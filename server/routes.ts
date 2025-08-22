import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { 
  loginSchema, 
  registerSchema,
  songSearchSchema,
  insertPlaylistSchema,
  insertSongSchema,
  insertVoteSchema 
} from "@shared/schema";
import { randomBytes } from "crypto";
import QRCode from "qrcode";

interface WebSocketClient extends WebSocket {
  adminId?: string;
  userId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Session configuration
  const PgSession = connectPg(session);
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session_store',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  }));

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store connected clients
  const clients = new Map<string, Set<WebSocketClient>>();

  wss.on('connection', (ws: WebSocketClient, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const adminId = url.searchParams.get('adminId');
    const userId = url.searchParams.get('userId') || randomBytes(8).toString('hex');

    if (adminId) {
      ws.adminId = adminId;
      ws.userId = userId;

      if (!clients.has(adminId)) {
        clients.set(adminId, new Set());
      }
      clients.get(adminId)!.add(ws);

      // Update session activity
      storage.updateSessionActivity(adminId, userId);

      ws.on('close', () => {
        if (adminId && clients.has(adminId)) {
          clients.get(adminId)!.delete(ws);
          if (clients.get(adminId)!.size === 0) {
            clients.delete(adminId);
          }
        }
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'vote' && message.songId) {
            // Handle vote
            const hasVoted = await storage.hasUserVoted(message.songId, userId);
            if (!hasVoted) {
              await storage.addVote({ songId: message.songId, userId });
              
              // Broadcast vote update to all clients in this admin's room
              const voteCount = await storage.getSongVotes(message.songId);
              broadcastToRoom(adminId, {
                type: 'vote_update',
                songId: message.songId,
                voteCount,
                userId
              });
            }
          }

          if (message.type === 'heartbeat') {
            await storage.updateSessionActivity(adminId, userId);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });
    }
  });

  function broadcastToRoom(adminId: string, message: any) {
    if (clients.has(adminId)) {
      const roomClients = clients.get(adminId)!;
      roomClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  // Admin authentication
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const admin = await storage.getAdminByUsername(username);
      
      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await storage.validatePassword(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Store admin in session
      (req.session as any).adminId = admin.id;

      res.json({ 
        admin: { 
          id: admin.id, 
          username: admin.username, 
          displayName: admin.displayName,
          uniqueCode: admin.uniqueCode 
        } 
      });
    } catch (error) {
      res.status(400).json({ error: 'Invalid request data' });
    }
  });

  app.post('/api/admin/register', async (req, res) => {
    try {
      const adminData = registerSchema.parse(req.body);

      const existingAdmin = await storage.getAdminByUsername(adminData.username);
      if (existingAdmin) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const admin = await storage.createAdmin(adminData);
      
      // Create default playlist for new admin
      await storage.createPlaylist({
        adminId: admin.id,
        name: "My Jukebox Playlist",
        isActive: true,
      });
      
      // Store admin in session
      (req.session as any).adminId = admin.id;

      res.json({ 
        admin: { 
          id: admin.id, 
          username: admin.username, 
          displayName: admin.displayName,
          uniqueCode: admin.uniqueCode 
        } 
      });
    } catch (error) {
      res.status(400).json({ error: 'Invalid request data' });
    }
  });

  app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ success: true });
    });
  });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.adminId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  };

  // Admin dashboard routes
  app.get('/api/admin/:adminId/stats', requireAuth, async (req, res) => {
    try {
      const { adminId } = req.params;
      const stats = await storage.getAdminStats(adminId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.get('/api/admin/:adminId/playlists', requireAuth, async (req, res) => {
    try {
      const { adminId } = req.params;
      const playlists = await storage.getAdminPlaylists(adminId);
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch playlists' });
    }
  });

  app.post('/api/admin/:adminId/playlists', requireAuth, async (req, res) => {
    try {
      const { adminId } = req.params;
      const playlistData = insertPlaylistSchema.parse({ ...req.body, adminId });
      const playlist = await storage.createPlaylist(playlistData);
      res.json(playlist);
    } catch (error) {
      res.status(400).json({ error: 'Invalid playlist data' });
    }
  });

  app.put('/api/admin/:adminId/playlists/:playlistId/activate', requireAuth, async (req, res) => {
    try {
      const { adminId, playlistId } = req.params;
      await storage.setActivePlaylist(adminId, playlistId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to activate playlist' });
    }
  });

  app.get('/api/playlists/:playlistId/songs', async (req, res) => {
    try {
      const { playlistId } = req.params;
      const songs = await storage.getPlaylistSongs(playlistId);
      res.json(songs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch songs' });
    }
  });

  app.post('/api/playlists/:playlistId/songs', async (req, res) => {
    try {
      const { playlistId } = req.params;
      const songData = insertSongSchema.parse({ ...req.body, playlistId });
      const song = await storage.addSong(songData);
      
      // Broadcast new song to all clients
      broadcastToRoom(playlistId, {
        type: 'song_added',
        song
      });
      
      res.json(song);
    } catch (error) {
      res.status(400).json({ error: 'Invalid song data' });
    }
  });

  app.put('/api/songs/:songId/play', async (req, res) => {
    try {
      const { songId } = req.params;
      // For now, skip setting currently playing since we need playlist ID
      // This endpoint needs to be updated to include playlist ID
      res.json({ success: true, message: 'Endpoint needs playlist ID parameter' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set currently playing' });
    }
  });

  // iTunes Search API integration
  app.get('/api/search/songs', async (req, res) => {
    try {
      const queryParams = {
        query: req.query.query as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20
      };
      const { query, limit } = songSearchSchema.parse(queryParams);
      
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;
      const response = await fetch(itunesUrl);
      const data = await response.json();
      
      const songs = data.results.map((result: any) => ({
        itunesId: result.trackId.toString(),
        title: result.trackName,
        artist: result.artistName,
        album: result.collectionName,
        duration: Math.floor(result.trackTimeMillis / 1000),
        artworkUrl: result.artworkUrl100?.replace('100x100', '300x300'),
        previewUrl: result.previewUrl,
      }));
      
      res.json(songs);
    } catch (error) {
      res.status(400).json({ error: 'Invalid search parameters' });
    }
  });

  // Public voting routes (no auth required)
  app.get('/api/public/:uniqueCode/info', async (req, res) => {
    try {
      const { uniqueCode } = req.params;
      const admin = await storage.getAdminByUniqueCode(uniqueCode);
      
      if (!admin) {
        return res.status(404).json({ error: 'Jukebox not found' });
      }

      const activePlaylist = await storage.getActivePlaylist(admin.id);
      if (!activePlaylist) {
        return res.status(404).json({ error: 'No active playlist' });
      }

      const songs = await storage.getPlaylistSongs(activePlaylist.id);
      const currentlyPlaying = await storage.getCurrentlyPlaying(activePlaylist.id);

      res.json({
        admin: {
          id: admin.id,
          displayName: admin.displayName,
        },
        playlist: activePlaylist,
        songs,
        currentlyPlaying
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch jukebox info' });
    }
  });

  // QR Code generation
  app.get('/api/admin/:adminId/qrcode', requireAuth, async (req, res) => {
    try {
      const { adminId } = req.params;
      const admin = await storage.getAdmin(adminId);
      
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : `http://localhost:5000`;
      
      const qrUrl = `${baseUrl}/vote/${admin.uniqueCode}`;
      const qrCode = await QRCode.toDataURL(qrUrl);
      
      res.json({ qrCode, url: qrUrl });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  // Public voting route
  app.post('/api/songs/:songId/vote', async (req, res) => {
    try {
      const { songId } = req.params;
      const voteData = insertVoteSchema.parse({ ...req.body, songId });
      
      // Check if user already voted for this song
      const existingVote = await storage.getUserVoteForSong(voteData.userId, songId);
      if (existingVote) {
        return res.status(409).json({ error: 'You have already voted for this song' });
      }

      const vote = await storage.createVote(voteData);
      
      // Get song info for WebSocket broadcast
      const song = await storage.getSong(songId);
      if (song) {
        const playlist = await storage.getPlaylistById(song.playlistId);
        if (playlist) {
          // Broadcast vote update to admin via WebSocket
          const voteCount = await storage.getSongVoteCount(songId);
          broadcastToRoom(playlist.adminId, {
            type: 'vote_update',
            songId,
            voteCount
          });

          // Auto-play: Check if this song now has the highest votes
          const topVotedSong = await storage.getTopVotedSong(playlist.id);
          if (topVotedSong && topVotedSong.id === songId) {
            // Set this song as currently playing
            await storage.setCurrentlyPlaying(playlist.id, songId);
            
            // Broadcast now playing update
            broadcastToRoom(playlist.adminId, {
              type: 'now_playing',
              song: topVotedSong
            });
          }
        }
      }

      res.json({ success: true, vote });
    } catch (error) {
      console.error('Vote error:', error);
      res.status(400).json({ error: 'Invalid vote data' });
    }
  });

  return httpServer;
}

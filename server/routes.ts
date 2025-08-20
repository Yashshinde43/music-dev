import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  loginSchema, 
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
      
      if (!admin || admin.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

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
      const adminData = loginSchema.extend({
        displayName: loginSchema.shape.username
      }).parse(req.body);

      const existingAdmin = await storage.getAdminByUsername(adminData.username);
      if (existingAdmin) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const admin = await storage.createAdmin(adminData);
      
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

  // Admin dashboard routes
  app.get('/api/admin/:adminId/stats', async (req, res) => {
    try {
      const { adminId } = req.params;
      const stats = await storage.getAdminStats(adminId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.get('/api/admin/:adminId/playlists', async (req, res) => {
    try {
      const { adminId } = req.params;
      const playlists = await storage.getAdminPlaylists(adminId);
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch playlists' });
    }
  });

  app.post('/api/admin/:adminId/playlists', async (req, res) => {
    try {
      const { adminId } = req.params;
      const playlistData = insertPlaylistSchema.parse({ ...req.body, adminId });
      const playlist = await storage.createPlaylist(playlistData);
      res.json(playlist);
    } catch (error) {
      res.status(400).json({ error: 'Invalid playlist data' });
    }
  });

  app.put('/api/admin/:adminId/playlists/:playlistId/activate', async (req, res) => {
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
      await storage.setCurrentlyPlaying(songId);
      
      // Get the song to broadcast the update
      const song = await storage.getPlaylistSongs(songId);
      if (song.length > 0) {
        broadcastToRoom(song[0].playlistId, {
          type: 'now_playing',
          song: song[0]
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set currently playing' });
    }
  });

  // iTunes Search API integration
  app.get('/api/search/songs', async (req, res) => {
    try {
      const { query, limit = 20 } = songSearchSchema.parse(req.query);
      
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
  app.get('/api/admin/:adminId/qrcode', async (req, res) => {
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

  return httpServer;
}

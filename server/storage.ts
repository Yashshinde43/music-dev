import { 
  admins, playlists, songs, votes, sessions,
  type Admin, type InsertAdmin,
  type Playlist, type InsertPlaylist, 
  type Song, type InsertSong,
  type Vote, type InsertVote,
  type Session, type InsertSession
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // Admin methods
  getAdmin(id: string): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminByUniqueCode(code: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  validatePassword(password: string, hashedPassword: string): Promise<boolean>;

  // Playlist methods
  getAdminPlaylists(adminId: string): Promise<Playlist[]>;
  getActivePlaylist(adminId: string): Promise<Playlist | undefined>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  setActivePlaylist(adminId: string, playlistId: string): Promise<void>;

  // Song methods
  getPlaylistSongs(playlistId: string): Promise<(Song & { voteCount: number })[]>;
  addSong(song: InsertSong): Promise<Song>;
  setCurrentlyPlaying(playlistId: string, songId: string): Promise<void>;
  getCurrentlyPlaying(playlistId: string): Promise<Song | undefined>;

  // Vote methods
  addVote(vote: InsertVote): Promise<Vote>;
  createVote(vote: InsertVote): Promise<Vote>;
  hasUserVoted(songId: string, userId: string): Promise<boolean>;
  getUserVoteForSong(userId: string, songId: string): Promise<Vote | undefined>;
  getSongVotes(songId: string): Promise<number>;
  getSongVoteCount(songId: string): Promise<number>;
  
  // Additional methods
  getSong(songId: string): Promise<Song | undefined>;
  getPlaylistById(playlistId: string): Promise<Playlist | undefined>;
  getTopVotedSong(playlistId: string): Promise<any>;

  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  updateSessionActivity(adminId: string, userId: string): Promise<void>;
  getActiveSessions(adminId: string): Promise<Session[]>;
  
  // Stats methods
  getAdminStats(adminId: string): Promise<{
    activeUsers: number;
    totalVotes: number;
    playlistLength: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getAdmin(id: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin || undefined;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin || undefined;
  }

  async getAdminByUniqueCode(code: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.uniqueCode, code));
    return admin || undefined;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const uniqueCode = randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(insertAdmin.password, 10);
    const [admin] = await db
      .insert(admins)
      .values({ 
        ...insertAdmin, 
        password: hashedPassword,
        uniqueCode 
      })
      .returning();
    return admin;
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async getAdminPlaylists(adminId: string): Promise<Playlist[]> {
    return db.select().from(playlists).where(eq(playlists.adminId, adminId));
  }

  async getActivePlaylist(adminId: string): Promise<Playlist | undefined> {
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.adminId, adminId), eq(playlists.isActive, true)));
    return playlist || undefined;
  }

  async createPlaylist(playlist: InsertPlaylist): Promise<Playlist> {
    const [newPlaylist] = await db
      .insert(playlists)
      .values(playlist)
      .returning();
    return newPlaylist;
  }

  async setActivePlaylist(adminId: string, playlistId: string): Promise<void> {
    await db
      .update(playlists)
      .set({ isActive: false })
      .where(eq(playlists.adminId, adminId));
    
    await db
      .update(playlists)
      .set({ isActive: true })
      .where(eq(playlists.id, playlistId));
  }

  async getPlaylistSongs(playlistId: string): Promise<(Song & { voteCount: number })[]> {
    const result = await db
      .select({
        id: songs.id,
        playlistId: songs.playlistId,
        itunesId: songs.itunesId,
        title: songs.title,
        artist: songs.artist,
        album: songs.album,
        duration: songs.duration,
        artworkUrl: songs.artworkUrl,
        previewUrl: songs.previewUrl,
        isPlaying: songs.isPlaying,
        addedAt: songs.addedAt,
        voteCount: count(votes.id),
      })
      .from(songs)
      .leftJoin(votes, eq(songs.id, votes.songId))
      .where(eq(songs.playlistId, playlistId))
      .groupBy(songs.id)
      .orderBy(desc(count(votes.id)));
    
    return result.map(row => ({
      ...row,
      voteCount: Number(row.voteCount),
    }));
  }

  async addSong(song: InsertSong): Promise<Song> {
    const [newSong] = await db
      .insert(songs)
      .values(song)
      .returning();
    return newSong;
  }


  async getCurrentlyPlaying(playlistId: string): Promise<Song | undefined> {
    const [song] = await db
      .select()
      .from(songs)
      .where(and(eq(songs.playlistId, playlistId), eq(songs.isPlaying, true)));
    return song || undefined;
  }

  async addVote(vote: InsertVote): Promise<Vote> {
    const [newVote] = await db
      .insert(votes)
      .values(vote)
      .returning();
    return newVote;
  }

  async hasUserVoted(songId: string, userId: string): Promise<boolean> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.songId, songId), eq(votes.userId, userId)))
      .limit(1);
    return !!vote;
  }

  async getSongVotes(songId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(votes)
      .where(eq(votes.songId, songId));
    return Number(result.count);
  }

  // Alias methods for compatibility
  async createVote(vote: InsertVote): Promise<Vote> {
    return this.addVote(vote);
  }

  async getUserVoteForSong(userId: string, songId: string): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.userId, userId), eq(votes.songId, songId)));
    return vote || undefined;
  }

  async getSongVoteCount(songId: string): Promise<number> {
    return this.getSongVotes(songId);
  }

  async getSong(songId: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, songId));
    return song || undefined;
  }

  async getPlaylistById(playlistId: string): Promise<Playlist | undefined> {
    const [playlist] = await db.select().from(playlists).where(eq(playlists.id, playlistId));
    return playlist || undefined;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db
      .insert(sessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateSessionActivity(adminId: string, userId: string): Promise<void> {
    const existingSession = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.adminId, adminId), eq(sessions.userId, userId)))
      .limit(1);

    if (existingSession.length > 0) {
      await db
        .update(sessions)
        .set({ lastActiveAt: new Date() })
        .where(eq(sessions.id, existingSession[0].id));
    } else {
      await this.createSession({ adminId, userId });
    }
  }

  async getActiveSessions(adminId: string): Promise<Session[]> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.adminId, adminId),
          sql`${sessions.lastActiveAt} > ${fifteenMinutesAgo}`
        )
      );
  }

  async getAdminStats(adminId: string): Promise<{
    activeUsers: number;
    totalVotes: number;
    playlistLength: number;
  }> {
    const activeSessions = await this.getActiveSessions(adminId);
    
    const activePlaylist = await this.getActivePlaylist(adminId);
    if (!activePlaylist) {
      return { activeUsers: 0, totalVotes: 0, playlistLength: 0 };
    }

    const playlistSongs = await db
      .select()
      .from(songs)
      .where(eq(songs.playlistId, activePlaylist.id));

    const [voteCount] = await db
      .select({ count: count() })
      .from(votes)
      .leftJoin(songs, eq(votes.songId, songs.id))
      .where(eq(songs.playlistId, activePlaylist.id));

    return {
      activeUsers: activeSessions.length,
      totalVotes: Number(voteCount.count),
      playlistLength: playlistSongs.length,
    };
  }

  async getTopVotedSong(playlistId: string): Promise<any> {
    const songsWithVotes = await db
      .select({
        id: songs.id,
        title: songs.title,
        artist: songs.artist,
        album: songs.album,
        artworkUrl: songs.artworkUrl,
        previewUrl: songs.previewUrl,
        duration: songs.duration,
        voteCount: count(votes.id)
      })
      .from(songs)
      .leftJoin(votes, eq(songs.id, votes.songId))
      .where(eq(songs.playlistId, playlistId))
      .groupBy(songs.id)
      .orderBy(desc(count(votes.id)));

    return songsWithVotes[0] || null;
  }

  async setCurrentlyPlaying(playlistId: string, songId: string): Promise<void> {
    // First, unset any currently playing songs in this playlist
    await db
      .update(songs)
      .set({ isPlaying: false })
      .where(eq(songs.playlistId, playlistId));
    
    // Then set the new currently playing song
    await db
      .update(songs)
      .set({ isPlaying: true })
      .where(eq(songs.id, songId));
  }
}

export const storage = new DatabaseStorage();

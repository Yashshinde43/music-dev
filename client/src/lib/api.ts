export interface ITunesSearchResult {
  itunesId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  artworkUrl?: string;
  previewUrl?: string;
}

export interface JukeboxInfo {
  admin: {
    id: string;
    displayName: string;
  };
  playlist: {
    id: string;
    name: string;
    isActive: boolean;
  };
  songs: Array<{
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration?: number;
    artworkUrl?: string;
    voteCount: number;
    isPlaying: boolean;
  }>;
  currentlyPlaying?: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration?: number;
    artworkUrl?: string;
    voteCount: number;
  };
}

export interface AdminStats {
  activeUsers: number;
  totalVotes: number;
  playlistLength: number;
}

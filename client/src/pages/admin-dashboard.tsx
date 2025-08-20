import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { SongSearch } from "@/components/song-search";
import { QRCodeDisplay } from "@/components/ui/qr-code";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  ThumbsUp, 
  ListMusic, 
  Clock, 
  Play, 
  Pause, 
  SkipForward, 
  Music,
  Plus,
  QrCode,
  Download,
  Share,
  TrendingUp
} from "lucide-react";

export function AdminDashboard() {
  const { adminId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSongSearch, setShowSongSearch] = useState(false);

  // WebSocket connection
  useWebSocket(`ws://localhost:5000/ws?adminId=${adminId}`, {
    onMessage: (data) => {
      if (data.type === 'vote_update') {
        // Invalidate songs query to refresh vote counts
        queryClient.invalidateQueries({ queryKey: ['/api/playlists', 'songs'] });
      }
      if (data.type === 'song_added') {
        queryClient.invalidateQueries({ queryKey: ['/api/playlists', 'songs'] });
      }
      if (data.type === 'now_playing') {
        queryClient.invalidateQueries({ queryKey: ['/api/playlists', 'songs'] });
      }
    }
  });

  // Fetch admin stats
  const { data: stats } = useQuery({
    queryKey: ['/api/admin', adminId, 'stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch playlists
  const { data: playlists = [] } = useQuery({
    queryKey: ['/api/admin', adminId, 'playlists'],
  });

  const activePlaylist = (playlists as any[]).find((p: any) => p.isActive);

  // Fetch songs for active playlist
  const { data: songs = [], isLoading: songsLoading } = useQuery({
    queryKey: ['/api/playlists', activePlaylist?.id, 'songs'],
    enabled: !!activePlaylist?.id,
  });

  // Fetch QR code
  const { data: qrData } = useQuery({
    queryKey: ['/api/admin', adminId, 'qrcode'],
    enabled: !!adminId,
  });

  const currentlyPlaying = (songs as any[]).find((song: any) => song.isPlaying);
  const topVotedSongs = (songs as any[]).slice(0, 3);

  const playMutation = useMutation({
    mutationFn: async (songId: string) => {
      await apiRequest('PUT', `/api/songs/${songId}/play`);
    },
    onSuccess: () => {
      toast({ title: "Now playing updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/playlists', activePlaylist?.id, 'songs'] });
    },
  });

  const handlePlayNow = (songId: string) => {
    playMutation.mutate(songId);
  };

  const downloadQR = () => {
    if ((qrData as any)?.qrCode) {
      const link = document.createElement('a');
      link.download = 'jukebox-qr-code.png';
      link.href = (qrData as any).qrCode;
      link.click();
    }
  };

  const shareQR = async () => {
    if ((qrData as any)?.url) {
      try {
        await navigator.share({
          title: 'Join my Jukebox!',
          text: 'Scan this QR code or visit the link to vote for songs',
          url: (qrData as any).url,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText((qrData as any).url);
        toast({ title: "Link copied to clipboard!" });
      }
    }
  };

  if (!adminId) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Invalid admin ID</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50" data-testid="admin-dashboard">
      <div className="flex">
        <Sidebar adminId={adminId} />
        
        {/* Main Content */}
        <div className="flex-1 lg:pl-64">
          {/* Mobile Header */}
          <div className="lg:hidden bg-slate-850 border-b border-slate-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                  <Music className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-lg font-bold text-gradient">QR Jukebox</h1>
              </div>
            </div>
          </div>

          {/* Page Header */}
          <header className="bg-slate-850 border-b border-slate-700 px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                <p className="text-slate-400 mt-1">Manage your collaborative jukebox experience</p>
              </div>
              <div className="flex space-x-3">
                <Dialog open={showSongSearch} onOpenChange={setShowSongSearch}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="border-slate-600 hover:bg-slate-700"
                      data-testid="button-add-song"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Songs
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl bg-slate-850 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Add Songs to Playlist</DialogTitle>
                    </DialogHeader>
                    <SongSearch 
                      playlistId={activePlaylist?.id} 
                      onSongAdded={() => setShowSongSearch(false)}
                    />
                  </DialogContent>
                </Dialog>
                
                <Button 
                  className="gradient-primary hover:opacity-90"
                  onClick={shareQR}
                  data-testid="button-share-qr"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Share QR Code
                </Button>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="flex-1 px-6 py-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <Card className="bg-slate-850 border-slate-700 animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Active Users</p>
                      <p className="text-2xl font-bold text-white mt-1" data-testid="stat-active-users">
                        {(stats as any)?.activeUsers || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 gradient-accent rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500 font-medium">Live</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-850 border-slate-700 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Total Votes</p>
                      <p className="text-2xl font-bold text-white mt-1" data-testid="stat-total-votes">
                        {(stats as any)?.totalVotes || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-accent to-cyan-400 rounded-xl flex items-center justify-center">
                      <ThumbsUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500 font-medium">Real-time</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-850 border-slate-700 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Playlist Songs</p>
                      <p className="text-2xl font-bold text-white mt-1" data-testid="stat-playlist-length">
                        {(stats as any)?.playlistLength || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-secondary to-purple-400 rounded-xl flex items-center justify-center">
                      <ListMusic className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-850 border-slate-700 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Avg Session</p>
                      <p className="text-2xl font-bold text-white mt-1">24m</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-indigo-400 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Currently Playing & Top Voted Songs */}
              <div className="xl:col-span-2 space-y-6">
                {/* Currently Playing */}
                <Card className="bg-slate-850 border-slate-700">
                  <CardHeader className="border-b border-slate-700">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">Currently Playing</CardTitle>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-slate-400">Live</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {currentlyPlaying ? (
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                          {currentlyPlaying.artworkUrl ? (
                            <img 
                              src={currentlyPlaying.artworkUrl} 
                              alt="Album art"
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            <Music className="w-8 h-8 text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-lg font-semibold text-white truncate" data-testid="current-song-title">
                            {currentlyPlaying.title}
                          </h4>
                          <p className="text-slate-400 truncate" data-testid="current-song-artist">
                            {currentlyPlaying.artist}
                          </p>
                          {currentlyPlaying.album && (
                            <p className="text-sm text-slate-500 truncate">{currentlyPlaying.album}</p>
                          )}
                          <div className="flex items-center mt-2 space-x-2">
                            <div className="flex items-center text-sm text-accent">
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              <span data-testid="current-song-votes">{currentlyPlaying.voteCount} votes</span>
                            </div>
                            {currentlyPlaying.duration && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-sm text-slate-400">
                                  {Math.floor(currentlyPlaying.duration / 60)}:{(currentlyPlaying.duration % 60).toString().padStart(2, '0')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-center space-y-2">
                          <Button
                            size="sm"
                            className="w-12 h-12 gradient-primary rounded-full hover:opacity-90"
                            data-testid="button-pause-play"
                          >
                            <Pause className="w-5 h-5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-10 h-10 rounded-full border-slate-600"
                            data-testid="button-skip"
                          >
                            <SkipForward className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No song currently playing</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Voted Songs */}
                <Card className="bg-slate-850 border-slate-700">
                  <CardHeader className="border-b border-slate-700">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">Top Voted Songs</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {songsLoading ? (
                      <div className="p-6 text-center text-slate-400">Loading songs...</div>
                    ) : topVotedSongs.length > 0 ? (
                      <div className="divide-y divide-slate-700">
                        {topVotedSongs.map((song: any, index: number) => (
                          <div key={song.id} className="p-4 hover:bg-slate-700/50 transition-colors">
                            <div className="flex items-center space-x-4">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm ${
                                index === 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                                index === 1 ? 'bg-gradient-to-br from-slate-500 to-slate-600' :
                                'bg-gradient-to-br from-amber-600 to-yellow-600'
                              }`}>
                                {index + 1}
                              </div>
                              <div className="w-12 h-12 gradient-accent rounded-lg flex items-center justify-center flex-shrink-0">
                                {song.artworkUrl ? (
                                  <img 
                                    src={song.artworkUrl} 
                                    alt="Album art"
                                    className="w-full h-full rounded-lg object-cover"
                                  />
                                ) : (
                                  <Music className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-white font-medium truncate" data-testid={`song-title-${index}`}>
                                  {song.title}
                                </p>
                                <p className="text-slate-400 text-sm truncate" data-testid={`song-artist-${index}`}>
                                  {song.artist}
                                </p>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center text-sm text-accent">
                                  <ThumbsUp className="w-3 h-3 mr-1" />
                                  <span data-testid={`song-votes-${index}`}>{song.voteCount}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-slate-400 hover:text-white"
                                  onClick={() => handlePlayNow(song.id)}
                                  disabled={playMutation.isPending}
                                  data-testid={`button-play-now-${index}`}
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-400">
                        <ListMusic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No songs in playlist yet</p>
                        <Button 
                          onClick={() => setShowSongSearch(true)}
                          className="mt-4 gradient-primary"
                        >
                          Add Your First Song
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* QR Code Panel */}
              <div className="space-y-6">
                <Card className="bg-slate-850 border-slate-700">
                  <CardHeader className="border-b border-slate-700">
                    <CardTitle className="text-white">Your QR Code</CardTitle>
                    <p className="text-slate-400 text-sm">Share this with your audience</p>
                  </CardHeader>
                  <CardContent className="p-6 text-center">
                    <QRCodeDisplay 
                      value={(qrData as any)?.url} 
                      size={192}
                      className="mx-auto mb-4"
                      data-testid="qr-code-display"
                    />
                    
                    <div className="space-y-3">
                      <p className="text-sm text-slate-400">Scan to join the jukebox</p>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={downloadQR}
                          className="flex-1 gradient-primary hover:opacity-90"
                          disabled={!(qrData as any)?.qrCode}
                          data-testid="button-download-qr"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button 
                          onClick={shareQR}
                          variant="outline"
                          className="flex-1 border-slate-600"
                          disabled={!(qrData as any)?.url}
                          data-testid="button-share-qr-copy"
                        >
                          <Share className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>

                    {(qrData as any)?.url && (
                      <div className="mt-4 p-3 bg-slate-700 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Direct Link</p>
                        <p className="text-sm text-white font-mono break-all" data-testid="qr-url">
                          {(qrData as any).url}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

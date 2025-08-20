import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { VotingCard } from "@/components/voting-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Music, Users, Plus, Radio } from "lucide-react";

export function UserVoting() {
  const { uniqueCode } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 8)}`);

  // Fetch jukebox info
  const { data: jukeboxData, isLoading, error } = useQuery({
    queryKey: ['/api/public', uniqueCode, 'info'],
  });

  // WebSocket connection for real-time updates
  useWebSocket(`ws://localhost:5000/ws?adminId=${jukeboxData?.admin?.id}&userId=${userId}`, {
    enabled: !!jukeboxData?.admin?.id,
    onMessage: (data) => {
      if (data.type === 'vote_update') {
        queryClient.invalidateQueries({ queryKey: ['/api/public', uniqueCode, 'info'] });
      }
      if (data.type === 'song_added') {
        queryClient.invalidateQueries({ queryKey: ['/api/public', uniqueCode, 'info'] });
        toast({ title: "New song added to playlist!" });
      }
      if (data.type === 'now_playing') {
        queryClient.invalidateQueries({ queryKey: ['/api/public', uniqueCode, 'info'] });
        toast({ title: `Now playing: ${data.song.title}` });
      }
    }
  });

  const currentlyPlaying = jukeboxData?.currentlyPlaying;
  const songs = jukeboxData?.songs?.filter((song: any) => !song.isPlaying) || [];
  const adminName = jukeboxData?.admin?.displayName;

  // Send heartbeat every 30 seconds to maintain session
  useEffect(() => {
    if (!jukeboxData?.admin?.id) return;

    const interval = setInterval(() => {
      // This would be sent via WebSocket heartbeat
    }, 30000);

    return () => clearInterval(interval);
  }, [jukeboxData?.admin?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" data-testid="loading-state">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Music className="w-6 h-6 text-white" />
          </div>
          <p className="text-white">Loading jukebox...</p>
        </div>
      </div>
    );
  }

  if (error || !jukeboxData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" data-testid="error-state">
        <Card className="w-full max-w-md mx-4 bg-slate-850 border-slate-700">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Music className="w-6 h-6 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Jukebox Not Found</h1>
            <p className="text-slate-400">
              This QR code might be invalid or the jukebox is no longer active.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4" data-testid="user-voting-page">
      <div className="max-w-sm mx-auto bg-slate-850 rounded-3xl p-6 border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 gradient-primary rounded-xl mx-auto mb-3 flex items-center justify-center">
            <Music className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">QR Jukebox</h1>
          <p className="text-slate-400 text-sm" data-testid="admin-name">
            {adminName}'s Playlist
          </p>
        </div>

        {/* Currently Playing */}
        {currentlyPlaying && (
          <Card className="bg-slate-700 border-slate-600 rounded-xl mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  {currentlyPlaying.artworkUrl ? (
                    <img 
                      src={currentlyPlaying.artworkUrl} 
                      alt="Album art"
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    <Music className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium text-sm truncate" data-testid="current-playing-title">
                    {currentlyPlaying.title}
                  </p>
                  <p className="text-slate-400 text-xs truncate" data-testid="current-playing-artist">
                    {currentlyPlaying.artist}
                  </p>
                </div>
                <div className="flex items-center text-xs text-accent">
                  <Radio className="w-3 h-3 mr-1 animate-pulse" />
                  <span>Now Playing</span>
                </div>
              </div>
              <Progress value={42} className="h-1.5" />
            </CardContent>
          </Card>
        )}

        {/* Vote for Next Songs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-medium text-sm">Vote for Next Song</h2>
            <div className="flex items-center text-xs text-slate-400">
              <Users className="w-3 h-3 mr-1" />
              <span data-testid="user-count">Live voting</span>
            </div>
          </div>
          
          {songs.length > 0 ? (
            <div className="space-y-3" data-testid="voting-songs-list">
              {songs.map((song: any, index: number) => (
                <VotingCard 
                  key={song.id} 
                  song={song} 
                  userId={userId}
                  rank={index + 1}
                  data-testid={`voting-card-${index}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Music className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No songs available for voting</p>
              <p className="text-xs">Ask the DJ to add some songs!</p>
            </div>
          )}

          {/* Add Song Suggestion - Future feature */}
          <div className="mt-4 pt-4 border-t border-slate-600">
            <Button 
              disabled
              className="w-full gradient-primary hover:opacity-90 opacity-50 cursor-not-allowed"
              data-testid="button-suggest-song"
            >
              <Plus className="w-4 h-4 mr-2" />
              Suggest a Song (Coming Soon)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

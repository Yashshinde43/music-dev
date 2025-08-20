import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Music, Plus, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface SongSearchProps {
  playlistId?: string;
  onSongAdded?: () => void;
}

export function SongSearch({ playlistId, onSongAdded }: SongSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['/api/search/songs', { query: debouncedQuery, limit: 20 }],
    enabled: debouncedQuery.length > 2,
  });

  const addSongMutation = useMutation({
    mutationFn: async (song: any) => {
      if (!playlistId) throw new Error("No playlist selected");
      await apiRequest('POST', `/api/playlists/${playlistId}/songs`, song);
    },
    onSuccess: () => {
      toast({ title: "Song added to playlist!" });
      queryClient.invalidateQueries({ queryKey: ['/api/playlists', playlistId, 'songs'] });
      onSongAdded?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to add song",
        description: error.message,
      });
    },
  });

  const handleAddSong = (song: any) => {
    addSongMutation.mutate(song);
  };

  return (
    <div className="space-y-4" data-testid="song-search">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search for songs, artists, or albums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
          data-testid="input-song-search"
        />
      </div>

      {/* Search Results */}
      <ScrollArea className="h-96">
        {searchLoading && debouncedQuery && (
          <div className="flex items-center justify-center py-8 text-slate-400" data-testid="search-loading">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Searching...
          </div>
        )}

        {!searchLoading && debouncedQuery && searchResults?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400" data-testid="no-results">
            <Music className="w-12 h-12 mb-4 opacity-50" />
            <p>No songs found for "{debouncedQuery}"</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        )}

        {!debouncedQuery && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400" data-testid="search-prompt">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <p>Start typing to search for songs</p>
          </div>
        )}

        <div className="space-y-3" data-testid="search-results">
          {searchResults?.map((song: any, index: number) => (
            <div 
              key={`${song.itunesId}-${index}`} 
              className="flex items-center space-x-4 p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              data-testid={`search-result-${index}`}
            >
              <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
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
                  {song.artist} {song.album && `• ${song.album}`}
                </p>
                {song.duration && (
                  <p className="text-slate-500 text-xs">
                    {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => handleAddSong(song)}
                disabled={addSongMutation.isPending || !playlistId}
                className="gradient-primary hover:opacity-90"
                data-testid={`button-add-song-${index}`}
              >
                {addSongMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Music } from "lucide-react";

interface VotingCardProps {
  song: {
    id: string;
    title: string;
    artist: string;
    artworkUrl?: string;
    voteCount: number;
  };
  userId: string;
  rank: number;
}

export function VotingCard({ song, userId, rank }: VotingCardProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const { toast } = useToast();

  const voteMutation = useMutation({
    mutationFn: async () => {
      // This will be handled via WebSocket
      const ws = new WebSocket(`ws://localhost:5000/ws?userId=${userId}`);
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'vote',
          songId: song.id,
        }));
        ws.close();
      };
    },
    onSuccess: () => {
      setHasVoted(true);
      toast({ title: `Voted for ${song.title}!` });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to vote",
        description: "Please try again",
      });
    },
  });

  const handleVote = () => {
    if (!hasVoted) {
      voteMutation.mutate();
    }
  };

  const getGradientColor = (rank: number) => {
    switch (rank) {
      case 1: return "from-accent to-cyan-400";
      case 2: return "from-secondary to-purple-400";
      case 3: return "from-success to-emerald-400";
      default: return "from-primary to-blue-400";
    }
  };

  return (
    <div className="bg-slate-700 rounded-lg p-3" data-testid="voting-card">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${getGradientColor(rank)} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {song.artworkUrl ? (
            <img 
              src={song.artworkUrl} 
              alt="Album art"
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            <Music className="w-4 h-4 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-medium truncate" data-testid="voting-song-title">
            {song.title}
          </p>
          <p className="text-slate-400 text-xs truncate" data-testid="voting-song-artist">
            {song.artist}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-accent font-medium" data-testid="voting-song-count">
            {song.voteCount}
          </span>
          <Button
            size="sm"
            onClick={handleVote}
            disabled={hasVoted || voteMutation.isPending}
            className={`w-8 h-8 rounded-lg transition-colors ${
              hasVoted 
                ? "bg-primary text-white" 
                : "bg-slate-600 hover:bg-primary text-white"
            }`}
            data-testid="button-vote"
          >
            <ThumbsUp className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

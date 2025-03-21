import { useState } from "react";
import { Play, Pause, Heart, Music, ListPlus, MoreHorizontal, Trash2, AlertCircle } from "lucide-react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { useMutation, useQueryClient } from "@tanstack/react-query"; 
import { Track } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import ShareWidget from "@/components/social/ShareWidget";
import LikeButton from "@/components/social/LikeButton";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { deleteTrack } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TrackCardProps {
  track: Track;
  showBadge?: boolean;
}

export default function TrackCard({ track, showBadge = false }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlayPause, addToQueue, addTrackAndPlayNext } = useAudioPlayer();
  const isCurrentTrack = currentTrack?.id === track.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isOwner = user?.id === track.userId;

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation(); //Added to prevent card click from playing
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    addToQueue(track);
    toast({
      title: "Added to queue",
      description: `${track.title} by ${track.artistName} added to your queue`,
      duration: 3000,
    });
  };

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    addTrackAndPlayNext(track);
    toast({
      title: "Playing next",
      description: `${track.title} by ${track.artistName} will play next`,
      duration: 3000,
    });
  };

  // Delete track mutation
  const deleteTrackMutation = useMutation({
    mutationFn: () => deleteTrack(track.id),
    onSuccess: () => {
      toast({
        title: "Track deleted",
        description: `"${track.title}" has been deleted successfully.`,
      });
      // Invalidate tracks queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/tracks/recent'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/user/${user?.id}`] });
      
      // Close the dialog
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete track",
        description: "There was an error deleting your track. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting track:", error);
    },
  });

  // Get play count and like count with fallbacks
  const playCount = track.playCount ?? 0;
  const likeCount = track.likeCount ?? 0;

  return (
    <>
      <div 
        className={cn(
          "p-4 rounded-lg group hover:bg-primary/5 transition cursor-pointer border",
          isCurrentTrack ? "border-primary card-border-accent bg-primary/5" : "border-primary/10"
        )}
      >
        <div className="flex space-x-3">
          <div className="relative flex-shrink-0">
            {track.coverUrl ? (
              <img 
                src={track.coverUrl}
                alt={track.title} 
                className={cn(
                  "w-16 h-16 object-cover rounded-md shadow-md",
                  isCurrentTrack ? "border-2 border-primary" : "border border-primary/20"
                )} 
              />
            ) : (
              <div className={cn(
                "w-16 h-16 rounded-md flex items-center justify-center shadow-md",
                isCurrentTrack ? "bg-primary/20 border-2 border-primary" : "bg-primary/5 border border-primary/20"
              )}>
                <Music className={cn(
                  "h-8 w-8", 
                  isCurrentTrack ? "text-primary" : "text-primary/60"
                )} />
              </div>
            )}
            <button 
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-md hover:bg-primary/40" 
              onClick={handlePlayClick}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white" />
              )}
            </button>
            {showBadge && (
              <Badge className="absolute -top-2 -right-2 px-2 py-1 bg-primary text-white">
                New
              </Badge>
            )}
          </div>

          <div className="flex-1">
            <div className="flex justify-between">
              <div>
                <h3 className={cn(
                  "font-medium line-clamp-1",
                  isCurrentTrack ? "text-primary" : "hover:text-primary transition-colors"
                )}>
                  {track.title}
                </h3>
                <Link 
                  href={`/profile/${track.userId}`}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {track.artistName || "Unknown artist"}
                </Link>
                {track.genre && (
                  <Badge variant="outline" className="mt-1 text-xs border-primary/30 hover:bg-primary/5">
                    {track.genre}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-muted-foreground">{formatDuration(track.duration)}</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className="text-muted-foreground hover:text-primary transition-colors"
                          onClick={handleAddToQueue}
                        >
                          <ListPlus size={16} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to queue</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="text-muted-foreground hover:text-primary transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handlePlayNext}>
                        Play next
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleAddToQueue}>
                        Add to queue
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        Like track
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          // This will be handled by the ShareWidget component
                        }}
                      >
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className="w-full"
                        >
                          <ShareWidget 
                            title={track.title}
                            description={`A track by ${track.artistName}`}
                            url={`/track/${track.id}`}
                            type="track"
                            compact={true}
                          />
                        </div>
                      </DropdownMenuItem>
                      
                      {isOwner && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteDialog(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete track
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center mt-1 space-x-3 text-xs">
                  <span className="flex items-center text-muted-foreground">
                    <Play className={cn("h-3 w-3 mr-1", isCurrentTrack && "text-primary")} /> 
                    <span className={isCurrentTrack ? "text-primary font-medium" : ""}>
                      {playCount.toLocaleString()}
                    </span>
                  </span>
                  <span className="flex items-center">
                    <LikeButton 
                      contentId={track.id} 
                      contentType="track"
                      initialLikeCount={track.likeCount || 0}
                      size="sm"
                    />
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2">
              <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-300 audio-progress-bar",
                    isCurrentTrack ? "w-1/2" : "w-0 group-hover:w-full"
                  )}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-semibold">Delete Track</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="text-primary font-medium">"{track.title}"</span>? This action cannot be undone 
              and the track will be permanently removed from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteTrackMutation.isPending}
              className="border-primary/20 hover:bg-primary/5 hover:text-primary"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                deleteTrackMutation.mutate();
              }}
              disabled={deleteTrackMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteTrackMutation.isPending ? (
                <span className="flex items-center">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
                  Deleting...
                </span>
              ) : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
import { Link } from "wouter";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stream } from "@shared/schema";
import ShareWidget from "@/components/social/ShareWidget";
import { useAuth } from "@/hooks/use-auth";
import { endStream } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { X, AlertCircle } from "lucide-react";
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

interface StreamCardProps {
  stream: Stream;
}

export default function StreamCard({ stream }: StreamCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEndDialog, setShowEndDialog] = useState(false);
  const isCurrentUserStream = user?.id === stream.userId;
  
  const endStreamMutation = useMutation({
    mutationFn: () => endStream(stream.id),
    onSuccess: () => {
      toast({
        title: "Stream ended",
        description: "Your live stream has been ended successfully.",
      });
      // Invalidate streams queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/streams/featured"] });
      queryClient.invalidateQueries({ queryKey: [`/api/streams/user/${user?.id}`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to end stream",
        description: "There was an error ending your stream. Please try again.",
        variant: "destructive",
      });
      console.error("Error ending stream:", error);
    },
  });
  return (
    <div className="bg-dark-200 rounded-lg overflow-hidden group">
      <Link href={`/streams/${stream.id}`}>
        <div className="relative cursor-pointer">
          <img 
            src={stream.thumbnailUrl || ''}
            alt={stream.title} 
            className="w-full h-40 object-cover transition group-hover:scale-105" 
          />
          {stream.isLive && (
            <div className="absolute top-2 left-2 bg-[#00b074] text-xs font-medium px-2 py-0.5 rounded flex items-center">
              <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse mr-1.5"></span>
              LIVE
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 text-xs font-medium px-2 py-0.5 rounded">
            {(stream.viewerCount ?? 0) > 0 ? `${(stream.viewerCount ?? 0).toLocaleString()} viewers` : 'New'}
          </div>
        </div>
      </Link>
      
      <div className="p-3">
        <div className="flex justify-between">
          <div className="flex space-x-2">
            <Link href={`/profile/${stream.userId}`}>
              <Avatar className="w-10 h-10 cursor-pointer">
                {/* In a real app, we'd have the user data here */}
                <AvatarImage src={`https://source.unsplash.com/random/${stream.userId}`} />
                <AvatarFallback>{stream.title[0]}</AvatarFallback>
              </Avatar>
            </Link>
            
            <div>
              <Link href={`/streams/${stream.id}`}>
                <h3 className="font-medium cursor-pointer hover:text-primary">{stream.title}</h3>
              </Link>
              
              <Link href={`/profile/${stream.userId}`}>
                <p className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">{stream.userId}</p>
              </Link>
              
              <div className="flex items-center space-x-2 mt-1">
                {stream.tags && stream.tags.slice(0, 2).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5 bg-dark-100 hover:bg-dark-100">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <ShareWidget
              title={stream.title}
              description={`Check out this ${stream.isLive ? 'live stream' : 'stream'} on BeatStream!`}
              url={`/streams/${stream.id}`}
              type="stream"
              compact={true}
            />
          </div>
        </div>
      </div>
      
      {/* Add End Stream button for user's own live streams */}
      {isCurrentUserStream && stream.isLive && (
        <>
          <div className="px-3 pb-3 pt-1 flex justify-end">
            <Button 
              variant="destructive" 
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setShowEndDialog(true)}
            >
              <X size={14} />
              End Stream
            </Button>
          </div>
          
          {/* Confirmation Dialog */}
          <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  End Live Stream
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to end this live stream? This action cannot be undone 
                  and all current viewers will be disconnected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={endStreamMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.preventDefault();
                    endStreamMutation.mutate();
                  }}
                  disabled={endStreamMutation.isPending}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {endStreamMutation.isPending ? 'Ending...' : 'End Stream'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

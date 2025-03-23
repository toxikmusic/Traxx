import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Users, Trash2, StopCircle } from "lucide-react";
import { Stream } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteStream, endStream } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface StreamCardProps {
  stream: Stream;
  isOwner?: boolean;
}

export default function StreamCard({ stream, isOwner = false }: StreamCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete stream mutation
  const deleteStreamMutation = useMutation({
    mutationFn: () => deleteStream(stream.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams/featured'] });
      queryClient.invalidateQueries({ queryKey: ['/api/streams/user'] });
      toast({
        title: 'Stream deleted',
        description: 'The stream has been successfully deleted',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete stream',
        variant: 'destructive',
      });
    },
  });
  
  // End stream mutation
  const endStreamMutation = useMutation({
    mutationFn: () => endStream(stream.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams/featured'] });
      queryClient.invalidateQueries({ queryKey: ['/api/streams/user'] });
      toast({
        title: 'Stream ended',
        description: 'Your live stream has been ended successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to end stream',
        variant: 'destructive',
      });
    },
  });

  // Handle delete button click
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this stream?')) {
      deleteStreamMutation.mutate();
    }
  };
  
  // Handle end stream button click
  const handleEndStream = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to end this live stream?')) {
      endStreamMutation.mutate();
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-0">
        <div className="aspect-video relative bg-primary/10">
          <img
            src={stream.thumbnailUrl || `https://source.unsplash.com/random/600x340?music=${stream.id}`}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
          {stream.isLive && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white font-bold">
              LIVE
            </Badge>
          )}
          {isOwner && (
            <Badge className="absolute top-2 right-2" variant="outline">
              Your Stream
            </Badge>
          )}
          <div className="absolute bottom-2 right-2 bg-background/80 text-foreground px-2 py-1 rounded text-sm flex items-center">
            <Users className="h-3 w-3 mr-1" />
            {stream.viewerCount || 0}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Link href={`/stream/${stream.id}`}>
          <h3 className="font-medium text-lg hover:text-primary truncate">{stream.title}</h3>
        </Link>
        <p className="text-sm text-muted-foreground">
          {stream.description ? (
            <>
              {stream.description.substring(0, 100)}
              {stream.description.length > 100 ? '...' : ''}
            </>
          ) : (
            'No description available'
          )}
        </p>
        <div className="flex justify-between mt-2 items-center">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full overflow-hidden bg-primary/10">
              <img
                src={`https://source.unsplash.com/random/50x50?portrait=${stream.userId}`}
                alt="Creator"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-sm">Creator {stream.userId}</span>
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleteStreamMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {stream.isLive && (
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={handleEndStream}
                    disabled={endStreamMutation.isPending}
                  >
                    <StopCircle className="h-4 w-4 mr-1" />
                    End
                  </Button>
                )}
              </>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link href={`/stream/${stream.id}`}>
                {stream.isLive ? 'Join Stream' : 'View Details'}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
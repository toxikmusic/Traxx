import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Users } from "lucide-react";
import { Stream } from "@shared/schema";

interface StreamCardProps {
  stream: Stream;
  isOwner?: boolean;
}

export default function StreamCard({ stream, isOwner = false }: StreamCardProps) {
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
          <Button size="sm" variant="outline" asChild>
            <Link href={`/stream/${stream.id}`}>
              {stream.isLive ? 'Join Stream' : 'View Details'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Stream } from "@shared/schema";

interface StreamCardProps {
  stream: Stream;
}

export default function StreamCard({ stream }: StreamCardProps) {
  return (
    <div className="bg-dark-200 rounded-lg overflow-hidden group">
      <Link href={`/stream/${stream.id}`}>
        <div className="relative cursor-pointer">
          <img 
            src={stream.thumbnailUrl}
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
            {stream.viewerCount > 0 ? `${stream.viewerCount.toLocaleString()} viewers` : 'New'}
          </div>
        </div>
      </Link>
      
      <div className="p-3">
        <div className="flex space-x-2">
          <Link href={`/profile/${stream.userId}`}>
            <Avatar className="w-10 h-10 cursor-pointer">
              {/* In a real app, we'd have the user data here */}
              <AvatarImage src={`https://source.unsplash.com/random/${stream.userId}`} />
              <AvatarFallback>{stream.title[0]}</AvatarFallback>
            </Avatar>
          </Link>
          
          <div>
            <Link href={`/stream/${stream.id}`}>
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
      </div>
    </div>
  );
}

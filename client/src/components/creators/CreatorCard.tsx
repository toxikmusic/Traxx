import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface CreatorCardProps {
  creator: User;
  isFollowing?: boolean;
}

export default function CreatorCard({ creator, isFollowing = false }: CreatorCardProps) {
  const [following, setFollowing] = useState(isFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollowToggle = async () => {
    setIsLoading(true);
    try {
      if (following) {
        await apiRequest('DELETE', `/api/follows/${creator.id}`, undefined);
      } else {
        await apiRequest('POST', '/api/follows', { followedId: creator.id });
      }
      setFollowing(!following);
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-dark-200 rounded-lg overflow-hidden group hover:bg-dark-100 transition text-center p-4">
      <Link href={`/profile/${creator.username}`}>
        <Avatar className="w-20 h-20 mx-auto border-2 border-primary">
          <AvatarImage src={creator.profileImageUrl} />
          <AvatarFallback>{creator.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
      </Link>
      
      <Link href={`/profile/${creator.username}`}>
        <h3 className="font-medium mt-2 hover:text-primary">{creator.displayName}</h3>
      </Link>
      
      <p className="text-xs text-gray-400 mb-2">{creator.bio}</p>
      
      <div className="text-xs text-gray-400">
        <p>{creator.followerCount.toLocaleString()} followers</p>
      </div>
      
      <Button
        onClick={handleFollowToggle}
        disabled={isLoading}
        variant={following ? "outline" : "default"}
        className={`mt-3 w-full py-1 rounded-full text-sm font-medium ${
          following 
            ? 'bg-dark-100 hover:bg-dark-300' 
            : 'bg-primary hover:bg-primary/80'
        }`}
      >
        {following ? 'Following' : 'Follow'}
      </Button>
    </div>
  );
}

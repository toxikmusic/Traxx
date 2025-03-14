
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import LikeButton from "./LikeButton";

interface PostCardProps {
  post: {
    id: number;
    userId: number;
    title: string;
    content: string;
    imageUrl?: string;
    createdAt: string;
    likeCount: number;
    user?: {
      username: string;
      displayName: string;
      profileImageUrl?: string;
    }
  }
}

export default function PostCard({ post }: PostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  
  return (
    <Card className="p-4 mb-4">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={post.user?.profileImageUrl} />
          <AvatarFallback>{post.user?.displayName?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">{post.user?.displayName}</span>
              <span className="text-muted-foreground text-sm ml-2">{timeAgo}</span>
            </div>
            <LikeButton 
              contentId={post.id}
              contentType="post"
              initialLikeCount={post.likeCount}
              size="sm"
            />
          </div>
          <h3 className="text-lg font-semibold mt-2">{post.title}</h3>
          <p className="mt-2 text-muted-foreground">{post.content}</p>
          {post.imageUrl && (
            <img 
              src={post.imageUrl} 
              alt={post.title}
              className="mt-3 rounded-lg max-h-96 w-full object-cover" 
            />
          )}
        </div>
      </div>
    </Card>
  );
}

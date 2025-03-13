import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Post } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import ShareWidget from "@/components/social/ShareWidget";

interface PostCardProps {
  post: Post & { user?: { displayName: string; profileImageUrl: string | null } };
}

export default function PostCard({ post }: PostCardProps) {
  const formattedDate = post.createdAt ? format(new Date(post.createdAt), 'MMM d, yyyy') : '';
  
  return (
    <Card className="w-full mb-4 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={post.user?.profileImageUrl || ""} alt={post.user?.displayName || "User"} />
            <AvatarFallback>{post.user?.displayName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{post.user?.displayName || "User"}</div>
            <div className="text-sm text-muted-foreground">{formattedDate}</div>
          </div>
        </div>
        <CardTitle className="mt-2 text-xl">{post.title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-base text-card-foreground mb-4">
          {post.content}
        </div>
        
        {post.postType === "image" && post.imageUrl && (
          <div className="relative w-full h-64 overflow-hidden rounded-md">
            <img 
              src={post.imageUrl} 
              alt={post.title} 
              className="object-cover w-full h-full"
            />
          </div>
        )}
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-6 text-muted-foreground">
            <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Heart size={18} />
              <span>{post.likeCount}</span>
            </button>
            <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <MessageSquare size={18} />
              <span>{post.commentCount}</span>
            </button>
          </div>
          <ShareWidget
            title={post.title}
            description={post.content?.substring(0, 100) || ""}
            url={`/post/${post.id}`}
            type="post"
            compact={true}
          />
        </div>
      </CardFooter>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface LikeButtonProps {
  contentId: number;
  contentType: 'track' | 'post';
  initialLikeCount?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showCount?: boolean;
}

export default function LikeButton({ 
  contentId, 
  contentType, 
  initialLikeCount = 0, 
  size = 'md', 
  className = '',
  showCount = true
}: LikeButtonProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  // Size mappings
  const sizeMap = {
    sm: {
      buttonClass: 'h-8 px-2',
      iconSize: 16,
      fontSize: 'text-sm'
    },
    md: {
      buttonClass: 'h-9 px-3',
      iconSize: 18,
      fontSize: 'text-base'
    },
    lg: {
      buttonClass: 'h-10 px-4',
      iconSize: 20,
      fontSize: 'text-lg'
    }
  };

  // Check if the user has liked this content
  const { data: isLikedData } = useQuery({
    queryKey: [`/api/likes/check`, { userId: user?.id, contentId, contentType }],
    queryFn: async () => {
      if (!user) return { isLiked: false };

      const res = await apiRequest(
        'GET', 
        `/api/likes/check?userId=${user.id}&contentId=${contentId}&contentType=${contentType}`
      );
      return res.json();
    },
    enabled: !!user
  });

  // Get like count
  const { data: likeCountData } = useQuery({
    queryKey: [`/api/likes/count`, { contentId, contentType }],
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/likes/count/${contentType}/${contentId}`
      );
      return res.json();
    }
  });

  // Create like mutation
  const createLikeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in to like content');

      const res = await apiRequest('POST', '/api/likes', {
        userId: user.id,
        contentId,
        contentType
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/likes/check`] });
      queryClient.invalidateQueries({ queryKey: [`/api/likes/count`] });
      setLikeCount(prev => prev + 1);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to like content'
      });
    }
  });

  // Remove like mutation
  const removeLikeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in to unlike content');

      const res = await apiRequest('DELETE', '/api/likes', {
        userId: user.id,
        contentId,
        contentType
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/likes/check`] });
      queryClient.invalidateQueries({ queryKey: [`/api/likes/count`] });
      setLikeCount(prev => Math.max(0, prev - 1));
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to unlike content'
      });
    }
  });

  // Update like count when data changes
  useEffect(() => {
    if (likeCountData?.count !== undefined) {
      setLikeCount(likeCountData.count);
    }
  }, [likeCountData]);

  const isLiked = isLikedData?.isLiked || false;
  const isPending = createLikeMutation.isPending || removeLikeMutation.isPending;

  const handleLikeClick = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to like content',
        variant: 'default'
      });
      return;
    }

    if (isLiked) {
      removeLikeMutation.mutate();
    } else {
      createLikeMutation.mutate();
    }
  };

  return (
    <Button
      variant={isLiked ? "secondary" : "outline"}
      size="sm"
      className={cn(
        "gap-1 group transition-all", 
        sizeMap[size].buttonClass,
        isLiked && "bg-pink-100 hover:bg-pink-200 dark:bg-pink-900/30 dark:hover:bg-pink-900/50 text-pink-600 dark:text-pink-500 border-pink-200 dark:border-pink-900",
        className
      )}
      onClick={handleLikeClick}
      disabled={isPending}
    >
      {isLiked ? (
        <Heart 
          size={sizeMap[size].iconSize} 
          className="fill-pink-500 text-pink-500 mr-1"
        />
      ) : (
        <Heart 
          size={sizeMap[size].iconSize} 
          className="text-gray-500 dark:text-gray-400 group-hover:text-pink-500 mr-1"
        />
      )}
      {showCount && (
        <span className={cn(
          sizeMap[size].fontSize,
          isLiked ? "text-pink-600 dark:text-pink-500" : "text-gray-700 dark:text-gray-300"
        )}>
          {likeCount}
        </span>
      )}
    </Button>
  );
}
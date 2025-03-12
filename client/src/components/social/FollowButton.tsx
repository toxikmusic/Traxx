import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  userId: number;
  isFollowing?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'default' | 'outline' | 'subtle';
}

export default function FollowButton({
  userId,
  isFollowing: initialIsFollowing = false,
  size = 'md',
  className = '',
  variant = 'default'
}: FollowButtonProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);

  // Check if current user is following this user
  const { data: followCheckData } = useQuery({
    queryKey: [`/api/follows/check`, user?.id, userId],
    queryFn: async () => {
      if (!user) return { isFollowing: false };
      
      try {
        const res = await apiRequest('GET', `/api/follows/check?followerId=${user.id}&followedId=${userId}`, null);
        return res.json();
      } catch (error) {
        return { isFollowing: false };
      }
    },
    enabled: !!user && user.id !== userId
  });

  // Create follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in to follow users');
      
      const res = await apiRequest('POST', '/api/follows', null, {
        followerId: user.id,
        followedId: userId
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/follows/check`] });
      toast({
        title: 'Success',
        description: 'You are now following this user',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to follow user'
      });
    }
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in to unfollow users');
      
      // Since our API uses a DELETE endpoint with URL parameter
      const res = await apiRequest('DELETE', `/api/follows/${userId}`, null);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/follows/check`] });
      toast({
        title: 'Success',
        description: 'You have unfollowed this user',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to unfollow user'
      });
    }
  });

  // Update following state when data changes
  useEffect(() => {
    if (followCheckData?.isFollowing !== undefined) {
      setIsFollowing(followCheckData.isFollowing);
    }
  }, [followCheckData]);

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  const handleClick = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to follow users',
        variant: 'default'
      });
      return;
    }
    
    if (user.id === userId) {
      toast({
        title: 'Action not allowed',
        description: 'You cannot follow yourself',
        variant: 'default'
      });
      return;
    }
    
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  // Size mappings
  const sizeClass = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  // Variant styles
  const getVariantClass = () => {
    if (isFollowing) {
      // For when already following
      switch (variant) {
        case 'outline':
          return 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800';
        case 'subtle':
          return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700';
        default:
          return 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600';
      }
    } else {
      // For when not following
      switch (variant) {
        case 'outline':
          return 'bg-transparent border-purple-500 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20';
        case 'subtle':
          return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30';
        default:
          return 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600';
      }
    }
  };

  return (
    <Button
      type="button"
      className={cn(
        "font-medium rounded-full transition-colors", 
        sizeClass[size], 
        getVariantClass(),
        className
      )}
      onClick={handleClick}
      disabled={isPending || user?.id === userId}
    >
      {isFollowing ? (
        <>
          <UserMinus className="mr-1 h-4 w-4" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="mr-1 h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
}
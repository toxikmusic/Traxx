import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Trash2, Reply, Edit, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import LikeButton from '@/components/social/LikeButton';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Comment } from '@shared/schema'; // Import the Comment type
import { format } from 'date-fns';

// Define the form schema
const commentSchema = z.object({
  text: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment is too long (max 500 characters)')
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentSectionProps {
  contentId: number;
  contentType: 'track' | 'post';
}

interface CommentItemProps {
  comment: Comment;
  currentUserId?: number;
  onReply: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  onEdit: (commentId: number, text: string) => void;
  username?: string; // Add username separately
}

function CommentItem({ comment, currentUserId, onReply, onDelete, onEdit, username }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const isOwnComment = currentUserId === comment.userId;
  const [displayName, setDisplayName] = useState<string>("User");
  
  // Fetch user info for the comment
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${comment.userId}`);
        if (response.ok) {
          const userData = await response.json();
          setDisplayName(userData.displayName || userData.username);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    
    fetchUser();
  }, [comment.userId]);
  
  const handleSaveEdit = () => {
    if (editText.trim() !== comment.text) {
      onEdit(comment.id, editText);
    }
    setIsEditing(false);
  };
  
  return (
    <Card className="mb-3">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{displayName}</p>
                <p className="text-xs text-gray-500">
                  {comment.createdAt && format(new Date(comment.createdAt), 'MMM d, yyyy • h:mm a')}
                  {comment.updatedAt !== comment.createdAt && ' (edited)'}
                </p>
              </div>
              
              {isOwnComment && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(comment.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {isEditing ? (
              <div className="mt-2">
                <Textarea 
                  value={editText} 
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm">{comment.text}</p>
            )}
            
            <div className="flex items-center gap-3 mt-2">
              <LikeButton 
                contentId={comment.id} 
                contentType="comment" 
                initialLikeCount={comment.likeCount || 0} 
                size="sm"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs flex items-center" 
                onClick={() => onReply(comment.id)}
              >
                <Reply className="mr-1 h-4 w-4" />
                Reply
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CommentSection({ contentId, contentType }: CommentSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  // Form for adding comments
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      text: ''
    }
  });

  // Query to get comments for this content
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: [`/api/comments`, contentType, contentId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/comments/${contentType}/${contentId}`, null);
      return res.json();
    }
  });

  // Mutation to add a comment
  const addCommentMutation = useMutation({
    mutationFn: async (data: CommentFormValues) => {
      if (!user) throw new Error('You must be logged in to comment');
      
      const commentData = {
        userId: user.id,
        contentId,
        contentType,
        text: data.text,
        parentId: replyingTo
      };
      
      const res = await apiRequest('POST', '/api/comments', null, commentData);
      return res.json();
    },
    onSuccess: () => {
      form.reset();
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: [`/api/comments`] });
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to post comment'
      });
    }
  });

  // Mutation to edit a comment
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, text }: { commentId: number, text: string }) => {
      const res = await apiRequest('PUT', `/api/comments/${commentId}`, null, { text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/comments`] });
      toast({
        title: 'Comment updated',
        description: 'Your comment has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update comment'
      });
    }
  });

  // Mutation to delete a comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return await apiRequest('DELETE', `/api/comments/${commentId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/comments`] });
      toast({
        title: 'Comment deleted',
        description: 'Your comment has been deleted',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete comment'
      });
    }
  });

  const onSubmit = (data: CommentFormValues) => {
    addCommentMutation.mutate(data);
  };

  const handleReply = (commentId: number) => {
    setReplyingTo(commentId);
    form.setFocus('text');
  };

  const handleEdit = (commentId: number, text: string) => {
    editCommentMutation.mutate({ commentId, text });
  };

  const handleDelete = (commentId: number) => {
    deleteCommentMutation.mutate(commentId);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Comments ({comments.length})</h3>
      
      {user ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mb-6">
            {replyingTo && (
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-t-md text-sm flex justify-between items-center">
                <span>
                  Replying to comment #{replyingTo}
                </span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={cancelReply}
                >
                  Cancel
                </Button>
              </div>
            )}
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Add a comment..." 
                      className={`min-h-[100px] ${replyingTo ? 'rounded-t-none' : ''}`}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end mt-2">
              <Button 
                type="submit" 
                disabled={addCommentMutation.isPending || !form.formState.isValid}
              >
                {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md mb-6">
          <p className="text-center">Please log in to post comments</p>
        </div>
      )}
      
      <Separator className="my-4" />
      
      {isLoading ? (
        <div className="text-center p-4">Loading comments...</div>
      ) : comments.length > 0 ? (
        <div>
          {comments.map((comment: Comment) => (
            <CommentItem 
              key={comment.id} 
              comment={comment}
              currentUserId={user?.id}
              onReply={handleReply}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="text-center p-4 text-gray-500">No comments yet. Be the first to comment!</div>
      )}
    </div>
  );
}
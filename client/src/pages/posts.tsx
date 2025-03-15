import { useQuery } from "@tanstack/react-query";
import PostCard from "@/components/posts/PostCard";
import { Post, User } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { getPosts } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function PostsPage() {
  const { toast } = useToast();
  
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['/api/posts/recent'],
    queryFn: () => getPosts(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load posts",
      variant: "destructive",
    });
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-destructive">Failed to load posts</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-6 px-4 md:px-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
        Community Posts
      </h1>
      
      <Tabs defaultValue="all" className="mb-8">
        <TabsList>
          <TabsTrigger value="all">All Posts</TabsTrigger>
          <TabsTrigger value="image">Images</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 gap-6">
            {posts?.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="image" className="mt-4">
          <div className="grid grid-cols-1 gap-6">
            {posts?.filter(post => post.postType === "image").map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="text" className="mt-4">
          <div className="grid grid-cols-1 gap-6">
            {posts?.filter(post => post.postType === "text").map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
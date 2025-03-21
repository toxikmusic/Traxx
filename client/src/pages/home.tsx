import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import AudioPlayer from "@/components/layout/AudioPlayer";
import StreamCard from "@/components/streams/StreamCard";
import TrackCard from "@/components/tracks/TrackCard";
import CreatorCard from "@/components/creators/CreatorCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Stream, Track, User, Post } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import PostCard from "@/components/posts/PostCard";
import { getFeaturedStreams, getRecentTracks, getRecommendedCreators } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MusicIcon, RadioIcon, Pencil } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  // Fetch featured streams
  const { data: featuredStreams, isLoading: streamsLoading } = useQuery<Stream[]>({
    queryKey: ['/api/streams/featured'],
    queryFn: getFeaturedStreams
  });

  // Fetch recent tracks
  const { data: recentTracks, isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: ['/api/tracks/recent'],
    queryFn: getRecentTracks
  });

  // Fetch recommended creators
  const { data: recommendedCreators, isLoading: creatorsLoading } = useQuery<User[]>({
    queryKey: ['/api/creators/recommended'],
    queryFn: getRecommendedCreators
  });

  // Fetch posts by current user
  const { data: userPosts, isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['/api/posts/user', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch(`/api/posts/user/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
    enabled: !!user
  });

  // Fetch tracks by current user
  const { data: userTracks, isLoading: userTracksLoading } = useQuery<Track[]>({
    queryKey: ['/api/tracks/user', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch(`/api/tracks/user/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch tracks');
      return response.json();
    },
    enabled: !!user
  });

  return (
    <div className="flex flex-col min-h-screen bg-dark-300 text-white">
      <Header />
      
      <main className="flex flex-1 pt-14 md:pt-16">
        <Sidebar />
        
        <div className="flex-1 md:ml-60 pb-20 md:pb-24">
          <div className="max-w-7xl mx-auto px-4 py-5">
            {/* Your Content Section (if user is logged in) */}
            {user && (
              <section className="mb-10 bg-dark-200 rounded-lg p-6 border-l-4 border-primary">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary">Your Creative Space</h2>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/upload-track">
                      <Button variant="outline" size="sm" className="flex items-center gap-2 border-primary text-primary hover:bg-primary/10">
                        <MusicIcon size={16} className="themed-icon" />
                        <span>Upload Track</span>
                      </Button>
                    </Link>
                    <Link href="/go-live">
                      <Button variant="outline" size="sm" className="flex items-center gap-2 border-primary text-primary hover:bg-primary/10">
                        <RadioIcon size={16} className="themed-icon" />
                        <span>Go Live</span>
                      </Button>
                    </Link>
                    <Link href="/posts/new">
                      <Button variant="outline" size="sm" className="flex items-center gap-2 border-primary text-primary hover:bg-primary/10">
                        <Pencil size={16} className="themed-icon" />
                        <span>Create Post</span>
                      </Button>
                    </Link>
                  </div>
                </div>
                
                {/* User's Tracks */}
                {userTracks && userTracks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-primary">
                      <span className="border-b-2 border-primary pb-1">Your Tracks</span>
                    </h3>
                    <div className="space-y-3">
                      {userTracksLoading ? (
                        <Skeleton className="h-20 w-full" />
                      ) : (
                        userTracks.map(track => (
                          <TrackCard key={track.id} track={track} showBadge={true} />
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {/* User's Posts */}
                {userPosts && userPosts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">
                      <span className="border-b-2 border-primary pb-1">Your Posts</span>
                    </h3>
                    <div className="space-y-4">
                      {postsLoading ? (
                        <Skeleton className="h-32 w-full" />
                      ) : (
                        userPosts.map(post => (
                          <PostCard key={post.id} post={{...post, user: {
                            displayName: user.displayName,
                            profileImageUrl: user.profileImageUrl
                          }}} />
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {/* Empty State */}
                {(!userTracks || userTracks.length === 0) && (!userPosts || userPosts.length === 0) && (
                  <div className="text-center py-10">
                    <h3 className="text-xl font-medium mb-2 text-primary">Share your music with the world</h3>
                    <p className="text-gray-400 mb-4">Upload tracks, go live, or create posts to get started</p>
                    <div className="flex justify-center space-x-3">
                      <Link href="/upload-track">
                        <Button className="flex items-center gap-2 bg-primary hover:bg-primary/80">
                          <MusicIcon size={16} />
                          <span>Upload Your First Track</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </section>
            )}
            
            {/* Featured streams section */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold border-l-4 border-primary pl-3">Featured Live Streams</h2>
                <Link href="/streams" className="text-sm text-primary hover:underline hover-effect">
                  See All
                </Link>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {streamsLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="bg-dark-200 rounded-lg overflow-hidden">
                      <Skeleton className="w-full h-40" />
                      <div className="p-3 flex space-x-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                          <div className="flex space-x-2">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : featuredStreams && featuredStreams.length > 0 ? (
                  featuredStreams.map((stream: Stream) => (
                    <StreamCard key={stream.id} stream={stream} />
                  ))
                ) : (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-10 bg-dark-200 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">No live streams right now</h3>
                    <p className="text-gray-400">Check back later or start streaming yourself</p>
                  </div>
                )}
              </div>
            </section>
            
            {/* Recent tracks section */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold border-l-4 border-primary pl-3">Recent Uploads</h2>
                <Link href="/tracks" className="text-sm text-primary hover:underline hover-effect">
                  See All
                </Link>
              </div>
              
              <div className="space-y-3">
                {tracksLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-dark-200 p-3 rounded-lg">
                      <div className="flex space-x-3">
                        <Skeleton className="w-16 h-16 rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between">
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                            <div className="space-y-2">
                              <Skeleton className="h-3 w-8" />
                              <div className="flex space-x-3">
                                <Skeleton className="h-3 w-10" />
                                <Skeleton className="h-3 w-10" />
                              </div>
                            </div>
                          </div>
                          <Skeleton className="h-1.5 w-full rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : recentTracks && recentTracks.length > 0 ? (
                  recentTracks.map((track: Track) => (
                    <TrackCard key={track.id} track={track} />
                  ))
                ) : (
                  <div className="text-center py-10 bg-dark-200 rounded-lg border border-dark-100">
                    <h3 className="text-lg font-medium mb-2">No tracks uploaded yet</h3>
                    <p className="text-gray-400 mb-4">Be the first to share your music</p>
                    <Link href="/upload-track">
                      <Button className="bg-primary hover:bg-primary/80">Upload Track</Button>
                    </Link>
                  </div>
                )}
              </div>
            </section>
            
            {/* Discover creators section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold border-l-4 border-primary pl-3">Discover Creators</h2>
                <Link href="/discover" className="text-sm text-primary hover:underline hover-effect">
                  See All
                </Link>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {creatorsLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="bg-dark-200 rounded-lg overflow-hidden p-4 text-center">
                      <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                      <Skeleton className="h-4 w-24 mx-auto mt-2" />
                      <Skeleton className="h-3 w-16 mx-auto mt-1" />
                      <Skeleton className="h-3 w-20 mx-auto mt-2" />
                      <Skeleton className="h-8 w-full rounded-full mt-3" />
                    </div>
                  ))
                ) : recommendedCreators && recommendedCreators.length > 0 ? (
                  recommendedCreators.map((creator: User) => (
                    <CreatorCard 
                      key={creator.id} 
                      creator={creator} 
                      isFollowing={false}
                    />
                  ))
                ) : (
                  <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 text-center py-10 bg-dark-200 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">No recommended creators yet</h3>
                    <p className="text-gray-400">Check back soon for personalized recommendations</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <AudioPlayer />
      <MobileNavigation />
    </div>
  );
}

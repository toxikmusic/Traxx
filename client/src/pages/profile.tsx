import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import AudioPlayer from "@/components/layout/AudioPlayer";
import StreamCard from "@/components/streams/StreamCard";
import TrackCard from "@/components/tracks/TrackCard";
import { User, Stream, Track } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:username");
  const username = params?.username;
  const [isFollowing, setIsFollowing] = useState(false);
  const { user: currentUser } = useAuth();

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/users/by-username/${username}`],
    enabled: !!username,
  });

  // Fetch user's streams
  const { data: streams, isLoading: streamsLoading } = useQuery<Stream[]>({
    queryKey: [`/api/streams/user/${user?.id}`],
    enabled: !!user,
  });

  // Fetch user's tracks
  const { data: tracks, isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: [`/api/tracks/user/${user?.id}`],
    enabled: !!user,
  });

  // Default state for loading or when data isn't available yet
  const displayedUser = user || {
    id: 0,
    username: "",
    password: "",
    displayName: "Loading...",
    bio: "Loading profile information...",
    profileImageUrl: "", // This is a string, not null
    isStreaming: false,
    followerCount: 0,
    createdAt: new Date()
  };
  const displayedStreams = streams || [];
  const displayedTracks = tracks || [];
  
  // Check if current user is viewing their own profile
  const isOwnProfile = currentUser?.id === user?.id;

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  return (
    <div className="flex flex-col min-h-screen bg-dark-300 text-white">
      <Header />
      
      <main className="flex flex-1 pt-14 md:pt-16">
        <Sidebar />
        
        <div className="flex-1 md:ml-60 pb-20 md:pb-24">
          <div className="max-w-7xl mx-auto px-4 py-5">
            {/* Profile header */}
            <div className="mb-8">
              {userLoading ? (
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                  <Skeleton className="w-32 h-32 rounded-full" />
                  <div className="space-y-2 text-center sm:text-left">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full max-w-md" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                  <Avatar className="w-32 h-32 border-2 border-primary">
                    <AvatarImage src={displayedUser.profileImageUrl} />
                    <AvatarFallback>{displayedUser.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                      <h1 className="text-2xl font-bold">{displayedUser.displayName}</h1>
                      {displayedUser.isStreaming && (
                        <Badge className="bg-[#00b074] hover:bg-[#00b074]/80 mt-1 sm:mt-0 self-center">
                          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse mr-1.5"></span>
                          LIVE NOW
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-400 mt-1">@{displayedUser.username} • {displayedUser.followerCount.toLocaleString()} followers</p>
                    <p className="text-gray-300 mt-2 max-w-md">{displayedUser.bio}</p>
                    
                    <Button 
                      onClick={toggleFollow}
                      variant={isFollowing ? "outline" : "default"}
                      className={`mt-4 ${isFollowing ? 'bg-dark-100 hover:bg-dark-300' : 'bg-primary hover:bg-primary/80'}`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Content tabs */}
            <Tabs defaultValue="streams" className="w-full">
              <TabsList className="w-full bg-dark-200 mb-4">
                <TabsTrigger value="streams" className="flex-1">Streams</TabsTrigger>
                <TabsTrigger value="tracks" className="flex-1">Music</TabsTrigger>
                <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
              </TabsList>
              
              <TabsContent value="streams">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {streamsLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="bg-dark-200 rounded-lg overflow-hidden">
                        <Skeleton className="w-full h-40" />
                        <div className="p-3">
                          <Skeleton className="h-5 w-3/4 mb-2" />
                          <div className="flex space-x-2">
                            <Skeleton className="h-5 w-12" />
                            <Skeleton className="h-5 w-16" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : displayedStreams.length > 0 ? (
                    displayedStreams.map(stream => (
                      <StreamCard 
                        key={stream.id} 
                        stream={stream} 
                        isOwner={isOwnProfile} 
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-gray-400">No streams yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="tracks">
                <div className="space-y-3">
                  {tracksLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="bg-dark-200 p-3 rounded-lg">
                        <div className="flex space-x-3">
                          <Skeleton className="w-16 h-16 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-1.5 w-full rounded-full" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : displayedTracks.length > 0 ? (
                    displayedTracks.map(track => (
                      <TrackCard key={track.id} track={track} />
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <p className="text-gray-400">No tracks yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="about">
                <div className="bg-dark-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-3">About {displayedUser.displayName}</h3>
                  <p className="text-gray-300 mb-6">{displayedUser.bio}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Account Info</h4>
                      <p className="text-sm mb-1"><span className="text-gray-400">Member since:</span> {new Date(displayedUser.createdAt).toLocaleDateString()}</p>
                      <p className="text-sm"><span className="text-gray-400">Username:</span> @{displayedUser.username}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Stats</h4>
                      <p className="text-sm mb-1"><span className="text-gray-400">Followers:</span> {displayedUser.followerCount.toLocaleString()}</p>
                      <p className="text-sm mb-1"><span className="text-gray-400">Tracks:</span> {displayedTracks.length}</p>
                      <p className="text-sm"><span className="text-gray-400">Streams:</span> {displayedStreams.length}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      <AudioPlayer />
      <MobileNavigation />
    </div>
  );
}

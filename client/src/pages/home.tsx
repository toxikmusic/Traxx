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
import { Stream, Track, User } from "@shared/schema";

export default function Home() {
  // Fetch featured streams
  const { data: featuredStreams, isLoading: streamsLoading } = useQuery<Stream[]>({
    queryKey: ['/api/streams/featured'],
    enabled: false, // We'll simulate with mock data for now
  });

  // Fetch recent tracks
  const { data: recentTracks, isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: ['/api/tracks/recent'],
    enabled: false, // We'll simulate with mock data for now
  });

  // Fetch recommended creators
  const { data: creators, isLoading: creatorsLoading } = useQuery<User[]>({
    queryKey: ['/api/creators/recommended'],
    enabled: false, // We'll simulate with mock data for now
  });

  // Mock data for initial render
  const mockStreams: Stream[] = [
    {
      id: 1,
      userId: 101,
      title: "Deep House Vibes",
      description: "Late night deep house session",
      thumbnailUrl: "https://images.unsplash.com/photo-1516873240891-4bf014598ab4?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=340&q=80",
      isLive: true,
      viewerCount: 1200,
      startedAt: new Date(),
      category: "House",
      tags: ["House", "Electronic"]
    },
    {
      id: 2,
      userId: 102,
      title: "Beat Making 101",
      description: "Learn how to make beats from scratch",
      thumbnailUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=340&q=80",
      isLive: true,
      viewerCount: 856,
      startedAt: new Date(),
      category: "Tutorial",
      tags: ["Hip Hop", "Tutorial"]
    },
    {
      id: 3,
      userId: 103,
      title: "Lofi & Chill",
      description: "Relaxing beats to study/chill to",
      thumbnailUrl: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=340&q=80",
      isLive: true,
      viewerCount: 3400,
      startedAt: new Date(),
      category: "Lo-Fi",
      tags: ["Lo-Fi", "Chill"]
    }
  ];

  const mockTracks: Track[] = [
    {
      id: 1,
      userId: 101,
      title: "Midnight Drive",
      artistName: "Synthwave Express",
      coverUrl: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1b8de8c112.mp3?filename=floating-abstract-142819.mp3",
      duration: 222,
      playCount: 1200,
      likeCount: 342,
      uploadedAt: new Date(),
      genre: "Synthwave"
    },
    {
      id: 2,
      userId: 102,
      title: "Deep Blue",
      artistName: "Ocean Waves",
      coverUrl: "https://images.unsplash.com/photo-1496293455970-f8581aae0e3b?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b0939c8.mp3?filename=chill-out-12624.mp3",
      duration: 258,
      playCount: 2500,
      likeCount: 645,
      uploadedAt: new Date(),
      genre: "Ambient"
    },
    {
      id: 3,
      userId: 103,
      title: "Urban Soul",
      artistName: "City Beats",
      coverUrl: "https://images.unsplash.com/photo-1560800452-f2d475982b96?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/16/audio_1333dfb36d.mp3?filename=lofi-study-112191.mp3",
      duration: 185,
      playCount: 968,
      likeCount: 217,
      uploadedAt: new Date(),
      genre: "Lo-Fi"
    },
    {
      id: 4,
      userId: 104,
      title: "Forest Dreams",
      artistName: "Ambient Collective",
      coverUrl: "https://images.unsplash.com/photo-1446057032654-9d8885db76c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
      audioUrl: "https://cdn.pixabay.com/download/audio/2021/11/25/audio_f8eb536e68.mp3?filename=ambient-piano-amp-strings-10711.mp3",
      duration: 322,
      playCount: 3100,
      likeCount: 789,
      uploadedAt: new Date(),
      genre: "Ambient"
    }
  ];

  const mockCreators: User[] = [
    {
      id: 101,
      username: "marcuslee",
      password: "",
      displayName: "Marcus Lee",
      bio: "EDM Producer",
      profileImageUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
      isStreaming: false,
      followerCount: 23000,
      createdAt: new Date()
    },
    {
      id: 102,
      username: "sophiachen",
      password: "",
      displayName: "Sophia Chen",
      bio: "Lo-Fi Artist",
      profileImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
      isStreaming: false,
      followerCount: 12000,
      createdAt: new Date()
    },
    {
      id: 103,
      username: "jameswilson",
      password: "",
      displayName: "James Wilson",
      bio: "House DJ",
      profileImageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
      isStreaming: false,
      followerCount: 45000,
      createdAt: new Date()
    },
    {
      id: 104,
      username: "tanyarodriguez",
      password: "",
      displayName: "Tanya Rodriguez",
      bio: "Trap Producer",
      profileImageUrl: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
      isStreaming: false,
      followerCount: 19000,
      createdAt: new Date()
    },
    {
      id: 105,
      username: "aishajohnson",
      password: "",
      displayName: "Aisha Johnson",
      bio: "Soul Vocalist",
      profileImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
      isStreaming: false,
      followerCount: 31000,
      createdAt: new Date()
    }
  ];

  const streams = featuredStreams || mockStreams;
  const tracks = recentTracks || mockTracks;
  const recommendedCreators = creators || mockCreators;

  return (
    <div className="flex flex-col min-h-screen bg-dark-300 text-white">
      <Header />
      
      <main className="flex flex-1 pt-14 md:pt-16">
        <Sidebar />
        
        <div className="flex-1 md:ml-60 pb-20 md:pb-24">
          <div className="max-w-7xl mx-auto px-4 py-5">
            {/* Featured streams section */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Featured Live Streams</h2>
                <Link href="/streams" className="text-sm text-primary hover:underline">
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
                ) : (
                  streams.map(stream => (
                    <StreamCard key={stream.id} stream={stream} />
                  ))
                )}
              </div>
            </section>
            
            {/* Recent tracks section */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Recent Uploads</h2>
                <Link href="/tracks" className="text-sm text-primary hover:underline">
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
                ) : (
                  tracks.map(track => (
                    <TrackCard key={track.id} track={track} />
                  ))
                )}
              </div>
            </section>
            
            {/* Discover creators section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Discover Creators</h2>
                <Link href="/creators">
                  <a className="text-sm text-primary hover:underline">See All</a>
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
                ) : (
                  recommendedCreators.map(creator => (
                    <CreatorCard 
                      key={creator.id} 
                      creator={creator} 
                      isFollowing={creator.id === 102 || creator.id === 105}
                    />
                  ))
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

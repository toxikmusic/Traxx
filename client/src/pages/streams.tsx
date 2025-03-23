import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import AudioPlayer from "@/components/layout/AudioPlayer";
import StreamCard from "@/components/streams/StreamCard";
import { useAuth } from "@/hooks/use-auth";

import { getFeaturedStreams, getRecentTracks, getStreamsByUser } from "@/lib/api";
import { Stream, Track } from "@shared/schema";
import { ExternalLink, PlaySquare, Music, Users, Radio } from "lucide-react";

// Recording Card Component (using Track as placeholder for now)
interface RecordingCardProps {
  recording: Track;
}

function RecordingCard({ recording }: RecordingCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-0">
        <div className="aspect-video relative bg-primary/10">
          <img
            src={recording.coverUrl || `https://source.unsplash.com/random/600x340?music=${recording.id}`}
            alt={recording.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white">
              <PlaySquare className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <Link href={`/track/${recording.id}`}>
          <h3 className="font-medium text-lg hover:text-primary truncate">{recording.title}</h3>
        </Link>
        <div className="flex justify-between mt-2 items-center">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full overflow-hidden bg-primary/10">
              <img
                src={`https://source.unsplash.com/random/50x50?portrait=${recording.userId}`}
                alt="User"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-sm">{recording.artistName || `Creator ${recording.userId}`}</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Music className="h-3 w-3 mr-1" />
            {recording.playCount || 0} plays
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StreamsPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("live");
  const { user } = useAuth();

  // Fetch featured/active streams
  const { data: streams, isLoading: isLoadingStreams } = useQuery({
    queryKey: ["/api/streams/featured"],
    queryFn: getFeaturedStreams
  });

  // Fetch past recordings (using tracks as placeholder)
  const { data: recordings, isLoading: isLoadingRecordings } = useQuery({
    queryKey: ["/api/tracks/recent"],
    queryFn: getRecentTracks
  });
  
  // Fetch user's streams if authenticated
  const { data: myStreams, isLoading: isLoadingMyStreams } = useQuery({
    queryKey: ["/api/streams/user", user?.id],
    queryFn: () => user ? getStreamsByUser(user.id) : Promise.resolve([]),
    enabled: !!user
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-4 pt-16 pb-20 md:pb-10 lg:pl-72">
          <div className="container max-w-6xl mx-auto pt-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Streams</h1>
              <Button asChild>
                <Link href="/go-live">
                  <Radio className="mr-2 h-4 w-4" />
                  Go Live
                </Link>
              </Button>
            </div>
            
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-6">
                <TabsTrigger value="live">Live Streams</TabsTrigger>
                <TabsTrigger value="recordings">Recordings</TabsTrigger>
                {user && <TabsTrigger value="my-streams">My Streams</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="live" className="mt-4">
                {isLoadingStreams ? (
                  <div className="flex justify-center py-12">
                    <Spinner size="lg" />
                  </div>
                ) : streams && streams.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {streams.map((stream) => (
                      <StreamCard key={stream.id} stream={stream} />
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground mb-4">No live streams available right now.</p>
                      <Button asChild>
                        <Link href="/go-live">Start Streaming</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="recordings" className="mt-4">
                {isLoadingRecordings ? (
                  <div className="flex justify-center py-12">
                    <Spinner size="lg" />
                  </div>
                ) : recordings && recordings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {recordings.map((recording) => (
                      <RecordingCard key={recording.id} recording={recording} />
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground mb-4">No recordings available yet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {user && (
                <TabsContent value="my-streams" className="mt-4">
                  {isLoadingMyStreams ? (
                    <div className="flex justify-center py-12">
                      <Spinner size="lg" />
                    </div>
                  ) : myStreams && myStreams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {myStreams.map((stream) => (
                        <StreamCard key={stream.id} stream={stream} isOwner />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">You haven't created any streams yet.</p>
                        <Button asChild>
                          <Link href="/go-live">Start Your First Stream</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
            </Tabs>
            
            {/* Featured Creators section removed to eliminate placeholder content */}
          </div>
        </main>
      </div>
      <MobileNavigation />
      <AudioPlayer />
    </div>
  );
}
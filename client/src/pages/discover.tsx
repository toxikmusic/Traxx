import { useState } from 'react';
import { Link } from 'wouter';
import { Search, Headphones, Users, Radio } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import AudioPlayer from '@/components/layout/AudioPlayer';
import StreamCard from '@/components/streams/StreamCard';
import TrackCard from '@/components/tracks/TrackCard';
import CreatorCard from '@/components/creators/CreatorCard';

import { getFeaturedStreams, getRecentTracks, getRecommendedCreators } from '@/lib/api';
import { Stream, Track, User } from '@shared/schema';

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('creators');

  const { data: streams, isLoading: isLoadingStreams } = useQuery({
    queryKey: ['/api/streams/featured'],
    queryFn: getFeaturedStreams
  });

  const { data: tracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ['/api/tracks/recent'],
    queryFn: getRecentTracks
  });
  
  const { data: creators, isLoading: isLoadingCreators } = useQuery({
    queryKey: ['/api/creators/recommended'],
    queryFn: getRecommendedCreators
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-4 pt-16 pb-20 md:pb-10 lg:pl-72">
          <div className="container max-w-6xl mx-auto pt-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-6">Discover</h1>
              
              <div className="relative mb-6">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for artists, tracks, or genres"
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="creators">Creators</TabsTrigger>
                  <TabsTrigger value="streams">Live Streams</TabsTrigger>
                  <TabsTrigger value="tracks">Tracks</TabsTrigger>
                </TabsList>
                
                <TabsContent value="creators" className="mt-6">
                  {isLoadingCreators ? (
                    <div className="flex justify-center py-12">
                      <Spinner size="lg" />
                    </div>
                  ) : creators && creators.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {creators.map((creator) => (
                        <CreatorCard key={creator.id} creator={creator} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground">No creators found.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="streams" className="mt-6">
                  {isLoadingStreams ? (
                    <div className="flex justify-center py-12">
                      <Spinner size="lg" />
                    </div>
                  ) : streams && streams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {streams.map((stream) => (
                        <StreamCard key={stream.id} stream={stream} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground">No live streams found.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="tracks" className="mt-6">
                  {isLoadingTracks ? (
                    <div className="flex justify-center py-12">
                      <Spinner size="lg" />
                    </div>
                  ) : tracks && tracks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tracks.map((track) => (
                        <TrackCard key={track.id} track={track} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground">No tracks found.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            
            <Separator className="my-8" />
            
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Trending Genres</h2>
                <Link href="/genres" className="text-primary hover:underline">
                  See all
                </Link>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'Electronic', icon: <Radio className="h-5 w-5 mb-2" /> },
                  { name: 'Hip-Hop', icon: <Headphones className="h-5 w-5 mb-2" /> },
                  { name: 'Rock', icon: <Radio className="h-5 w-5 mb-2" /> },
                  { name: 'Jazz', icon: <Headphones className="h-5 w-5 mb-2" /> }
                ].map((genre) => (
                  <Card key={genre.name} className="overflow-hidden hover:shadow-md transition-shadow border-primary/10">
                    <CardContent className="p-0">
                      <Link href={`/genre/${genre.name.toLowerCase()}`} className="block p-6 text-center hover:bg-primary/5 transition-colors">
                        <div className="flex flex-col items-center">
                          {genre.icon}
                          <h3 className="font-medium text-lg">{genre.name}</h3>
                          <Badge variant="outline" className="mt-2">Trending</Badge>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
            
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Weekly Top Picks</h2>
                <Link href="/top-picks" className="text-primary hover:underline">
                  See all
                </Link>
              </div>
              
              {isLoadingTracks ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : tracks && tracks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tracks.slice(0, 2).map((track) => (
                    <TrackCard key={track.id} track={track} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">No top picks available.</p>
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        </main>
      </div>
      <MobileNavigation />
      <AudioPlayer />
    </div>
  );
}
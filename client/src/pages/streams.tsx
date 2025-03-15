import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Stream } from "@shared/schema";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import AudioPlayer from "@/components/layout/AudioPlayer";
import StreamCard from "@/components/streams/StreamCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

export default function StreamsPage() {
  // Fetch featured streams
  const { data: streams, isLoading } = useQuery<Stream[]>({
    queryKey: ['/api/streams/featured'],
  });

  return (
    <div className="flex flex-col min-h-screen bg-dark-300 text-white">
      <Header />

      <main className="flex flex-1 pt-14 md:pt-16">
        <Sidebar />

        <div className="flex-1 md:ml-60 pb-20 md:pb-24">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Live Streams</h1>
              <Link href="/go-live">
                <Button className="bg-primary hover:bg-primary/80">
                  <Plus size={18} className="mr-2" />
                  Go Live
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex flex-col">
                    <Skeleton className="w-full aspect-video rounded-lg" />
                    <div className="mt-2 space-y-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : streams && streams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {streams.map((stream) => (
                  <StreamCard key={stream.id} stream={stream} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <h2 className="text-xl font-semibold mb-2">No Live Streams</h2>
                <p className="text-gray-400 mb-6">
                  There are no active streams right now. Be the first to go live!
                </p>
                <Link href="/go-live">
                  <Button className="bg-primary hover:bg-primary/80">
                    <Plus size={18} className="mr-2" />
                    Start Streaming
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <AudioPlayer />
      <MobileNavigation />
    </div>
  );
}
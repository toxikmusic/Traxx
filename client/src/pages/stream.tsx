import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import AudioPlayer from "@/components/layout/AudioPlayer";
import { Stream, User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type ChatMessage = {
  id: number;
  userId: number;
  username: string;
  message: string;
  timestamp: Date;
};

export default function StreamPage() {
  const [, params] = useRoute("/stream/:id");
  const streamId = params?.id ? parseInt(params.id) : undefined;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch stream data
  const { data: stream, isLoading: streamLoading } = useQuery<Stream>({
    queryKey: [`/api/streams/${streamId}`],
    enabled: !!streamId,
  });

  // Fetch streamer data
  const { data: streamer, isLoading: streamerLoading } = useQuery<User>({
    queryKey: [`/api/users/${stream?.userId}`],
    enabled: !!stream,
  });

  // Mock stream data for initial render
  const mockStream: Stream = {
    id: 1,
    userId: 101,
    title: "Deep House Vibes",
    description: "Late night deep house session with all the good vibes. Join us for some relaxing beats and chat!",
    thumbnailUrl: "https://images.unsplash.com/photo-1516873240891-4bf014598ab4?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=340&q=80",
    isLive: true,
    viewerCount: 1256,
    startedAt: new Date(),
    category: "House",
    tags: ["House", "Electronic", "Deep House"]
  };

  // Mock streamer data for initial render
  const mockStreamer: User = {
    id: 101,
    username: "djez",
    password: "",
    displayName: "DJ EZ",
    bio: "House music producer and DJ based in London",
    profileImageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-1.2.1&auto=format&fit=crop&w=40&h=40&q=80",
    isStreaming: true,
    followerCount: 45600,
    createdAt: new Date()
  };

  // Mock chat messages
  const mockChatMessages: ChatMessage[] = [
    { id: 1, userId: 201, username: "musicLover42", message: "This beat is fire! 🔥", timestamp: new Date(Date.now() - 180000) },
    { id: 2, userId: 202, username: "beatMaster", message: "What gear are you using?", timestamp: new Date(Date.now() - 150000) },
    { id: 3, userId: 203, username: "nightOwl", message: "Perfect vibe for my late night coding session", timestamp: new Date(Date.now() - 120000) },
    { id: 4, userId: 204, username: "deepHouseFan", message: "That transition was smooth!", timestamp: new Date(Date.now() - 90000) },
    { id: 5, userId: 205, username: "synthWaver", message: "Can you play something with more bass?", timestamp: new Date(Date.now() - 60000) },
    { id: 6, userId: 206, username: "clubKid99", message: "Greetings from Berlin! ❤️", timestamp: new Date(Date.now() - 30000) }
  ];

  useEffect(() => {
    // Initialize with mock chat messages
    setChatMessages(mockChatMessages);
    
    // Simulate video playback with poster image for mock purposes
    if (videoRef.current) {
      videoRef.current.poster = mockStream.thumbnailUrl;
    }
    
    // Scroll chat to bottom on load
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      const newMessage: ChatMessage = {
        id: chatMessages.length + 1,
        userId: 999, // Current user
        username: "You",
        message: chatMessage,
        timestamp: new Date()
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatMessage("");
    }
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayedStream = stream || mockStream;
  const displayedStreamer = streamer || mockStreamer;

  return (
    <div className="flex flex-col min-h-screen bg-dark-300 text-white">
      <Header />
      
      <main className="flex flex-1 pt-14 md:pt-16">
        <Sidebar />
        
        <div className="flex-1 md:ml-60 pb-20 md:pb-24">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Stream video area */}
              <div className="lg:col-span-2">
                <div className="bg-black rounded-lg overflow-hidden aspect-video">
                  {streamLoading ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <video 
                      ref={videoRef}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      playsInline
                      poster={displayedStream.thumbnailUrl}
                    >
                      <source src="" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
                
                <div className="mt-4">
                  {streamLoading || streamerLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <div className="flex space-x-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-xl font-bold">{displayedStream.title}</h1>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-start space-x-2">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={displayedStreamer.profileImageUrl} />
                            <AvatarFallback>{displayedStreamer.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h2 className="font-medium">{displayedStreamer.displayName}</h2>
                            <p className="text-sm text-gray-400">{displayedStreamer.followerCount.toLocaleString()} followers</p>
                          </div>
                        </div>
                        <Button 
                          onClick={toggleFollow}
                          variant={isFollowing ? "outline" : "default"}
                          className={`${isFollowing ? 'bg-dark-100 hover:bg-dark-300' : 'bg-primary hover:bg-primary/80'}`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </Button>
                      </div>
                      
                      <Separator className="my-4 bg-dark-100" />
                      
                      <div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className="bg-[#00b074] hover:bg-[#00b074]/80">
                            <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse mr-1.5"></span>
                            LIVE
                          </Badge>
                          <Badge variant="outline" className="bg-dark-100 hover:bg-dark-100">
                            {displayedStream.viewerCount.toLocaleString()} viewers
                          </Badge>
                          {displayedStream.tags?.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="bg-dark-100 hover:bg-dark-100">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-gray-300">{displayedStream.description}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Chat area */}
              <div className="bg-dark-200 rounded-lg overflow-hidden flex flex-col h-[600px]">
                <div className="p-3 border-b border-dark-100">
                  <h3 className="font-medium">Live Chat</h3>
                </div>
                
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-3 space-y-3"
                >
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="flex space-x-2">
                      <div className="shrink-0">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">{msg.username[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${msg.username === 'You' ? 'text-primary' : 'text-gray-300'}`}>
                            {msg.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200 break-words">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <form onSubmit={handleSendMessage} className="p-3 border-t border-dark-100 flex">
                  <Input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Send a message"
                    className="bg-dark-100 border-dark-100 focus-visible:ring-primary"
                  />
                  <Button type="submit" size="icon" className="ml-2 bg-primary hover:bg-primary/80">
                    <Send size={16} />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <AudioPlayer />
      <MobileNavigation />
    </div>
  );
}

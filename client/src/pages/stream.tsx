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
import { Send, Users, Volume2, VolumeX, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Slider } from "@/components/ui/slider";
import { audioStreamingService, type StreamStatus } from '@/lib/audioStreaming';

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioConnected, setIsAudioConnected] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>({ 
    isLive: false, 
    viewerCount: 0, 
    peakViewerCount: 0 
  });
  const socketRef = useRef<WebSocket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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

  // Connect to WebSocket when stream and user info is available
  useEffect(() => {
    if (!streamId) return;
    
    // Close any existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Set up WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?streamId=${streamId}&userId=${user?.id || 0}&username=${user?.displayName || 'Guest'}`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    socket.onopen = () => {
      setIsConnected(true);
      toast({
        title: "Connected to stream",
        description: "You've joined the live chat.",
        variant: "default",
      });
    };
    
    socket.onclose = () => {
      setIsConnected(false);
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection error",
        description: "Failed to connect to chat. Please try again.",
        variant: "destructive",
      });
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'chat_message':
            // Add new chat message
            if (data.message) {
              setChatMessages(prev => [...prev, data.message]);
            }
            break;
            
          case 'chat_history':
            // Replace chat messages with history
            if (data.messages && Array.isArray(data.messages)) {
              setChatMessages(data.messages);
            }
            break;
            
          case 'viewer_count':
            // Update viewer count
            if (typeof data.viewerCount === 'number') {
              setViewerCount(data.viewerCount);
            }
            break;
            
          case 'user_joined':
            // Optional: Show notification when user joins
            toast({
              title: "User joined",
              description: `${data.username} joined the stream`,
              variant: "default",
            });
            break;
            
          case 'stream_status':
            // Handle stream status changes
            if (data.isLive === false) {
              toast({
                title: "Stream ended",
                description: "The stream has ended.",
                variant: "default",
              });
            }
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    // Clean up on unmount
    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, [streamId, user, toast]);
  
  // Connect to audio stream and handle visualizations
  useEffect(() => {
    if (!streamId) return;
    
    // Set up audio stream visualization
    const setupAudioVisualizer = async () => {
      try {
        setIsAudioConnected(false);
        
        // Get stream URL from server based on streamId
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const audioStreamUrl = `${protocol}//${window.location.host}/audio/${streamId}`;
        
        if (audioRef.current) {
          audioRef.current.src = audioStreamUrl;
          audioRef.current.volume = volume;
          
          // When connected
          audioRef.current.onplaying = () => {
            setIsAudioConnected(true);
            toast({
              title: "Audio stream connected",
              description: "You are now listening to the live audio stream.",
              variant: "default",
            });
          };
          
          // When disconnected
          audioRef.current.onerror = () => {
            setIsAudioConnected(false);
            toast({
              title: "Audio stream error",
              description: "Failed to connect to audio stream. The stream may be offline.",
              variant: "destructive",
            });
          };
          
          // Set up audio analyzer for visualization
          if (canvasRef.current) {
            // Register visualization handler
            audioStreamingService.onVisualize((data) => {
              setFrequencyData(data);
              drawVisualization(data);
            });
            
            // Register status change handler
            audioStreamingService.onStatusChange((status) => {
              setStreamStatus(status);
              setViewerCount(status.viewerCount);
            });
          }
        }
      } catch (error) {
        console.error("Error setting up audio stream:", error);
        toast({
          title: "Connection error",
          description: "Failed to connect to audio stream.",
          variant: "destructive",
        });
      }
    };
    
    const drawVisualization = (data: Uint8Array) => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set up visualization style
      const barWidth = canvas.width / data.length * 2.5;
      const barSpacing = 1;
      const barHeightFactor = canvas.height / 255;
      
      // Draw frequency bars
      ctx.fillStyle = 'rgba(138, 43, 226, 0.8)'; // Purple color matching theme
      
      for (let i = 0; i < data.length; i++) {
        const barHeight = data[i] * barHeightFactor;
        const x = i * (barWidth + barSpacing);
        const y = canvas.height - barHeight;
        
        // Draw gradient bars
        const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
        gradient.addColorStop(0, 'rgba(138, 43, 226, 0.8)');
        gradient.addColorStop(1, 'rgba(185, 103, 255, 0.5)');
        ctx.fillStyle = gradient;
        
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };
    
    setupAudioVisualizer();
    
    return () => {
      // Clean up audio connections
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [streamId, volume, toast]);
  
  // Initialize UI and scroll chat to bottom on load
  useEffect(() => {
    // For initial load, use mock data if no real data yet
    if (!chatMessages.length) {
      setChatMessages(mockChatMessages);
    }
    
    // Simulate video playback with poster image
    if (videoRef.current && displayedStream.thumbnailUrl) {
      videoRef.current.poster = displayedStream.thumbnailUrl;
    }
    
    // Scroll chat to bottom
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
    
    if (!chatMessage.trim()) return;
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && streamId) {
      // Send message through WebSocket
      const messageData = {
        type: 'chat',
        streamId: streamId,
        userId: user?.id,
        username: user?.displayName || 'Guest',
        message: chatMessage
      };
      
      socketRef.current.send(JSON.stringify(messageData));
      setChatMessage("");
      
      // We don't need to add the message to the chat manually
      // The server will broadcast it and we'll receive it back
    } else {
      // Fallback for when socket is not connected
      toast({
        title: "Connection issue",
        description: "Cannot send message, trying to reconnect...",
        variant: "destructive",
      });
      
      // Add message locally if not connected
      const newMessage: ChatMessage = {
        id: Date.now(),
        userId: user?.id || 0,
        username: user?.displayName || 'Guest',
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
                            <Users size={14} className="mr-1" />
                            {(viewerCount || displayedStream.viewerCount || 0).toLocaleString()} viewers
                          </Badge>
                          {displayedStream.tags?.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="bg-dark-100 hover:bg-dark-100">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-gray-300">{displayedStream.description}</p>
                      </div>
                      
                      {/* Audio controls and visualizer */}
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 rounded-full"
                              onClick={() => setIsMuted(!isMuted)}
                            >
                              {isMuted ? (
                                <VolumeX className="h-5 w-5 text-gray-400" />
                              ) : (
                                <Volume2 className="h-5 w-5 text-gray-200" />
                              )}
                            </Button>
                            
                            <Slider
                              className="w-32"
                              value={[isMuted ? 0 : volume * 100]}
                              min={0}
                              max={100}
                              step={1}
                              onValueChange={(value) => {
                                const newVolume = value[0] / 100;
                                setVolume(newVolume);
                                setIsMuted(newVolume === 0);
                                if (audioRef.current) {
                                  audioRef.current.volume = newVolume;
                                }
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-400">
                              Audio Visualization
                            </span>
                          </div>
                          
                          <div className="flex ml-auto space-x-2">
                            <Badge variant={isAudioConnected ? "default" : "outline"} className={isAudioConnected ? "bg-green-600" : "bg-transparent"}>
                              {isAudioConnected ? "Audio Connected" : "No Audio"}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Audio visualizer */}
                        <div className="bg-dark-100 rounded-md overflow-hidden aspect-[4/1]">
                          <canvas
                            ref={canvasRef}
                            className="w-full h-full"
                            width={600}
                            height={150}
                          />
                        </div>
                        
                        {/* Hidden audio element */}
                        <audio
                          ref={audioRef}
                          className="hidden"
                          autoPlay
                          muted={isMuted}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Chat area */}
              <div className="bg-dark-200 rounded-lg overflow-hidden flex flex-col h-[600px]">
                <div className="p-3 border-b border-dark-100 flex justify-between items-center">
                  <h3 className="font-medium">Live Chat</h3>
                  <div className="flex items-center text-xs">
                    {isConnected ? (
                      <span className="flex items-center text-green-500">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1.5"></span>
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center text-red-500">
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                        Disconnected
                      </span>
                    )}
                  </div>
                </div>
                
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-3 space-y-3"
                >
                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="flex space-x-2">
                        <div className="shrink-0">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">{msg.username[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${msg.username === user?.displayName ? 'text-primary' : 'text-gray-300'}`}>
                              {msg.username}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(msg.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-200 break-words">{msg.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                      <p>No messages yet</p>
                      <p className="mt-2">Be the first to chat!</p>
                    </div>
                  )}
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

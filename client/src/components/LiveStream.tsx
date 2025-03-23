import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import SimplePeer from "simple-peer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Mic, MicOff, Video, VideoOff, Send, Users } from "lucide-react";

interface ChatMessage {
  senderId: string;
  message: string;
  timestamp: string;
  isCurrentUser?: boolean;
}

interface LiveStreamProps {
  initialStreamId?: string;
  userId?: number;
  userName?: string;
}

const LiveStream = ({ initialStreamId, userId, userName }: LiveStreamProps) => {
  // Stream mode states
  const [mode, setMode] = useState<"host" | "viewer">(initialStreamId ? "viewer" : "host");
  const [streamId, setStreamId] = useState(initialStreamId || "");
  const [shareUrl, setShareUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  
  // Media device states
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [availableDevices, setAvailableDevices] = useState<{
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
  }>({
    videoDevices: [],
    audioDevices: [],
  });
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");
  
  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  
  // Refs
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, any>>({});
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  
  const { toast } = useToast();

  // Initialize socket connection
  useEffect(() => {
    // Use window.location.origin for proper URL construction
    const socketURL = window.location.origin;
    console.log("Connecting to Socket.IO server at:", socketURL);
    
    const socket = io(socketURL);
    socketRef.current = socket;
    
    // Cleanup on unmount
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      // Clean up peer connections
      Object.values(peersRef.current).forEach(peer => {
        peer.destroy();
      });
    };
  }, []);
  
  // Setup socket event listeners
  useEffect(() => {
    if (!socketRef.current) return;
    
    const handleViewerJoined = ({ viewerId }: { viewerId: string }) => {
      console.log("New viewer joined:", viewerId);
      if (mode === "host" && localStreamRef.current) {
        try {
          // Create new peer connection for the viewer with STUN servers
          const peer = new SimplePeer({
            initiator: true,
            trickle: true,
            stream: localStreamRef.current,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
              ]
            }
          });
          
          // Store the peer
          peersRef.current[viewerId] = peer;
          
          // Handle signaling
          peer.on("signal", (data) => {
            console.log("Host signaling data generated for viewer:", viewerId);
            socketRef.current?.emit("stream-offer", {
              streamId,
              description: data,
              viewerId
            });
          });
          
          // Handle disconnect
          peer.on("close", () => {
            console.log("Peer connection closed with viewer:", viewerId);
            delete peersRef.current[viewerId];
          });
          
          // Handle errors
          peer.on("error", (err) => {
            console.error("WebRTC error with viewer:", viewerId, err);
            toast({
              title: "Connection Error",
              description: "Failed to establish connection with viewer. Please try again.",
              variant: "destructive"
            });
            delete peersRef.current[viewerId];
          });
        } catch (error) {
          console.error("Error creating host peer connection:", error);
          toast({
            title: "Connection Error",
            description: "Failed to establish streaming connection. Please try again.",
            variant: "destructive"
          });
        }
      }
    };
    
    const handleViewerLeft = ({ viewerId }: { viewerId: string }) => {
      console.log("Viewer left:", viewerId);
      if (peersRef.current[viewerId]) {
        peersRef.current[viewerId].destroy();
        delete peersRef.current[viewerId];
      }
    };
    
    const handleStreamOffer = ({ hostId, description }: { hostId: string; description: any }) => {
      console.log("Received stream offer from host:", hostId);
      if (mode === "viewer") {
        try {
          // Create new peer connection to accept the offer with STUN servers
          const peer = new SimplePeer({
            initiator: false,
            trickle: true,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
              ]
            }
          });
          
          peersRef.current[hostId] = peer;
          
          // Accept the offer
          peer.signal(description);
          
          // Send answer back to host
          peer.on("signal", (data) => {
            console.log("Viewer signaling data generated for host:", hostId);
            socketRef.current?.emit("stream-answer", {
              hostId,
              description: data
            });
          });
          
          // When we get the remote stream
          peer.on("stream", (stream) => {
            console.log("Received remote stream from host");
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
            }
          });
          
          // Handle errors
          peer.on("error", (err) => {
            console.error("WebRTC error with host:", hostId, err);
            toast({
              title: "Connection Error",
              description: "Failed to connect to stream. The host may have poor connectivity.",
              variant: "destructive"
            });
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
            peer.destroy();
            delete peersRef.current[hostId];
          });
          
          // Handle peer closing
          peer.on("close", () => {
            console.log("Peer connection closed with host:", hostId);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
            delete peersRef.current[hostId];
          });
        } catch (error) {
          console.error("Error creating viewer peer connection:", error);
          toast({
            title: "Connection Error",
            description: "Failed to establish connection to stream. Please try again.",
            variant: "destructive"
          });
        }
      }
    };
    
    const handleStreamAnswer = ({ viewerId, description }: { viewerId: string; description: any }) => {
      console.log("Received stream answer from viewer:", viewerId);
      if (mode === "host" && peersRef.current[viewerId]) {
        peersRef.current[viewerId].signal(description);
      }
    };
    
    const handleIceCandidate = ({ from, candidate }: { from: string; candidate: any }) => {
      console.log("Received ICE candidate from:", from);
      if (peersRef.current[from]) {
        peersRef.current[from].signal({ type: "candidate", candidate });
      }
    };
    
    const handleViewerCount = ({ count }: { count: number }) => {
      setViewerCount(count);
    };
    
    const handleChatMessage = ({ senderId, message, timestamp }: ChatMessage) => {
      const isCurrentUser = senderId === socketRef.current?.id;
      setChatMessages(prev => [...prev, { senderId, message, timestamp, isCurrentUser }]);
      
      // Auto-scroll chat to bottom
      if (chatContainerRef.current) {
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    };
    
    const handleStreamEnded = () => {
      if (mode === "viewer") {
        toast({
          title: "Stream ended",
          description: "The host has ended the stream.",
          variant: "destructive"
        });
        
        // Clean up
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        
        setIsStreaming(false);
      }
    };
    
    const handleStreamNotFound = () => {
      if (mode === "viewer") {
        toast({
          title: "Stream not found",
          description: "The stream ID you entered does not exist.",
          variant: "destructive"
        });
        
        setIsStreaming(false);
      }
    };
    
    // Register event handlers
    socketRef.current.on("viewer-joined", handleViewerJoined);
    socketRef.current.on("viewer-left", handleViewerLeft);
    socketRef.current.on("stream-offer", handleStreamOffer);
    socketRef.current.on("stream-answer", handleStreamAnswer);
    socketRef.current.on("ice-candidate", handleIceCandidate);
    socketRef.current.on("viewer-count", handleViewerCount);
    socketRef.current.on("chat-message", handleChatMessage);
    socketRef.current.on("stream-ended", handleStreamEnded);
    socketRef.current.on("stream-not-found", handleStreamNotFound);
    
    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.off("viewer-joined", handleViewerJoined);
        socketRef.current.off("viewer-left", handleViewerLeft);
        socketRef.current.off("stream-offer", handleStreamOffer);
        socketRef.current.off("stream-answer", handleStreamAnswer);
        socketRef.current.off("ice-candidate", handleIceCandidate);
        socketRef.current.off("viewer-count", handleViewerCount);
        socketRef.current.off("chat-message", handleChatMessage);
        socketRef.current.off("stream-ended", handleStreamEnded);
        socketRef.current.off("stream-not-found", handleStreamNotFound);
      }
    };
  }, [mode, streamId, toast]);
  
  // Auto-join stream when initialStreamId is provided
  useEffect(() => {
    if (initialStreamId && mode === "viewer" && socketRef.current && !isStreaming) {
      // Automatically join the stream
      socketRef.current.emit("join-stream", { streamId: initialStreamId });
      setIsStreaming(true);
      
      toast({
        title: "Joining Stream",
        description: "Connecting to the stream...",
      });
    }
  }, [initialStreamId, mode, isStreaming, toast]);

  // Get available media devices
  useEffect(() => {
    async function getDevices() {
      try {
        // Try to request permissions with a more permissive approach
        let mediaStream = null;
        try {
          // First try both video and audio
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
        } catch (bothError) {
          console.warn("Could not access both camera and microphone:", bothError);
          
          try {
            // Try just video
            mediaStream = await navigator.mediaDevices.getUserMedia({ 
              video: true, 
              audio: false 
            });
            
            toast({
              title: "Limited Access",
              description: "Camera access granted, but microphone access was denied.",
            });
          } catch (videoError) {
            console.warn("Could not access camera:", videoError);
            
            try {
              // Try just audio
              mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: false, 
                audio: true 
              });
              
              toast({
                title: "Limited Access",
                description: "Microphone access granted, but camera access was denied.",
              });
            } catch (audioError) {
              console.error("Could not access any media devices:", audioError);
              throw new Error("No media devices could be accessed");
            }
          }
        }
        
        // Release the temporary stream
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        
        // Now enumerate available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const videoDevices = devices.filter(device => device.kind === "videoinput");
        const audioDevices = devices.filter(device => device.kind === "audioinput");
        
        // Check if we got meaningful device information (with labels)
        // If not, it often means permissions weren't fully granted
        const hasVideoLabels = videoDevices.some(device => !!device.label);
        const hasAudioLabels = audioDevices.some(device => !!device.label);
        
        if (!hasVideoLabels && !hasAudioLabels && (videoDevices.length > 0 || audioDevices.length > 0)) {
          console.warn("Device information available but without labels - permissions may be limited");
        }
        
        setAvailableDevices({
          videoDevices,
          audioDevices
        });
        
        // Set default devices if not already set
        if (videoDevices.length > 0 && !selectedVideoDevice) {
          setSelectedVideoDevice(videoDevices[0].deviceId);
        }
        
        if (audioDevices.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(audioDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error getting media devices:", error);
        
        // Show a more informative error message
        let errorMessage = "Unable to access your camera or microphone.";
        if ((error as Error).message.includes("Permission denied")) {
          errorMessage = "Permission denied. Please allow camera and microphone access in your browser settings.";
        } else if ((error as Error).message.includes("No media devices")) {
          errorMessage = "No camera or microphone detected. Please connect a device and try again.";
        }
        
        toast({
          title: "Device Access Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    }
    
    getDevices();
  }, [toast, selectedVideoDevice, selectedAudioDevice]);

  // Host stream creation function
  const createStream = async () => {
    try {
      // First get access to the media devices
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled ? { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined } : false,
        audio: audioEnabled ? { deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined } : false
      });
      
      // Store the local stream for later use
      localStreamRef.current = stream;
      
      // Display the local video feed
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Create an API request to get a stream ID
      const response = await fetch(`${window.location.origin}/api/streams/webrtc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          userName: userName || 'Anonymous'
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Failed to create stream");
      }
      
      setStreamId(data.streamId);
      setShareUrl(data.shareUrl);
      
      // Emit host-stream event to socket server
      socketRef.current?.emit("host-stream", { streamId: data.streamId });
      
      setIsStreaming(true);
      
      toast({
        title: "Stream Created",
        description: "Your live stream has been created successfully.",
      });
      
      return data.streamId;
    } catch (error) {
      console.error("Error creating stream:", error);
      toast({
        title: "Stream Creation Failed",
        description: (error as Error).message || "Could not create stream",
        variant: "destructive"
      });
      return null;
    }
  };

  // Join existing stream function for viewers
  const joinStream = async () => {
    if (!streamId) {
      toast({
        title: "Stream ID Required",
        description: "Please enter a valid stream ID to join",
        variant: "destructive"
      });
      return;
    }
    
    // Check if the stream exists first
    try {
      const response = await fetch(`${window.location.origin}/api/streams/webrtc/${streamId}`);
      const data = await response.json();
      
      if (!data.success) {
        toast({
          title: "Stream Not Found",
          description: "The stream ID you entered does not exist",
          variant: "destructive"
        });
        return;
      }
      
      // Stream exists, join it
      socketRef.current?.emit("join-stream", { streamId });
      setIsStreaming(true);
      
      toast({
        title: "Joining Stream",
        description: "Connected to stream successfully",
      });
    } catch (error) {
      console.error("Error joining stream:", error);
      toast({
        title: "Connection Error",
        description: "Failed to join the stream. Please try again.",
        variant: "destructive"
      });
    }
  };

  // End stream function
  const endStream = () => {
    // Notify server the stream is ending
    if (mode === "host" && streamId) {
      socketRef.current?.emit("end-stream", { streamId });
    } else if (mode === "viewer" && streamId) {
      socketRef.current?.emit("leave-stream", { streamId });
    }
    
    // Stop tracks and clean up
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Clean up peer connections
    Object.values(peersRef.current).forEach(peer => {
      peer.destroy();
    });
    peersRef.current = {};
    
    // Reset state
    setIsStreaming(false);
    setChatMessages([]);
    setViewerCount(0);
    
    toast({
      title: mode === "host" ? "Stream Ended" : "Left Stream",
      description: mode === "host" ? "Your live stream has ended" : "You have left the stream",
    });
  };

  // Toggle video/audio functions
  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      
      if (videoTracks.length > 0) {
        const enabled = !videoTracks[0].enabled;
        videoTracks.forEach(track => {
          track.enabled = enabled;
        });
        setVideoEnabled(enabled);
      } else if (!videoEnabled) {
        // If video is disabled and we have no video tracks, try to add one
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined }
          });
          
          const videoTrack = stream.getVideoTracks()[0];
          
          if (videoTrack) {
            localStreamRef.current.addTrack(videoTrack);
            setVideoEnabled(true);
          }
        } catch (error) {
          console.error("Error adding video track:", error);
          toast({
            title: "Camera Error",
            description: "Could not enable camera",
            variant: "destructive"
          });
        }
      }
    }
  };
  
  const toggleAudio = async () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      
      if (audioTracks.length > 0) {
        const enabled = !audioTracks[0].enabled;
        audioTracks.forEach(track => {
          track.enabled = enabled;
        });
        setAudioEnabled(enabled);
      } else if (!audioEnabled) {
        // If audio is disabled and we have no audio tracks, try to add one
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined }
          });
          
          const audioTrack = stream.getAudioTracks()[0];
          
          if (audioTrack) {
            localStreamRef.current.addTrack(audioTrack);
            setAudioEnabled(true);
          }
        } catch (error) {
          console.error("Error adding audio track:", error);
          toast({
            title: "Microphone Error",
            description: "Could not enable microphone",
            variant: "destructive"
          });
        }
      }
    }
  };

  // Chat function
  const sendChatMessage = () => {
    if (!currentMessage.trim() || !streamId || !socketRef.current) return;
    
    socketRef.current.emit("chat-message", {
      streamId,
      message: currentMessage.trim()
    });
    
    setCurrentMessage("");
  };

  // Copy stream URL to clipboard
  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast({
          title: "Copied!",
          description: "Stream URL copied to clipboard",
        });
      })
      .catch(err => {
        console.error("Failed to copy:", err);
      });
  };

  // Host UI
  const renderHostUI = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-1 md:col-span-2">
        <Card className="overflow-hidden">
          <CardHeader className="bg-zinc-950/40 pb-2 pt-4">
            <CardTitle className="flex justify-between items-center text-lg">
              <div className="flex items-center space-x-2">
                <span>Live Stream</span>
                {isStreaming && (
                  <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                )}
              </div>
              {isStreaming && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-white/70" />
                  <span className="text-white/70 text-sm">{viewerCount} viewers</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative aspect-video bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              
              <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-3">
                <Button
                  variant={videoEnabled ? "default" : "destructive"}
                  size="sm"
                  onClick={toggleVideo}
                  className="rounded-full"
                >
                  {videoEnabled ? <Video className="h-4 w-4 mr-1" /> : <VideoOff className="h-4 w-4 mr-1" />}
                  {videoEnabled ? "Camera On" : "Camera Off"}
                </Button>
                
                <Button
                  variant={audioEnabled ? "default" : "destructive"}
                  size="sm"
                  onClick={toggleAudio}
                  className="rounded-full"
                >
                  {audioEnabled ? <Mic className="h-4 w-4 mr-1" /> : <MicOff className="h-4 w-4 mr-1" />}
                  {audioEnabled ? "Mic On" : "Mic Off"}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-zinc-950/40 flex justify-between py-3">
            {!isStreaming ? (
              <Button onClick={createStream} variant="default" className="w-full">
                Start Streaming
              </Button>
            ) : (
              <Button onClick={endStream} variant="destructive" className="w-full">
                End Stream
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {isStreaming && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Share your stream</CardTitle>
              <CardDescription>
                Use this link to share your stream with others
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyShareUrl} size="icon" variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 text-sm text-zinc-500">
                Stream ID: <span className="font-mono">{streamId}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={chatContainerRef}
                className="h-[200px] overflow-y-auto border rounded-md p-2 mb-2 bg-black/20"
              >
                {chatMessages.length === 0 ? (
                  <div className="text-center text-zinc-500 pt-8">
                    Chat messages will appear here
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`mb-2 ${
                        msg.isCurrentUser
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      <div
                        className={`inline-block rounded-lg px-3 py-1 text-sm ${
                          msg.isCurrentUser
                            ? "bg-purple-700 text-white"
                            : "bg-zinc-800 text-white"
                        }`}
                      >
                        <div className="font-bold text-xs opacity-70">
                          {msg.isCurrentUser ? "You" : `Anonymous (${msg.senderId.slice(0, 4)})`}
                        </div>
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendChatMessage();
                    }
                  }}
                />
                <Button onClick={sendChatMessage} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  // Viewer UI
  const renderViewerUI = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="col-span-1 md:col-span-2">
        <Card className="overflow-hidden">
          <CardHeader className="bg-zinc-950/40 pb-2 pt-4">
            <CardTitle className="flex justify-between items-center text-lg">
              <div className="flex items-center space-x-2">
                <span>Watching Stream</span>
                {isStreaming && (
                  <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                )}
              </div>
              {isStreaming && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-white/70" />
                  <span className="text-white/70 text-sm">{viewerCount} viewers</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative aspect-video bg-black">
              {!isStreaming ? (
                <div className="flex items-center justify-center h-full flex-col">
                  <div className="text-center p-6">
                    <h3 className="text-lg font-medium">Join a Stream</h3>
                    <p className="text-zinc-400 text-sm mb-4">
                      Enter a stream ID to join as a viewer
                    </p>
                    <div className="flex space-x-2 mb-4">
                      <Input
                        placeholder="Enter stream ID"
                        value={streamId}
                        onChange={(e) => setStreamId(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button onClick={joinStream}>
                        Join
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-zinc-950/40 flex justify-between py-3">
            {isStreaming && (
              <Button onClick={endStream} variant="outline" className="w-full">
                Leave Stream
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {isStreaming && (
        <Card className="md:row-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Live Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={chatContainerRef}
              className="h-[300px] overflow-y-auto border rounded-md p-2 mb-2 bg-black/20"
            >
              {chatMessages.length === 0 ? (
                <div className="text-center text-zinc-500 pt-8">
                  Chat messages will appear here
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`mb-2 ${
                      msg.isCurrentUser ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block rounded-lg px-3 py-1 text-sm ${
                        msg.isCurrentUser
                          ? "bg-purple-700 text-white"
                          : "bg-zinc-800 text-white"
                      }`}
                    >
                      <div className="font-bold text-xs opacity-70">
                        {msg.isCurrentUser
                          ? "You"
                          : `Anonymous (${msg.senderId.slice(0, 4)})`}
                      </div>
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Type a message..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendChatMessage();
                  }
                }}
              />
              <Button onClick={sendChatMessage} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue={initialStreamId ? "viewer" : "host"} onValueChange={(value) => setMode(value as "host" | "viewer")}>
        <TabsList className="mb-4 mx-auto grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="host">Host Stream</TabsTrigger>
          <TabsTrigger value="viewer">Join Stream</TabsTrigger>
        </TabsList>
        
        <TabsContent value="host">
          {renderHostUI()}
        </TabsContent>
        
        <TabsContent value="viewer">
          {renderViewerUI()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveStream;
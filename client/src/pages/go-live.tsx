import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Camera, Mic, MicOff, Video, VideoOff, Settings, Volume2, VolumeX, RefreshCw } from "lucide-react";

import { mediaStreamingService, type StreamStatus, type MediaDevice } from "@/lib/mediaStreaming";
import { createStream } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

const streamFormSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters long",
  }).max(50, {
    message: "Title must be less than 50 characters",
  }),
  description: z.string().max(300, {
    message: "Description must be less than 300 characters",
  }).optional(),
  genre: z.string().optional(),
});

type FormValues = z.infer<typeof streamFormSchema>;

export default function GoLivePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>({
    isLive: false,
    viewerCount: 0,
    audioLevel: -60,
    hasVideo: true,
    hasMic: true,
    peakViewerCount: 0
  });
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  
  // Device selection
  const [mediaDevices, setMediaDevices] = useState<MediaDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  // Streaming state
  const [streamId, setStreamId] = useState<number | null>(null);
  const [streamKey, setStreamKey] = useState<string>("");
  const [isStarting, setIsStarting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(streamFormSchema),
    defaultValues: {
      title: "",
      description: "",
      genre: "electronic",
    },
  });

  const createStreamMutation = useMutation({
    mutationFn: createStream,
    onSuccess: (data) => {
      setStreamId(data.id);
      setStreamKey(data.streamKey!);
      startStreaming(data.id, data.streamKey!);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create stream",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Initialize streaming service and load available devices
    const initializeMedia = async () => {
      try {
        setIsInitializing(true);
        const success = await mediaStreamingService.initialize({
          enableVideo: true,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        
        if (success && videoRef.current) {
          mediaStreamingService.attachVideo(videoRef.current);
          mediaStreamingService.onStatusChange(setStreamStatus);
          
          if (canvasRef.current) {
            mediaStreamingService.initializeVisualization(canvasRef.current, 'purple');
          }
          
          // Load available devices after successful initialization
          await loadMediaDevices();
        }
        
        setIsInitializing(false);
      } catch (err) {
        toast({
          title: "Failed to initialize media",
          description: err instanceof Error ? err.message : "Could not access camera/microphone",
          variant: "destructive",
        });
        setIsInitializing(false);
      }
    };
    
    // Function to load media devices
    const loadMediaDevices = async () => {
      try {
        setIsLoadingDevices(true);
        const devices = await mediaStreamingService.getMediaDevices();
        setMediaDevices(devices);
        
        // Set initial device selections if available
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        const audioDevices = devices.filter(d => d.kind === 'audioinput');
        
        if (videoDevices.length > 0) {
          setSelectedVideoDevice(videoDevices[0].deviceId);
        }
        
        if (audioDevices.length > 0) {
          setSelectedAudioDevice(audioDevices[0].deviceId);
        }
        
        setIsLoadingDevices(false);
      } catch (error) {
        console.error("Failed to load media devices:", error);
        setIsLoadingDevices(false);
      }
    };
    
    // Register device change listener
    const handleDeviceChange = (updatedDevices: MediaDevice[]) => {
      setMediaDevices(updatedDevices);
    };

    initializeMedia();
    
    // Register device change callback
    mediaStreamingService.onDevicesChange(handleDeviceChange);

    return () => {
      // Clean up
      mediaStreamingService.dispose();
    };
  }, [toast]);

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to be logged in to start a stream",
        variant: "destructive",
      });
      return;
    }

    createStreamMutation.mutate({
      title: values.title,
      description: values.description || "",
      userId: user.id,
      isLive: true,
      category: values.genre || "electronic",
    });
  };

  const startStreaming = async (id: number, key: string) => {
    try {
      console.log("Starting stream with ID:", id);
      
      // First check if we have the necessary permissions
      if (!streamStatus.hasMic) {
        toast({
          title: "Microphone access required",
          description: "Please enable microphone access to start streaming",
          variant: "destructive",
        });
        return;
      }
      
      setIsStarting(true);
      
      // Register a status change handler to receive stream status updates
      const handleStatusChange = (status: StreamStatus) => {
        setStreamStatus(status);
        
        // Check for errors in status
        if (status.error) {
          toast({
            title: "Streaming error",
            description: status.error,
            variant: "destructive",
          });
          setIsStarting(false);
        }
      };
      
      // Register the handler before starting stream
      mediaStreamingService.onStatusChange(handleStatusChange);
      
      // Attempt to start streaming
      const success = await mediaStreamingService.startStreaming(id, key);
      
      if (!success) {
        setIsStarting(false);
        throw new Error("Failed to connect to streaming server. Please try again.");
      }
      
      // Show success message
      toast({
        title: "Stream started",
        description: "Your stream is now live!",
      });

      // Redirect to the stream page
      navigate(`/stream/${id}`);
    } catch (err) {
      console.error("Error starting stream:", err);
      setIsStarting(false);
      
      toast({
        title: "Streaming Error",
        description: err instanceof Error ? err.message : "Failed to start streaming",
        variant: "destructive",
      });
    }
  };

  const toggleVideo = () => {
    mediaStreamingService.toggleVideo(!streamStatus.hasVideo);
  };

  const toggleMic = () => {
    mediaStreamingService.toggleAudio(!streamStatus.hasMic);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    mediaStreamingService.setVolume(newVolume / 100);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    mediaStreamingService.setVolume(isMuted ? volume / 100 : 0);
  };
  
  // Device selection handlers
  const refreshDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const devices = await mediaStreamingService.getMediaDevices();
      setMediaDevices(devices);
      setIsLoadingDevices(false);
    } catch (error) {
      console.error("Failed to refresh devices:", error);
      setIsLoadingDevices(false);
    }
  };
  
  const handleChangeVideoDevice = async (deviceId: string) => {
    if (deviceId === selectedVideoDevice) return;
    
    try {
      const success = await mediaStreamingService.switchInputDevice(deviceId, 'videoinput');
      if (success) {
        setSelectedVideoDevice(deviceId);
        toast({
          title: "Camera changed",
          description: "Successfully switched to the selected camera",
        });
      } else {
        throw new Error("Failed to switch camera");
      }
    } catch (error) {
      toast({
        title: "Device error",
        description: error instanceof Error ? error.message : "Could not switch camera",
        variant: "destructive",
      });
    }
  };
  
  const handleChangeAudioDevice = async (deviceId: string) => {
    if (deviceId === selectedAudioDevice) return;
    
    try {
      const success = await mediaStreamingService.switchInputDevice(deviceId, 'audioinput');
      if (success) {
        setSelectedAudioDevice(deviceId);
        toast({
          title: "Microphone changed",
          description: "Successfully switched to the selected microphone",
        });
      } else {
        throw new Error("Failed to switch microphone");
      }
    } catch (error) {
      toast({
        title: "Device error",
        description: error instanceof Error ? error.message : "Could not switch microphone",
        variant: "destructive",
      });
    }
  };
  
  const toggleDeviceSettings = () => {
    setShowDeviceSettings(!showDeviceSettings);
  };

  return (
    <div className="container py-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Go Live</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card className="bg-black border-zinc-800">
            <CardContent className="p-0 relative overflow-hidden rounded-md">
              {/* Video Preview */}
              <div className="aspect-video bg-zinc-900 flex items-center justify-center relative">
                {isInitializing ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex gap-4 mb-3">
                      <Camera className="h-8 w-8 text-white/30" />
                      <Mic className="h-8 w-8 text-white/30" />
                    </div>
                    <p className="text-white/70 text-sm">Initializing camera and microphone...</p>
                    <p className="text-white/50 text-xs mt-2">Please allow access in your browser</p>
                  </div>
                ) : (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover" 
                    />
                    
                    {/* Media controls overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-full w-10 h-10 p-0 bg-zinc-800/50 hover:bg-zinc-700"
                              onClick={toggleVideo}
                            >
                              {streamStatus.hasVideo ? (
                                <Video className="h-5 w-5 text-white" />
                              ) : (
                                <VideoOff className="h-5 w-5 text-red-500" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-full w-10 h-10 p-0 bg-zinc-800/50 hover:bg-zinc-700"
                              onClick={toggleMic}
                            >
                              {streamStatus.hasMic ? (
                                <Mic className="h-5 w-5 text-white" />
                              ) : (
                                <MicOff className="h-5 w-5 text-red-500" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-full w-10 h-10 p-0 bg-zinc-800/50 hover:bg-zinc-700"
                              onClick={toggleMute}
                            >
                              {!isMuted ? (
                                <Volume2 className="h-5 w-5 text-white" />
                              ) : (
                                <VolumeX className="h-5 w-5 text-red-500" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`rounded-full w-10 h-10 p-0 ${showDeviceSettings ? 'bg-purple-700 hover:bg-purple-600' : 'bg-zinc-800/50 hover:bg-zinc-700'}`}
                              onClick={toggleDeviceSettings}
                            >
                              <Settings className={`h-5 w-5 ${showDeviceSettings ? 'text-white' : 'text-white/70'}`} />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 mr-2">
                              <Slider 
                                value={[volume]} 
                                min={0} 
                                max={100} 
                                step={1} 
                                onValueChange={handleVolumeChange} 
                                className="h-2"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Device Settings Panel */}
                        {showDeviceSettings && (
                          <div className="mt-2 p-3 bg-zinc-900/90 rounded-md border border-zinc-700 animate-in slide-in-from-bottom duration-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-white">Device Settings</h4>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 rounded-full"
                                onClick={refreshDevices}
                                disabled={isLoadingDevices}
                              >
                                <RefreshCw className={`h-4 w-4 ${isLoadingDevices ? 'animate-spin' : ''}`} />
                              </Button>
                            </div>
                            
                            <div className="space-y-3">
                              {/* Camera selection */}
                              <div>
                                <label className="text-xs text-zinc-400 mb-1 block">Camera</label>
                                <Select 
                                  value={selectedVideoDevice} 
                                  onValueChange={handleChangeVideoDevice}
                                  disabled={isLoadingDevices || mediaDevices.filter(d => d.kind === 'videoinput').length === 0}
                                >
                                  <SelectTrigger className="h-8 text-sm bg-zinc-800 border-zinc-700">
                                    <SelectValue placeholder="Select camera" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mediaDevices
                                      .filter(device => device.kind === 'videoinput')
                                      .map(device => (
                                        <SelectItem 
                                          key={device.deviceId} 
                                          value={device.deviceId}
                                          className="text-sm"
                                        >
                                          {device.label}
                                        </SelectItem>
                                      ))
                                    }
                                    {mediaDevices.filter(d => d.kind === 'videoinput').length === 0 && (
                                      <SelectItem value="none" disabled>No cameras available</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Microphone selection */}
                              <div>
                                <label className="text-xs text-zinc-400 mb-1 block">Microphone</label>
                                <Select 
                                  value={selectedAudioDevice} 
                                  onValueChange={handleChangeAudioDevice}
                                  disabled={isLoadingDevices || mediaDevices.filter(d => d.kind === 'audioinput').length === 0}
                                >
                                  <SelectTrigger className="h-8 text-sm bg-zinc-800 border-zinc-700">
                                    <SelectValue placeholder="Select microphone" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mediaDevices
                                      .filter(device => device.kind === 'audioinput')
                                      .map(device => (
                                        <SelectItem 
                                          key={device.deviceId} 
                                          value={device.deviceId}
                                          className="text-sm"
                                        >
                                          {device.label}
                                        </SelectItem>
                                      ))
                                    }
                                    {mediaDevices.filter(d => d.kind === 'audioinput').length === 0 && (
                                      <SelectItem value="none" disabled>No microphones available</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            
            {/* Audio visualization */}
            <CardFooter className="px-4 py-3 border-t border-zinc-800">
              <div className="w-full">
                <p className="text-sm font-medium mb-2 text-zinc-400">Audio Level</p>
                <div className="relative h-10 bg-zinc-800 rounded-md overflow-hidden">
                  <canvas 
                    ref={canvasRef} 
                    className="w-full h-full" 
                  />
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Stream Details</CardTitle>
              <CardDescription>Fill out the information for your stream</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stream Title</FormLabel>
                        <FormControl>
                          <Input placeholder="My Awesome Stream" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell viewers about your stream..."
                            className="resize-none h-20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="genre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Genre</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a genre" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="electronic">Electronic</SelectItem>
                            <SelectItem value="hip-hop">Hip Hop</SelectItem>
                            <SelectItem value="pop">Pop</SelectItem>
                            <SelectItem value="rock">Rock</SelectItem>
                            <SelectItem value="ambient">Ambient</SelectItem>
                            <SelectItem value="jazz">Jazz</SelectItem>
                            <SelectItem value="classical">Classical</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isInitializing || createStreamMutation.isPending || streamStatus.isLive}
                      className="w-full"
                    >
                      {createStreamMutation.isPending ? "Creating Stream..." : "Go Live"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {!isInitializing && (
            <div className="mt-4">
              <Alert>
                <AlertDescription>
                  {streamStatus.isLive 
                    ? `Streaming live! Viewers: ${streamStatus.viewerCount}`
                    : "Your stream will be visible to everyone when you go live."}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
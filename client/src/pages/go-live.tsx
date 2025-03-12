import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createStream } from '@/lib/api';
import { Stream } from '@shared/schema';
import { audioStreamingService, type StreamStatus } from '@/lib/audioStreaming';
import { useLocation } from 'wouter';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertCircle, Camera, Radio, Mic, Volume2, VolumeX, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import AudioPlayer from '@/components/layout/AudioPlayer';
import { useAuth } from '@/hooks/use-auth';

// Form schema
const streamFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  thumbnailUrl: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal("")),
  saveStream: z.boolean().default(true),
});

type StreamFormValues = z.infer<typeof streamFormSchema>;

export default function GoLivePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [streamKey, setStreamKey] = useState("••••••••••••••••");
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>({ 
    isLive: false, 
    viewerCount: 0, 
    peakViewerCount: 0 
  });
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeStreamId, setActiveStreamId] = useState<number | null>(null);
  
  // For demo, a fixed userId (in real app would come from auth)
  const userId = user?.id || 1;
  
  // Initialize audio streaming when component mounts
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        const result = await audioStreamingService.initialize({
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        });
        
        if (result) {
          setAudioInitialized(true);
          audioStreamingService.setVolume(volume);
          
          // Register status change listener
          audioStreamingService.onStatusChange((status) => {
            setStreamStatus(status);
          });
          
          // Register visualization data listener
          audioStreamingService.onVisualize((data) => {
            setFrequencyData(data);
          });
          
          toast({
            title: "Audio initialized",
            description: "Your microphone is ready for streaming.",
          });
        } else {
          toast({
            title: "Audio initialization failed",
            description: "Could not access your microphone. Please check permissions.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error initializing audio:", error);
        toast({
          title: "Audio error",
          description: "Failed to initialize audio streaming. Please check your microphone settings.",
          variant: "destructive",
        });
      }
    };

    initializeAudio();
    
    // Clean up resources when component unmounts
    return () => {
      if (isStreaming) {
        audioStreamingService.stopStreaming();
      }
      audioStreamingService.dispose();
    };
  }, [toast, volume]);

  // Set up form with validation
  const form = useForm<StreamFormValues>({
    resolver: zodResolver(streamFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      tags: "",
      thumbnailUrl: "",
      saveStream: true,
    }
  });

  // Stream creation mutation
  const createStreamMutation = useMutation({
    mutationFn: (data: StreamFormValues) => {
      // Process tags if provided
      const tagArray = data.tags ? data.tags.split(",").map(tag => tag.trim()) : [];
      
      // Create stream data object
      const streamData: Partial<Stream> = {
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        tags: tagArray.length > 0 ? tagArray : null,
        thumbnailUrl: data.thumbnailUrl || null,
        userId: userId,
        isLive: true,
        viewerCount: 0,
        startedAt: new Date(),
      };
      
      return createStream(streamData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams/featured'] });
      toast({
        title: 'Stream created!',
        description: 'Your live stream has started successfully.',
      });
      // Generate a random stream key for demonstration
      setStreamKey(Math.random().toString(36).substring(2, 15));
    },
    onError: (error) => {
      toast({
        title: 'Error creating stream',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  function onSubmit(data: StreamFormValues) {
    createStreamMutation.mutate(data);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-4 pt-16 pb-20 md:pb-10 lg:pl-72">
          <div className="container max-w-3xl mx-auto pt-6">
            <h1 className="text-3xl font-bold mb-2">Go Live</h1>
            <p className="text-muted-foreground mb-6">Set up your live stream and connect with your audience</p>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Stream Settings</CardTitle>
                  <CardDescription>Configure your stream details</CardDescription>
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
                              <Input placeholder="Give your stream a title" {...field} />
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
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe what your stream is about" 
                                rows={4} 
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. Electronic, Hip-Hop, Production" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags (comma separated)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. live production, house, remix" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="thumbnailUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Thumbnail URL</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://example.com/thumbnail.jpg" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="saveStream"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Save stream for followers to watch later</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={createStreamMutation.isPending}
                      >
                        {createStreamMutation.isPending ? (
                          <>
                            <Spinner className="mr-2" size="sm" />
                            Starting stream...
                          </>
                        ) : 'Start Stream'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Stream Preview</CardTitle>
                    <CardDescription>Check your camera and audio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-md flex flex-col items-center justify-center">
                      <Camera className="h-12 w-12 text-white/30 mb-2" />
                      <p className="text-white/70 text-sm">Your camera preview will appear here</p>
                    </div>
                    <div className="mt-4 flex justify-between">
                      <Button variant="outline" size="sm">
                        <Mic className="h-4 w-4 mr-2" />
                        Test Audio
                      </Button>
                      <Button variant="outline" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Switch Camera
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Stream Info</CardTitle>
                    <CardDescription>Connection details for OBS/Streamlabs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium">Stream URL</h3>
                      <div className="mt-1 flex">
                        <Input 
                          value="rtmp://beatstream.live/live" 
                          readOnly 
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">Stream Key</h3>
                      <div className="mt-1 flex gap-2">
                        <Input 
                          type={showStreamKey ? "text" : "password"} 
                          value={streamKey} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowStreamKey(!showStreamKey)}
                        >
                          {showStreamKey ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Important</AlertTitle>
                      <AlertDescription>
                        Never share your stream key with anyone. It grants access to broadcast on your channel.
                      </AlertDescription>
                    </Alert>
                    
                    <div>
                      <h3 className="text-sm font-medium">Required Software</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        OBS Studio, StreamLabs OBS, or XSplit
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
      <MobileNavigation />
      <AudioPlayer />
    </div>
  );
}
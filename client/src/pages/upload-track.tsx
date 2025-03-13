import { useState } from "react";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Music, Upload, Image } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Genre } from "@shared/schema";

// Form schema for track upload
const trackFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  artistName: z.string().min(1, "Artist name is required"),
  genre: z.string().optional(),
  audioFile: z.instanceof(File, { message: "Audio file is required" }),
  coverFile: z.instanceof(File).optional(),
});

type FormValues = z.infer<typeof trackFormSchema>;

export default function UploadTrackPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Get genres for the dropdown
  const { data: genres = [], isLoading: isLoadingGenres } = useQuery<Genre[]>({
    queryKey: ['/api/genres'],
    refetchOnWindowFocus: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(trackFormSchema),
    defaultValues: {
      title: "",
      artistName: user?.displayName || "",
      genre: "",
    },
  });

  // Audio upload mutation
  const audioUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("audio", file);
      const res = await fetch("/api/upload/audio", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("Failed to upload audio file");
      }
      return await res.json();
    },
  });

  // Cover image upload mutation
  const coverUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("Failed to upload cover image");
      }
      return await res.json();
    },
  });

  // Track creation mutation
  const createTrackMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest<any>("POST", "/api/tracks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracks/recent'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/user/${user?.id}`] });

      toast({
        title: "Track uploaded successfully!",
        description: "Your track is now available for listeners.",
      });

      navigate("/library");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create track",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload tracks",
        variant: "destructive",
      });
      return;
    }

    try {
      // First upload the audio file
      const audioResult = await audioUploadMutation.mutateAsync(values.audioFile);

      // If there's a cover image, upload it
      let coverUrl = null;
      if (values.coverFile) {
        const coverResult = await coverUploadMutation.mutateAsync(values.coverFile);
        coverUrl = coverResult.url;
      }

      // Create the track with the file URLs
      await createTrackMutation.mutateAsync({
        userId: user.id,
        title: values.title,
        artistName: values.artistName,
        genre: values.genre === "none" ? null : values.genre,
        audioUrl: audioResult.url,
        coverUrl: coverUrl,
        duration: audioResult.duration,
      });

    } catch (error) {
      console.error("Error in track upload process:", error);
    }
  };

  // Handle audio file change
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("audioFile", file);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setAudioPreview(url);

      // Clean up previous preview URL
      return () => URL.revokeObjectURL(url);
    }
  };

  // Handle cover image change
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("coverFile", file);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setCoverPreview(url);

      // Clean up previous preview URL
      return () => URL.revokeObjectURL(url);
    }
  };

  const isLoading = audioUploadMutation.isPending || coverUploadMutation.isPending || createTrackMutation.isPending;

  return (
    <div className="container py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Upload Track</h1>
        <p className="text-muted-foreground">
          Share your music with the BeatStream community
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Track Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter track title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="artistName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artist Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter artist name" {...field} />
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
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingGenres ? (
                          <SelectItem value="loading" disabled>
                            Loading genres...
                          </SelectItem>
                        ) : (
                          <>
                            <SelectItem value="none">None</SelectItem>
                            {genres.map((genre) => (
                              <SelectItem key={genre.id} value={genre.name}>
                                {genre.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="audioFile"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Audio File</FormLabel>
                    <FormControl>
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="audio-upload"
                          className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50/5 hover:bg-gray-100/10 dark:border-gray-600/40 dark:hover:border-purple-500/50 transition-all duration-300 backdrop-blur-sm group"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <div className="w-16 h-16 mb-3 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all duration-300">
                              <Music className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                            </div>
                            <p className="mb-2 text-base text-gray-400 group-hover:text-gray-300 transition-colors">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-300 transition-colors">
                              MP3, WAV, FLAC or OGG (MAX. 50MB)
                            </p>
                          </div>
                          <input 
                            id="audio-upload" 
                            type="file" 
                            className="hidden" 
                            accept=".mp3,.wav,.flac,.ogg"
                            onChange={handleAudioChange}
                          />
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverFile"
                render={() => (
                  <FormItem>
                    <FormLabel>Cover Image (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="cover-upload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Image className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              JPG, PNG, WebP or GIF (MAX. 5MB)
                            </p>
                          </div>
                          <input 
                            id="cover-upload" 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleCoverChange}
                          />
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Track
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>

        <div>
          <h3 className="text-xl font-medium mb-4">Track Preview</h3>

          <Card className="overflow-hidden">
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {coverPreview ? (
                <img 
                  src={coverPreview} 
                  alt="Cover preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="h-20 w-20 text-gray-400" />
              )}
            </div>

            <CardContent className="p-4">
              <h4 className="font-semibold text-lg truncate">
                {form.watch("title") || "Track Title"}
              </h4>
              <p className="text-sm text-muted-foreground truncate">
                {form.watch("artistName") || "Artist Name"}
              </p>

              {audioPreview && (
                <div className="mt-4">
                  <audio 
                    src={audioPreview} 
                    controls 
                    className="w-full" 
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
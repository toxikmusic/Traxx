import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserSettings, updateUserSettings, updateUserProfile } from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { Camera, Loader2 } from "lucide-react";

// Color options for UI theme
const colorOptions = [
  { name: "Purple", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Orange", value: "#F59E0B" },
  { name: "Pink", value: "#EC4899" },
];

// Sort options for content
const sortOptions = [
  { name: "Recent", value: "recent" },
  { name: "Popular", value: "popular" },
  { name: "Trending", value: "trending" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { primaryColor, setPrimaryColor } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get the authenticated user's ID
  const { user, refetchUser } = useAuth();
  
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['/api/user-settings', user?.id],
    queryFn: () => user ? getUserSettings(user.id) : Promise.reject('No authenticated user'),
    enabled: !!user, // Only run the query if we have a user
  });
  
  // State for appearance and playback settings
  const [selectedColor, setSelectedColor] = useState<string | null>(primaryColor);
  const [enableAutoplay, setEnableAutoplay] = useState<boolean | null>(null);
  const [sortType, setSortType] = useState<string | null>(null);
  
  // State for profile settings
  const [displayName, setDisplayName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Initialize state from fetched settings
  useEffect(() => {
    if (settings) {
      setSelectedColor(settings.uiColor);
      setEnableAutoplay(settings.enableAutoplay);
      setSortType(settings.defaultSortType);
    }
  }, [settings]);
  
  // Initialize profile state from user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setProfileImageUrl(user.profileImageUrl);
    }
  }, [user]);
  
  // Update theme context when color changes
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setPrimaryColor(color);
  };
  
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => user ? updateUserSettings(user.id, data) : Promise.reject('No authenticated user'),
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['/api/user-settings', user.id] });
        toast({
          title: "Settings Updated",
          description: "Your preferences have been saved successfully.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => user ? updateUserProfile(user.id, data) : Promise.reject('No authenticated user'),
    onSuccess: () => {
      if (user) {
        refetchUser();
        toast({
          title: "Profile Updated",
          description: "Your profile has been saved successfully.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      
      return apiRequest<{ url: string }>("/api/upload/image", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header, it will be set automatically with boundary
      });
    },
    onSuccess: (data) => {
      setProfileImageUrl(data.url);
      toast({
        title: "Image Uploaded",
        description: "Your profile image has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File Too Large",
        description: "Image must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingImage(true);
    uploadImageMutation.mutate(file, {
      onSettled: () => {
        setUploadingImage(false);
      }
    });
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const saveSettings = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save settings",
        variant: "destructive",
      });
      return;
    }
    
    updateSettingsMutation.mutate({
      uiColor: selectedColor,
      enableAutoplay,
      defaultSortType: sortType,
    });
  };
  
  const saveProfile = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save profile",
        variant: "destructive",
      });
      return;
    }
    
    updateProfileMutation.mutate({
      displayName,
      bio,
      profileImageUrl,
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
        User Settings
      </h1>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="playback">Playback</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Update your personal profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      {profileImageUrl ? (
                        <AvatarImage src={profileImageUrl} alt="Profile" />
                      ) : (
                        <AvatarFallback>{user?.displayName?.charAt(0) || user?.username.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 rounded-full p-2 h-auto"
                      onClick={triggerFileInput}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label htmlFor="displayName" className="text-base mb-2 block">Display Name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="max-w-md"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="bio" className="text-base mb-2 block">Bio</Label>
                      <Textarea
                        id="bio"
                        value={bio || ""}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell others about yourself"
                        className="max-w-md resize-none h-24"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={saveProfile}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving Profile...
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize how BeatStream looks for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">UI Color</h3>
                  <div className="flex flex-wrap gap-3">
                    {colorOptions.map((color) => (
                      <div
                        key={color.value}
                        className={`w-10 h-10 rounded-full cursor-pointer border-2 ${
                          selectedColor === color.value
                            ? "border-white scale-110"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => handleColorChange(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={saveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="playback">
          <Card>
            <CardHeader>
              <CardTitle>Playback Settings</CardTitle>
              <CardDescription>
                Control how tracks and streams play on BeatStream
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoplay" className="text-base">Autoplay</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically play tracks and streams when navigating
                    </p>
                  </div>
                  <Switch
                    id="autoplay"
                    checked={enableAutoplay || false}
                    onCheckedChange={setEnableAutoplay}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={saveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Content Settings</CardTitle>
              <CardDescription>
                Control how content is displayed to you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Default Sort Order</h3>
                  <div className="flex flex-wrap gap-3">
                    {sortOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={sortType === option.value ? "default" : "outline"}
                        onClick={() => setSortType(option.value)}
                        className="px-4"
                      >
                        {option.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={saveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
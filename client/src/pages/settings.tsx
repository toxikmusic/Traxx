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
import { 
  Camera, 
  Loader2, 
  EyeIcon, 
  Contrast, 
  Sun, 
  Moon, 
  Monitor, 
  Palette,
  Check
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Default color if no settings are found - must match the one in ThemeContext
const DEFAULT_PRIMARY_COLOR = '#8B5CF6'; // Purple

// Color options for UI theme with descriptive names and hex values
const colorOptions = [
  { name: "Purple", value: "#8B5CF6", description: "Creative, imaginative" },
  { name: "Blue", value: "#3B82F6", description: "Calm, trustworthy" },
  { name: "Green", value: "#10B981", description: "Fresh, natural" },
  { name: "Orange", value: "#F59E0B", description: "Energetic, warm" },
  { name: "Pink", value: "#EC4899", description: "Playful, vibrant" },
  { name: "Red", value: "#EF4444", description: "Bold, passionate" },
  { name: "Teal", value: "#14B8A6", description: "Balanced, refreshing" },
  { name: "Indigo", value: "#6366F1", description: "Mysterious, unique" },
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
  const { primaryColor, setPrimaryColor, highContrastMode, setHighContrastMode } = useTheme();
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
  const [enableHighContrast, setEnableHighContrast] = useState<boolean>(highContrastMode);
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
      
      // Initialize high contrast mode if set in settings
      if (settings.highContrastMode !== undefined && settings.highContrastMode !== null) {
        setEnableHighContrast(settings.highContrastMode);
        setHighContrastMode(settings.highContrastMode);
      }
    }
  }, [settings, setHighContrastMode]);
  
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
    
    // Update cache for immediate feedback
    try {
      const cacheData = JSON.parse(localStorage.getItem('traxx_theme_cache') || '{}');
      localStorage.setItem('traxx_theme_cache', JSON.stringify({
        ...cacheData,
        uiColor: color
      }));
      console.log("Color selection cached:", color);
    } catch (e) {
      console.error("Error caching color selection:", e);
    }
  };
  
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => {
      console.log("Updating user settings with data:", data);
      return user ? updateUserSettings(user.id, data) : Promise.reject('No authenticated user');
    },
    onSuccess: (updatedSettings) => {
      console.log("Settings update success, updated settings:", updatedSettings);
      
      // Update localStorage cache with the latest settings
      try {
        localStorage.setItem('traxx_theme_cache', JSON.stringify({
          uiColor: updatedSettings.uiColor,
          highContrastMode: updatedSettings.highContrastMode
        }));
        console.log("Settings cache updated from server response:", updatedSettings);
      } catch (e) {
        console.error("Error saving settings to localStorage:", e);
      }
      
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['/api/user-settings', user.id] });
        toast({
          title: "Settings Updated",
          description: "Your preferences have been saved successfully.",
        });
      }
    },
    onError: (error) => {
      console.error("Settings update error:", error);
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
    
    // Make sure we're sending valid values, not null or undefined
    const settingsToUpdate = {
      uiColor: selectedColor || DEFAULT_PRIMARY_COLOR,
      enableAutoplay: enableAutoplay === null ? false : enableAutoplay,
      defaultSortType: sortType || "recent",
      highContrastMode: enableHighContrast
    };
    
    console.log("Saving settings:", settingsToUpdate);
    
    updateSettingsMutation.mutate(settingsToUpdate);
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
                Customize how Traxx looks for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Palette className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Color Theme</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {colorOptions.map((color) => (
                      <div
                        key={color.value}
                        className={`group cursor-pointer rounded-lg transition-all duration-300 ${
                          selectedColor === color.value
                            ? "ring-2 ring-primary ring-offset-2 bg-muted/40"
                            : "hover:bg-muted/20"
                        }`}
                        onClick={() => handleColorChange(color.value)}
                      >
                        <div className="p-3 flex flex-col items-center">
                          <div 
                            className="w-12 h-12 rounded-full mb-2 relative flex items-center justify-center"
                            style={{ backgroundColor: color.value }}
                          >
                            {selectedColor === color.value && (
                              <Check className="h-5 w-5 text-white" />
                            )}
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{color.name}</div>
                            <div className="text-xs text-muted-foreground">{color.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div
                        className="w-16 h-16 rounded-lg shadow-md flex-shrink-0"
                        style={{ backgroundColor: selectedColor || DEFAULT_PRIMARY_COLOR }}
                      ></div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">Selected Color</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {colorOptions.find(c => c.value === selectedColor)?.name || 'Custom'} - {selectedColor || DEFAULT_PRIMARY_COLOR}
                        </p>
                        <div className="text-xs mb-3">
                          This color will be used throughout the application for buttons, links, and highlights.
                        </div>
                        
                        <div className="flex gap-2 items-center mt-2">
                          <div className="flex-1 max-w-xs">
                            <Label htmlFor="custom-color" className="text-xs font-medium mb-1 block">
                              Custom Hex Color
                            </Label>
                            <div className="flex">
                              <Input
                                id="custom-color"
                                type="text"
                                value={selectedColor || ''}
                                onChange={(e) => {
                                  // Validate hex color format
                                  const input = e.target.value;
                                  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(input) || input === '') {
                                    handleColorChange(input || DEFAULT_PRIMARY_COLOR);
                                  }
                                }}
                                placeholder="#RRGGBB"
                                className="flex-1"
                                maxLength={7}
                              />
                              <div className="relative w-12">
                                <input 
                                  type="color"
                                  value={selectedColor || DEFAULT_PRIMARY_COLOR}
                                  onChange={(e) => handleColorChange(e.target.value)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                />
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="icon"
                                  className="h-full border-l-0 rounded-l-none w-full"
                                >
                                  <Palette className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {!enableHighContrast && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                      <EyeIcon className="h-5 w-5 text-primary" />
                      Preview
                    </h3>
                    <div className="p-4 bg-muted/20 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground mb-4">
                        See how your selected color will look in the application:
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs mb-1 font-medium">Buttons</p>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" style={{backgroundColor: selectedColor || DEFAULT_PRIMARY_COLOR} as React.CSSProperties}>
                                Primary
                              </Button>
                              <Button size="sm" variant="outline">
                                <span style={{color: selectedColor || DEFAULT_PRIMARY_COLOR} as React.CSSProperties}>Outline</span>
                              </Button>
                              <Button size="sm" variant="ghost">
                                <span style={{color: selectedColor || DEFAULT_PRIMARY_COLOR} as React.CSSProperties}>Ghost</span>
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs mb-1 font-medium">Switch</p>
                            <Switch checked={true} style={{"--thumb-size": "1rem", "--track-padding": "2px", backgroundColor: selectedColor || DEFAULT_PRIMARY_COLOR} as any} />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs mb-1 font-medium">Links</p>
                            <div className="space-y-1">
                              <p>Regular text with a <a href="#" style={{color: selectedColor || DEFAULT_PRIMARY_COLOR, textDecoration: "underline"} as React.CSSProperties}>colored link</a> inside.</p>
                              <a href="#" style={{color: selectedColor || DEFAULT_PRIMARY_COLOR} as React.CSSProperties}>Standalone link</a>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs mb-1 font-medium">Badge</p>
                            <div className="flex gap-2">
                              <span className="px-2 py-1 text-xs rounded-full text-white" style={{backgroundColor: selectedColor || DEFAULT_PRIMARY_COLOR} as React.CSSProperties}>
                                Badge
                              </span>
                              <span className="px-2 py-1 text-xs rounded-full border" style={{color: selectedColor || DEFAULT_PRIMARY_COLOR, borderColor: selectedColor || DEFAULT_PRIMARY_COLOR} as React.CSSProperties}>
                                Outline
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col space-y-4 mt-8 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="high-contrast" className="flex items-center gap-2 text-base">
                        <Contrast className="h-5 w-5 text-primary" />
                        High Contrast Mode
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Increases contrast for better readability and accessibility
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {enableHighContrast ? "On" : "Off"}
                      </span>
                      <Switch
                        id="high-contrast"
                        checked={enableHighContrast}
                        onCheckedChange={(checked) => {
                          setEnableHighContrast(checked);
                          setHighContrastMode(checked);
                          
                          // Also update localStorage for immediate feedback
                          try {
                            const cacheData = JSON.parse(localStorage.getItem('traxx_theme_cache') || '{}');
                            localStorage.setItem('traxx_theme_cache', JSON.stringify({
                              ...cacheData,
                              highContrastMode: checked
                            }));
                            console.log("High contrast mode cached:", checked);
                          } catch (e) {
                            console.error("Error caching high contrast mode:", e);
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  {enableHighContrast && (
                    <div className="p-3 bg-yellow-400 text-black rounded-md text-sm mt-2">
                      <div className="font-medium">High Contrast Mode Active</div>
                      <p className="text-xs mt-1">
                        This mode overrides your color selection to provide maximum readability.
                        Toggle the switch to "Off" to disable high contrast mode.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // Reset to defaults
                  setSelectedColor(DEFAULT_PRIMARY_COLOR);
                  setPrimaryColor(DEFAULT_PRIMARY_COLOR);
                  setEnableHighContrast(false);
                  setHighContrastMode(false);
                  
                  // Update localStorage cache with default settings
                  try {
                    localStorage.setItem('traxx_theme_cache', JSON.stringify({
                      uiColor: DEFAULT_PRIMARY_COLOR,
                      highContrastMode: false
                    }));
                    console.log("Theme cache reset to defaults");
                  } catch (e) {
                    console.error("Error resetting theme cache:", e);
                  }
                  
                  // Save reset settings to database
                  if (user) {
                    const defaultSettings = {
                      uiColor: DEFAULT_PRIMARY_COLOR,
                      enableAutoplay: true,
                      defaultSortType: "recent",
                      highContrastMode: false
                    };
                    
                    updateSettingsMutation.mutate(defaultSettings);
                  }
                  
                  toast({
                    title: "Settings Reset",
                    description: "Appearance settings have been reset to defaults.",
                  });
                }}
                disabled={updateSettingsMutation.isPending}
              >
                Reset to Defaults
              </Button>
              
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
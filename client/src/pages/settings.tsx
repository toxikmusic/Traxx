import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserSettings, updateUserSettings } from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/context/ThemeContext";

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
  
  // For demo purposes, using a fixed user ID
  // In a real app, this would come from authentication
  const userId = 1;
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/user-settings', userId],
    queryFn: () => getUserSettings(userId),
  });
  
  const [selectedColor, setSelectedColor] = useState<string | null>(primaryColor);
  const [enableAutoplay, setEnableAutoplay] = useState<boolean | null>(null);
  const [sortType, setSortType] = useState<string | null>(null);
  
  // Initialize state from fetched settings
  useEffect(() => {
    if (settings) {
      setSelectedColor(settings.uiColor);
      setEnableAutoplay(settings.enableAutoplay);
      setSortType(settings.defaultSortType);
    }
  }, [settings]);
  
  // Update theme context when color changes
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setPrimaryColor(color);
  };
  
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => updateUserSettings(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-settings', userId] });
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const saveSettings = () => {
    updateSettingsMutation.mutate({
      uiColor: selectedColor,
      enableAutoplay,
      defaultSortType: sortType,
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
      
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="playback">Playback</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>
        
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
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={updateSettingsMutation.isPending}
          className="px-6"
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
      </div>
    </div>
  );
}
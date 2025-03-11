import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import AudioPlayer from '@/components/layout/AudioPlayer';

export default function GoLivePage() {
  const { toast } = useToast();
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [saveStream, setSaveStream] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: 'Stream created!',
        description: 'Your live stream has started successfully.',
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-4 pt-16 pb-20 md:pb-10 lg:pl-72">
          <div className="container max-w-3xl mx-auto pt-6">
            <h1 className="text-3xl font-bold mb-6">Go Live</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Stream Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="streamTitle">Stream Title</Label>
                      <Input
                        id="streamTitle"
                        value={streamTitle}
                        onChange={(e) => setStreamTitle(e.target.value)}
                        placeholder="Give your stream a title"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="streamDescription">Description</Label>
                      <Textarea
                        id="streamDescription"
                        value={streamDescription}
                        onChange={(e) => setStreamDescription(e.target.value)}
                        placeholder="Describe what your stream is about"
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g. Electronic, Hip-Hop, Production"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input
                        id="tags"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="e.g. live production, house, remix"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
                      <Input
                        id="thumbnailUrl"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        placeholder="https://example.com/thumbnail.jpg"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox 
                        id="saveStream" 
                        checked={saveStream} 
                        onCheckedChange={(checked) => setSaveStream(checked as boolean)} 
                      />
                      <Label htmlFor="saveStream" className="text-sm font-normal">
                        Save stream for followers to watch later
                      </Label>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Spinner className="mr-2" size="sm" />
                          Starting stream...
                        </>
                      ) : 'Start Stream'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Stream Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-md flex items-center justify-center">
                      <p className="text-white/70 text-sm">Your camera preview will appear here</p>
                    </div>
                    <div className="mt-4 flex justify-between">
                      <Button variant="outline" size="sm">Test Audio</Button>
                      <Button variant="outline" size="sm">Switch Camera</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Stream Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium">Stream URL</h3>
                      <p className="text-sm text-muted-foreground mt-1">rtmp://beatstream.live/live/[YOUR_STREAM_KEY]</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">Stream Key</h3>
                      <div className="mt-1 flex gap-2">
                        <Input type="password" value="••••••••••••••••" readOnly />
                        <Button variant="outline" size="sm">Show</Button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">Required Software</h3>
                      <p className="text-sm text-muted-foreground mt-1">OBS Studio, StreamLabs OBS, or XSplit</p>
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
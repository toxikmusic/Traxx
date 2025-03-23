import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import LiveStream from "@/components/LiveStream";
import { useToast } from "@/hooks/use-toast";

export default function GoLiveWebRTC() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to start a live stream.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [user, navigate, toast]);

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Live Streaming Studio</h1>
      <p className="text-zinc-400 mb-8">
        Create and share live streams with your audience using our new WebRTC-based streaming platform.
      </p>
      
      <LiveStream 
        userId={user?.id} 
        userName={user?.username || user?.displayName} 
      />
    </div>
  );
}
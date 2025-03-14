import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { 
  FaFacebook, 
  FaTwitter, 
  FaLinkedin, 
  FaReddit, 
  FaWhatsapp,
  FaTelegramPlane,
  FaHome
} from "react-icons/fa";

export default function SharePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentData, setContentData] = useState<{
    title: string;
    description: string;
    url: string;
    type: string;
    imageUrl?: string;
  } | null>(null);

  useEffect(() => {
    // Parse the URL parameters
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const type = params.get('type');

    if (!id || !type) {
      setError("Missing content information");
      setLoading(false);
      return;
    }

    // We would typically fetch content data here based on type and ID
    // For now, we'll use the parameters directly
    setContentData({
      title: params.get('title') || 'Content on BeatStream',
      description: params.get('description') || '',
      url: window.location.origin + params.get('returnUrl') || '/',
      type: type,
      imageUrl: params.get('imageUrl') || undefined
    });
    
    setLoading(false);
  }, []);

  // Function to share to social platforms
  const shareToSocial = (platform: string) => {
    if (!contentData) return;
    
    const shareText = `Check out this ${contentData.type} on BeatStream: ${contentData.title}`;
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(contentData.url);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'reddit':
        shareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  // Copy link to clipboard
  const copyToClipboard = async () => {
    if (!contentData) return;
    
    try {
      await navigator.clipboard.writeText(contentData.url);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Failed to copy",
        description: "Please try again or copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const goBack = () => {
    if (contentData?.url) {
      // Ensure we're using proper URL handling for navigation
      const url = new URL(contentData.url, window.location.origin);
      navigate(url.pathname);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-background/80">
        <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-6 border">
          <h1 className="text-2xl font-bold text-destructive mb-4 text-center">Error</h1>
          <p className="text-center mb-6">{error}</p>
          <Button 
            className="w-full flex items-center justify-center gap-2" 
            onClick={() => navigate('/')}
          >
            <FaHome size={16} />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-background/80">
      <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-6 border">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Share {contentData?.type}
        </h1>
        
        {contentData?.imageUrl && (
          <div className="mb-6 rounded-md overflow-hidden">
            <img 
              src={contentData.imageUrl} 
              alt={contentData.title} 
              className="w-full h-40 object-cover"
            />
          </div>
        )}
        
        <div className="mb-6">
          <h2 className="font-semibold text-lg mb-1">{contentData?.title}</h2>
          {contentData?.description && (
            <p className="text-sm text-muted-foreground">{contentData.description}</p>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center p-4 h-auto gap-2" 
            onClick={() => shareToSocial('facebook')}
          >
            <FaFacebook size={24} className="text-blue-600" />
            <span className="text-xs">Facebook</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center p-4 h-auto gap-2" 
            onClick={() => shareToSocial('twitter')}
          >
            <FaTwitter size={24} className="text-sky-500" />
            <span className="text-xs">Twitter</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center p-4 h-auto gap-2" 
            onClick={() => shareToSocial('whatsapp')}
          >
            <FaWhatsapp size={24} className="text-green-500" />
            <span className="text-xs">WhatsApp</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center p-4 h-auto gap-2" 
            onClick={() => shareToSocial('telegram')}
          >
            <FaTelegramPlane size={24} className="text-blue-500" />
            <span className="text-xs">Telegram</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center p-4 h-auto gap-2" 
            onClick={() => shareToSocial('linkedin')}
          >
            <FaLinkedin size={24} className="text-blue-700" />
            <span className="text-xs">LinkedIn</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center p-4 h-auto gap-2" 
            onClick={() => shareToSocial('reddit')}
          >
            <FaReddit size={24} className="text-orange-600" />
            <span className="text-xs">Reddit</span>
          </Button>
        </div>
        
        <div className="space-y-4">
          <Button className="w-full" onClick={copyToClipboard}>
            Copy Link
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={goBack}
          >
            Return to Content
          </Button>
        </div>
      </div>
    </div>
  );
}
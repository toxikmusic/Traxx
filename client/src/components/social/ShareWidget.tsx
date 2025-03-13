import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  FaFacebook, 
  FaTwitter, 
  FaLinkedin, 
  FaReddit, 
  FaLink,
  FaWhatsapp,
  FaTelegramPlane,
  FaShareAlt
} from 'react-icons/fa';
import { Button } from "@/components/ui/button";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface ShareWidgetProps {
  title: string;
  description?: string;
  url: string;
  type: 'track' | 'stream' | 'post'; // Content type being shared
  compact?: boolean; // For smaller layout
  className?: string;
}

export default function ShareWidget({ 
  title, 
  description = "", 
  url, 
  type, 
  compact = false,
  className 
}: ShareWidgetProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  
  // Ensure we have an absolute URL
  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  
  // Prepare sharing text based on content type
  const shareText = `Check out this ${type === 'track' ? 'track' : type === 'stream' ? 'live stream' : 'post'} on BeatStream: ${title}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(fullUrl);
  
  // Extract ID from URL
  const getIdFromUrl = (url: string) => {
    // Simple extraction from path like "/stream/123" or "/track/456"
    const matches = url.match(/\/([^\/]+)\/(\d+)/);
    return matches ? matches[2] : '';
  };
  
  // Sharing URLs for different platforms
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
  };
  
  // Function to open share dialog
  const shareToSocial = (platform: keyof typeof shareUrls) => {
    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };
  
  // Open dedicated share page
  const openSharePage = () => {
    const contentId = getIdFromUrl(url);
    const sharePageUrl = `/share?id=${contentId}&type=${type}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&returnUrl=${encodeURIComponent(url)}`;
    navigate(sharePageUrl);
  };
  
  // Copy link to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
        duration: 3000,
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Failed to copy",
        description: "Please try again or copy the link manually.",
        variant: "destructive",
      });
    }
  };
  
  // Icon size based on compact mode
  const iconSize = compact ? 16 : 20;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size={compact ? "sm" : "default"}
          className={cn("gap-2", className)}
        >
          <Share2 size={iconSize} />
          {!compact && "Share"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-[300px] p-2">
        <div className="p-2">
          <h3 className="font-semibold mb-2">Share this {type}</h3>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <Button 
              variant="outline" 
              className="p-2 h-10 aspect-square" 
              onClick={() => shareToSocial('facebook')}
              title="Share to Facebook"
            >
              <FaFacebook size={iconSize} className="text-blue-600" />
            </Button>
            <Button 
              variant="outline" 
              className="p-2 h-10 aspect-square" 
              onClick={() => shareToSocial('twitter')}
              title="Share to Twitter"
            >
              <FaTwitter size={iconSize} className="text-sky-500" />
            </Button>
            <Button 
              variant="outline" 
              className="p-2 h-10 aspect-square" 
              onClick={() => shareToSocial('whatsapp')}
              title="Share to WhatsApp"
            >
              <FaWhatsapp size={iconSize} className="text-green-500" />
            </Button>
            <Button 
              variant="outline" 
              className="p-2 h-10 aspect-square" 
              onClick={() => shareToSocial('telegram')}
              title="Share to Telegram"
            >
              <FaTelegramPlane size={iconSize} className="text-blue-500" />
            </Button>
          </div>
          
          <div className="flex gap-2 mb-3">
            <Button 
              variant="outline" 
              className="flex-1 h-10 justify-start" 
              onClick={copyToClipboard}
              title="Copy link"
            >
              <FaLink size={iconSize} className={cn(
                "mr-2", 
                copied ? "text-green-500" : "text-gray-500"
              )} />
              {copied ? "Copied!" : "Copy link"}
            </Button>
            
            <Button 
              variant="outline" 
              className="flex-1 h-10 justify-start" 
              onClick={openSharePage}
              title="More sharing options"
            >
              <FaShareAlt size={iconSize} className="mr-2 text-primary" />
              More options
            </Button>
          </div>
          
          {!compact && (
            <div className="text-xs text-muted-foreground">
              Share this content with your friends and followers!
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
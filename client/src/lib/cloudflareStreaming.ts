/**
 * Cloudflare Streaming Integration Service
 * Provides integration with Cloudflare Stream for live audio broadcasting
 */
import axios from 'axios';
import { apiRequest } from './queryClient';

interface CloudflareStreamOptions {
  streamKey?: string;
  rtmpsUrl?: string;
  websocketUrl?: string;
  playbackUrl?: string;
}

export interface CloudflareStreamStatus {
  isLive: boolean;
  streamId?: string;
  viewerCount: number;
  health?: 'healthy' | 'unhealthy';
  audioLevel?: number;
}

interface StreamKeyResponse {
  streamKey: string;
  rtmpsKey?: string;
  rtmpsUrl: string;
  playbackKey?: string;
  playbackUrl: string;
  webRtcUrl?: string;
  webRtcPlayUrl?: string;
  accountId?: string;
}

class CloudflareStreamingService {
  private streamKey: string = '';
  private rtmpsKey: string = '';
  private rtmpsUrl: string = 'rtmps://live.cloudflare.com:443/live/';
  private playbackKey: string = '';
  private playbackUrl: string = '';
  private webRtcUrl: string = '';
  private webRtcPlayUrl: string = '';
  private accountId: string = '';
  private streamStatus: CloudflareStreamStatus = {
    isLive: false,
    viewerCount: 0,
  };
  private onStatusChangeCallbacks: ((status: CloudflareStreamStatus) => void)[] = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  
  /**
   * Initialize the Cloudflare streaming service with options
   */
  async initialize(options: CloudflareStreamOptions = {}): Promise<boolean> {
    try {
      // Set options if provided
      if (options.streamKey) this.streamKey = options.streamKey;
      if (options.rtmpsUrl) this.rtmpsUrl = options.rtmpsUrl;
      if (options.websocketUrl) this.webRtcPlayUrl = options.websocketUrl;
      if (options.playbackUrl) this.playbackUrl = options.playbackUrl;
      
      // If stream key is not provided, fetch it from our API
      if (!this.streamKey) {
        try {
          // Use axios directly to avoid type issues with the apiRequest function
          const response = await axios.get('/api/cloudflare/stream-key', {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            withCredentials: true
          });
          
          if (response && response.status === 200 && response.data) {
            const data = response.data as StreamKeyResponse;
            this.streamKey = data.streamKey;
            
            // Store all the new credentials if they exist
            if (data.rtmpsKey) this.rtmpsKey = data.rtmpsKey;
            if (data.rtmpsUrl) this.rtmpsUrl = data.rtmpsUrl;
            if (data.playbackKey) this.playbackKey = data.playbackKey;
            if (data.playbackUrl) this.playbackUrl = data.playbackUrl;
            if (data.webRtcUrl) this.webRtcUrl = data.webRtcUrl;
            if (data.webRtcPlayUrl) this.webRtcPlayUrl = data.webRtcPlayUrl;
            if (data.accountId) this.accountId = data.accountId;
            
            console.log('Successfully fetched Cloudflare stream key and credentials');
            console.log(`Stream key: ${this.streamKey}`);
            console.log(`WebRTC URL: ${this.webRtcUrl}`);
          } else {
            console.error('Failed to fetch Cloudflare stream key');
            return false;
          }
        } catch (error) {
          console.error('Error fetching stream key:', error);
          return false;
        }
      }
      
      // Start polling for stream status
      this.startStatusPolling();
      
      return true;
    } catch (error) {
      console.error('Error initializing Cloudflare streaming service:', error);
      return false;
    }
  }
  
  /**
   * Get the RTMPS URL for streaming
   */
  getRtmpsUrl(): string {
    if (this.rtmpsKey) {
      return `${this.rtmpsUrl}${this.rtmpsKey}`;
    }
    return `${this.rtmpsUrl}${this.streamKey}`;
  }
  
  /**
   * Get the WebRTC broadcasting URL 
   */
  getWebRtcUrl(): string {
    return this.webRtcUrl;
  }
  
  /**
   * Get the WebSocket URL for playback
   */
  getWebSocketUrl(): string {
    return this.webRtcPlayUrl || `wss://live.cloudflare.com/webrtc/play/${this.streamKey}`;
  }
  
  /**
   * Get the HLS/DASH playback URL
   */
  getPlaybackUrl(): string {
    return this.playbackUrl || `https://customer-streams.cloudflarestream.com/${this.streamKey}/manifest/video.m3u8`;
  }
  
  /**
   * Get current stream status
   */
  getStreamStatus(): CloudflareStreamStatus {
    return { ...this.streamStatus };
  }
  
  /**
   * Register a callback for stream status changes
   */
  onStatusChange(callback: (status: CloudflareStreamStatus) => void): void {
    this.onStatusChangeCallbacks.push(callback);
  }
  
  /**
   * Clean up resources when no longer needed
   */
  dispose(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  /**
   * Poll for stream status
   */
  private startStatusPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.pollingInterval = setInterval(() => {
      this.fetchStreamStatus().then(status => {
        if (status) {
          // Update stream status if changed
          const hasChanged = JSON.stringify(this.streamStatus) !== JSON.stringify(status);
          if (hasChanged) {
            this.streamStatus = status;
            this.notifyStatusChange();
          }
        }
      });
    }, 5000); // Poll every 5 seconds
  }
  
  /**
   * Fetch the current stream status
   */
  private async fetchStreamStatus(): Promise<CloudflareStreamStatus | null> {
    try {
      // In a real implementation, we would call our backend which would then communicate with Cloudflare
      // For now, simulate a status
      return {
        isLive: true,
        streamId: this.streamKey,
        viewerCount: Math.floor(Math.random() * 100), // Simulate random viewers
        health: 'healthy',
        audioLevel: -20 + Math.random() * 15 // Simulate audio level between -20 and -5 dB
      };
    } catch (error) {
      console.error('Error fetching stream status:', error);
      return null;
    }
  }
  
  /**
   * Notify all status change callbacks
   */
  private notifyStatusChange(): void {
    const status = this.getStreamStatus();
    this.onStatusChangeCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status change callback:', error);
      }
    });
  }
}

// Export singleton instance
export const cloudflareStreamingService = new CloudflareStreamingService();
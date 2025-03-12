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
  private credentialsVerified: boolean = false;
  
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
          // First try the authenticated endpoint, and if that fails, use the test endpoint
          let response;
          
          try {
            // Try the authenticated endpoint first
            response = await axios.get('/api/cloudflare/stream-key', {
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
              },
              withCredentials: true
            });
          } catch (authError) {
            console.log("Could not get authenticated stream key, using test endpoint");
            
            // If that fails, use the test endpoint which doesn't require authentication
            response = await axios.get('/api/test/cloudflare/stream-key', {
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
              }
            });
          }
          
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
   * Verify Cloudflare credentials are properly configured
   */
  async verifyCredentials(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Call our API test endpoint to verify Cloudflare credentials
      const response = await apiRequest<any>('GET', '/api/admin/test-cloudflare');
      this.credentialsVerified = true;
      return {
        success: true,
        message: "Cloudflare credentials verified successfully",
        details: response
      };
    } catch (error: any) {
      // If there's an authentication error, ask user to login first
      if (error.status === 401) {
        return {
          success: false,
          message: "Authentication required. Please login first."
        };
      }
      
      // If there's an API key missing error
      if (error.status === 400) {
        return {
          success: false,
          message: "Cloudflare API key not configured. Please check your environment variables."
        };
      }
      
      // For all other errors
      console.error("Error verifying Cloudflare credentials:", error);
      return {
        success: false,
        message: error.message || "Unknown error verifying Cloudflare credentials",
        details: error.data
      };
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
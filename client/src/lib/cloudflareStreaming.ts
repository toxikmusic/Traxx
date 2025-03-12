/**
 * Cloudflare Streaming Integration Service
 * Provides integration with Cloudflare Stream for live audio broadcasting
 */

interface CloudflareStreamOptions {
  accountId?: string;
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

class CloudflareStreamingService {
  private apiKey: string = process.env.CLOUDFLARE_API_KEY || '';
  private accountId: string = '';
  private streamKey: string = '';
  private rtmpsUrl: string = 'rtmps://live.cloudflare.com:443/live/';
  private websocketUrl: string = 'wss://live.cloudflare.com/webrtc/play/';
  private playbackUrl: string = 'https://customer-streams.cloudflarestream.com/';
  private streamStatus: CloudflareStreamStatus = {
    isLive: false,
    viewerCount: 0,
  };
  private onStatusChangeCallbacks: ((status: CloudflareStreamStatus) => void)[] = [];
  
  /**
   * Initialize the Cloudflare streaming service with API key and options
   */
  async initialize(options: CloudflareStreamOptions = {}): Promise<boolean> {
    try {
      // Set options if provided
      if (options.accountId) this.accountId = options.accountId;
      if (options.streamKey) this.streamKey = options.streamKey;
      if (options.rtmpsUrl) this.rtmpsUrl = options.rtmpsUrl;
      if (options.websocketUrl) this.websocketUrl = options.websocketUrl;
      if (options.playbackUrl) this.playbackUrl = options.playbackUrl;
      
      // Validate we have the necessary information
      if (!this.apiKey) {
        console.error('Cloudflare API key is not set');
        return false;
      }
      
      // If account ID is not provided, fetch it
      if (!this.accountId) {
        const accountInfo = await this.fetchAccountInfo();
        if (accountInfo && accountInfo.id) {
          this.accountId = accountInfo.id;
        } else {
          console.error('Failed to fetch Cloudflare account information');
          return false;
        }
      }
      
      // If stream key is not provided, create or fetch a stream
      if (!this.streamKey) {
        const streamInfo = await this.createOrGetStream();
        if (streamInfo && streamInfo.uid) {
          this.streamKey = streamInfo.uid;
        } else {
          console.error('Failed to create or get stream information');
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
    return `${this.rtmpsUrl}${this.streamKey}`;
  }
  
  /**
   * Get the WebSocket URL for playback
   */
  getWebSocketUrl(): string {
    return `${this.websocketUrl}${this.streamKey}`;
  }
  
  /**
   * Get the HLS/DASH playback URL
   */
  getPlaybackUrl(): string {
    return `${this.playbackUrl}${this.streamKey}/manifest/video.m3u8`;
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
   * Fetch account information from Cloudflare
   */
  private async fetchAccountInfo(): Promise<any> {
    try {
      // In a real implementation, this would make an API call to Cloudflare
      // For now, return a stub since we're using the API key directly
      return { id: 'default-account' };
    } catch (error) {
      console.error('Error fetching account info:', error);
      return null;
    }
  }
  
  /**
   * Create a new stream or get an existing one
   */
  private async createOrGetStream(): Promise<any> {
    try {
      // This would make an API call to Cloudflare to create or get a stream
      // For now, use the API key itself as the stream ID (just for demonstration)
      return { uid: this.apiKey.substring(0, 20) };
    } catch (error) {
      console.error('Error creating/getting stream:', error);
      return null;
    }
  }
  
  /**
   * Poll for stream status
   */
  private startStatusPolling(): void {
    setInterval(() => {
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
      // This would make an API call to Cloudflare to get stream status
      // For now, return a stub status
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
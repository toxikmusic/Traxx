/**
 * Enhanced Audio and Video Streaming Service
 * Handles media capture, processing, and streaming for the platform
 */

export interface MediaStreamSettings {
  // Audio settings
  sampleRate?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  channelCount?: number;
  
  // Video settings
  enableVideo?: boolean;
  videoQuality?: 'low' | 'standard' | 'high';
  frameRate?: number;
  facingMode?: 'user' | 'environment';
}

export interface StreamStatus {
  isLive: boolean;
  streamId?: number;
  viewerCount: number;
  startTime?: Date;
  peakViewerCount: number;
  audioLevel?: number;
  hasVideo?: boolean;
  hasMic?: boolean;
  error?: string;
}

export class AudioVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private lastDrawTime: number = 0;
  private visualizerTheme: 'standard' | 'purple' | 'high-contrast' = 'purple'; // Default theme

  constructor(canvas: HTMLCanvasElement, analyser: AnalyserNode) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!; // Optimize for mobile GPU
    this.analyser = analyser;
    this.dataArray = new Uint8Array(analyser.frequencyBinCount);
    this.lastDrawTime = 0;

    // Better touch handling for mobile
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  setTheme(theme: 'standard' | 'purple' | 'high-contrast') {
    this.visualizerTheme = theme;
  }

  draw() {
    // Throttle drawing on mobile for better performance
    const now = performance.now();
    if (now - this.lastDrawTime < 1000 / 30) { // 30fps on mobile
      requestAnimationFrame(() => this.draw());
      return;
    }
    this.lastDrawTime = now;

    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.analyser.getByteFrequencyData(this.dataArray);

    const barWidth = width / this.dataArray.length;
    let x = 0;

    // Theme settings
    let mainColor, gradientTop, gradientBottom;
    
    switch (this.visualizerTheme) {
      case 'purple':
        mainColor = '#9333ea';
        gradientTop = '#c084fc';
        gradientBottom = '#7e22ce';
        break;
      case 'high-contrast':
        mainColor = '#ffff00';
        gradientTop = '#ffffff';
        gradientBottom = '#ffff00';
        break;
      case 'standard':
      default:
        mainColor = '#4CAF50';
        gradientTop = '#8BC34A';
        gradientBottom = '#2E7D32';
    }

    // Draw bars with gradient
    for (let i = 0; i < this.dataArray.length; i++) {
      const barHeight = (this.dataArray[i] / 255) * height;
      const y = height - barHeight;
      
      // Create gradient for each bar
      const gradient = this.ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, gradientTop);
      gradient.addColorStop(1, gradientBottom);
      this.ctx.fillStyle = gradient;
      
      // Draw rounded bars
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, barWidth - 1, barHeight, 2);
      this.ctx.fill();
      
      // Add outline for high contrast mode
      if (this.visualizerTheme === 'high-contrast') {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
      
      x += barWidth;
    }
    
    requestAnimationFrame(() => this.draw());
  }
}

export type MediaDevice = {
  deviceId: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
  label: string;
  groupId: string;
};

export class MediaStreamingService {
  // Media stream handling
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private videoElement: HTMLVideoElement | null = null;
  
  // Media devices
  private availableDevices: MediaDevice[] = [];
  private selectedAudioDeviceId: string = '';
  private selectedVideoDeviceId: string = '';
  
  // WebSocket connection
  private socket: WebSocket | null = null;
  private streamKey: string = "";
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  
  // Audio processing
  private audioProcessorNode: AudioWorkletNode | null = null;
  private frequencyData: Uint8Array | null = null;
  
  // Status tracking
  private streamStatus: StreamStatus = {
    isLive: false,
    viewerCount: 0,
    peakViewerCount: 0,
    audioLevel: -60,
    hasVideo: false,
    hasMic: false
  };
  
  // Callbacks
  private onStatusChangeCallbacks: ((status: StreamStatus) => void)[] = [];
  private onVisualizeCallbacks: ((data: Uint8Array) => void)[] = [];
  private visualizer: AudioVisualizer | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private onDevicesChangeCallbacks: ((devices: MediaDevice[]) => void)[] = [];

  constructor() {
    // Create Audio Context when needed (due to browser autoplay policies)
    
    // Bind the deviceChange handler to this instance so it works correctly with event listeners
    this.handleDeviceChange = this.handleDeviceChange.bind(this);
    
    // Listen for device changes
    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
    }
  }

  /**
   * Initialize media capture devices and prepare for streaming
   */
  async initialize(settings: MediaStreamSettings = {}): Promise<boolean> {
    try {
      // Merge default and custom settings
      const streamSettings = { 
        // Audio defaults
        sampleRate: 48000, 
        echoCancellation: false, 
        noiseSuppression: false, 
        autoGainControl: false, 
        channelCount: 2,
        
        // Video defaults
        enableVideo: true,
        videoQuality: 'standard',
        frameRate: 30,
        facingMode: 'user',
        
        // Merge with provided settings
        ...settings 
      };

      console.log("Requesting media permissions...");
      
      // Convert videoQuality to constraints
      let videoConstraints: boolean | MediaTrackConstraints = streamSettings.enableVideo;
      
      if (streamSettings.enableVideo) {
        const qualityMap = {
          low: { width: 640, height: 360 },
          standard: { width: 1280, height: 720 },
          high: { width: 1920, height: 1080 }
        };
        
        const quality = qualityMap[streamSettings.videoQuality as keyof typeof qualityMap] || qualityMap.standard;
        
        videoConstraints = {
          width: { ideal: quality.width },
          height: { ideal: quality.height },
          frameRate: { ideal: streamSettings.frameRate },
          facingMode: streamSettings.facingMode
        };
      }
      
      // Request media access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: streamSettings as MediaTrackConstraints,
        video: videoConstraints
      });
      
      // Update status with available tracks
      this.streamStatus.hasVideo = this.stream.getVideoTracks().length > 0;
      this.streamStatus.hasMic = this.stream.getAudioTracks().length > 0;
      
      console.log("Media permissions granted:", {
        tracks: this.stream.getTracks().map(t => `${t.kind}:${t.label}`),
        hasVideo: this.streamStatus.hasVideo,
        hasMic: this.streamStatus.hasMic
      });

      // Create audio context with desired sample rate
      this.audioContext = new AudioContext({
        sampleRate: streamSettings.sampleRate
      });

      // Only set up audio processing if we have audio tracks
      if (this.streamStatus.hasMic) {
        // Create source node from the input stream
        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

        // Create analyzer for visualizations
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);

        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 1.0;

        // Connect the audio graph
        this.sourceNode.connect(this.analyserNode);
        this.analyserNode.connect(this.gainNode);

        // Start visualization process
        this.setupVisualizationLoop();
      }

      return true;
    } catch (error) {
      console.error("Error initializing media streaming:", error);
      
      // Set a more descriptive error message based on the error
      let errorMsg = "Unknown error";
      if (error instanceof Error) {
        errorMsg = error.message;
        
        // Special handling for common permission errors
        if (errorMsg.includes("Permission denied") || errorMsg.includes("NotAllowedError")) {
          errorMsg = "Media access permission denied. Please allow camera/microphone access.";
        }
      }
      
      this.streamStatus.error = errorMsg;
      this.notifyStatusChange();
      
      return false;
    }
  }
  
  /**
   * Start capturing audio/video for preview
   */
  startCapture(): boolean {
    try {
      if (!this.stream) {
        console.error("No media stream available");
        return false;
      }
      
      // Enable all tracks in the stream
      this.stream.getTracks().forEach(track => {
        track.enabled = true;
      });
      
      console.log("Media capture started with tracks:", 
        this.stream.getTracks().map(t => `${t.kind}:${t.label}:${t.enabled}`));
      
      return true;
    } catch (error) {
      console.error("Error starting media capture:", error);
      return false;
    }
  }
  
  /**
   * Attach video stream to a video element
   */
  attachVideo(videoElement: HTMLVideoElement): boolean {
    try {
      if (!this.stream || !this.streamStatus.hasVideo) {
        console.error("No video track available");
        return false;
      }
      
      this.videoElement = videoElement;
      videoElement.srcObject = this.stream;
      videoElement.muted = true; // Prevent feedback
      
      return true;
    } catch (error) {
      console.error("Error attaching video:", error);
      return false;
    }
  }
  
  /**
   * Toggle video track on/off
   */
  toggleVideo(enabled: boolean): boolean {
    try {
      if (!this.stream) return false;
      
      const videoTracks = this.stream.getVideoTracks();
      if (videoTracks.length === 0) return false;
      
      videoTracks.forEach(track => {
        track.enabled = enabled;
      });
      
      this.streamStatus.hasVideo = enabled;
      this.notifyStatusChange();
      
      return true;
    } catch (error) {
      console.error("Error toggling video:", error);
      return false;
    }
  }
  
  /**
   * Toggle audio track on/off
   */
  toggleAudio(enabled: boolean): boolean {
    try {
      if (!this.stream) return false;
      
      const audioTracks = this.stream.getAudioTracks();
      if (audioTracks.length === 0) return false;
      
      audioTracks.forEach(track => {
        track.enabled = enabled;
      });
      
      this.streamStatus.hasMic = enabled;
      this.notifyStatusChange();
      
      return true;
    } catch (error) {
      console.error("Error toggling audio:", error);
      return false;
    }
  }
  
  /**
   * Initialize visualization with a canvas element
   */
  startVisualization(canvas?: HTMLCanvasElement): void {
    if (canvas && this.analyserNode) {
      this.visualizer = new AudioVisualizer(canvas, this.analyserNode);
      this.visualizer.draw();
    } else if (this.analyserNode && this.frequencyData) {
      // Start the internal visualization loop if no canvas provided
      this.setupInternalVisualization();
    }
  }
  
  /**
   * Private: Setup internal visualization without a canvas element
   * Used for audio level monitoring when no visual display is needed
   */
  private setupInternalVisualization(): void {
    if (!this.analyserNode || !this.frequencyData) return;
    
    const updateInternalVisualization = () => {
      if (!this.analyserNode || !this.frequencyData) return;
      
      // Get frequency data
      this.analyserNode.getByteFrequencyData(this.frequencyData);
      
      // Calculate audio level from frequency data
      let sum = 0;
      for (let i = 0; i < this.frequencyData.length; i++) {
        sum += this.frequencyData[i];
      }
      const average = sum / this.frequencyData.length;
      
      // Convert to dB scale (rough approximation)
      // -60dB (quiet) to 0dB (loud)
      const dbLevel = average === 0 ? -60 : Math.max(-60, Math.min(0, (average / 255) * 60 - 60));
      
      // Update stream status with audio level
      this.streamStatus.audioLevel = dbLevel;
      
      // Notify status change to update UI
      this.notifyStatusChange();
      
      // Continue monitoring
      requestAnimationFrame(updateInternalVisualization);
    };
    
    // Start the loop
    updateInternalVisualization();
  }

  
  /**
   * Set up the visualization loop without calling startVisualization
   */
  private setupVisualizationLoop(): void {
    if (!this.analyserNode || !this.frequencyData) return;

    const updateVisualization = () => {
      if (!this.analyserNode || !this.frequencyData) return;

      // Get frequency data
      this.analyserNode.getByteFrequencyData(this.frequencyData);

      // Notify visualize callbacks
      this.onVisualizeCallbacks.forEach(callback => {
        callback(this.frequencyData!);
      });

      // Continue loop
      requestAnimationFrame(updateVisualization);
    };

    // Start the loop
    updateVisualization();
  }

  /**
   * Start streaming to the server
   */
  async startStreaming(streamId: number, streamKey: string): Promise<boolean> {
    try {
      // Store the stream key for use in error handling and logging
      this.streamKey = streamKey;
      
      if (!this.stream || !this.audioContext) {
        const initialized = await this.initialize({
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          enableVideo: true
        });
        if (!initialized) {
          console.error("Failed to initialize media stream");
          return false;
        }
      }

      // Ensure audio context is running
      if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      } else if (this.streamStatus.hasMic) {
        console.warn("Audio context is not initialized");
      }

      // Close any existing connection
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }

      // Setup WebSocket connection for streaming
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Determine the correct WebSocket URL based on environment
      // Always use the current hostname and port for WebSocket connections
      const host = window.location.host;
      
      // Build the WebSocket URL - use the exact format expected by the server
      const wsUrl = `${protocol}//${host}/audio?streamId=${streamId}&role=broadcaster&streamKey=${streamKey}`;

      // Mask stream key in logs
      const maskedUrl = wsUrl.replace(/streamKey=([^&]+)/, 'streamKey=****');
      console.log(`Connecting to streaming WebSocket: ${maskedUrl}`);
      console.log("Environment info:", {
        hostname: window.location.hostname,
        protocol,
        host,
        port: window.location.port,
        hasVideo: this.streamStatus.hasVideo,
        hasMic: this.streamStatus.hasMic,
        hasStreamKey: !!streamKey
      });
      
      // Reset reconnect attempts
      this.reconnectAttempts = 0;
      
      // Close any existing socket before creating a new one
      if (this.socket && (this.socket as WebSocket).readyState !== WebSocket.CLOSED) {
        try {
          (this.socket as WebSocket).close();
        } catch (e) {
          console.warn("Error closing previous socket:", e);
        }
        this.socket = null;
      }
      
      // Create WebSocket connection with a try-catch to handle any errors
      try {
        this.socket = new WebSocket(wsUrl);
        console.log("WebSocket instance created successfully");
      } catch (error) {
        console.error("Error creating WebSocket instance:", error);
        this.streamStatus.error = "Failed to create WebSocket connection";
        this.notifyStatusChange();
        return false;
      }

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.socket && (this.socket as WebSocket).readyState !== WebSocket.OPEN) {
          console.error("WebSocket connection timeout");
          (this.socket as WebSocket).close();
          this.notifyStatusChange();
        }
      }, 10000); // 10 seconds timeout

      return new Promise<boolean>((resolve) => {
        if (!this.socket) {
          resolve(false);
          return;
        }

        this.socket.onopen = () => {
          console.log("Streaming WebSocket connection established");
          clearTimeout(connectionTimeout);

          // Start audio processing and sending to websocket when connected
          if (this.streamStatus.hasMic) {
            this.startAudioProcessing();
          }

          // Update stream status
          const currentLevel = this.streamStatus.audioLevel || -60;
          this.streamStatus = {
            ...this.streamStatus,
            isLive: true,
            streamId,
            startTime: new Date(),
            viewerCount: 0,
            peakViewerCount: 0,
            audioLevel: currentLevel
          };

          this.notifyStatusChange();

          // Setup connection checking
          this.connectionCheckInterval = setInterval(() => {
            if (this.socket && (this.socket as WebSocket).readyState === WebSocket.OPEN) {
              (this.socket as WebSocket).send(JSON.stringify({ 
                type: 'ping',
                hasVideo: this.streamStatus.hasVideo,
                hasMic: this.streamStatus.hasMic
              }));
            } else {
              // Try to reconnect if connection is lost
              this.attemptReconnect(streamId, streamKey);
            }
          }, 30000); // Check every 30 seconds

          resolve(true);
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
          clearTimeout(connectionTimeout);
          
          // Only try to reconnect if it wasn't a normal closure
          if (event.code !== 1000 && this.streamStatus.isLive) {
            this.attemptReconnect(streamId, streamKey);
          } else {
            this.stopStreaming();
          }

          if (this.streamStatus.isLive) {
            // Connection was lost after successful start
            console.log("Connection lost, stream was active");
            this.streamStatus.isLive = false;
            this.notifyStatusChange();
          }

          resolve(false);
          
          // Log detailed information about the connection failure
          if (event.code !== 1000) {
            console.error(`WebSocket closed abnormally. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
            console.log("Connection details:", {
              url: wsUrl.replace(/streamKey=([^&]+)/, 'streamKey=****'),
              streamId,
              wasEverConnected: event.wasClean,
              hasStreamKey: !!this.streamKey
            });
          }
        };

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          console.log("WebSocket connection details:", {
            url: wsUrl.replace(/streamKey=([^&]+)/, 'streamKey=****'),
            readyState: this.socket ? this.socket.readyState : 'socket_not_initialized',
            browserSupport: 'WebSocket' in window ? 'supported' : 'not_supported',
            streamId,
            hasStreamKey: !!this.streamKey
          });
          clearTimeout(connectionTimeout);
          this.stopStreaming();
          resolve(false);
        };

        this.socket.onmessage = (event) => {
          try {
            // Check if it's a text message (control message)
            if (typeof event.data === 'string') {
              const data = JSON.parse(event.data);

              switch (data.type) {
                case 'viewer_count':
                  const newCount = data.viewerCount || 0;
                  this.streamStatus.viewerCount = newCount;
                  this.streamStatus.peakViewerCount = Math.max(
                    this.streamStatus.peakViewerCount,
                    newCount
                  );
                  this.notifyStatusChange();
                  break;

                case 'stream_status':
                  if (data.isLive !== undefined) {
                    this.streamStatus.isLive = data.isLive;
                  }
                  if (data.viewerCount !== undefined) {
                    this.streamStatus.viewerCount = data.viewerCount;
                  }
                  this.notifyStatusChange();
                  break;

                case 'error':
                  console.error("Stream error:", data.message);
                  this.streamStatus.error = data.message;
                  this.notifyStatusChange();
                  break;

                case 'pong':
                  // Server responded to our ping, connection is healthy
                  break;
              }
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };
      });
    } catch (error) {
      console.error("Error starting streaming:", error);
      return false;
    }
  }

  /**
   * Attempt to reconnect the WebSocket
   */
  private attemptReconnect(streamId: number, streamKey: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`Connection check failed, attempting to reconnect (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      setTimeout(() => {
        this.startStreaming(streamId, streamKey);
      }, 2000 * this.reconnectAttempts); // Exponential backoff
    } else {
      console.error("Max reconnection attempts reached. Stopping stream.");
      this.stopStreaming();
    }
  }

  /**
   * Stop the active stream
   */
  stopStreaming(): void {
    // Clean up audio processing
    if (this.audioProcessorNode) {
      this.audioProcessorNode.disconnect();
      this.audioProcessorNode = null;
    }

    // Close WebSocket connection
    if (this.socket) {
      if ((this.socket as WebSocket).readyState === WebSocket.OPEN) {
        (this.socket as WebSocket).send(JSON.stringify({
          type: 'end_stream',
          streamId: this.streamStatus.streamId
        }));
      }
      (this.socket as WebSocket).close();
      this.socket = null;
    }

    // Clear checking interval
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    // Update stream status
    this.streamStatus.isLive = false;
    this.notifyStatusChange();
  }

  /**
   * Set the output volume
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
  }

  /**
   * Get current stream status
   */
  getStreamStatus(): StreamStatus {
    return { ...this.streamStatus };
  }

  /**
   * Register a callback for stream status changes
   */
  onStatusChange(callback: (status: StreamStatus) => void): void {
    this.onStatusChangeCallbacks.push(callback);
  }

  /**
   * Register a callback for visualization data
   */
  onVisualize(callback: (data: Uint8Array) => void): void {
    this.onVisualizeCallbacks.push(callback);
  }

  /**
   * Get available media devices (cameras and microphones)
   */
  async getMediaDevices(): Promise<MediaDevice[]> {
    try {
      // Request permissions first to get labeled devices
      if (!this.stream) {
        try {
          // Try to get a temporary stream to trigger permissions
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          
          // Stop the temporary stream right away
          tempStream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.warn("Could not get full permissions - device labels may be unavailable", err);
        }
      }
      
      // Enumerate all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter and format devices
      this.availableDevices = devices
        .filter(device => ['audioinput', 'videoinput'].includes(device.kind))
        .map(device => ({
          deviceId: device.deviceId,
          kind: device.kind as 'audioinput' | 'videoinput' | 'audiooutput',
          label: device.label || (device.kind === 'audioinput' 
            ? `Microphone ${device.deviceId.slice(0, 5)}...` 
            : `Camera ${device.deviceId.slice(0, 5)}...`),
          groupId: device.groupId
        }));
      
      // Notify listeners
      this.notifyDevicesChange();
      
      return this.availableDevices;
    } catch (error) {
      console.error("Error getting media devices:", error);
      return [];
    }
  }
  
  /**
   * Handle device change events
   */
  private async handleDeviceChange() {
    console.log("Media devices changed, updating device list");
    await this.getMediaDevices();
  }
  
  /**
   * Register a callback for device changes
   */
  onDevicesChange(callback: (devices: MediaDevice[]) => void): void {
    this.onDevicesChangeCallbacks.push(callback);
  }
  
  /**
   * Notify all registered callbacks about device changes
   */
  private notifyDevicesChange(): void {
    this.onDevicesChangeCallbacks.forEach(callback => {
      callback(this.availableDevices);
    });
  }
  
  /**
   * Switch to a different camera or audio input device
   */
  async switchInputDevice(deviceId: string, kind: 'audioinput' | 'videoinput'): Promise<boolean> {
    try {
      if (!this.stream) {
        console.error("No stream available, cannot switch devices");
        return false;
      }
      
      // Store the selected device ID
      if (kind === 'audioinput') {
        this.selectedAudioDeviceId = deviceId;
      } else {
        this.selectedVideoDeviceId = deviceId;
      }
      
      // Stop the current tracks of this kind
      this.stream.getTracks()
        .filter(track => (kind === 'audioinput' ? track.kind === 'audio' : track.kind === 'video'))
        .forEach(track => track.stop());
      
      // Create constraints for the new device
      const constraints: MediaStreamConstraints = {};
      
      if (kind === 'audioinput') {
        constraints.audio = { deviceId: { exact: deviceId } };
        constraints.video = this.streamStatus.hasVideo;
      } else {
        constraints.video = { deviceId: { exact: deviceId } };
        constraints.audio = this.streamStatus.hasMic;
      }
      
      // Get a new stream with the specified device
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Replace the old tracks with new ones
      const oldTrackKind = kind === 'audioinput' ? 'audio' : 'video';
      const newTracks = newStream.getTracks().filter(track => 
        (oldTrackKind === 'audio' ? track.kind === 'audio' : track.kind === 'video')
      );
      
      newTracks.forEach(track => {
        this.stream!.addTrack(track);
      });
      
      // Update the stream status
      if (kind === 'audioinput') {
        this.streamStatus.hasMic = newTracks.length > 0;
        
        // Reconnect audio processing if audio changed
        if (this.audioContext && this.streamStatus.hasMic) {
          this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
          this.sourceNode.connect(this.analyserNode!);
        }
      } else {
        this.streamStatus.hasVideo = newTracks.length > 0;
      }
      
      // Update video element if it exists
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
      }
      
      this.notifyStatusChange();
      return true;
    } catch (error) {
      console.error(`Error switching ${kind}:`, error);
      return false;
    }
  }

  /**
   * Clean up and release resources
   */
  dispose(): void {
    try {
      this.stopStreaming();

      // Stop all tracks in the media stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          track.stop();
        });
        this.stream = null;
      }

      // Clean up video element
      if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.videoElement = null;
      }

      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }

      // Remove device change listener
      if (navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
      }

      this.audioContext = null;
      this.sourceNode = null;
      this.analyserNode = null;
      this.gainNode = null;
      this.frequencyData = null;
      this.visualizer = null;
      this.onStatusChangeCallbacks = [];
      this.onVisualizeCallbacks = [];
      this.onDevicesChangeCallbacks = [];
    } catch (error) {
      console.error("Error disposing media streaming service:", error);
    }
  }
  
  /**
   * Private: Start audio processing and streaming
   */
  private async startAudioProcessing(): Promise<void> {
    if (!this.audioContext || !this.gainNode || !this.socket) return;

    try {
      // Load audio worklet for efficient audio processing
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');

      // Create audio processor node
      this.audioProcessorNode = new AudioWorkletNode(
        this.audioContext,
        'audio-processor'
      );

      // Connect gain node to processor
      this.gainNode.connect(this.audioProcessorNode);

      // Handle processed audio data and level messages
      this.audioProcessorNode.port.onmessage = (event) => {
        if (!event.data) return;

        // Check if it's a level message
        if (typeof event.data === 'object' && event.data.type === 'level') {
          // Update audio level in stream status
          this.streamStatus.audioLevel = event.data.level;
          this.notifyStatusChange();
          return;
        }

        // Otherwise it's audio data to send
        if (this.socket && (this.socket as WebSocket).readyState === WebSocket.OPEN) {
          try {
            (this.socket as WebSocket).send(event.data);
          } catch (error) {
            console.error("Error sending audio data:", error);
          }
        }
      };

      // Connect processor to destination (not actually outputting audio)
      this.audioProcessorNode.connect(this.audioContext.destination);

    } catch (error) {
      console.error("Error starting audio processing:", error);

      // Fallback to ScriptProcessorNode if AudioWorklet not supported
      this.setupLegacyAudioProcessing();
    }
  }

  /**
   * Private: Setup legacy audio processing for browsers that don't support AudioWorklet
   */
  private setupLegacyAudioProcessing(): void {
    if (!this.audioContext || !this.gainNode || !this.socket) return;

    const bufferSize = 4096;
    const processorNode = this.audioContext.createScriptProcessor(
      bufferSize,
      2, // stereo input
      2  // stereo output
    );

    processorNode.onaudioprocess = (e) => {
      if (this.socket && (this.socket as WebSocket).readyState === WebSocket.OPEN) {
        // Get audio data
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);

        // Prepare data for transmission (simplified, would need proper encoding in production)
        const interleaved = new Float32Array(left.length * 2);
        for (let i = 0; i < left.length; i++) {
          interleaved[i * 2] = left[i];
          interleaved[i * 2 + 1] = right[i];
        }

        // Send audio data to server
        (this.socket as WebSocket).send(interleaved.buffer);
      }
    };

    // Connect the processor
    this.gainNode.connect(processorNode);
    processorNode.connect(this.audioContext.destination);
  }

  /**
   * Private: Notify all status change callbacks
   */
  private notifyStatusChange(): void {
    const status = this.getStreamStatus();
    this.onStatusChangeCallbacks.forEach(callback => {
      callback(status);
    });

    // Send audio level update to the server if we're streaming as broadcaster
    if (this.socket && 
        (this.socket as WebSocket).readyState === WebSocket.OPEN &&
        this.streamStatus.isLive && 
        this.streamStatus.streamId &&
        this.streamStatus.hasMic &&
        this.streamStatus.audioLevel !== undefined) {
      try {
        // Send as a control message (string) instead of binary audio data
        (this.socket as WebSocket).send(JSON.stringify({
          type: 'audio_level',
          level: this.streamStatus.audioLevel,
          streamId: this.streamStatus.streamId
        }));
      } catch (error) {
        console.error('Error sending audio level to server:', error);
      }
    }
  }
  
  /**
   * Public: Initialize visualization with canvas element
   */
  public initializeVisualization(canvas: HTMLCanvasElement, theme: 'standard' | 'purple' | 'high-contrast' = 'purple'): void {
    if (this.analyserNode) {
      this.visualizer = new AudioVisualizer(canvas, this.analyserNode);
      this.visualizer.setTheme(theme);
      this.visualizer.draw();
    }
  }

  /**
   * Initialize media stream with both audio and video
   */
  public async initializeStream(video = true): Promise<boolean> {
    return this.initialize({
      enableVideo: video,
      videoQuality: 'standard'
    });
  }

  /**
   * Test audio functionality
   */
  public async testAudio(): Promise<void> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices not supported");
      }
      
      await this.initializeStream(false); // Just audio for testing
      
      if (!this.streamStatus.hasMic) {
        throw new Error("Microphone access failed or no microphone detected");
      }
      
      console.log("Audio test successful");
    } catch (error) {
      console.error("Audio test failed:", error);
      throw error;
    }
  }
  
  /**
   * Switch camera (if multiple cameras available)
   */
  public async switchCamera(): Promise<boolean> {
    try {
      if (!this.stream) {
        return false;
      }
      
      // Get current video track
      const currentVideoTrack = this.stream.getVideoTracks()[0];
      if (!currentVideoTrack) {
        return false;
      }
      
      // Get current facing mode constraint
      const currentFacingMode = currentVideoTrack.getSettings().facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      // Stop current tracks
      this.stream.getTracks().forEach(track => track.stop());
      
      // Get new stream with opposite facing mode
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: true
      });
      
      // Replace the stream
      this.stream = newStream;
      
      // Reconnect audio nodes if needed
      if (this.audioContext && this.streamStatus.hasMic) {
        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        this.sourceNode.connect(this.analyserNode!);
      }
      
      // Update video element if it exists
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
      }
      
      return true;
    } catch (error) {
      console.error("Error switching camera:", error);
      return false;
    }
  }
}

// Export a singleton instance
export const mediaStreamingService = new MediaStreamingService();
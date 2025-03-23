/**
 * Socket.IO Streaming Service
 * Implements streaming functionality using Socket.IO instead of raw WebSockets
 */
import { io, Socket } from 'socket.io-client';
import { AudioContextConstructor } from '../utils/audioContext';

// Define types for the streaming service
interface StreamStatus {
  isLive: boolean;
  streamId?: number;
  error?: string;
  hasVideo: boolean;
  hasMic: boolean;
  audioLevel?: number;
  startTime?: Date;
  viewerCount?: number;
  peakViewerCount?: number;
  lastErrorMessage?: string;
}

// AudioProcessorNode interface for processing audio samples
interface AudioProcessorNode extends AudioWorkletNode {
  port: MessagePort;
}

type StatusChangeCallback = (status: StreamStatus) => void;

// Audio streaming service with Socket.IO
export class SocketIOStreamingService {
  private socket: Socket | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: AudioProcessorNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private connectionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private statusCallbacks: StatusChangeCallback[] = [];
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  // Track status of the stream
  public streamStatus: StreamStatus = {
    isLive: false,
    hasVideo: false,
    hasMic: false,
    audioLevel: -60 // Default to -60dB (silence)
  };

  constructor() {
    // Initialize AudioContext when service is created
    this.initAudioContext();
  }

  private async initAudioContext() {
    try {
      this.audioContext = new AudioContextConstructor();
      
      // Load the audio worklet processor
      if (this.audioContext) {
        try {
          // Create a blob URL for the worklet code
          const workletCode = `
            class AudioStreamProcessor extends AudioWorkletProcessor {
              constructor() {
                super();
                this._lastUpdate = currentTime;
                this._volume = 0;
              }
            
              process(inputs, outputs, parameters) {
                // Get the first input (microphone input)
                const input = inputs[0];
                if (!input || !input.length) return true;
                
                // We only need one channel
                const samples = input[0];
                if (!samples || !samples.length) return true;
                
                // Calculate RMS (Root Mean Square) for volume level
                let sum = 0;
                for (let i = 0; i < samples.length; i++) {
                  sum += samples[i] * samples[i];
                }
                const rms = Math.sqrt(sum / samples.length);
                
                // Convert to dB (clamped to reasonable range)
                let db = 20 * Math.log10(rms);
                if (isNaN(db) || db < -60) db = -60;
                if (db > 0) db = 0;
                
                // Update volume level every 100ms
                if (currentTime - this._lastUpdate > 0.1) {
                  this._volume = db;
                  this.port.postMessage({ type: 'level', level: db });
                  this._lastUpdate = currentTime;
                }
                
                // Post raw audio data to main thread
                this.port.postMessage({ 
                  type: 'audio', 
                  samples: samples
                });
                
                return true;
              }
            }
            
            registerProcessor('audio-stream-processor', AudioStreamProcessor);
          `;
          
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          
          // Load the worklet
          await this.audioContext.audioWorklet.addModule(workletUrl);
          
          // Clean up after module is loaded
          URL.revokeObjectURL(workletUrl);
          
          console.log("Audio worklet module loaded successfully");
        } catch (error) {
          console.error("Error loading audio worklet:", error);
        }
      }
    } catch (error) {
      console.error("Error initializing audio context:", error);
    }
  }

  // Register a callback for stream status updates
  public onStatusChange(callback: StatusChangeCallback) {
    this.statusCallbacks.push(callback);
    // Immediately call with current status
    callback(this.streamStatus);
  }

  // Remove a status callback
  public offStatusChange(callback: StatusChangeCallback) {
    this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
  }

  // Notify all callbacks of status change
  private notifyStatusChange() {
    for (const callback of this.statusCallbacks) {
      try {
        callback(this.streamStatus);
      } catch (error) {
        console.error("Error in status change callback:", error);
      }
    }
  }

  // Request a microphone
  public async requestMicrophone(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphoneStream = stream;
      this.streamStatus.hasMic = true;
      this.notifyStatusChange();
      
      console.log("Microphone access granted");
      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      this.streamStatus.hasMic = false;
      this.streamStatus.error = "Microphone access denied";
      this.notifyStatusChange();
      return false;
    }
  }

  // Release the microphone
  public releaseMicrophone() {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    
    this.streamStatus.hasMic = false;
    this.notifyStatusChange();
  }

  // Start streaming using Socket.IO
  public async startStreaming(streamId: number, streamKey: string): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      console.log(`Starting audio streaming for stream ID: ${streamId}`);
      
      // Request microphone if not already available
      if (!this.streamStatus.hasMic && !this.microphoneStream) {
        const micGranted = await this.requestMicrophone();
        if (!micGranted) {
          console.error("Cannot start streaming without microphone access");
          this.streamStatus.error = "Microphone required for streaming";
          this.notifyStatusChange();
          resolve(false);
          return;
        }
      }

      // Close any existing socket before creating a new one
      this.closeExistingSocket();

      // Determine the correct Socket.IO URL based on environment
      const host = window.location.host;
      let socketUrl = '';
      
      // Use the window.location.origin which includes the correct port for Replit
      socketUrl = window.location.origin;
      
      // Log connection details
      console.log(`Connecting to Socket.IO: ${socketUrl}`);
      
      // Log additional connection details for debugging
      const isReplit = window.location.hostname.includes('.replit.dev') || 
                       window.location.hostname.includes('.repl.co');
      console.log("Environment info:", {
        protocol: window.location.protocol,
        host,
        port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
        hostname: window.location.hostname,
        isReplit,
        sourceUrl: window.location.origin
      });

      try {
        // Connect to Socket.IO server
        this.socket = io(`${socketUrl}/stream`, {
          query: {
            streamId: String(streamId),
            userId: '0', // This would be the user ID if available
            username: 'Broadcaster',
            role: 'broadcaster',
            streamKey: streamKey
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
          reconnectionDelay: 1000,
          timeout: 10000
        });

        console.log("Socket.IO instance created successfully");
        
        // Set up event handlers
        this.socket.on('connect', () => {
          console.log("Socket.IO connection established");
          
          // Start audio processing and sending to socket when connected
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
            audioLevel: currentLevel,
            error: undefined
          };

          this.notifyStatusChange();

          // Setup connection checking
          this.connectionCheckInterval = setInterval(() => {
            if (this.socket) {
              this.socket.emit('ping', { 
                hasVideo: this.streamStatus.hasVideo,
                hasMic: this.streamStatus.hasMic
              });
            }
          }, 30000); // Check every 30 seconds

          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.error("Socket.IO connection error:", error);
          this.streamStatus.error = "Failed to connect to server";
          this.streamStatus.lastErrorMessage = error.message;
          this.notifyStatusChange();
          resolve(false);
        });

        this.socket.on('disconnect', (reason) => {
          console.log(`Socket.IO disconnected: ${reason}`);
          
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            // Intentional disconnect, clean up
            this.cleanupStream();
          } else {
            // Unexpected disconnect
            this.streamStatus.error = `Connection lost: ${reason}`;
            this.notifyStatusChange();
            
            // Socket.IO will automatically try to reconnect
          }
        });

        this.socket.on('viewer_count', (data) => {
          this.streamStatus.viewerCount = data.viewerCount;
          
          // Update peak count if needed
          if (data.viewerCount > (this.streamStatus.peakViewerCount || 0)) {
            this.streamStatus.peakViewerCount = data.viewerCount;
          }
          
          this.notifyStatusChange();
        });

        this.socket.on('error', (data) => {
          console.error("Stream error:", data.message);
          this.streamStatus.error = data.message;
          this.notifyStatusChange();
        });

      } catch (error) {
        console.error("Error creating Socket.IO instance:", error);
        this.streamStatus.error = "Failed to create Socket.IO connection";
        this.notifyStatusChange();
        resolve(false);
        return false;
      }
    });
  }

  // Close existing socket connection if one exists
  private closeExistingSocket() {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (e) {
        console.warn("Error disconnecting Socket.IO:", e);
      }
      this.socket = null;
    }
  }

  // Start audio processing and transmission
  private startAudioProcessing() {
    if (!this.audioContext || !this.microphoneStream) {
      console.error("Cannot start audio processing: AudioContext or microphone stream not available");
      return;
    }

    try {
      // Create audio source from microphone stream
      this.audioSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
      
      // Create audio processor worklet node
      this.audioProcessor = new AudioWorkletNode(
        this.audioContext,
        'audio-stream-processor'
      ) as AudioProcessorNode;
      
      // Handle messages from worklet processor
      this.audioProcessor.port.onmessage = (event) => {
        if (!this.socket) return;
        
        const { type, samples, level } = event.data;
        
        // Audio level events for visualization and monitoring
        if (type === 'level' && typeof level === 'number') {
          // Update audio level in status
          this.streamStatus.audioLevel = level;
          this.notifyStatusChange();
          
          // Send level updates to server
          try {
            this.socket.emit('audio_level', { level });
          } catch (error) {
            console.warn("Error sending audio level:", error);
          }
        }
        
        // Raw audio data to be streamed to server
        if (type === 'audio' && samples) {
          // Convert audio data to format suitable for transfer
          // For example, encode as 16-bit PCM
          const pcmData = this.floatTo16BitPCM(samples);
          
          // Send audio data to server if socket is open
          try {
            this.socket.emit('audio_data', pcmData);
          } catch (error) {
            console.warn("Error sending audio data:", error);
          }
        }
      };
      
      // Connect audio processing pipeline
      this.audioSource.connect(this.audioProcessor);
      // Note: we don't connect to destination to avoid feedback
      
      console.log("Audio processing started");
    } catch (error) {
      console.error("Error starting audio processing:", error);
    }
  }

  // Convert Float32Array audio data to Int16Array for more efficient transfer
  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      // Convert float (-1.0 to 1.0) to int16 (-32768 to 32767)
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
  }

  // Stop streaming and clean up resources
  public stopStreaming() {
    console.log("Stopping audio streaming");
    
    // Close socket connection
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        console.warn("Error disconnecting Socket.IO:", error);
      }
      this.socket = null;
    }
    
    // Clean up stream resources
    this.cleanupStream();
    
    return true;
  }

  // Clean up all resources
  private cleanupStream() {
    // Clear connection check interval
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Stop audio processing
    if (this.audioProcessor) {
      try {
        this.audioProcessor.disconnect();
      } catch (e) {
        console.warn("Error disconnecting audio processor:", e);
      }
      this.audioProcessor = null;
    }
    
    if (this.audioSource) {
      try {
        this.audioSource.disconnect();
      } catch (e) {
        console.warn("Error disconnecting audio source:", e);
      }
      this.audioSource = null;
    }
    
    // Reset stream status
    this.streamStatus = {
      ...this.streamStatus,
      isLive: false,
      error: undefined,
      startTime: undefined,
      viewerCount: undefined,
      peakViewerCount: undefined
    };
    
    this.notifyStatusChange();
  }

  // Listen to an audio stream
  public async listenToStream(streamId: number): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      console.log(`Connecting to stream ${streamId} as listener`);
      
      // Close any existing socket before creating a new one
      this.closeExistingSocket();
      
      // Ensure AudioContext is initialized and in running state
      if (!this.audioContext) {
        await this.initAudioContext();
      } else if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Determine the correct Socket.IO URL based on environment
      const host = window.location.host;
      let socketUrl = '';
      
      // Use the window.location.origin which includes the correct port for Replit
      socketUrl = window.location.origin;
      
      console.log(`Connecting to Socket.IO as listener: ${socketUrl}`);
      
      // Log additional connection details for debugging
      const isReplit = window.location.hostname.includes('.replit.dev') || 
                       window.location.hostname.includes('.repl.co');
      console.log("Listener environment info:", {
        protocol: window.location.protocol,
        host,
        port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
        hostname: window.location.hostname,
        isReplit,
        socketUrl
      });

      try {
        // Connect to Socket.IO server
        this.socket = io(`${socketUrl}/stream`, {
          query: {
            streamId: String(streamId),
            userId: '0', // This would be the user ID if available
            username: 'Listener',
            role: 'listener'
          },
          transports: ['websocket', 'polling']
        });

        console.log("Listener Socket.IO instance created successfully");
        
        // Create audio sources and processing for listener
        let audioQueue: Int16Array[] = [];
        let isPlaying = false;
        
        // Create a ScriptProcessorNode for audio output
        // (Using ScriptProcessor instead of AudioWorklet for better browser support for playback)
        const bufferSize = 4096;
        const scriptNode = this.audioContext!.createScriptProcessor(
          bufferSize, // bufferSize
          1,          // numberOfInputChannels (mono)
          1           // numberOfOutputChannels (mono)
        );
        
        scriptNode.onaudioprocess = (audioProcessingEvent) => {
          const outputBuffer = audioProcessingEvent.outputBuffer;
          const outputData = outputBuffer.getChannelData(0);
          
          // Fill output buffer with silence (zeros) by default
          outputData.fill(0);
          
          // If we have data in the queue, use it
          if (audioQueue.length > 0 && isPlaying) {
            const nextChunk = audioQueue.shift();
            if (nextChunk) {
              // Convert Int16Array back to float32 for Web Audio API
              for (let i = 0; i < outputData.length && i < nextChunk.length; i++) {
                // Convert int16 (-32768 to 32767) to float (-1.0 to 1.0)
                outputData[i] = nextChunk[i] / (nextChunk[i] < 0 ? 0x8000 : 0x7FFF);
              }
            }
          }
        };
        
        // Connect the script node to the destination (speakers)
        scriptNode.connect(this.audioContext!.destination);
        
        // Set up Socket.IO event handlers
        this.socket.on('connect', () => {
          console.log("Listener Socket.IO connection established");
          
          // Update stream status
          this.streamStatus = {
            ...this.streamStatus,
            isLive: true,
            streamId,
            audioLevel: -60,
            error: undefined
          };
          
          this.notifyStatusChange();
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.error("Listener Socket.IO connection error:", error);
          this.streamStatus.error = "Failed to connect to stream";
          this.streamStatus.lastErrorMessage = error.message;
          this.notifyStatusChange();
          resolve(false);
        });

        this.socket.on('disconnect', (reason) => {
          console.log(`Listener Socket.IO disconnected: ${reason}`);
          this.cleanupStream();
          
          if (reason !== 'io server disconnect' && reason !== 'io client disconnect') {
            // Unexpected disconnect
            this.streamStatus.error = `Connection lost: ${reason}`;
            this.notifyStatusChange();
          }
          
          // Clean up audio
          isPlaying = false;
          scriptNode.disconnect();
        });

        // Handle incoming audio data
        this.socket.on('audio_data', (data) => {
          try {
            // Convert ArrayBuffer to Int16Array
            const int16Data = new Int16Array(data);
            
            // Add to audio queue
            audioQueue.push(int16Data);
            
            // Limit queue size to prevent memory issues
            while (audioQueue.length > 20) { // About 1 second of audio at 44.1kHz
              audioQueue.shift();
            }
            
            // Start playing if not already
            if (!isPlaying) {
              isPlaying = true;
              // Resume AudioContext if it's suspended
              if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
              }
            }
          } catch (e) {
            console.error("Error processing audio data:", e);
          }
        });

        // Handle audio level updates
        this.socket.on('audio_level', (data) => {
          if (typeof data.level === 'number') {
            this.streamStatus.audioLevel = data.level;
            this.notifyStatusChange();
          }
        });

        // Handle stream status updates
        this.socket.on('stream_status', (data) => {
          if ('isLive' in data) {
            this.streamStatus.isLive = data.isLive;
          }
          this.notifyStatusChange();
          
          // If stream has ended, close connection
          if (data.isLive === false) {
            isPlaying = false;
            this.stopStreaming();
          }
        });

      } catch (error) {
        console.error("Error creating Socket.IO instance:", error);
        this.streamStatus.error = "Failed to connect to stream";
        this.notifyStatusChange();
        resolve(false);
      }
    });
  }
}

// Create a singleton instance
export const socketIOStreamingService = new SocketIOStreamingService();
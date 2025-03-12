/**
 * Audio Processor Worklet for BeatStream
 * Handles efficient audio processing for streaming
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Buffer for collecting audio data
    this.bufferSize = 4096; // Adjust based on latency/quality needs
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    
    // Opus encoder would be used here in a production environment
    // We're using a simplified approach for demonstration
  }
  
  process(inputs, outputs, parameters) {
    // Get input data (assuming mono or taking first channel of stereo)
    const input = inputs[0][0];
    
    // If no input, skip processing
    if (!input) return true;
    
    // Copy input data to buffer
    for (let i = 0; i < input.length; i++) {
      if (this.bufferIndex < this.bufferSize) {
        this.buffer[this.bufferIndex++] = input[i];
      }
      
      // When buffer is full, send it and reset
      if (this.bufferIndex >= this.bufferSize) {
        // Clone the buffer for sending
        const audioData = this.buffer.slice(0);
        
        // In a real implementation, we would:
        // 1. Compress the audio (e.g., using Opus encoding)
        // 2. Package with appropriate headers/metadata
        // 3. Send optimized binary data
        
        // For this demo, we're sending raw Float32Array data
        this.port.postMessage({
          type: 'audio',
          data: audioData.buffer
        }, [audioData.buffer]);
        
        // Reset buffer
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }
    
    // Output the audio as well (pass-through)
    if (outputs[0].length > 0) {
      for (let channel = 0; channel < outputs[0].length; channel++) {
        outputs[0][channel].set(inputs[0][channel]);
      }
    }
    
    // Return true to keep the processor alive
    return true;
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);
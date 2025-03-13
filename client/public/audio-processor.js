/**
 * Audio Processor Worklet for Traxx
 * Handles efficient audio processing for streaming with dynamic compression
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Buffer for collecting audio data
    this.bufferSize = 4096; // Adjust based on latency/quality needs
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    
    // Audio processing settings
    this.sampleRate = 48000; // Standard high-quality audio rate
    this.channels = 2; // Stereo
    
    // Dynamic range compression settings
    this.threshold = -24; // dB
    this.ratio = 4; // compression ratio
    this.attack = 0.003; // seconds
    this.release = 0.25; // seconds
    this.makeupGain = 6; // dB
    
    // State variables for compression
    this.envBuffer = 0;
    this.attackCoeff = Math.exp(-1 / (this.attack * this.sampleRate));
    this.releaseCoeff = Math.exp(-1 / (this.release * this.sampleRate));
    
    // For level metering
    this.levelMeterSmoothCoeff = 0.9; // Smoothing coefficient for level meter
    this.currentLevel = 0;
    this.lastReportTime = 0;
    
    // Opus encoder would be used here in a production environment
    // We're using a simplified approach for demonstration
  }
  
  // Convert linear to dB
  linearToDb(linear) {
    return 20 * Math.log10(Math.max(linear, 1e-6));
  }
  
  // Convert dB to linear
  dbToLinear(db) {
    return Math.pow(10, db / 20);
  }
  
  // Apply dynamic range compression to a sample
  compress(sample) {
    // Calculate input level in dB
    const inputLevel = this.linearToDb(Math.abs(sample));
    
    // Dynamic range compression
    let outputLevel;
    if (inputLevel <= this.threshold) {
      outputLevel = inputLevel; // Below threshold, no compression
    } else {
      // Above threshold, apply compression
      const overshoot = inputLevel - this.threshold;
      const compressed = overshoot / this.ratio;
      outputLevel = this.threshold + compressed;
    }
    
    // Apply makeup gain
    outputLevel += this.makeupGain;
    
    // Convert back to linear and maintain sign
    return Math.sign(sample) * this.dbToLinear(outputLevel);
  }
  
  // Update envelope follower for smoothed level metering
  updateEnvelopeFollower(sample, currentTime) {
    const rectified = Math.abs(sample);
    
    if (rectified > this.envBuffer) {
      // Attack phase - fast rise
      this.envBuffer = this.attackCoeff * this.envBuffer + (1 - this.attackCoeff) * rectified;
    } else {
      // Release phase - slow fall
      this.envBuffer = this.releaseCoeff * this.envBuffer + (1 - this.releaseCoeff) * rectified;
    }
    
    // Smooth level meter
    this.currentLevel = this.levelMeterSmoothCoeff * this.currentLevel + 
                        (1 - this.levelMeterSmoothCoeff) * this.envBuffer;
    
    // Report levels to main thread occasionally (every 100ms)
    if (currentTime && (currentTime - this.lastReportTime > 0.1)) {
      // Calculate level in dB, with a floor of -60dB
      const dbLevel = Math.max(-60, this.linearToDb(this.currentLevel));
      
      this.port.postMessage({
        type: 'level',
        level: dbLevel
      });
      this.lastReportTime = currentTime;
    }
  }
  
  process(inputs, outputs, parameters, currentTime) {
    // Get input data
    const inputL = inputs[0][0];
    const inputR = inputs[0].length > 1 ? inputs[0][1] : inputs[0][0]; // Use mono if only one channel
    
    // If no input, skip processing
    if (!inputL) return true;
    
    // Process audio frame
    for (let i = 0; i < inputL.length; i++) {
      // Apply compression to both channels
      const processedL = this.compress(inputL[i]);
      const processedR = this.compress(inputR[i]);
      
      // Update level meter (using average of both channels)
      this.updateEnvelopeFollower((Math.abs(processedL) + Math.abs(processedR)) / 2, currentTime);
      
      // Store in buffer (interleaved stereo)
      if (this.bufferIndex < this.bufferSize - 1) {
        this.buffer[this.bufferIndex++] = processedL;
        this.buffer[this.bufferIndex++] = processedR;
      }
      
      // When buffer is full, send it and reset
      if (this.bufferIndex >= this.bufferSize) {
        // Clone the buffer for sending
        const audioData = this.buffer.slice(0);
        
        // Apply a simple amplitude normalization to prevent clipping
        // and optimize the dynamic range for transmission
        let maxAmp = 0;
        for (let j = 0; j < audioData.length; j++) {
          maxAmp = Math.max(maxAmp, Math.abs(audioData[j]));
        }
        
        // Only normalize if audio is too quiet or too loud
        if (maxAmp > 0.01 && maxAmp !== 1) {
          const targetAmp = 0.85; // Target amplitude for normalization
          const normFactor = maxAmp > 1 ? 1/maxAmp : targetAmp/maxAmp;
          for (let j = 0; j < audioData.length; j++) {
            audioData[j] *= normFactor;
          }
        }
        
        // Send audio data to main thread
        this.port.postMessage({
          type: 'audio',
          data: audioData.buffer,
          channels: this.channels
        }, [audioData.buffer]);
        
        // Reset buffer
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }
    
    // Output the audio as well (pass-through with processing)
    if (outputs[0].length > 0) {
      for (let i = 0; i < inputL.length; i++) {
        // Apply processing to output (if needed)
        outputs[0][0][i] = this.compress(inputL[i]);
        if (outputs[0].length > 1) {
          outputs[0][1][i] = this.compress(inputR[i]);
        }
      }
    }
    
    // Return true to keep the processor alive
    return true;
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);
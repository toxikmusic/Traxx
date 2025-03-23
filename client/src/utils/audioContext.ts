/**
 * AudioContext utility for cross-browser compatibility
 * Provides a unified constructor for AudioContext across different browsers
 */

// Define the AudioContext constructor for various browser environments
export const AudioContextConstructor: typeof AudioContext = 
  window.AudioContext || 
  ((window as any).webkitAudioContext as typeof AudioContext);

export default AudioContextConstructor;
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Track } from '@shared/schema';

interface AudioContextType {
  // Currently playing track data
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  
  // Audio state
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  
  // Audio element reference
  audioElement: HTMLAudioElement | null;
  
  // Playback controls
  volume: number;
  setVolume: (volume: number) => void;
  currentTime: number;
  duration: number;
  
  // Control functions
  togglePlayPause: () => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  formatTime: (time: number) => string;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  // Track state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  
  // Audio element state
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.75); // 75% volume by default
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Initialize audio element once on mount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    setAudioElement(audio);
    
    // Cleanup on unmount
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);
  
  // Set up audio element event listeners
  useEffect(() => {
    if (!audioElement) return;
    
    // Update time as audio plays
    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime);
    };
    
    // When playback ends
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    // When duration is loaded
    const handleDurationChange = () => {
      setDuration(audioElement.duration);
    };
    
    // When audio is loaded and ready to play
    const handleCanPlay = () => {
      setDuration(audioElement.duration);
    };
    
    // When playback state changes
    const handlePlayState = () => {
      setIsPlaying(!audioElement.paused);
    };
    
    // Add event listeners
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('durationchange', handleDurationChange);
    audioElement.addEventListener('canplay', handleCanPlay);
    audioElement.addEventListener('play', handlePlayState);
    audioElement.addEventListener('pause', handlePlayState);
    
    // Cleanup event listeners
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('durationchange', handleDurationChange);
      audioElement.removeEventListener('canplay', handleCanPlay);
      audioElement.removeEventListener('play', handlePlayState);
      audioElement.removeEventListener('pause', handlePlayState);
    };
  }, [audioElement]);
  
  // Update audio source when track changes
  useEffect(() => {
    if (!audioElement || !currentTrack) return;
    
    const wasPlaying = !audioElement.paused;
    
    // Update source
    audioElement.src = currentTrack.audioUrl;
    audioElement.load();
    
    // If it was playing before, continue playing
    if (wasPlaying) {
      audioElement.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  }, [audioElement, currentTrack]);
  
  // Update volume when it changes
  useEffect(() => {
    if (!audioElement) return;
    audioElement.volume = volume;
  }, [audioElement, volume]);
  
  // Playback control functions
  const play = () => {
    if (!audioElement || !currentTrack) return;
    
    audioElement.play().catch(error => {
      console.error('Error playing audio:', error);
    });
    setIsPlaying(true);
  };
  
  const pause = () => {
    if (!audioElement) return;
    
    audioElement.pause();
    setIsPlaying(false);
  };
  
  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };
  
  const seek = (time: number) => {
    if (!audioElement) return;
    
    audioElement.currentTime = time;
    setCurrentTime(time);
  };
  
  // Utility function to format time in MM:SS
  const formatTime = (time: number): string => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Provide context value
  const value: AudioContextType = {
    currentTrack,
    setCurrentTrack,
    isPlaying,
    setIsPlaying,
    audioElement,
    volume,
    setVolume,
    currentTime,
    duration,
    togglePlayPause,
    play,
    pause,
    seek,
    formatTime
  };
  
  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
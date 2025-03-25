import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";
import { Track } from "@shared/schema";

interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  history: Track[];
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  addToQueue: (track: Track) => void;
  addTrackAndPlayNext: (track: Track) => void;
  clearQueue: () => void;
  duration: number;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  isShuffling: boolean;
  toggleShuffle: () => void;
  repeatMode: "off" | "all" | "one";
  toggleRepeat: () => void;
  isMinimized: boolean;
  toggleMinimized: () => void;
  audioElement: HTMLAudioElement | null;
  formatTime: (seconds: number) => string;
}

// This key will be used for saving player state in localStorage
const PLAYER_STATE_KEY = "beatstream_player_state";

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

// Format time in mm:ss for use throughout the player
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  // Single shared audio element for the entire application
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Core player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  
  // Player appearance state
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Audio control state
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const [previousVolume, setPreviousVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  
  // Playback modes
  const [isShuffling, setIsShuffling] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  
  // Create the audio element once on mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
      setAudioElement(audioRef.current);
    }
    
    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  
  // Set up event listeners for the audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // When metadata is loaded, update the duration
    const handleMetadataLoaded = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    
    // Update time as audio plays
    const updateTime = () => setCurrentTime(audio.currentTime);
    
    // When playback ends
    const handleEnded = () => {
      // If we have more tracks in queue or repeat is enabled, play the next track
      nextTrack();
    };
    
    // When audio is loaded and ready to play
    const handleCanPlay = () => {
      if (isPlaying) {
        audio.play().catch(err => console.error("Error auto-playing audio:", err));
      }
    };
    
    audio.addEventListener('loadedmetadata', handleMetadataLoaded);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleMetadataLoaded);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);
  
  // Handle player initialization from localStorage
  useEffect(() => {
    try {
      // Load volume first as it's always needed
      const savedVolume = localStorage.getItem("beatstream_volume");
      if (savedVolume) {
        const parsedVolume = parseInt(savedVolume);
        setVolume(parsedVolume);
        setIsMuted(parsedVolume === 0);
      }
      
      // Try to load saved player state
      const savedState = localStorage.getItem(PLAYER_STATE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Restore the queue and history
        if (parsedState.queue) setQueue(parsedState.queue);
        if (parsedState.history) setHistory(parsedState.history);
        
        // Restore repeat and shuffle modes
        if (parsedState.repeatMode) setRepeatMode(parsedState.repeatMode);
        if (parsedState.isShuffling !== undefined) setIsShuffling(parsedState.isShuffling);
        
        // Restore minimized state
        if (parsedState.isMinimized !== undefined) setIsMinimized(parsedState.isMinimized);
        
        // Restore the current track last - this triggers playback if needed
        if (parsedState.currentTrack) {
          setCurrentTrack(parsedState.currentTrack);
          
          // Set the audio source
          if (audioRef.current && parsedState.currentTrack.audioUrl) {
            audioRef.current.src = parsedState.currentTrack.audioUrl;
            
            // If there was a saved position, restore it
            if (parsedState.currentTime) {
              audioRef.current.currentTime = parsedState.currentTime;
              setCurrentTime(parsedState.currentTime);
            }
            
            // If it was playing before, resume playback
            if (parsedState.isPlaying) {
              audioRef.current.play().catch(error => {
                console.error("Error auto-resuming playback:", error);
              });
              setIsPlaying(true);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error restoring player state:", error);
      // If restoration fails, start with clean state
    }
  }, []);
  
  // Save player state to localStorage when it changes
  useEffect(() => {
    try {
      const stateToSave = {
        currentTrack,
        isPlaying,
        currentTime,
        queue,
        history: history.slice(0, 10), // Limit history to save storage space
        repeatMode,
        isShuffling,
        isMinimized
      };
      
      localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Error saving player state:", error);
    }
  }, [currentTrack, isPlaying, currentTime, queue, history, repeatMode, isShuffling, isMinimized]);
  
  // Save volume separately when it changes
  useEffect(() => {
    localStorage.setItem("beatstream_volume", volume.toString());
    
    // Update audio volume
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);
  
  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    
    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.error("Error playing audio:", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);
  
  // Update audio source when track changes
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    
    const wasPlaying = isPlaying;
    
    // Only update the source if it's different
    if (audioRef.current.src !== currentTrack.audioUrl) {
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.load();
      setCurrentTime(0);
      
      // If it was playing, continue playing
      if (wasPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Error playing new track:', error);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrack]);
  
  // Track progress update
  const updateCurrentTime = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);
  
  // Play a specific track
  const playTrack = useCallback((track: Track) => {
    // If there's a current track, add it to history before changing
    if (currentTrack) {
      setHistory(prev => [currentTrack, ...prev.slice(0, 19)]); // Keep up to 20 tracks in history
    }
    
    // Update the current track (which triggers audio source change)
    setCurrentTrack(track);
    setIsPlaying(true);
    
    // Unhide the player if minimized
    setIsMinimized(false);
  }, [currentTrack]);
  
  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (currentTrack) {
      setIsPlaying(!isPlaying);
    }
  }, [currentTrack, isPlaying]);
  
  // Get the next track to play based on queue and repeat mode
  const nextTrack = useCallback(() => {
    if (repeatMode === "one" && currentTrack) {
      // Repeat current track - don't change track, just restart
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }
    
    if (queue.length > 0) {
      // If we have queued tracks, play the next one
      const nextTrack = queue[0];
      const newQueue = queue.slice(1);
      
      // Add current track to history if it exists
      if (currentTrack) {
        setHistory(prev => [currentTrack, ...prev.slice(0, 19)]);
      }
      
      setCurrentTrack(nextTrack);
      setQueue(newQueue);
      setIsPlaying(true);
    } else if (repeatMode === "all" && currentTrack) {
      // If in repeat all mode and queue is empty, move current track to history
      // and start playing again from the beginning of history
      const newHistory = [...history];
      if (currentTrack) {
        newHistory.unshift(currentTrack);
      }
      
      // Get a track from history to play next, if available
      if (newHistory.length > 0) {
        setCurrentTrack(newHistory[0]);
        setHistory(newHistory.slice(1));
        setIsPlaying(true);
      }
    } else if (currentTrack) {
      // End of queue, no repeat - just finish playing
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
    }
  }, [queue, currentTrack, history, repeatMode]);
  
  // Play the previous track or restart current track
  const previousTrack = useCallback(() => {
    // If we're more than 3 seconds into a track, just restart it
    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      return;
    }
    
    // If we have history, go back to the previous track
    if (history.length > 0) {
      const prevTrack = history[0];
      const newHistory = history.slice(1);
      
      // Add current track to queue if it exists
      if (currentTrack) {
        setQueue(prev => [currentTrack, ...prev]);
      }
      
      setCurrentTrack(prevTrack);
      setHistory(newHistory);
      setIsPlaying(true);
    } else if (currentTrack) {
      // No history, just restart the current track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, [currentTrack, history, currentTime]);
  
  // Add a track to the end of the queue
  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => [...prev, track]);
  }, []);
  
  // Add a track to play next (at the front of the queue)
  const addTrackAndPlayNext = useCallback((track: Track) => {
    setQueue(prev => [track, ...prev]);
  }, []);
  
  // Clear the queue
  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(previousVolume);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
    }
    setIsMuted(!isMuted);
  }, [isMuted, volume, previousVolume]);
  
  // Toggle shuffle mode
  const toggleShuffle = useCallback(() => {
    setIsShuffling(!isShuffling);
    
    // When turning on shuffle, shuffle the current queue
    if (!isShuffling && queue.length > 1) {
      const shuffledQueue = [...queue];
      // Fisher-Yates shuffle algorithm
      for (let i = shuffledQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQueue[i], shuffledQueue[j]] = [shuffledQueue[j], shuffledQueue[i]];
      }
      setQueue(shuffledQueue);
    }
  }, [isShuffling, queue]);
  
  // Toggle repeat mode (off -> all -> one -> off)
  const toggleRepeat = useCallback(() => {
    setRepeatMode(current => {
      if (current === "off") return "all";
      if (current === "all") return "one";
      return "off";
    });
  }, []);
  
  // Toggle minimized state
  const toggleMinimized = useCallback(() => {
    setIsMinimized(!isMinimized);
  }, [isMinimized]);
  
  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        queue,
        history,
        playTrack,
        togglePlayPause,
        nextTrack,
        previousTrack,
        addToQueue,
        addTrackAndPlayNext,
        clearQueue,
        duration,
        currentTime,
        setCurrentTime,
        volume,
        setVolume,
        isMuted,
        toggleMute,
        isShuffling,
        toggleShuffle,
        repeatMode,
        toggleRepeat,
        isMinimized,
        toggleMinimized,
        audioElement, 
        formatTime
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  }
  return context;
}

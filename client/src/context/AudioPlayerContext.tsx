import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
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
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  // Core player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  
  // Audio control state
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const [previousVolume, setPreviousVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  
  // Playback modes
  const [isShuffling, setIsShuffling] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");

  // Track progress update from audio element
  const updateCurrentTime = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Play a specific track
  const playTrack = useCallback((track: Track) => {
    // If there's a current track, add it to history before changing
    if (currentTrack) {
      setHistory(prev => [currentTrack, ...prev.slice(0, 19)]); // Keep up to 20 tracks in history
    }
    
    // Update play count via an API call in a real implementation
    // For now we'll just update the state
    setCurrentTrack(track);
    setIsPlaying(true);
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
      setCurrentTime(0);
    }
  }, [queue, currentTrack, history, repeatMode]);

  // Play the previous track or restart current track
  const previousTrack = useCallback(() => {
    // If we're more than 3 seconds into a track, just restart it
    if (currentTime > 3) {
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

  // Initialize audio player from localStorage if available
  useEffect(() => {
    const savedVolume = localStorage.getItem("beatstream_volume");
    if (savedVolume) {
      const parsedVolume = parseInt(savedVolume);
      setVolume(parsedVolume);
      setIsMuted(parsedVolume === 0);
    }
  }, []);

  // Save volume to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("beatstream_volume", volume.toString());
  }, [volume]);

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
        toggleRepeat
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

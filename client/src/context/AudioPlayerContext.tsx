import React, { createContext, useContext, useState, ReactNode } from "react";
import { Track } from "@shared/schema";

interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (currentTrack) {
      setIsPlaying(!isPlaying);
    }
  };

  const nextTrack = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      const newQueue = queue.slice(1);
      setCurrentTrack(nextTrack);
      setQueue(newQueue);
      setIsPlaying(true);
    } else if (currentTrack) {
      // If no next track in queue, just restart current track
      setIsPlaying(true);
    }
  };

  const previousTrack = () => {
    if (currentTrack) {
      // Just restart current track for now
      // In a full implementation, we'd keep a history
      setIsPlaying(true);
    }
  };

  const addToQueue = (track: Track) => {
    setQueue([...queue, track]);
  };

  const clearQueue = () => {
    setQueue([]);
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        queue,
        playTrack,
        togglePlayPause,
        nextTrack,
        previousTrack,
        addToQueue,
        clearQueue,
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

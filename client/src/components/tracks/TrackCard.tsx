import { useState } from "react";
import { Play, Pause, Heart } from "lucide-react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { Track } from "@shared/schema";

interface TrackCardProps {
  track: Track;
}

export default function TrackCard({ track }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const isCurrentTrack = currentTrack?.id === track.id;
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayClick = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  return (
    <div 
      className={`bg-dark-200 p-3 rounded-lg group hover:bg-dark-100 transition ${isCurrentTrack ? 'bg-dark-100' : ''}`}
      onClick={handlePlayClick}
    >
      <div className="flex space-x-3">
        <div className="relative flex-shrink-0">
          <img 
            src={track.coverUrl}
            alt={track.title} 
            className="w-16 h-16 object-cover rounded" 
          />
          <button className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition rounded">
            {isCurrentTrack && isPlaying ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between">
            <div>
              <h3 className="font-medium">{track.title}</h3>
              <p className="text-sm text-gray-400">{track.artistName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{formatDuration(track.duration)}</p>
              <div className="flex items-center mt-1 space-x-3 text-gray-400 text-sm">
                <span className="flex items-center">
                  <Play className="h-3 w-3 mr-1" /> {track.playCount.toLocaleString()}
                </span>
                <span className="flex items-center">
                  <Heart className="h-3 w-3 mr-1" /> {track.likeCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="h-1.5 bg-dark-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${isCurrentTrack ? 'w-1/2' : 'w-0 group-hover:w-full'} bg-gradient-to-r from-primary to-secondary transition-all duration-300`}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

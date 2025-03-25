import { useState } from 'react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { Link, useLocation } from 'wouter';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX,
  Maximize2,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    currentTime,
    duration,
    formatTime,
    setCurrentTime,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    nextTrack,
    previousTrack,
    toggleMinimized,
    isMinimized
  } = useAudioPlayer();
  
  const [, navigate] = useLocation();
  
  // Don't show mini player if no track is selected or player is in full mode
  if (!currentTrack || !isMinimized) return null;
  
  // Navigate to full player page
  const goToFullPlayer = () => {
    toggleMinimized();
    navigate(`/tracks/${currentTrack.id}`);
  };
  
  // Handle seeking with slider
  const handleSeek = (values: number[]) => {
    setCurrentTime(values[0]);
  };
  
  // Handle volume change with slider
  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0]);
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-primary/20 z-50 px-4 py-2">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Track info */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {currentTrack.coverUrl ? (
            <img 
              src={currentTrack.coverUrl} 
              alt={currentTrack.title} 
              className="h-10 w-10 rounded-md object-cover border border-primary/30"
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center border border-primary/30">
              <Music className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link 
              href={`/tracks/${currentTrack.id}`}
              className="text-sm font-medium truncate block hover:text-primary"
            >
              {currentTrack.title}
            </Link>
            {currentTrack.artistName && (
              <Link 
                href={`/user/${currentTrack.userId}`}
                className="text-xs text-muted-foreground truncate block hover:text-primary"
              >
                {currentTrack.artistName}
              </Link>
            )}
          </div>
        </div>
        
        {/* Playback controls */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden sm:flex items-center space-x-1">
            <span className="text-xs w-10 text-right">{formatTime(currentTime)}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousTrack}
              className="h-8 w-8 hidden sm:flex"
              aria-label="Previous track"
            >
              <SkipBack size={16} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              className="h-8 w-8"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={nextTrack}
              className="h-8 w-8 hidden sm:flex"
              aria-label="Next track"
            >
              <SkipForward size={16} />
            </Button>
          </div>
          
          <div className="hidden sm:flex items-center space-x-1">
            <span className="text-xs w-10">{formatTime(duration)}</span>
          </div>
          
          {/* Progress bar (desktop only) */}
          <div className="hidden md:block w-64 lg:w-96">
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
              aria-label="Playback progress"
            />
          </div>
          
          {/* Volume control (desktop only) */}
          <div className="hidden lg:flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
            
            <Slider
              value={[volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-24"
              aria-label="Volume"
            />
          </div>
          
          {/* Expand to full view button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={goToFullPlayer}
            className="h-8 w-8"
            aria-label="Open full player"
          >
            <Maximize2 size={16} />
          </Button>
        </div>
      </div>
      
      {/* Mobile progress bar */}
      <div className="mt-1 md:hidden">
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="w-full"
          aria-label="Playback progress"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
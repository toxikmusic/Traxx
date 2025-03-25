import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Shuffle, 
  Repeat,
  ListPlus,
  Music,
  List,
  Minimize2
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AudioPlayer() {
  const { 
    currentTrack,
    isPlaying,
    queue,
    history,
    togglePlayPause,
    nextTrack,
    previousTrack,
    addToQueue,
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
    toggleMinimized,
    isMinimized,
    formatTime,
    audioElement
  } = useAudioPlayer();

  // If no track is playing, don't render the player
  if (!currentTrack || isMinimized) return null;

  // Calculate current progress percentage
  const currentProgress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // If seek position is changed using the slider
  const handleProgressChange = (value: number[]) => {
    if (audioElement && currentTrack) {
      const newTime = (value[0] / 100) * duration;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-background border-t border-primary/20 py-3 px-4 z-50 player-container">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center">
          {/* Track info */}
          <div className="flex items-center mr-4 w-1/4">
            {currentTrack.coverUrl ? (
              <img 
                src={currentTrack.coverUrl}
                alt={currentTrack.title} 
                className="w-12 h-12 object-cover rounded-md mr-3 hidden sm:block border border-primary/30 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-md flex items-center justify-center bg-primary/10 mr-3 hidden sm:block border border-primary/30">
                <Music className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="truncate">
              <h4 className="font-medium text-sm truncate hover:text-primary transition-colors">{currentTrack.title}</h4>
              <p className="text-xs text-muted-foreground hover:text-primary/80 transition-colors truncate">{currentTrack.artistName}</p>
            </div>
          </div>
          
          {/* Player controls */}
          <div className="flex-1 md:mx-4">
            <div className="flex items-center justify-center space-x-4 mb-1">
              <TooltipProvider>
                {/* Shuffle button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className={cn(
                        "text-muted-foreground hover:text-primary focus:outline-none transition-colors", 
                        isShuffling && "text-primary"
                      )}
                      onClick={toggleShuffle}
                    >
                      <Shuffle size={16} className={isShuffling ? "filter drop-shadow-sm" : ""} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isShuffling ? "Disable shuffle" : "Enable shuffle"}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Previous track button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="text-muted-foreground hover:text-primary focus:outline-none transition-colors" 
                      onClick={previousTrack}
                    >
                      <SkipBack size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{history.length > 0 ? "Previous track" : "Restart track"}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Play/Pause button */}
                <button 
                  className="text-white focus:outline-none bg-primary hover:bg-primary/80 rounded-full w-8 h-8 flex items-center justify-center shadow-sm transition-colors"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                </button>

                {/* Next track button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="text-muted-foreground hover:text-primary focus:outline-none transition-colors"
                      onClick={nextTrack}
                    >
                      <SkipForward size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{queue.length > 0 ? "Next track" : "End playback"}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Repeat button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className={cn(
                        "text-muted-foreground hover:text-primary focus:outline-none transition-colors",
                        repeatMode !== "off" && "text-primary"
                      )}
                      onClick={toggleRepeat}
                    >
                      <Repeat 
                        size={16} 
                        className={cn(
                          repeatMode === "one" ? "relative" : "",
                          repeatMode !== "off" ? "filter drop-shadow-sm" : ""
                        )}
                        {...(repeatMode === "one" ? { 
                          "data-number": "1",
                          "data-content": "1" 
                        } : {})}
                      />
                      {repeatMode === "one" && (
                        <span className="absolute text-[8px] font-bold text-primary" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -40%)' }}>
                          1
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {repeatMode === "off" && "Enable repeat all"}
                      {repeatMode === "all" && "Enable repeat one"}
                      {repeatMode === "one" && "Disable repeat"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="hidden sm:flex items-center">
              <span className="text-xs text-muted-foreground mr-2 min-w-[40px] text-right">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative">
                <Slider
                  value={[currentProgress]}
                  max={100}
                  step={1}
                  className="cursor-pointer audio-progress-bar themed-slider"
                  onValueChange={handleProgressChange}
                />
              </div>
              <span className="text-xs text-muted-foreground ml-2 min-w-[40px]">
                {formatTime(duration || 0)}
              </span>
            </div>
          </div>
          
          {/* Volume and Queue controls */}
          <div className="hidden md:flex items-center space-x-4 w-1/6 justify-end">
            <TooltipProvider>
              {/* Volume control */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="text-muted-foreground hover:text-primary focus:outline-none transition-colors"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMuted ? "Unmute" : "Mute"}</p>
                </TooltipContent>
              </Tooltip>
              
              <div className="w-24 relative">
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  className="cursor-pointer volume-slider themed-slider"
                  onValueChange={(value) => setVolume(value[0])}
                />
              </div>

              {/* Queue button */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-muted-foreground hover:text-primary focus:outline-none relative transition-colors">
                    <List size={16} />
                    {queue.length > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-white">
                        {queue.length}
                      </Badge>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 border-primary/20" align="end">
                  <div className="p-3 border-b border-primary/10">
                    <h4 className="font-medium text-primary-foreground">Queue: {queue.length} tracks</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {queue.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Your queue is empty
                      </div>
                    ) : (
                      <div className="p-1">
                        {queue.map((track, index) => (
                          <div key={`${track.id}-${index}`} className="flex items-center p-2 hover:bg-primary/5 rounded-md transition-colors">
                            {track.coverUrl ? (
                              <img src={track.coverUrl} alt={track.title} className="w-8 h-8 rounded-md mr-2 border border-primary/20" />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mr-2 border border-primary/20">
                                <Music size={12} className="text-primary" />
                              </div>
                            )}
                            <div className="flex-1 truncate">
                              <p className="text-xs font-medium truncate hover:text-primary transition-colors">{track.title}</p>
                              <p className="text-xs text-muted-foreground hover:text-primary/80 transition-colors truncate">{track.artistName}</p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(track.duration || 0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Minimize button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="text-muted-foreground hover:text-primary focus:outline-none transition-colors"
                    onClick={toggleMinimized}
                  >
                    <Minimize2 size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Minimize player</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

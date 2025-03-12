import { useRef, useEffect } from "react";
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
  List
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
  } = useAudioPlayer();
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Format time in mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle audio element playback state
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Error playing audio:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // When metadata is loaded, update the duration
    const handleMetadataLoaded = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        // Update the context's duration state
        // This function is unused, but we would update it if we had access
        // setDuration(audio.duration);
      }
    };

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => nextTrack();

    audio.addEventListener('loadedmetadata', handleMetadataLoaded);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleMetadataLoaded);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [nextTrack, setCurrentTime]);

  // Update audio volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // If seek position is changed using the slider
  const handleProgressChange = (value: number[]) => {
    if (audioRef.current && currentTrack) {
      const newTime = (value[0] / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Calculate current progress percentage
  const currentProgress = audioRef.current && currentTrack && audioRef.current.duration
    ? (currentTime / audioRef.current.duration) * 100
    : 0;

  // If no track is playing, don't render the player
  if (!currentTrack) return null;

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        preload="metadata"
      />

      <div className="fixed bottom-0 left-0 w-full bg-background border-t py-3 px-4 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center">
            {/* Track info */}
            <div className="flex items-center mr-4 w-1/4">
              {currentTrack.coverUrl ? (
                <img 
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title} 
                  className="w-12 h-12 object-cover rounded mr-3 hidden sm:block"
                />
              ) : (
                <div className="w-12 h-12 rounded flex items-center justify-center bg-muted mr-3 hidden sm:block">
                  <Music className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="truncate">
                <h4 className="font-medium text-sm truncate">{currentTrack.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artistName}</p>
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
                          "text-gray-400 hover:text-white focus:outline-none", 
                          isShuffling && "text-primary"
                        )}
                        onClick={toggleShuffle}
                      >
                        <Shuffle size={16} />
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
                        className="text-gray-400 hover:text-white focus:outline-none" 
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
                    className="text-white focus:outline-none bg-primary hover:bg-primary/80 rounded-full w-8 h-8 flex items-center justify-center"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                  </button>

                  {/* Next track button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="text-gray-400 hover:text-white focus:outline-none"
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
                          "text-gray-400 hover:text-white focus:outline-none",
                          repeatMode !== "off" && "text-primary"
                        )}
                        onClick={toggleRepeat}
                      >
                        <Repeat 
                          size={16} 
                          className={repeatMode === "one" ? "relative" : ""}
                          {...(repeatMode === "one" ? { 
                            "data-number": "1",
                            "data-content": "1" 
                          } : {})}
                        />
                        {repeatMode === "one" && (
                          <span className="absolute text-[8px] font-bold" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -40%)' }}>
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
                <span className="text-xs text-gray-400 mr-2 min-w-[40px] text-right">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 relative">
                  <Slider
                    value={[currentProgress]}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                    onValueChange={handleProgressChange}
                  />
                </div>
                <span className="text-xs text-gray-400 ml-2 min-w-[40px]">
                  {audioRef.current?.duration && !isNaN(audioRef.current.duration) 
                    ? formatTime(audioRef.current.duration) 
                    : formatTime(currentTrack.duration || 0)}
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
                      className="text-gray-400 hover:text-white focus:outline-none"
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
                    className="cursor-pointer"
                    onValueChange={(value) => setVolume(value[0])}
                  />
                </div>

                {/* Queue button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-gray-400 hover:text-white focus:outline-none relative">
                      <List size={16} />
                      {queue.length > 0 && (
                        <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                          {queue.length}
                        </Badge>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-3 border-b">
                      <h4 className="font-medium">Queue: {queue.length} tracks</h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {queue.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Your queue is empty
                        </div>
                      ) : (
                        <div className="p-1">
                          {queue.map((track, index) => (
                            <div key={`${track.id}-${index}`} className="flex items-center p-2 hover:bg-muted rounded">
                              {track.coverUrl ? (
                                <img src={track.coverUrl} alt={track.title} className="w-8 h-8 rounded mr-2" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center mr-2">
                                  <Music size={12} />
                                </div>
                              )}
                              <div className="flex-1 truncate">
                                <p className="text-xs font-medium truncate">{track.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
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
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

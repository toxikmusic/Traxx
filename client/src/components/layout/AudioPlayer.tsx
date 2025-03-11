import { useState, useRef, useEffect } from "react";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Shuffle, 
  Repeat
} from "lucide-react";

export default function AudioPlayer() {
  const { 
    currentTrack,
    isPlaying,
    togglePlayPause,
    nextTrack,
    previousTrack
  } = useAudioPlayer();
  
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Format time in mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Error playing audio:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => nextTrack();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [nextTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handleProgressChange = (value: number[]) => {
    if (audioRef.current && currentTrack) {
      const newTime = (value[0] / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const currentProgress = audioRef.current && currentTrack
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

      <div className="fixed bottom-0 left-0 w-full bg-dark-200 border-t border-dark-100 py-3 px-4 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center">
            {/* Track info */}
            <div className="flex items-center mr-4">
              <img 
                src={currentTrack.coverUrl}
                alt={currentTrack.title} 
                className="w-12 h-12 object-cover rounded mr-3 hidden sm:block"
              />
              <div>
                <h4 className="font-medium text-sm">{currentTrack.title}</h4>
                <p className="text-xs text-gray-400">{currentTrack.artistName}</p>
              </div>
            </div>
            
            {/* Player controls */}
            <div className="flex-1 mx-2 md:mx-4">
              <div className="flex items-center justify-center space-x-4 mb-1">
                <button 
                  className="text-gray-400 hover:text-white focus:outline-none" 
                  onClick={previousTrack}
                >
                  <SkipBack size={16} />
                </button>
                <button 
                  className="text-white focus:outline-none bg-primary hover:bg-primary/80 rounded-full w-8 h-8 flex items-center justify-center"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                </button>
                <button 
                  className="text-gray-400 hover:text-white focus:outline-none"
                  onClick={nextTrack}
                >
                  <SkipForward size={16} />
                </button>
              </div>
              <div className="hidden sm:flex items-center">
                <span className="text-xs text-gray-400 mr-2">
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
                <span className="text-xs text-gray-400 ml-2">
                  {audioRef.current?.duration ? formatTime(audioRef.current.duration) : '0:00'}
                </span>
              </div>
            </div>
            
            {/* Volume controls */}
            <div className="hidden md:flex items-center space-x-4">
              <button className="text-gray-400 hover:text-white focus:outline-none">
                <Volume2 size={16} />
              </button>
              <div className="w-24 relative">
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                  onValueChange={(value) => setVolume(value[0])}
                />
              </div>
              <button className="text-gray-400 hover:text-white focus:outline-none">
                <Shuffle size={16} />
              </button>
              <button className="text-gray-400 hover:text-white focus:outline-none">
                <Repeat size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

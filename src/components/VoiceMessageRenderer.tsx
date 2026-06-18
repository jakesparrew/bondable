
import React, { useRef } from 'react';
import { useOptimizedState, useOptimizedMemo, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, ChevronUp } from 'lucide-react';
import { MessageAttachment, messageAttachmentService } from '@/services/api';
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";

interface VoiceMessageRendererProps {
  attachment: MessageAttachment;
  isCurrentUser: boolean;
  disabled?: boolean;
}

const VoiceMessageRenderer = ({ attachment, isCurrentUser, disabled = false }: VoiceMessageRendererProps) => {
  const [isPlaying, setIsPlaying] = useOptimizedState(false);
  const [progress, setProgress] = useOptimizedState(0);
  const [currentTime, setCurrentTime] = useOptimizedState(0);
  const [duration, setDuration] = useOptimizedState(0);
  const [isExpanded, setIsExpanded] = useOptimizedState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { t } = useTranslation();
  
  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Simple hash function for consistent soundwave
  const generateConsistentHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  // Generate consistent soundwave bars
  const soundwaveBars = useOptimizedMemo(() => {
    const bars = [];
    const barCount = 25;
    const hash = generateConsistentHash(attachment.id);
    
    for (let i = 0; i < barCount; i++) {
      const seedValue = (hash + i * 1337) % 1000;
      const height = (seedValue % 12) + 3; // Height between 3-14px
      bars.push(height);
    }
    
    return bars;
  }, [attachment.id]);

  const handlePlayPause = async () => {
    if (disabled) return;
    try {
      if (!audioRef.current) {
        const signedUrl = attachment.file_url.startsWith("blob:")
          ? attachment.file_url
          : await messageAttachmentService.getSignedUrl(attachment.file_url);
        
        audioRef.current = new Audio(signedUrl);
        audioRef.current.preload = 'auto';
        audioRef.current.crossOrigin = 'anonymous';
        
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        });

        audioRef.current.addEventListener('timeupdate', () => {
          if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const total = audioRef.current.duration;
            setCurrentTime(current);
            setProgress((current / total) * 100);
          }
        });

        audioRef.current.addEventListener('ended', () => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        });

        audioRef.current.addEventListener('error', (e) => {
          console.error('🎵 Audio error:', audioRef.current?.error);
          setIsPlaying(false);
        });
        
        audioRef.current.load();
      }

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (playError) {
          console.error('🎵 Play error:', playError);
          try {
            audioRef.current.load();
            await new Promise(resolve => setTimeout(resolve, 100));
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (retryError) {
            console.error("🎵 Retry play error:", retryError);
            toast.error(t("unable_to_play_audio"));
            setIsPlaying(false);
          }
        }
      }
    } catch (error) {
      console.error("🎵 Error in handlePlayPause:", error);
      toast.error(t("failed_to_play_audio"));
      setIsPlaying(false);
    }
  };

  const handleSeek = (direction: 'forward' | 'backward') => {
    if (disabled) return;
    if (!audioRef.current) return;
    
    const skipAmount = 10; // seconds
    const newTime = direction === 'forward' 
      ? Math.min(audioRef.current.currentTime + skipAmount, audioRef.current.duration)
      : Math.max(audioRef.current.currentTime - skipAmount, 0);
    
    audioRef.current.currentTime = newTime;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
  };

  useOptimizedEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const generateSoundwaveBars = () => {
    return soundwaveBars.map((height, i) => {
      const isActive = progress > (i / soundwaveBars.length) * 100;
      
      return (
        <div
          key={i}
          className={`w-0.5 rounded transition-colors duration-150 ${
            isActive
              ? (isCurrentUser ? 'bg-primary-foreground' : 'bg-primary')
              : (isCurrentUser ? 'bg-primary-foreground/40' : 'bg-muted-foreground')
          }`}
          style={{ height: `${height}px` }}
        />
      );
    });
  };

  const totalDuration = duration || attachment.duration_seconds || 0;

  return (
    <div
      className={`rounded-lg overflow-hidden border transition-all duration-200 ${
        isCurrentUser
          ? "bg-primary border-transparent text-primary-foreground"
          : "bg-muted border-transparent text-foreground"
      } ${isExpanded ? 'pb-2' : ''}`}
    >
      {/* Minimal View */}
      <div className="flex items-center p-3 space-x-3">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={disabled}
          aria-disabled={disabled}
          className={` rounded-full flex items-center justify-center transition-colors ${
            isCurrentUser
              ? " text-primary-foreground hover:text-primary-foreground"
              : " text-muted-foreground hover:text-foreground"
          } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        >
          {isPlaying ? <Pause className="w-4 h-4" fill="currentColor"/> : <Play className="w-4 h-4 ml-0.5" fill="currentColor"/>}
        </button>

        {/* Soundwave & Progress */}
        <div className="flex-1 flex items-center space-x-3">
          <div 
            className={`flex items-end space-x-px h-5 cursor-pointer flex-1 ${disabled ? 'pointer-events-none opacity-70' : ''}`}
            onClick={handleProgressClick}
          >
            {generateSoundwaveBars()}
          </div>
          
          {/* Time Display */}
          <div className={`text-xs font-mono min-w-[4rem] text-right ${
            isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            isCurrentUser
              ? 'text-primary-foreground/70 hover:text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="px-3 pb-1 space-y-3 animate-fade-in">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div 
              className={`w-full h-1 rounded-full cursor-pointer ${
                isCurrentUser ? 'bg-primary-foreground/30' : 'bg-muted-foreground/30'
              } ${disabled ? 'pointer-events-none opacity-70' : ''}`}
              onClick={handleProgressClick}
            >
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  isCurrentUser ? 'bg-primary-foreground' : 'bg-primary'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Advanced Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => handleSeek('backward')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isCurrentUser
                  ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background'
              }`}
              title={t("rewind_10s")}
            >
              <SkipBack className="w-4 h-4" fill="currentColor"/>
            </button>

            <button
              onClick={handlePlayPause}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isCurrentUser
                  ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor"/> : <Play className="w-5 h-5 ml-0.5" fill="currentColor"/>}
            </button>

            <button
              onClick={() => handleSeek('forward')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isCurrentUser
                  ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background'
              }`}
              title={t("forward_10s")}
            >
              <SkipForward className="w-4 h-4" fill="currentColor"/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceMessageRenderer;

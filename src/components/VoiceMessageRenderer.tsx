
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
              ? (isCurrentUser ? 'bg-neutral-700' : 'bg-neutral-300')
              : (isCurrentUser ? 'bg-neutral-300' : 'bg-neutral-600')
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
          ? "bg-white border-transparent text-neutral-900" 
          : "bg-[#27272a] border-transparent text-white"
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
              ? " text-neutral-700 hover:text-neutral-900"
              : " text-neutral-300 hover:text-neutral-100"
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
            isCurrentUser ? 'text-neutral-500' : 'text-neutral-400'
          }`}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            isCurrentUser 
              ? 'text-neutral-400 hover:text-neutral-600' 
              : 'text-neutral-500 hover:text-neutral-300'
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
                isCurrentUser ? 'bg-neutral-200' : 'bg-neutral-700'
              } ${disabled ? 'pointer-events-none opacity-70' : ''}`}
              onClick={handleProgressClick}
            >
              <div 
                className={`h-full rounded-full transition-all duration-100 ${
                  isCurrentUser ? 'bg-neutral-700' : 'bg-white'
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
                  ? 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-600'
              }`}
              title={t("rewind_10s")}
            >
              <SkipBack className="w-4 h-4" fill="currentColor"/>
            </button>

            <button
              onClick={handlePlayPause}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isCurrentUser
                  ? "bg-neutral-800 text-white hover:bg-neutral-700"
                  : "bg-white text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor"/> : <Play className="w-5 h-5 ml-0.5" fill="currentColor"/>}
            </button>

            <button
              onClick={() => handleSeek('forward')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isCurrentUser 
                  ? 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-600'
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

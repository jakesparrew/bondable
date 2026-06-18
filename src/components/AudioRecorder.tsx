import React, { useState, useRef, useEffect } from 'react';
import console from "@/lib/production-console";
import { 
  useOptimizedState, 
  useOptimizedEffect 
} from "@/hooks/performance/useOptimizedComponents";

import { useTranslation } from "react-i18next";
import { Button } from '@/components/ui/button';
import { Mic, Play, Pause, Send, X, ArrowUp } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

const AudioRecorder = ({ onRecordingComplete, onCancel }: AudioRecorderProps) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useOptimizedState(false);
  const [hasRecording, setHasRecording] = useOptimizedState(false);
  const [isPlaying, setIsPlaying] = useOptimizedState(false);
  const [audioBlob, setAudioBlob] = useOptimizedState<Blob | null>(null);
  const [duration, setDuration] = useOptimizedState(0);
  const [currentTime, setCurrentTime] = useOptimizedState(0);
  const [audioLevels, setAudioLevels] = useOptimizedState<number[]>(new Array(50).fill(0));
  const [recordedWaveform, setRecordedWaveform] = useOptimizedState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStartTime = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const progressUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Use refs to avoid closure issues in animation loop
  const isRecordingRef = useRef(false);
  const audioLevelsRef = useRef<number[]>(new Array(50).fill(0));

  const NUM_BARS = 50;

  const startRecording = async () => {
    try {
      // Starting recording
  
      // ✅ Create AudioContext immediately on user gesture (fixes iOS Safari)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      // Audio context created
  
      // ✅ Device detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
      // ✅ Check for support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser');
      }
  
      let stream: MediaStream;
  
      // ✅ iOS requires simplest constraints
      if (isIOS) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else if (isMobile) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
            channelCount: 1,
          },
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });
      }
  
      streamRef.current = stream;
      // Media stream obtained
  
      // ✅ Set up analyser for waveform visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.1;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyserRef.current = analyser;
  
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      // REMOVED: Debug logging for production
  
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
  
      // ✅ Pick mobile-compatible MIME type for MediaRecorder (omit on iOS to let WKWebView choose AAC/MP4)
      let selectedMimeType: string | undefined;
      if (isIOS) {
        selectedMimeType = undefined;
      } else if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
          selectedMimeType = 'audio/mpeg';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          selectedMimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          selectedMimeType = 'audio/webm';
        }
      }
  
      const recorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined as any);
      const chunks: BlobPart[] = [];
  
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
  
      recorder.onstop = async () => {
        // REMOVED: Debug logging for production
        const finalType = (chunks[0] as Blob)?.type || selectedMimeType || 'audio/mp4';
        const blob = new Blob(chunks, { type: finalType }); // ✅ match MIME type
        setAudioBlob(blob);
        setHasRecording(true);
  
        const recordingDuration = (Date.now() - recordingStartTime.current) / 1000;
        setDuration(recordingDuration);
  
        await generateWaveform(blob);
        cleanup();
      };
  
      recorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        cleanup();
      };
  
      mediaRecorderRef.current = recorder;
      recordingStartTime.current = Date.now();
      recorder.start(100); // capture every 100ms
  
      // ✅ Update state
      isRecordingRef.current = true;
      setIsRecording(true);
      setHasRecording(false);
      setAudioLevels(new Array(NUM_BARS).fill(0));
      audioLevelsRef.current = new Array(NUM_BARS).fill(0);
  
      // ✅ Start visualizer
      startVisualization();
      // REMOVED: Debug logging for production
    } catch (error) {
      console.error('❌ Error starting recording:', error);
  
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert(t('allow_microphone_access'));
        } else if (error.name === 'NotFoundError') {
          alert(t('no_microphone_found'));
        } else if (error.name === 'NotSupportedError') {
          alert(t('recording_not_supported'));
        } else {
          alert(t('failed_to_start_recording'));
        }
      }
  
      cleanup();
    }
  };

  const startVisualization = () => {
    if (!analyserRef.current || !dataArrayRef.current) {
      console.warn('⚠️ No analyser or data array available');
      return;
    }

    const updateVisualization = () => {
      // Check if we should continue the animation loop
      if (!isRecordingRef.current || !analyserRef.current || !dataArrayRef.current) {
        console.log('🔚 Stopping visualization loop');
        return;
      }

      try {
        // Get frequency domain data for better sensitivity
        const buffer = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buffer);
        
        const newLevels: number[] = [];
        const frequencyStep = Math.floor(buffer.length / NUM_BARS);
        
        for (let i = 0; i < NUM_BARS; i++) {
          let sum = 0;
          let max = 0;
          const start = i * frequencyStep;
          const end = Math.min(start + frequencyStep, buffer.length);
          
          // Focus on lower frequencies for voice (more responsive)
          const frequencyWeight = i < NUM_BARS * 0.3 ? 2.0 : 1.0;
          
          for (let j = start; j < end; j++) {
            const value = buffer[j];
            sum += value * frequencyWeight;
            max = Math.max(max, value * frequencyWeight);
          }
          
          // Enhanced sensitivity calculation
          const average = sum / (end - start);
          const normalized = Math.min(average / 255, 1);
          
          // Apply logarithmic scaling for better visual response
          const logScaled = Math.log10(normalized * 9 + 1); // log10(1) to log10(10)
          
          // Add minimum activity and boost sensitivity
          const level = Math.max(0.05, logScaled * 1.5);
          
          newLevels.push(Math.min(level, 1));
        }
        
        // Update refs and state
        audioLevelsRef.current = newLevels;
        setAudioLevels(newLevels);
        
        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(updateVisualization);
        
      } catch (error) {
        console.error('❌ Error in visualization loop:', error);
      }
    };
    
    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(updateVisualization);
  };

  const generateWaveform = async (blob: Blob) => {
    try {
      console.log('📊 Generating waveform...');
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samples = NUM_BARS;
      const blockSize = Math.floor(channelData.length / samples);
      const waveform: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        const start = i * blockSize;
        const end = start + blockSize;
        
        for (let j = start; j < end && j < channelData.length; j++) {
          sum += Math.abs(channelData[j]);
        }
        waveform.push(sum / blockSize);
      }
      
      // Normalize waveform
      const max = Math.max(...waveform, 0.1);
      const normalizedWaveform = waveform.map(val => 0.9 - (val / max));
      
      setRecordedWaveform(normalizedWaveform);
      await audioContext.close();
      console.log('✅ Waveform generated');
    } catch (error) {
      console.error('❌ Error generating waveform:', error);
      setRecordedWaveform(new Array(NUM_BARS).fill(0.2));
    }
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up...');
    
    // Update refs first
    isRecordingRef.current = false;
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Clear progress update
    if (progressUpdateRef.current) {
      clearInterval(progressUpdateRef.current);
      progressUpdateRef.current = null;
    }
    
      // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().then(() => {
        console.log('🔇 Audio context closed');
      });
    }
    
    // Clear refs
    analyserRef.current = null;
    dataArrayRef.current = null;
    mediaRecorderRef.current = null;
  };

  const stopRecording = () => {
    console.log('🛑 Stopping recording...');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // cleanup() will be called in the onstop handler
    }
  };

  const playRecording = () => {
    if (!audioBlob) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current);
        progressUpdateRef.current = null;
      }
      return;
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Force load the audio to get proper duration
    audio.load();
    
    // Set up event listeners before attempting to play
    const setupAudioEvents = () => {
      audio.onloadeddata = () => {
        console.log('📊 Audio data loaded');
      };

      audio.oncanplay = () => {
        console.log('📊 Audio can play, duration:', audio.duration);
        
        // Use recorded duration as fallback if audio.duration is invalid
        const actualDuration = audio.duration && isFinite(audio.duration) ? audio.duration : duration;
        console.log('📊 Using duration:', actualDuration);
        
        // Start playback
        audio.play().then(() => {
          setIsPlaying(true);
          setCurrentTime(0);
          
          // Use interval for more reliable progress updates
          const updateProgress = () => {
            if (audio && !audio.paused && !audio.ended) {
              const currentAudioTime = audio.currentTime;
              setCurrentTime(currentAudioTime);
              console.log('📊 Progress:', currentAudioTime, '/', actualDuration);
            }
          };
          
          // Update progress immediately and then every 50ms for smooth animation
          updateProgress();
          progressUpdateRef.current = setInterval(updateProgress, 50);
          
        }).catch((error) => {
          console.error('❌ Error playing audio:', error);
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        });
      };

      audio.onended = () => {
        console.log('📊 Audio playback ended');
        setIsPlaying(false);
        setCurrentTime(0);
        if (progressUpdateRef.current) {
          clearInterval(progressUpdateRef.current);
          progressUpdateRef.current = null;
        }
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error('❌ Error playing audio:', e);
        setIsPlaying(false);
        setCurrentTime(0);
        if (progressUpdateRef.current) {
          clearInterval(progressUpdateRef.current);
          progressUpdateRef.current = null;
        }
        URL.revokeObjectURL(audioUrl);
      };

      audio.ontimeupdate = () => {
        if (audio && !audio.paused && !audio.ended) {
          setCurrentTime(audio.currentTime);
        }
      };
    };

    setupAudioEvents();

    // Try to trigger canplay event if it doesn't fire automatically
    setTimeout(() => {
      if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or better
        const canplayHandler = audio.oncanplay;
        if (canplayHandler) {
          canplayHandler.call(audio, new Event('canplay'));
        }
      }
    }, 100);
  };

  const handleMicClick = () => {
    if (isRecording) {
      // Stop current recording
      stopRecording();
    } else if (hasRecording) {
      // Delete existing recording and start new one
      setHasRecording(false);
      setAudioBlob(null);
      setCurrentTime(0);
      setIsPlaying(false);
      setAudioLevels(new Array(NUM_BARS).fill(0));
      setRecordedWaveform([]);
      audioLevelsRef.current = new Array(NUM_BARS).fill(0);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Start new recording
      startRecording();
    } else {
      // Start recording
      startRecording();
    }
  };

  const handleSendRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, duration);
    }
  };

  const handleCancel = () => {
    // Stop recording if in progress
    if (isRecording) {
      stopRecording();
    }
    
    // Clear any existing recording
    setHasRecording(false);
    setAudioBlob(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setAudioLevels(new Array(NUM_BARS).fill(0));
    setRecordedWaveform([]);
    audioLevelsRef.current = new Array(NUM_BARS).fill(0);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Call the onCancel callback to return to normal input view
    onCancel();
  };

  // Cleanup on unmount
  useOptimizedEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const renderVisualizer = () => {
    if (isRecording) {
      // Real-time recording visualization with improved sensitivity
      return (
        <div className="flex items-center justify-center h-8 w-full px-2">
          <div className="flex items-end justify-between w-full h-full gap-px">
            {audioLevels.map((level, i) => (
              <div
                key={i}
                className="bg-white rounded-sm transition-all duration-100 flex-1 min-w-[1px]"
                style={{
                  height: `${Math.max(2, level * 32)}px`,
                  opacity: Math.max(0.3, 0.5 + (level * 0.5))
                }}
              />
            ))}
          </div>
        </div>
      );
    } else if (hasRecording && recordedWaveform.length > 0) {
      // Recorded waveform with improved playback progress
      const audioDuration = duration; // Always use recorded duration
      const progress = audioDuration > 0 ? (currentTime / audioDuration) : 0;
      const playedBars = Math.floor(progress * recordedWaveform.length);
      
      console.log('📊 Render progress:', { currentTime, audioDuration, progress, playedBars });
      
      return (
        <div className="flex items-center justify-center h-8 w-full px-2">
          <div className="flex items-end justify-between w-full h-full gap-px">
            {recordedWaveform.map((level, i) => (
              <div
                key={i}
                className={`rounded-sm transition-all duration-75 flex-1 min-w-[1px] ${
                  !isPlaying || i < playedBars ? 'bg-neutral-100' : 'bg-neutral-500'
                }`}
                style={{
                  height: `${Math.max(2, level * 32)}px`
                }}
              />
            ))}
          </div>
        </div>
      );
    } else {
      // Default inactive state
      return (
        <div className="flex items-center justify-center h-8 w-full px-2">
          <div className="flex items-end justify-between w-full h-full gap-px">
            {Array.from({ length: NUM_BARS }).map((_, i) => (
              <div
                key={i}
                className="bg-neutral-500 rounded-sm flex-1 min-w-[1px] h-1"
              />
            ))}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex items-center space-x-2 w-full">
      <Button
        onClick={handleMicClick}
        className={`h-10 w-10 p-0 ${
          isRecording ? 'bg-white text-black hover:bg-gray-200 hover:text-neutral-800' : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-neutral-800'
        }`}
        variant="ghost"
      >
        <Mic className="h-4 w-4" />
      </Button>

      {/* Always show X button next to record button */}
      <Button
        onClick={handleCancel}
        className="h-10 w-10 p-0 bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-neutral-800"
        variant="ghost"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex-1 bg-[#1a1a1a] border border-[#1f1f23] rounded-md h-10 flex items-center justify-center overflow-hidden">
        {renderVisualizer()}
      </div>

      {hasRecording && (
        <div className="flex items-center space-x-2">
          <Button
            onClick={playRecording}
            variant="ghost"
            size="sm"
            className="bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-neutral-800 h-10 w-10 p-0"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            onClick={handleSendRecording}
            variant="ghost"
            size="sm"
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-950 hover:text-neutral-800 h-10 w-10 p-0"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;

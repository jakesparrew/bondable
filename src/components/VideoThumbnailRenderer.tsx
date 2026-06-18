
import React, { useRef } from 'react';
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import { Play, AlertCircle } from 'lucide-react';
import { MessageAttachment } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import VideoPreviewDialog from './dialogs/VideoPreviewDialog';
import { useTranslation } from "react-i18next";

interface VideoThumbnailRendererProps {
  attachment: MessageAttachment;
  isCurrentUser: boolean;
}

const VideoThumbnailRenderer = ({ attachment, isCurrentUser }: VideoThumbnailRendererProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useOptimizedState<string | null>(null);
  const [videoUrl, setVideoUrl] = useOptimizedState<string | null>(null);
  const [loading, setLoading] = useOptimizedState(true);
  const [error, setError] = useOptimizedState<string | null>(null);
  const [showPreview, setShowPreview] = useOptimizedState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useTranslation();

  const isOptimistic = (attachment.id || '').toString().startsWith('temp-') || attachment.file_url.startsWith('blob:');

  useOptimizedEffect(() => {
    if (isOptimistic) {
      // Skip loading/generating thumbnail for optimistic; show placeholder instead
      setLoading(false);
      setError(null);
      setThumbnailUrl(null);
      setVideoUrl(null);
      return;
    }

    const loadVideo = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get signed URL for the video
        const { data: signedUrlData, error: urlError } = await supabase
          .storage
          .from('message-attachments')
          .createSignedUrl(attachment.file_url, 3600);

        if (urlError || !signedUrlData?.signedUrl) {
          throw new Error("Failed to load video URL");
        }

        setVideoUrl(signedUrlData.signedUrl);
      } catch (err) {
        console.error("Error loading video:", err);
        setError(t("failed_to_load_video"));
        setLoading(false);
      }
    };

    loadVideo();
  }, [attachment.file_url, isOptimistic]);

  const generateThumbnail = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setThumbnailUrl(url);
        }
        setLoading(false);
      }, "image/jpeg", 0.8);
    } catch (err) {
      console.error("Error generating thumbnail:", err);
      setError(t("failed_to_generate_thumbnail"));
      setLoading(false);
    }
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      // Seek to 1 second or 10% of duration, whichever is smaller
      const seekTime = Math.min(1, videoRef.current.duration * 0.1);
      videoRef.current.currentTime = seekTime;
    }
  };

  const handleVideoSeeked = () => {
    generateThumbnail();
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("Video loading error:", e);
    setError(t("failed_to_generate_thumbnail"));
    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <>
      <div
        className={`relative rounded-lg overflow-hidden cursor-pointer group max-w-xs ${
          isCurrentUser ? 'ml-auto' : 'mr-auto'
        }`}
        onClick={() => setShowPreview(true)}
      >
        {loading && (
          <div className="w-64 h-36 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 animate-pulse flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}

        {error && (
          <div className="w-64 h-36 bg-card flex flex-col items-center justify-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2" />
            <span className="text-sm text-center px-2">{error}</span>
          </div>
        )}

        {isOptimistic && !loading && !error && (
          <div className="relative">
            <img
              src="/placeholder.svg"
              alt={t('sending_video_preview')}
              className="w-64 h-36 object-cover opacity-100 scale-[1.7] origin-center"
            />
          </div>
        )}

        {thumbnailUrl && !loading && !error && (
          <div className="relative">
            <img
              src={thumbnailUrl}
              alt={attachment.file_name}
              className="w-64 h-36 object-cover"
            />

            {/* Video info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
              <div className="text-white text-sm">
                <p className="font-medium truncate max-w-[200px]">{attachment.file_name}</p>
                <div className="flex items-center justify-between text-xs opacity-75">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  {attachment.duration_seconds && (
                    <span>{formatDuration(attachment.duration_seconds)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hidden video element for thumbnail generation */}
        {videoUrl && (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={handleVideoLoad}
              onSeeked={handleVideoSeeked}
              onError={handleVideoError}
              className="hidden"
              preload="metadata"
              crossOrigin="anonymous"
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      {/* Video preview dialog */}
      <VideoPreviewDialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        videoUrl={videoUrl}
        fileName={attachment.file_name}
      />
    </>
  );
};

export default VideoThumbnailRenderer;

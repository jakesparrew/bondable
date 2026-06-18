
import React, { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface VideoPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  fileName: string;
}

const VideoPreviewDialog = ({ isOpen, onClose, videoUrl, fileName }: VideoPreviewDialogProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      // Reset video when dialog opens
      videoRef.current.currentTime = 0;
    }
  }, [isOpen]);

  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!videoUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-card border-border p-4 rounded shadow-lg max-w-4xl w-full"
        disableCloseButton
      >
        <VisuallyHidden>
          <DialogTitle>{fileName}</DialogTitle>
        </VisuallyHidden>
        <div className="flex justify-end ">
          <DialogClose asChild>
            <button
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogClose>
        </div>
        
        <div className="relative">
          {/* Video player */}
          <div className="w-full">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full h-auto max-h-[80vh] object-contain"
              autoPlay
              crossOrigin="anonymous"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Video info */}
          <p className="text-muted-foreground text-sm mt-3 flex flex-col items-center">{fileName}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPreviewDialog;

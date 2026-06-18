
import React from 'react';
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { MessageAttachment, messageAttachmentService } from '@/services/api';
import { ImagePreviewDialog } from './dialogs/ImagePreviewDialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ImageThumbnailRendererProps {
  attachment: MessageAttachment;
  isCurrentUser: boolean;
}

const ImageThumbnailRenderer = ({ attachment, isCurrentUser }: ImageThumbnailRendererProps) => {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useOptimizedState<string | null>(null);
  const [isLoading, setIsLoading] = useOptimizedState(true);

  const isOptimistic = (attachment.id || '').toString().startsWith('temp-') || attachment.file_url.startsWith('blob:');

  useOptimizedEffect(() => {
    if (isOptimistic) {
      setIsLoading(false);
      setImageUrl(null);
      return;
    }

    const loadImage = async () => {
      try {
        const signedUrl = attachment.file_url.startsWith("blob:")
          ? attachment.file_url
          : await messageAttachmentService.getSignedUrl(attachment.file_url);
        setImageUrl(signedUrl);
      } catch (error) {
        console.error("Error loading image:", error);
        toast.error(t("failed_to_load"));
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [attachment.file_url, isOptimistic]);

  if (isOptimistic) {
    return (
      <div className="w-48 h-32 rounded-lg overflow-hidden">
        <img
          src="/placeholder.svg"
          alt={t('sending_image_preview')}
          className="w-full h-full object-cover opacity-100 scale-[1.7] origin-center"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-48 h-32 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 rounded-lg animate-pulse flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-48 h-32 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
        <span className="text-sm text-neutral-500">{t("failed_to_load")}</span>
      </div>
    );
  }

  return (
    <div className="">
      <ImagePreviewDialog
        src={imageUrl}
        alt={attachment.file_name}
        trigger={
          <button className="block">
            <img
              src={imageUrl}
              alt={attachment.file_name}
              className="w-48 h-32 object-cover rounded-lg hover:opacity-90 transition-opacity"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg";
              }}
            />
          </button>
        }
      />
    </div>
  );
};

export default ImageThumbnailRenderer;


import React from 'react';
import { MessageAttachment } from '@/services/api';
import VoiceMessageRenderer from './VoiceMessageRenderer';
import ImageThumbnailRenderer from './ImageThumbnailRenderer';
import PDFThumbnailRenderer from './PDFThumbnailRenderer';
import VideoThumbnailRenderer from './VideoThumbnailRenderer';

interface AttachmentRendererProps {
  attachment: MessageAttachment;
  isCurrentUser: boolean;
}

const AttachmentRenderer = ({ attachment, isCurrentUser }: AttachmentRendererProps) => {
  const isOptimistic = (
    (attachment.id as unknown as string)?.toString().startsWith('temp-') ||
    (attachment.file_url || '').startsWith('blob:')
  );

  switch (attachment.file_type) {
    case 'voice':
      return <VoiceMessageRenderer attachment={attachment} isCurrentUser={isCurrentUser} disabled={isOptimistic} />;
    case 'image':
      return <ImageThumbnailRenderer attachment={attachment} isCurrentUser={isCurrentUser} />;
    case 'pdf':
      return <PDFThumbnailRenderer attachment={attachment} isCurrentUser={isCurrentUser} />;
    case 'video':
      return <VideoThumbnailRenderer attachment={attachment} isCurrentUser={isCurrentUser} />;
    default:
      return null;
  }
};

export default AttachmentRenderer;

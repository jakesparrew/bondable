import React from 'react';
import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';
import { MessageAttachment, messageAttachmentService } from '@/services/api';
import PDFViewer from './PDFViewer';

interface PDFThumbnailRendererProps {
  attachment: MessageAttachment;
  isCurrentUser: boolean;
}

const PDFThumbnailRenderer = ({ attachment, isCurrentUser }: PDFThumbnailRendererProps) => {
  const [showPDFViewer, setShowPDFViewer] = useOptimizedState(false);
  const [pdfUrl, setPdfUrl] = useOptimizedState<string | null>(null);

  // Optimistic state: temporary id or blob URL
  const isOptimistic =
    ((attachment.id as unknown as string)?.toString().startsWith('temp-')) ||
    ((attachment.file_url || '').startsWith('blob:'));

  const handleOpenPDF = async () => {
    if (isOptimistic) return;
    try {
      const signedUrl = await messageAttachmentService.getSignedUrl(attachment.file_url);
      setPdfUrl(signedUrl);
      setShowPDFViewer(true);
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const pdfIconUrl =
    '/pdf.png';

  return (
    <>
      <button
        onClick={handleOpenPDF}
        aria-label={`Open PDF ${attachment.file_name}`}
        disabled={isOptimistic}
        aria-disabled={isOptimistic}
        className={`p-0 m-0 border-none bg-transparent transition-opacity ${isOptimistic ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'hover:opacity-80'}`}
        title={isOptimistic ? 'Uploading PDF…' : `Open PDF ${attachment.file_name}`}
      >
        <img
          src={pdfIconUrl}
          alt="PDF document icon"
          className="h-24 w-auto object-contain"
        />
      </button>

      {showPDFViewer && pdfUrl && (
        <PDFViewer
          fileUrl={pdfUrl}
          fileName={attachment.file_name}
          onCancel={() => setShowPDFViewer(false)}
        />
      )}
    </>
  );
};

export default PDFThumbnailRenderer;

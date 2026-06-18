
import { useRef } from "react";
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import { Button } from "@/components/ui/button";
import { FileText, Download, X, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface PDFViewerProps {
  onPDFSelect?: (pdfFile: File) => void;
  onCancel?: () => void;
  fileUrl?: string;
  fileName?: string;
  isUploadMode?: boolean;
}

const PDFViewer = ({ 
  onPDFSelect, 
  onCancel, 
  fileUrl, 
  fileName, 
  isUploadMode = false 
}: PDFViewerProps) => {
  const [selectedPDF, setSelectedPDF] = useOptimizedState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useOptimizedState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
          toast.error(t("pdf_files_only_max_50mb"));
          return;
        }
        setSelectedPDF(file);
        const url = URL.createObjectURL(file);
        setPdfPreview(url);
      } else {
        toast.error(t("choose_pdf"));
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = () => {
    setSelectedPDF(null);
    if (pdfPreview) {
      URL.revokeObjectURL(pdfPreview);
    }
    setPdfPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if (selectedPDF && onPDFSelect) {
      onPDFSelect(selectedPDF);
    }
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload mode
  if (isUploadMode) {
    return (
      <div className="bg-[#1a1a1a] border border-[#1f1f23] rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">{t("share_pdf")}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            ×
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedPDF ? (
          <div className="text-center space-y-4">
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">{t("select_pdf_to_share")}</p>
              <Button
                onClick={handleUploadClick}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t("choose_pdf")}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              {t("pdf_files_only_max_50mb")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-gray-600 rounded-lg p-4">
              <iframe
                src={pdfPreview || undefined}
                className="w-full h-64 rounded"
                title={t("pdf_preview")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                <p>{selectedPDF.name}</p>
                <p>{formatFileSize(selectedPDF.size)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={onCancel}
                className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSend}
                className="bg-white text-black hover:bg-gray-200"
              >
                {t("send_pdf")}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper function to shorten file names on mobile
  const getShortenedFileName = (name: string) => {
    if (typeof window === 'undefined') return name;
    
    const isMobile = window.innerWidth < 768;
    if (!isMobile || !name || name.length <= 20) return name;
    
    const extension = name.split('.').pop() || '';
    const nameWithoutExtension = name.substring(0, name.lastIndexOf('.'));
    const maxLength = 20;
    
    if (nameWithoutExtension.length > maxLength) {
      return nameWithoutExtension.substring(0, maxLength) + '[...].' + extension;
    }
    
    return name;
  };

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  // Prevent background scrolling when modal is open
  useOptimizedEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // View mode
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 md:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#1a1a1a] border border-[#1f1f23] rounded-lg w-full max-w-4xl h-full max-h-[85vh] md:max-h-none flex flex-col">
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#1f1f23]">
          <h3 className="text-white font-medium flex items-center text-sm md:text-base truncate pr-2">
            {getShortenedFileName(fileName || t("pdf_document"))}
          </h3>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 p-2 md:p-4">
          <iframe
            src={fileUrl}
            className="w-full h-full rounded"
            title={t("pdf_document")}
          />
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;

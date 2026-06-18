
"use client";

import {
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileUpIcon,
  HeadphonesIcon,
  ImageIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  formatBytes,
  useFileUpload,
} from "@/hooks/utils/use-file-upload";
import { Button } from "@/components/ui/button";

const getFileIcon = (file: { file: File | { type: string; name: string } }) => {
  const fileType = file.file instanceof File ? file.file.type : file.file.type;
  const fileName = file.file instanceof File ? file.file.name : file.file.name;

  if (
    fileType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />;
  } else if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />;
  } else if (
    fileType.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />;
  } else if (fileType.includes("video/")) {
    return <VideoIcon className="size-4 opacity-60" />;
  } else if (fileType.includes("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />;
  } else if (fileType.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />;
  }
  return <FileIcon className="size-4 opacity-60" />;
};

interface FileUploadProps {
  maxSize?: number;
  maxFiles?: number;
  externalFiles?: any[];
  externalHandlers?: any;
}

export function FileUpload({ 
  maxSize = 100 * 1024 * 1024, 
  maxFiles = 10,
  externalFiles,
  externalHandlers
}: FileUploadProps) {
  const { t } = useTranslation();
  const [
    internalState,
    internalHandlers,
  ] = useFileUpload({
    multiple: true,
    maxFiles,
    maxSize,
  });

  // Use external state if provided, otherwise use internal state
  const files = externalFiles || internalState.files;
  const isDragging = externalHandlers?.isDragging ?? internalState.isDragging;
  const errors = externalHandlers?.errors ?? internalState.errors;
  
  const handlers = externalHandlers || internalHandlers;

  return (
    <div className="flex flex-col gap-2">
      {/* Drop area */}
      <div
        role="button"
        onClick={handlers.openFileDialog}
        onDragEnter={handlers.handleDragEnter}
        onDragLeave={handlers.handleDragLeave}
        onDragOver={handlers.handleDragOver}
        onDrop={handlers.handleDrop}
        onTouchStart={(e) => {
          // Prevent long press context menu on mobile
          e.preventDefault();
        }}
        data-dragging={isDragging || undefined}
        className="border-[#1f1f23] hover:bg-[#1a1a1a] data-[dragging=true]:bg-[#1a1a1a] flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed p-4 transition-colors cursor-pointer touch-manipulation"
        style={{ touchAction: 'manipulation' }}
      >
        <input
          {...handlers.getInputProps()}
          className="sr-only"
          aria-label="Upload files"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="bg-[#0a0a0a] mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border border-[#1f1f23]"
            aria-hidden="true"
          >
            <FileUpIcon className="size-4 opacity-60 text-gray-400" />
          </div>
          <p className="mb-1.5 text-sm font-medium text-gray-300">{t("upload_files")}</p>
          <p className="text-gray-500 mb-2 text-xs">
            {t("drag_drop_click_browse")}
          </p>
          <div className="text-gray-500 flex flex-wrap justify-center gap-1 text-xs">
            <span>{t("all_files")}</span>
            <span>∙</span>
            <span>{t("max_files", { count: maxFiles })}</span>
            <span>∙</span>
            <span>{t("up_to_size", { size: formatBytes(maxSize) })}</span>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          className="text-red-400 flex items-center gap-1 text-xs"
          role="alert"
        >
          <span>{errors[0]}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-[#0a0a0a] text-neutral-50 flex items-center justify-between gap-2 rounded-lg border border-[#1f1f23] p-2 pe-3"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded border border-[#1f1f23]">
                  {getFileIcon(file)}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-[13px] font-medium text-gray-300 max-w-[200px]">
                    {file.file instanceof File
                      ? file.file.name
                      : file.file.name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {formatBytes(
                      file.file instanceof File
                        ? file.file.size
                        : file.file.size
                    )}
                  </p>
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-white -me-2 size-8 hover:bg-[#1f1f23]"
                onClick={() => handlers.removeFile(file.id)}
                aria-label="Remove file"
              >
                <XIcon className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}

          {/* Remove all files button */}
          {files.length > 1 && (
            <div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handlers.clearFiles}
                className="border-[#333] bg-transparent hover:bg-[#1a1a1a] text-gray-300 hover:text-white"
              >
                {t("remove_all_files")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

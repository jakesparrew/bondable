
import { useState, useCallback } from "react";

interface FileUploadFile {
  id: string;
  file: File | { name: string; size: number; type: string; url: string };
}

interface UseFileUploadOptions {
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  initialFiles?: any[];
}

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const {
    multiple = false,
    maxFiles = 10,
    maxSize = 10 * 1024 * 1024, // 10MB
    acceptedTypes = [],
    initialFiles = [],
  } = options;

  const [files, setFiles] = useState<FileUploadFile[]>(
    initialFiles.map((file) => ({
      id: file.id || `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
    }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `File "${file.name}" is too large. Maximum size is ${formatBytes(maxSize)}.`;
    }
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
      return `File "${file.name}" is not an accepted file type.`;
    }
    return null;
  }, [maxSize, acceptedTypes]);

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    // Wait for mobile blobs to resolve
    const resolvedFiles = await Promise.all(fileArray.map(async (file) => {
      if (file.size === 0 && file.type.startsWith("image/")) {
        return await new Promise<File>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const blob = new Blob([reader.result as ArrayBuffer], { type: file.type });
            resolve(new File([blob], file.name, { type: file.type }));
          };
          reader.readAsArrayBuffer(file);
        });
      }
      return file;
    }));

    const validFiles: FileUploadFile[] = [];
    const newErrors: string[] = [];

    if (files.length + resolvedFiles.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    resolvedFiles.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
        });
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    } else {
      setErrors([]);
      if (multiple) {
        setFiles((prev) => [...prev, ...validFiles]);
      } else {
        setFiles(validFiles);
      }
    }
  }, [files, maxFiles, multiple, validateFile]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
    setErrors([]);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setErrors([]);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);

  const openFileDialog = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    input.style.display = 'none';
    
    if (acceptedTypes.length > 0) {
      input.accept = acceptedTypes.join(",");
    }
    
    // Add mobile-specific event handler
    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        addFiles(target.files);
        // Clean up
        document.body.removeChild(input);
      }
    };
    
    const handleClick = () => {
      // For mobile, ensure the input is properly attached
      document.body.appendChild(input);
    };
    
    input.addEventListener('change', handleChange);
    input.addEventListener('click', handleClick);
    
    // Mobile-friendly approach
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      document.body.appendChild(input);
      input.click();
    } else {
      input.click();
    }
  }, [multiple, acceptedTypes, addFiles]);

  const getInputProps = useCallback(() => ({
    type: "file" as const,
    multiple,
    accept: acceptedTypes.join(","),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log('📁 File input change event:', e.target.files?.length || 0);
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        // Clear the input so the same file can be selected again if needed
        e.target.value = '';
      }
    },
  }), [multiple, acceptedTypes, addFiles]);

  return [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] as const;
};

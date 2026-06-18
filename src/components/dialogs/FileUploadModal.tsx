import React, { useEffect } from 'react';
import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { useFileUpload } from "@/hooks/utils/use-file-upload";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { localDocumentService, type LocalDocument } from "@/services/api/localDocumentService";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { FileText, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelect: (files: File[]) => void;
}

const FileUploadModal = ({ isOpen, onClose, onFilesSelect }: FileUploadModalProps) => {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useOptimizedState<File[]>([]);

  // Auth and Local Documents
  const { user } = useAuthManager();
  const [activeTab, setActiveTab] = useOptimizedState<'upload' | 'local'>('upload');
  const [localDocs, setLocalDocs] = useOptimizedState<LocalDocument[]>([]);
  const [selectedLocal, setSelectedLocal] = useOptimizedState<Record<string, boolean>>({});
  const [loadingLocal, setLoadingLocal] = useOptimizedState(false);
  const [addingLocal, setAddingLocal] = useOptimizedState(false);
  const [fetchedLocal, setFetchedLocal] = useOptimizedState(false);
  const [readyToOpen, setReadyToOpen] = useOptimizedState(false);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isOpen || fetchedLocal) return;
      if (!user?.id) {
        if (mounted) {
          setLocalDocs([]);
          setFetchedLocal(true);
          setReadyToOpen(true);
        }
        return;
      }
      setLoadingLocal(true);
      try {
        const docs = await localDocumentService.listDocuments(user.id);
        if (mounted) {
          setLocalDocs(docs);
          setFetchedLocal(true);
          setReadyToOpen(true);
        }
      } catch (e) {
        console.error('Failed to load local docs', e);
        if (mounted) {
          setLocalDocs([]);
          setFetchedLocal(true);
          setReadyToOpen(true);
        }
      } finally {
        if (mounted) setLoadingLocal(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [isOpen, user?.id, fetchedLocal]);

  // Clear cache when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLocalDocs([]);
      setSelectedLocal({});
      setActiveTab('upload');
      setFetchedLocal(false);
      setReadyToOpen(false);
    }
  }, [isOpen]);

  const [
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
  ] = useFileUpload({
    multiple: true,
    maxFiles: 10,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const handleSendFiles = () => {
    const fileObjects = files.map(f => f.file).filter(f => f instanceof File) as File[];
    if (fileObjects.length > 0) {
      onFilesSelect(fileObjects);
      clearFiles();
      onClose();
    }
  };

  const toggleLocal = (id: string) => {
    setSelectedLocal(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSelected = async () => {
    const ids = Object.keys(selectedLocal).filter(id => selectedLocal[id]);
    if (ids.length === 0) return;
    setAddingLocal(true);
    try {
      const files: File[] = [];
      for (const id of ids) {
        const doc = localDocs.find(d => d.id === id);
        if (!doc) continue;
        try {
          const url = await localDocumentService.getSignedUrl(doc.file_url);
          const resp = await fetch(url);
          const blob = await resp.blob();
          files.push(new File([blob], doc.file_name, { type: doc.mime_type }));
        } catch (e) {
          console.error('Failed to fetch local doc', e);
        }
      }
      if (files.length > 0) {
        onFilesSelect(files);
        onClose();
      }
    } finally {
      setAddingLocal(false);
    }
  };

  const getRowSizes = (count: number): number[] => {
    if (count <= 0) return [];
    if (count === 1) return [1];
    const sizes: number[] = [];
    let remaining = count;
    let wantTwo = true;
    while (remaining > 0) {
      const target = wantTwo ? 2 : 3;
      if (remaining >= target) { sizes.push(target); remaining -= target; }
      else { sizes.push(remaining); remaining = 0; }
      wantTwo = !wantTwo;
    }
    return sizes;
  };

  if (isOpen && !readyToOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("upload_files")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {(fetchedLocal && localDocs.length === 0) ? (
            <>
              <FileUpload
                maxSize={100 * 1024 * 1024}
                maxFiles={10}
                externalFiles={files}
                externalHandlers={{
                  isDragging,
                  errors,
                  handleDragEnter,
                  handleDragLeave,
                  handleDragOver,
                  handleDrop,
                  openFileDialog,
                  removeFile,
                  clearFiles,
                  getInputProps,
                }}
              />
              {files.length > 0 && (
                <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="bg-transparent border-gray-600 text-muted-foreground hover:bg-gray-800 touch-manipulation"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    onClick={handleSendFiles}
                    disabled={files.length === 0}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {t("send_files", { count: files.length, plural: files.length !== 1 ? 's' : '' })}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'local')}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="upload">{t("upload_files")}</TabsTrigger>
                <TabsTrigger value="local">{t("local_files")}</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-4">
                <FileUpload
                  maxSize={100 * 1024 * 1024}
                  maxFiles={10}
                  externalFiles={files}
                  externalHandlers={{
                    isDragging,
                    errors,
                    handleDragEnter,
                    handleDragLeave,
                    handleDragOver,
                    handleDrop,
                    openFileDialog,
                    removeFile,
                    clearFiles,
                    getInputProps,
                  }}
                />
                {files.length > 0 && (
                  <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="bg-transparent border-gray-600 text-muted-foreground hover:bg-gray-800 touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      onClick={handleSendFiles}
                      disabled={files.length === 0}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                    >
                      {t("send_files", { count: files.length, plural: files.length !== 1 ? 's' : '' })}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="local" className="mt-4">
                {loadingLocal ? (
                  <div className="text-muted-foreground text-sm">{t('loading') || 'Loading...'}</div>
                ) : (
                  <>
                    {localDocs.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{t('no_documents_found') || 'No documents'}</div>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          const sizes = getRowSizes(localDocs.length);
                          let offset = 0;
                          return sizes.map((size, rowIdx) => {
                            const rowDocs = localDocs.slice(offset, offset + size);
                            offset += size;
                            const gridColsClass = size === 1 ? "md:grid-cols-1" : size === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
                            return (
                              <div key={`row-${rowIdx}`} className={`grid grid-cols-1 ${gridColsClass} gap-3`}>
                                {rowDocs.map((doc) => (
                                  <div
                                    key={doc.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleLocal(doc.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleLocal(doc.id); }}
                                    className={`flex items-center justify-between w-full bg-card border border-border rounded-lg p-3 hover:bg-muted transition text-left ${selectedLocal[doc.id] ? 'ring-1 ring-white/20' : ''}`}
                                  >
                                    <div className="flex items-center space-x-3 min-w-0 pr-2">
                                      {doc.file_type === 'image' && <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />}
                                      {doc.file_type === 'video' && <VideoIcon className="h-5 w-5 text-muted-foreground shrink-0" />}
                                      {(doc.file_type === 'pdf' || doc.file_type === 'other') && <FileText className="h-5 w-5 text-muted-foreground shrink-0" />}
                                      <div className="min-w-0">
                                        <p className="text-foreground text-sm truncate">{doc.file_name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{doc.mime_type}</p>
                                      </div>
                                    </div>
                                    <div className="shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                                      <Checkbox checked={!!selectedLocal[doc.id]} onCheckedChange={() => toggleLocal(doc.id)} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}

                    {Object.values(selectedLocal).some(Boolean) && (
                      <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-4">
                        <Button
                          variant="outline"
                          onClick={onClose}
                          className="bg-transparent border-gray-600 text-muted-foreground hover:bg-gray-800"
                        >
                          {t('cancel')}
                        </Button>
                        <Button
                          onClick={handleAddSelected}
                          disabled={addingLocal}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {addingLocal ? (t('adding')) : (t('add_selected'))}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadModal;

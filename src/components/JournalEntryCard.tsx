import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';

import console from "@/lib/production-console";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Lock,
  Users,
  MoreHorizontal,
  Trash2,
  Pencil,
  Image as ImageIcon,
  FileText,
  FileArchive,
  FileSpreadsheet,
  Video,
  Headphones,
  File,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JournalEntrySharingDialog } from "./dialogs/JournalEntrySharingDialog";
import { ImagePreviewDialog } from "./dialogs/ImagePreviewDialog";
import { formatBytes } from "@/hooks/utils/use-file-upload";
import { useToast } from "@/hooks/ui/use-toast";
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface Therapist {
  id: string;
  name: string;
  specialty: string;
  status: "Available" | "Busy" | "Away";
}

interface JournalEntry {
  id: string;
  content: string;
  date: string;
  sharing: "private" | "therapist";
  sharedWithTherapists?: Therapist[];
  createdAt: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }>;
}

interface JournalEntryCardProps {
  entry: JournalEntry;
  onDelete?: (id: string) => void;
  onSharingUpdate?: (entry: JournalEntry) => void;
}

const getFileIcon = (fileType: string, fileName: string) => {
  if (
    fileType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileText className="w-4 h-4 text-gray-400" />;
  } else if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar")
  ) {
    return <FileArchive className="w-4 h-4 text-gray-400" />;
  } else if (
    fileType.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return <FileSpreadsheet className="w-4 h-4 text-gray-400" />;
  } else if (fileType.includes("video/")) {
    return <Video className="w-4 h-4 text-gray-400" />;
  } else if (fileType.includes("audio/")) {
    return <Headphones className="w-4 h-4 text-gray-400" />;
  } else if (fileType.startsWith("image/")) {
    return <ImageIcon className="w-4 h-4 text-gray-400" />;
  }
  return <File className="w-4 h-4 text-gray-400" />;
};

export const JournalEntryCard = ({
  entry,
  onDelete,
  onSharingUpdate,
}: JournalEntryCardProps) => {
  const { t } = useTranslation();
  const [isDialogOpen, setDialogOpen] = useOptimizedState(false);
  const [isDropdownOpen, setDropdownOpen] = useOptimizedState(false);
  const { toast } = useToast();

  const handleDelete = () => {
    if (onDelete) {
      onDelete(entry.id);
      toast({
        title: t("deleted"),
        description: t("journal_entry_deleted"),
      });
    } else {
      toast({
        title: t("unable_to_delete"),
        description: t("error_deleting_entry"),
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const images = (entry.attachments || []).filter(
    (attachment) => attachment.type.startsWith("image/")
  );
  const files = (entry.attachments || []).filter(
    (attachment) => !attachment.type.startsWith("image/")
  );

  return (
    <>
      <Card className="bg-[#111111] border-[#1f1f23]">
        <CardContent className="p-4">
          <div className="flex justify-between items-start ">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(entry.date)}</span>
              <span>•</span>
              <span>{formatTime(entry.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {entry.sharing === "private" ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>{t("private")}</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3" />
                    <span>
                      {t("shared_with", { 
                        therapists: (entry.sharedWithTherapists || []).map(
                          (therapist) => therapist.name
                        ).join(", ") || t("therapists")
                      })}
                    </span>
                  </>
                )}
              </div>
              {onSharingUpdate && (
                <JournalEntrySharingDialog
                  entry={entry}
                  onSharingUpdate={onSharingUpdate}
                  open={isDialogOpen}
                  onOpenChange={setDialogOpen}
                />
              )}
              <DropdownMenu open={isDropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1f1f23]"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#111111] border-[#1f1f23] text-white">
                  <DropdownMenuItem
                    onClick={() => {
                      setDropdownOpen(false);
                      setDialogOpen(true);
                    }}
                    className="focus:bg-[#1f1f23] text-neutral-400 hover:!bg-neutral-800 hover:!text-neutral-300"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    {t("edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className=" focus:bg-[#1f1f23] text-red-400 hover:!bg-neutral-800 hover:!text-neutral-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="text-white leading-relaxed mb-3">
            {entry.content.split("\n").map((paragraph, index) => (
              <p key={index} className="mb-2 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>

          {entry.attachments && entry.attachments.length > 0 && (
            <>
              <div className="mb-3 -mt-1 h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent" />
              <div className="space-y-3">
                <div className="text-xs text-gray-400 mb-2">
                  {images.length > 0 && `${t("images")} (${images.length})`}
                  {images.length > 0 && files.length > 0 && " / "}
                  {files.length > 0 && `${t("files")} (${files.length})`}
                </div>

                {images.length > 0 && (
                  <div className="space-y-2">
                    {images.map((image) => (
                      <ImagePreviewDialog
                        key={image.id}
                        src={image.url || "/placeholder.svg"}
                        alt={image.name}
                        trigger={
                          <div className="flex items-center gap-3 p-2 bg-[#0a0a0a] border border-[#1f1f23] rounded cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="flex items-center justify-center w-8 h-8 border border-[#1f1f23] rounded">
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-300 truncate">{image.name}</p>
                              <p className="text-xs text-gray-500">{t("click_to_preview")}</p>
                            </div>
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-2 bg-[#0a0a0a] border border-[#1f1f23] rounded"
                      >
                        <div className="flex items-center justify-center w-8 h-8 border border-[#1f1f23] rounded">
                          {getFileIcon(file.type, file.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300 truncate max-w-[200px]">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {t("no_preview_available")} • {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
};


import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { TherapistSharingSelector } from "../TherapistSharingSelector";
import { useToast } from "@/hooks/ui/use-toast";
import { useFileUpload } from "@/hooks/utils/use-file-upload";
import { useTranslation } from "react-i18next";

interface Therapist {
  id: string;
  name: string;
  specialty: string;
  status: "Available" | "Busy" | "Away";
}

interface JournalEntryDialogProps {
  trigger?: React.ReactNode;
  onEntryCreated?: (entry: any) => void;
}

export const JournalEntryDialog = ({
  trigger,
  onEntryCreated,
}: JournalEntryDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useOptimizedState(false);
  const [content, setContent] = useOptimizedState("");
  const [isPrivate, setIsPrivate] = useOptimizedState(true);
  const [selectedTherapists, setSelectedTherapists] = useOptimizedState<Therapist[]>(
    []
  );
  const { toast } = useToast();

  const [fileState, fileHandlers] = useFileUpload({
    multiple: true,
    maxFiles: 5,
    maxSize: 50 * 1024 * 1024,
  });

  const { files } = fileState;
  const { clearFiles } = fileHandlers;

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please complete the content before saving.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isPrivate && selectedTherapists.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one therapist before sharing.",
        variant: "destructive",
      });
      return;
    }

    const attachments = files.map((file) => ({
      id: file.id,
      name: file.file.name,
      type: file.file.type,
      url:
        file.file instanceof File
          ? URL.createObjectURL(file.file)
          : file.file.url || "placeholder-url",
      size: file.file.size,
    }));

    const newEntry = {
      id: `entry-${Date.now()}`, // This will be replaced by the database
      content: content.trim(),
      date: new Date().toISOString(),
      sharing: isPrivate ? "private" as const : "therapist" as const,
      sharedWithTherapists:
        isPrivate || selectedTherapists.length === 0
          ? undefined
          : selectedTherapists,
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setContent("");
    setIsPrivate(true);
    setSelectedTherapists([]);
    clearFiles();
    setOpen(false);
    toast({
      title: "Success",
      description: "Journal entry saved successfully.",
    });

    if (onEntryCreated) {
      onEntryCreated(newEntry);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950">
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="bg-[#111111] border-[#1f1f23] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {t("new_journal_entry")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent" />

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-300">
                {t("how_are_you_feeling_today")}
              </Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("write_about_your_day")}
                className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 min-h-32 focus:border-gray-400 resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-gray-300">
                {t("attach_files_optional")}
                {files.length > 0 && (
                  <span className="text-sm text-blue-400">
                    ({files.length} file{files.length !== 1 ? "s" : ""} selected)
                  </span>
                )}
              </Label>
              <FileUpload
                maxSize={50 * 1024 * 1024}
                maxFiles={5}
                externalFiles={files}
                externalHandlers={fileHandlers}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-gray-300">{t('sharing_preferences')}</Label>
              <TherapistSharingSelector
                selectedTherapists={selectedTherapists}
                onSelectTherapists={setSelectedTherapists}
                isPrivate={isPrivate}
                onTogglePrivacy={() => setIsPrivate(!isPrivate)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSave}
                className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950"
              >
                {t("save_entry")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

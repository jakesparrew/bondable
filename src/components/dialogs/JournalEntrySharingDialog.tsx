import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Lock,
  Users,
  Image as ImageIcon,
  File,
} from "lucide-react";
import { TherapistSharingSelector } from "../TherapistSharingSelector";
import { useToast } from "@/hooks/ui/use-toast";
import { ImagePreviewDialog } from "../dialogs/ImagePreviewDialog";

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

interface JournalEntrySharingDialogProps {
  entry: JournalEntry;
  onSharingUpdate: (updatedEntry: JournalEntry) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JournalEntrySharingDialog = ({
  entry,
  onSharingUpdate,
  open,
  onOpenChange,
}: JournalEntrySharingDialogProps) => {
  const [isPrivate, setIsPrivate] = useOptimizedState(entry.sharing === "private");
  const [selectedTherapists, setSelectedTherapists] = useOptimizedState<Therapist[]>(
    entry.sharedWithTherapists || []
  );
  const { toast } = useToast();

  const handleSave = () => {
    if (!isPrivate && selectedTherapists.length === 0) {
      toast({
        title: "Therapist required",
        description: "Please select at least one therapist before sharing.",
        variant: "destructive",
      });
      return;
    }

    const updatedEntry = {
      ...entry,
      sharing: isPrivate ? "private" as const : "therapist" as const,
      sharedWithTherapists: isPrivate
        ? undefined
        : selectedTherapists.length > 0
        ? selectedTherapists
        : undefined,
    };

    onSharingUpdate(updatedEntry);

    toast({
      title: "Success",
      description: "Sharing preferences updated successfully.",
    });

    onOpenChange(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const images =
    entry.attachments?.filter((attachment) =>
      attachment.type.startsWith("image/")
    ) || [];

  const files =
    entry.attachments?.filter(
      (attachment) => !attachment.type.startsWith("image/")
    ) || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#111111] border-[#1f1f23] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              Entry Sharing Settings
            </DialogTitle>
          </DialogHeader>
          <div className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent" />

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-400">
                Entry from {formatDate(entry.date)}
              </div>
              <div className="bg-[#0a0a0a] border-[#1f1f23] rounded-lg p-3 max-h-24 overflow-y-auto">
                <p className="text-sm text-gray-300">
                  {entry.content.length > 100
                    ? `${entry.content.substring(0, 100)}...`
                    : entry.content}
                </p>
              </div>

              {entry.attachments && entry.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400">Attachments:</div>

                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {images.map((image) => (
                        <ImagePreviewDialog
                          key={image.id}
                          src="/placeholder.svg"
                          alt={image.name}
                          trigger={
                            <div className="w-full h-auto py-2 bg-[#1a1a1a] border border-[#1f1f23] rounded cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-start pl-2">
                              <div className="text-center flex">
                                <ImageIcon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                                <p className="text-xs text-gray-500 truncate px-1">
                                  {image.name.substring(0, 50)}
                                </p>
                              </div>
                            </div>
                          }
                        />
                      ))}
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="space-y-1">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="w-full h-auto py-2 bg-[#0f0f0f] border border-[#151518] rounded flex items-center justify-start pl-2"
                        >
                          <div className="text-center flex">
                            <File className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-500 truncate px-1 max-w-[150px]">
                              {file.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                Current sharing status:
              </div>
              <div className="flex items-center gap-2 text-sm bg-neutral-800 p-2 rounded-lg">
                {entry.sharing === "private" ? (
                  <>
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Private</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400">
                      Shared with{" "}
                      {entry.sharedWithTherapists
                        ?.map((t) => t.name)
                        .join(", ") || "therapists"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                Update sharing preferences:
              </div>
              <TherapistSharingSelector
                selectedTherapists={selectedTherapists}
                onSelectTherapists={setSelectedTherapists}
                isPrivate={isPrivate}
                onTogglePrivacy={() => setIsPrivate(!isPrivate)}
              />
            </div>

            <div className="flex justify-end gap-3 ">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950"
                disabled={!isPrivate && selectedTherapists.length === 0}
              >
                Update Sharing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

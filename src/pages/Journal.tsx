
"use client";

import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { JournalEntryDialog } from "@/components/dialogs/JournalEntryDialog";
import { JournalEntryCard } from "@/components/JournalEntryCard";
import { TherapistSharingSelector } from "@/components/TherapistSharingSelector";
import { useJournalEntries } from "@/hooks/api/useOptimizedJournal";
import { useToast } from "@/hooks/ui/use-toast";
import { useFileUpload } from "@/hooks/utils/use-file-upload";
// Removed skeleton import - using instant loading
import { useTranslation } from "react-i18next";

interface Therapist {
  id: string;
  name: string;
  specialty: string;
  status: "Available" | "Busy" | "Away";
}

const Journal = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { entries, loading, addEntry, deleteEntry, updateEntry } =
    useJournalEntries();
  const [quickEntry, setQuickEntry] = useOptimizedState("");
  const [quickIsPrivate, setQuickIsPrivate] = useOptimizedState(true);
  const [quickSelectedTherapists, setQuickSelectedTherapists] = useOptimizedState<
    Therapist[]
  >([]);

  const [fileState, fileHandlers] = useFileUpload({
    multiple: true,
    maxFiles: 5,
    maxSize: 50 * 1024 * 1024,
  });

  const { files } = fileState;
  const { clearFiles } = fileHandlers;

  const handleDelete = (id: string) => {
    deleteEntry(id);
    toast({
      title: t("deleted"),
      description: t("journal_entry_deleted"),
    });
  };

  const handleQuickSave = () => {
    if (!quickEntry.trim()) {
      toast({
        title: t("error"),
        description: t("please_write_something"),
        variant: "destructive",
      });
      return;
    }
    
    if (!quickIsPrivate && quickSelectedTherapists.length === 0) {
      toast({
        title: t("error"),
        description: t("select_therapist_before_sharing"),
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
      id: `entry-${Date.now()}`,
      content: quickEntry.trim(),
      date: new Date().toISOString(),
      sharing: quickIsPrivate ? ("private" as const) : ("therapist" as const),
      sharedWithTherapists: quickIsPrivate
        ? undefined
        : quickSelectedTherapists,
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    addEntry(newEntry);
    setQuickEntry("");
    setQuickIsPrivate(true);
    setQuickSelectedTherapists([]);
    clearFiles();

    toast({
      title: "Success",
      description: "Journal entry saved successfully.",
    });
  };

  // Remove loading screen - instant UI with cached data
  return (
    <DashboardLayout userType="client">
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-1">{t("journal")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("track_thoughts_feelings")}
            </p>
          </div>
          <JournalEntryDialog
            onEntryCreated={(entry) => {
              addEntry(entry);
              toast({
                title: "Success",
                description: "Journal entry created.",
              });
            }}
            trigger={
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                {t("new_entry")}
              </Button>
            }
          />
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="text-foreground text-lg">
              {t("how_feeling_today")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={quickEntry}
              onChange={(e) => setQuickEntry(e.target.value)}
              placeholder={t("write_day_thoughts_feelings")}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground min-h-32 focus:border-ring resize-none"
            />
            <div className="space-y-3">
              <Label className="text-muted-foreground">
                {t("attach_files_images_optional")}
                {files.length > 0 && (
                  <span className="text-sm text-blue-400">
                    {" "}
                    ({files.length})
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
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div className="flex-1">
                <div className="flex flex-col md:flex-row gap-2 md:items-start">
                  <span className="text-sm text-muted-foreground md:mt-2">{t("sharing")}:</span>
                  <div className="flex-1">
                    <TherapistSharingSelector
                      selectedTherapists={quickSelectedTherapists}
                      onSelectTherapists={setQuickSelectedTherapists}
                      isPrivate={quickIsPrivate}
                      onTogglePrivacy={() => setQuickIsPrivate(!quickIsPrivate)}
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={handleQuickSave}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full md:w-auto"
                disabled={
                  !quickIsPrivate && quickSelectedTherapists.length === 0
                }
                >
                {t("save_entry")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="text-foreground text-lg">{t("recent_entries")}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("loading_entries")}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 md:py-16">
                <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t("start_your_journal")}
                </h3>
                <p className="text-muted-foreground text-sm mb-6 px-4">
                  {t("writing_regularly_helps_track_progress")}
                </p>
                <JournalEntryDialog
                  onEntryCreated={(entry) => {
                    addEntry(entry);
                    toast({
                      title: "Success",
                      description: "Journal entry created.",
                    });
                  }}
                  trigger={
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full md:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      {t("write_first_entry")}
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <JournalEntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={handleDelete}
                    onSharingUpdate={updateEntry}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Journal;

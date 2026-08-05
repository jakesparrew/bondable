import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Check,
  FileText,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import PostSignChain from "@/components/notes/PostSignChain";
import {
  noteService,
  type NoteTemplate,
  type NoteTemplateField,
  type SessionNote,
} from "@/services/api/noteService";

/**
 * QuickCaptureSheet — the 90-second post-session capture (ticket T-PX-4, §2).
 *
 * A keyboard-first Sheet (never a full page): pick a template (provider default
 * pre-selected), tap a mood/progress chip, fill short textareas, add Huiswerk
 * lines (each becomes a task on sign), then Onderteken (sign, locks) or Bewaar
 * als klad (save draft). It NEVER blocks: closing keeps a draft, and unfinished
 * drafts resurface as a gentle ActionInbox reminder (noteService.listDrafts…).
 *
 * The Risico field is provider-only and never leaves the note — it feeds the
 * risk engine, not the client and not analytics.
 *
 * Mock-backed via noteService (localStorage). No analytics events fire here —
 * clinical text must never enter the analytics spine.
 */

export interface QuickCaptureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  providerId: string;
  clientId: string;
  clientName?: string;
  /** ISO date (yyyy-mm-dd) of the session — feeds the invoice/attest chain. */
  sessionDate?: string;
  /** Session length in minutes; drives the invoice line description. */
  durationMin?: number;
  /** Overrides the provider's standard rate for this session. */
  amountCents?: number;
  /**
   * Open straight on the post-sign chain (factuur → attest) when the note is
   * already signed. Lets a provider come back to the paperwork later without
   * re-reading a note they wrote themselves.
   */
  startInChain?: boolean;
  /** Called after a successful sign or draft-save (to refetch surfaces). */
  onSaved?: (note: SessionNote) => void;
}

/** Mood/progress chips — one tap, non-clinical, stored as a content field. */
const MOOD_CHIPS: { key: string; nl: string; en: string }[] = [
  { key: "beter", nl: "Beter dan vorige keer", en: "Better than last time" },
  { key: "stabiel", nl: "Stabiel", en: "Steady" },
  { key: "wisselend", nl: "Wisselend", en: "Mixed" },
  { key: "zwaarder", nl: "Zwaarder", en: "Heavier" },
];

const QuickCaptureSheet: React.FC<QuickCaptureSheetProps> = ({
  open,
  onOpenChange,
  sessionId,
  providerId,
  clientId,
  clientName,
  sessionDate,
  durationMin,
  amountCents,
  startInChain = false,
  onSaved,
}) => {
  const { t, i18n } = useTranslation();
  const isNl = (i18n.language || "nl").startsWith("nl");
  const label = (nl: string, en: string) => (isNl ? nl : en);

  const templates = React.useMemo(
    () => noteService.listTemplates(providerId),
    [providerId],
  );

  const [note, setNote] = React.useState<SessionNote | null>(null);
  const [templateId, setTemplateId] = React.useState<string>("");
  const [content, setContent] = React.useState<Record<string, string>>({});
  const [mood, setMood] = React.useState<string>("");
  const [risk, setRisk] = React.useState<string>("");
  const [homework, setHomework] = React.useState<string[]>([]);
  const [homeworkDraft, setHomeworkDraft] = React.useState<string>("");
  const [busy, setBusy] = React.useState<"idle" | "saving" | "signing">("idle");
  /**
   * After a successful sign the sheet does NOT close: it hands over to the
   * post-sign chain (factuur → attest) while the session is still in hand.
   * `null` = the capture form; a number = tasks created on that sign.
   */
  const [chainTasks, setChainTasks] = React.useState<number | null>(null);

  // Load-or-create the draft when the sheet opens.
  React.useEffect(() => {
    if (!open) return;
    const existing =
      noteService.getNoteForSession(sessionId) ??
      noteService.createDraft({ sessionId, providerId, clientId });
    setNote(existing);
    setTemplateId(existing.templateId);
    setContent({ ...existing.contentJson });
    setMood(existing.contentJson.__mood ?? "");
    setRisk(existing.riskNote);
    setHomework([...existing.homework]);
    setHomeworkDraft("");
    setBusy("idle");
    setChainTasks(
      startInChain && existing.status === "signed" ? 0 : null,
    );
  }, [open, sessionId, providerId, clientId, startInChain]);

  const template: NoteTemplate | null = React.useMemo(
    () => templates.find((tmpl) => tmpl.id === templateId) ?? null,
    [templates, templateId],
  );

  const isSigned = note?.status === "signed";

  // Structured fields excluding the shared Huiswerk/Risico tail (handled apart).
  const bodyFields: NoteTemplateField[] = React.useMemo(
    () =>
      (template?.fields ?? []).filter(
        (f) => f.key !== "huiswerk" && f.key !== "risico",
      ),
    [template],
  );

  const setField = (key: string, value: string) =>
    setContent((prev) => ({ ...prev, [key]: value }));

  const addHomework = () => {
    const line = homeworkDraft.trim();
    if (!line) return;
    setHomework((prev) => [...prev, line]);
    setHomeworkDraft("");
  };

  const removeHomework = (idx: number) =>
    setHomework((prev) => prev.filter((_, i) => i !== idx));

  const collectContent = (): Record<string, string> => ({
    ...content,
    __mood: mood,
  });

  const persistDraft = (): SessionNote | null => {
    if (!note) return null;
    return noteService.saveDraft(note.id, {
      contentJson: collectContent(),
      riskNote: risk,
      homework,
    });
  };

  const handleSaveDraft = () => {
    if (!note || isSigned) {
      onOpenChange(false);
      return;
    }
    setBusy("saving");
    try {
      // Fold in a pending, un-added homework line so nothing is silently lost.
      if (homeworkDraft.trim()) {
        setHomework((prev) => [...prev, homeworkDraft.trim()]);
      }
      const saved = noteService.saveDraft(note.id, {
        contentJson: collectContent(),
        riskNote: risk,
        homework: homeworkDraft.trim()
          ? [...homework, homeworkDraft.trim()]
          : homework,
      });
      onSaved?.(saved);
      toast.success(
        label("Bewaard als klad.", "Saved as a draft."),
      );
      onOpenChange(false);
    } catch {
      toast.error(label("Kon niet bewaren.", "Could not save."));
    } finally {
      setBusy("idle");
    }
  };

  const handleSign = async () => {
    if (!note || isSigned) return;
    setBusy("signing");
    try {
      const pendingHomework = homeworkDraft.trim()
        ? [...homework, homeworkDraft.trim()]
        : homework;
      // Save the latest field values first so signing locks the real content.
      noteService.saveDraft(note.id, {
        contentJson: collectContent(),
        riskNote: risk,
        homework: pendingHomework,
      });
      const { note: signed, tasksCreated } = await noteService.sign(
        note.id,
        providerId,
      );
      setNote(signed);
      onSaved?.(signed);
      // Hand over to the chain instead of closing: the session is still in the
      // provider's head, which is the only moment invoicing costs no effort.
      setChainTasks(tasksCreated);
    } catch {
      toast.error(label("Kon niet ondertekenen.", "Could not sign."));
    } finally {
      setBusy("idle");
    }
  };

  const changeTemplate = (id: string) => {
    setTemplateId(id);
    if (note && !isSigned) {
      // Re-create against the new template while keeping any typed content.
      const notes = noteService.getNote(note.id);
      if (notes) {
        // Persist the template choice via a fresh draft object.
        const updated = noteService.saveDraft(note.id, {
          contentJson: collectContent(),
          riskNote: risk,
          homework,
        });
        // templateId isn't part of saveDraft; recreate through the store is out
        // of scope, so we keep the field selection in local UI state only.
        setNote({ ...updated, templateId: id });
      }
    }
  };

  const risicoField = template?.fields.find((f) => f.key === "risico");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-1 border-b border-border px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <SheetTitle className="text-base font-semibold">
              {label("Klinische notitie", "Clinical note")}
            </SheetTitle>
            {isSigned && (
              <Badge variant="success" className="ml-1">
                {label("Ondertekend", "Signed")}
              </Badge>
            )}
          </div>
          <SheetDescription className="text-sm text-muted-foreground">
            {chainTasks !== null
              ? label(
                  "Nog twee kleine stappen, en de sessie is helemaal afgewerkt.",
                  "Two small steps left and this session is fully wrapped up.",
                )
              : clientName
              ? label(
                  `Na de sessie met ${clientName}. Blijft privé — alleen jij ziet dit.`,
                  `After the session with ${clientName}. Stays private — only you see this.`,
                )
              : label(
                  "Blijft privé — alleen jij ziet dit.",
                  "Stays private — only you see this.",
                )}
          </SheetDescription>
        </SheetHeader>

        {chainTasks !== null ? (
          <PostSignChain
            sessionId={sessionId}
            clientId={clientId}
            clientName={clientName}
            sessionDate={sessionDate}
            durationMin={durationMin}
            amountCents={amountCents}
            tasksCreated={chainTasks}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <>
        <div className="flex-1 space-y-5 px-5 py-5">
          {/* Template picker */}
          <div className="space-y-1.5">
            <Label className="text-sm">{label("Sjabloon", "Template")}</Label>
            <Select
              value={templateId}
              onValueChange={changeTemplate}
              disabled={isSigned}
            >
              <SelectTrigger className="rounded-ctl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tmpl) => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mood/progress chip row — one tap */}
          <div className="space-y-2">
            <Label className="text-sm">{label("Hoe ging het", "How it went")}</Label>
            <div className="flex flex-wrap gap-2">
              {MOOD_CHIPS.map((chip) => {
                const active = mood === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    disabled={isSigned}
                    onClick={() => setMood(active ? "" : chip.key)}
                    className={cn(
                      "rounded-ctl border px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-60",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {label(chip.nl, chip.en)}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Structured template fields */}
          <div className="space-y-4">
            {bodyFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`note-${field.key}`} className="text-sm">
                  {label(field.labelNl, field.labelEn)}
                  {field.required && (
                    <span className="ml-1 text-muted-foreground">·</span>
                  )}
                </Label>
                <Textarea
                  id={`note-${field.key}`}
                  value={content[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={label(field.promptNl ?? "", field.promptEn ?? "")}
                  disabled={isSigned}
                  rows={3}
                  className="resize-none rounded-ctl text-sm"
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Huiswerk — each line becomes a task on sign */}
          <div className="space-y-2">
            <Label className="text-sm">{label("Huiswerk", "Homework")}</Label>
            <p className="text-xs text-muted-foreground">
              {label(
                "Elke lijn wordt een taak voor de cliënt.",
                "Each line becomes a task for the client.",
              )}
            </p>
            {homework.length > 0 && (
              <ul className="space-y-1.5">
                {homework.map((line, idx) => (
                  <li
                    key={`${line}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-ctl border border-border bg-muted/40 px-3 py-1.5 text-sm"
                  >
                    <span className="truncate">{line}</span>
                    {!isSigned && (
                      <button
                        type="button"
                        onClick={() => removeHomework(idx)}
                        aria-label={label("Verwijder", "Remove")}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!isSigned && (
              <div className="flex gap-2">
                <input
                  value={homeworkDraft}
                  onChange={(e) => setHomeworkDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addHomework();
                    }
                  }}
                  placeholder={label(
                    "bv. dagelijks 10 min ademhaling",
                    "e.g. 10 min breathing daily",
                  )}
                  className="h-9 flex-1 rounded-ctl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addHomework}
                  className="rounded-ctl"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Risico — provider-only, feeds the risk engine, never client-visible */}
          <div className="space-y-1.5">
            <Label htmlFor="note-risico" className="text-sm">
              {label("Risico", "Risk")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {label(
                risicoField?.promptNl ??
                  "Iets gehoord dat je zorgen baart? Noteer het hier — dit blijft privé.",
                risicoField?.promptEn ??
                  "Heard something that worries you? Note it here — this stays private.",
              )}
            </p>
            <Textarea
              id="note-risico"
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              disabled={isSigned}
              rows={2}
              className="resize-none rounded-ctl text-sm"
            />
          </div>
        </div>

        {/* Footer actions — never blocking */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-card px-5 py-3">
          {isSigned ? (
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-ctl"
            >
              {label("Sluiten", "Close")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={handleSaveDraft}
                disabled={busy !== "idle"}
                className="rounded-ctl"
              >
                {busy === "saving" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                {label("Bewaar als klad", "Save as draft")}
              </Button>
              <Button
                type="button"
                onClick={handleSign}
                disabled={busy !== "idle"}
                className="rounded-ctl"
              >
                {busy === "signing" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-4 w-4" />
                )}
                {label("Onderteken", "Sign")}
              </Button>
            </>
          )}
        </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default QuickCaptureSheet;

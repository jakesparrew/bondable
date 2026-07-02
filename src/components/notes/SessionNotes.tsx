import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Eye, FileText, Lock, PlusCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  noteService,
  type NoteTemplate,
  type SessionNote,
} from "@/services/api/noteService";

/**
 * SessionNotes — read/amend a session's clinical note + its trail (T-PX-4/5, §2).
 *
 * Renders the signed "Klinische notitie" (provider-only) for a session: the
 * per-field content, an append-only amendment timeline ("Aanvulling — 3 juli"),
 * and the Art. 9 read log (who, other than the author, opened this note). A
 * draft shows a quiet "still a draft" line and a button to open capture; the
 * signed note is immutable — edits become amendments, never overwrites.
 *
 * When a NON-author viewer opens a signed note, a read-log entry is recorded
 * (supervision / admin access trail). The `viewer` prop identifies who is
 * reading so author-reads are correctly skipped.
 *
 * Mock-backed (noteService / localStorage). Emits no analytics.
 */

export interface SessionNotesProps {
  sessionId: string;
  /** The signed-in viewer (to skip author reads / attribute amendments). */
  viewer: { id: string; name: string };
  /** Why this viewer has access — drives the read-log context. */
  accessContext?: "supervision" | "admin" | "other";
  /** Show the "Notitie starten / bewerken" affordance (author only). */
  canEdit?: boolean;
  /** Open the quick-capture sheet for this session. */
  onOpenCapture?: () => void;
  /** Bumped by the parent after a capture save to force a refetch. */
  refreshKey?: number;
}

const fmtDateTime = (iso: string, locale: string): string =>
  new Date(iso).toLocaleString(locale.startsWith("nl") ? "nl-BE" : "en-GB", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

const SessionNotes: React.FC<SessionNotesProps> = ({
  sessionId,
  viewer,
  accessContext = "other",
  canEdit = false,
  onOpenCapture,
  refreshKey = 0,
}) => {
  const { t, i18n } = useTranslation();
  const isNl = (i18n.language || "nl").startsWith("nl");
  const label = (nl: string, en: string) => (isNl ? nl : en);

  const [note, setNote] = React.useState<SessionNote | null>(null);
  const [template, setTemplate] = React.useState<NoteTemplate | null>(null);
  const [amendBody, setAmendBody] = React.useState("");
  const [amending, setAmending] = React.useState(false);

  // Load + (on a signed note read by a non-author) record the access.
  React.useEffect(() => {
    const found = noteService.getNoteForSession(sessionId);
    setNote(found);
    setTemplate(found ? noteService.getTemplate(found.templateId) : null);
    if (found && found.status === "signed" && found.providerId !== viewer.id) {
      const logged = noteService.logRead(found.id, {
        id: viewer.id,
        name: viewer.name,
        context: accessContext,
      });
      if (logged) {
        // Reflect the just-logged read without a second fetch race.
        setNote((prev) =>
          prev ? { ...prev, readLog: [...prev.readLog, logged] } : prev,
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, viewer.id, viewer.name, accessContext, refreshKey]);

  const submitAmendment = () => {
    if (!note || !amendBody.trim()) return;
    setAmending(true);
    try {
      const updated = noteService.amend(
        note.id,
        viewer.id,
        viewer.name,
        amendBody,
      );
      setNote(updated);
      setAmendBody("");
      toast.success(label("Aanvulling toegevoegd.", "Amendment added."));
    } catch {
      toast.error(label("Kon niet toevoegen.", "Could not add."));
    } finally {
      setAmending(false);
    }
  };

  // — No note yet —
  if (!note) {
    return (
      <Card className="border border-border bg-card">
        <CardContent className="flex flex-col items-start gap-3 p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">
              {label("Klinische notitie", "Clinical note")}
            </h4>
          </div>
          <p className="text-sm text-muted-foreground">
            {label(
              "Nog geen klinische notitie voor deze sessie.",
              "No clinical note for this session yet.",
            )}
          </p>
          {canEdit && onOpenCapture && (
            <Button
              size="sm"
              onClick={onOpenCapture}
              className="rounded-ctl"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              {label("Notitie starten", "Start note")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const bodyFields = (template?.fields ?? []).filter(
    (f) => f.key !== "huiswerk" && f.key !== "risico",
  );
  const isAuthor = note.providerId === viewer.id;
  const isDraft = note.status === "draft";

  return (
    <Card className="border border-border bg-card">
      <CardContent className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">
              {label("Klinische notitie", "Clinical note")}
            </h4>
            {isDraft ? (
              <Badge variant="outline">{label("Klad", "Draft")}</Badge>
            ) : (
              <Badge variant="success" className="gap-1">
                <Lock className="h-3 w-3" />
                {label("Ondertekend", "Signed")}
              </Badge>
            )}
          </div>
          {template && (
            <span className="text-xs text-muted-foreground">{template.name}</span>
          )}
        </div>

        {isDraft ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {label(
                "Deze notitie staat nog als klad. Ze verschijnt pas ondertekend in het dossier.",
                "This note is still a draft. It appears in the record once signed.",
              )}
            </p>
            {canEdit && isAuthor && onOpenCapture && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenCapture}
                className="rounded-ctl"
              >
                {label("Klad verder afwerken", "Finish the draft")}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Signed metadata */}
            <p className="text-xs text-muted-foreground">
              {label("Ondertekend op", "Signed on")}{" "}
              {note.signedAt ? fmtDateTime(note.signedAt, i18n.language) : "—"}
              {note.signedBy ? ` · ${note.signedBy}` : ""}
            </p>

            {/* Fields */}
            <div className="space-y-3">
              {bodyFields.map((field) => {
                const value = note.contentJson[field.key];
                if (!value) return null;
                return (
                  <div key={field.key} className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {label(field.labelNl, field.labelEn)}
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Huiswerk lines */}
            {note.homework.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label("Huiswerk", "Homework")}
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground">
                  {note.homework.map((line, idx) => (
                    <li key={`${line}-${idx}`}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Amendment timeline */}
            {note.amendments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  {note.amendments.map((amd) => (
                    <div
                      key={amd.id}
                      className="border-l-2 border-border pl-3"
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        {label("Aanvulling", "Amendment")} —{" "}
                        {fmtDateTime(amd.createdAt, i18n.language)}
                        {amd.authorName ? ` · ${amd.authorName}` : ""}
                      </p>
                      <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-foreground">
                        {amd.body}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Add amendment (author, signed note only) */}
            {isAuthor && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {label(
                      "Een ondertekende notitie blijft staan. Voeg een aanvulling toe in plaats van te wijzigen.",
                      "A signed note stays as is. Add an amendment rather than editing.",
                    )}
                  </p>
                  <Textarea
                    value={amendBody}
                    onChange={(e) => setAmendBody(e.target.value)}
                    rows={2}
                    placeholder={label(
                      "Aanvulling toevoegen…",
                      "Add an amendment…",
                    )}
                    className="resize-none rounded-ctl text-sm"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={submitAmendment}
                      disabled={!amendBody.trim() || amending}
                      className="rounded-ctl"
                    >
                      {label("Aanvulling toevoegen", "Add amendment")}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Read log — Art. 9 access trail (non-author reads) */}
            {note.readLog.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {label("Wie las deze notitie", "Who read this note")}
                    </p>
                  </div>
                  <ul className="space-y-0.5">
                    {note.readLog.map((entry) => (
                      <li key={entry.id} className="text-xs text-muted-foreground">
                        {entry.readerName} · {fmtDateTime(entry.readAt, i18n.language)}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionNotes;

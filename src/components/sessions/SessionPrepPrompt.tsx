import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NotebookPen, Check, Pencil, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Session } from "@/services/api/SessionService";
import { sessionNotificationService } from "@/services/api/sessionNotificationService";
import { sessionStartMs, prepNoteStorageKey } from "./sessionLoopUtils";

/**
 * SessionPrepPrompt — the session-prep ritual.
 *
 * When a session is within ~48 hours, a calm prompt appears: "Wat wil je zeker
 * bespreken met {provider}?". The answer is stored against the EXISTING prep_note
 * concept (`prepNoteStorageKey`, shared with PreSessionNudge) so there is one note
 * per session, not two competing ones.
 *
 * CONSENT IS EXPLICIT AND DEFAULT-OFF. Writing something down is for the client
 * first. It only reaches the provider when the client flips "Mag {provider} dit
 * vooraf lezen?" — and only then is it handed to the reminder payload. Turning the
 * toggle back off stops it being shared again. Default private, opt-in to share.
 *
 * Two variants:
 *   • `card`   — standalone surface for the client dashboard (border-first, teal).
 *   • `bond`   — inline inside Bond, where mint is the reserved AI colour.
 *
 * Renders nothing when there is no session, or when it is further away than the
 * window — a prep ritual that shows up two weeks early is just noise.
 */

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_WINDOW_HOURS = 48;

/**
 * localStorage key for the explicit "provider may read this" consent, kept
 * alongside `prepNoteStorageKey` from sessionLoopUtils. Module-local on purpose:
 * the note only ever reaches a provider through
 * `sessionNotificationService.sendPreSessionReminder`, which this component calls
 * ONLY while consent is on. Nothing else should read the flag directly.
 */
const prepConsentStorageKey = (sessionId: string) => `bondable.prepNoteConsent.${sessionId}`;

export interface SessionPrepPromptProps {
  session: Session | null | undefined;
  /** Provider display name used throughout the copy. */
  providerName?: string;
  /** How early the ritual appears. Defaults to 48h. */
  windowHours?: number;
  variant?: "card" | "bond";
  /** Called once the client saves (or clears) their note. */
  onSaved?: (note: string, sharedWithProvider: boolean) => void;
  className?: string;
}

function readStoredNote(sessionId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(prepNoteStorageKey(sessionId)) ?? "";
  } catch {
    return "";
  }
}

function readStoredConsent(sessionId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(prepConsentStorageKey(sessionId)) === "true";
  } catch {
    return false;
  }
}

const SessionPrepPrompt = ({
  session,
  providerName,
  windowHours = DEFAULT_WINDOW_HOURS,
  variant = "card",
  onSaved,
  className = "",
}: SessionPrepPromptProps) => {
  const { t } = useTranslation();

  const sessionId = session?.id ?? "";

  const [note, setNote] = useState("");
  const [draft, setDraft] = useState("");
  const [shareWithProvider, setShareWithProvider] = useState(false);
  const [editing, setEditing] = useState(false);

  // Restore any note + consent already set for THIS session.
  useEffect(() => {
    if (!sessionId) return;
    const stored = readStoredNote(sessionId);
    setNote(stored);
    setDraft(stored);
    setShareWithProvider(readStoredConsent(sessionId));
    setEditing(false);
  }, [sessionId]);

  const hoursUntilStart = useMemo(() => {
    if (!session) return Number.POSITIVE_INFINITY;
    const start = sessionStartMs(session);
    if (start <= 0) return Number.POSITIVE_INFINITY;
    return (start - Date.now()) / HOUR_MS;
  }, [session]);

  if (!session || !sessionId) return null;
  if (hoursUntilStart > windowHours || hoursUntilStart < -1) return null;

  const provider = providerName || session.therapist?.full_name || t("prep_provider_fallback", "je begeleider");
  const isBond = variant === "bond";

  const whenLabel =
    hoursUntilStart <= 1
      ? t("prep_when_hour", "binnen het uur")
      : hoursUntilStart <= 24
        ? t("prep_when_hours", "over ongeveer {{count}} uur", {
            count: Math.max(1, Math.round(hoursUntilStart)),
          })
        : t("prep_when_days", "over ongeveer {{count}} dagen", {
            count: Math.max(1, Math.round(hoursUntilStart / 24)),
          });

  const persist = (nextNote: string, nextConsent: boolean) => {
    try {
      if (nextNote) window.localStorage.setItem(prepNoteStorageKey(sessionId), nextNote);
      else window.localStorage.removeItem(prepNoteStorageKey(sessionId));
      window.localStorage.setItem(prepConsentStorageKey(sessionId), String(nextConsent));
    } catch {
      /* localStorage may be unavailable; the note stays in memory this session */
    }

    // The note only travels when consent is explicitly on. No consent, no send.
    if (nextNote && nextConsent) {
      void sessionNotificationService.sendPreSessionReminder({
        sessionId,
        sessionDate: session.session_date,
        sessionTime: session.session_time,
        prepNote: nextNote,
      });
    }
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    setNote(trimmed);
    setEditing(false);
    persist(trimmed, shareWithProvider);
    onSaved?.(trimmed, shareWithProvider);
    toast.success(
      shareWithProvider
        ? t("prep_saved_shared", "Bewaard. {{provider}} kan dit vooraf lezen.", { provider })
        : t("prep_saved_private", "Bewaard, alleen voor jou. Je kunt het later nog delen."),
    );
  };

  const handleToggleConsent = (checked: boolean) => {
    setShareWithProvider(checked);
    if (note) persist(note, checked);
  };

  const shellClass = isBond
    ? "rounded-card border border-mint/40 bg-mint-soft p-4 sm:p-5"
    : "rounded-card border border-border bg-card p-5";

  const primaryButtonClass = isBond
    ? "h-auto rounded-ctl bg-mint px-4 py-2 text-sm font-medium text-mint-foreground hover:bg-mint/90"
    : "h-auto rounded-ctl px-4 py-2 text-sm font-medium";

  return (
    <section
      className={`animate-enter ${shellClass} ${className}`.trim()}
      aria-label={t("prep_region_label", "Sessie voorbereiden")}
    >
      <div className="flex items-start gap-3">
        <NotebookPen aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">
            {t("prep_title", "Wat wil je zeker bespreken met {{provider}}?", { provider })}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("prep_subtitle", "Je sessie is {{when}}. Eén zin volstaat.", { when: whenLabel })}
          </p>

          {editing ? (
            <div className="mt-3 space-y-3">
              <Textarea
                id={`prep-note-${sessionId}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder={t("prep_placeholder", "Ik wil het hebben over…")}
                className="resize-none bg-card text-sm"
              />

              <div className="flex items-start justify-between gap-3 rounded-ctl border border-border bg-background px-3 py-2.5">
                <Label
                  htmlFor={`prep-consent-${sessionId}`}
                  className="cursor-pointer text-xs font-normal leading-snug text-foreground"
                >
                  {t("prep_consent_label", "Mag {{provider}} dit vooraf lezen?", { provider })}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {shareWithProvider
                      ? t("prep_consent_on", "Gedeeld voor de sessie. Je kunt dit altijd terugdraaien.")
                      : t("prep_consent_off", "Blijft van jou. Je neemt het zelf mee naar de sessie.")}
                  </span>
                </Label>
                <Switch
                  id={`prep-consent-${sessionId}`}
                  checked={shareWithProvider}
                  onCheckedChange={handleToggleConsent}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={handleSave} className={primaryButtonClass}>
                  <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {t("prep_save", "Bewaren")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDraft(note);
                    setEditing(false);
                  }}
                  className="h-auto rounded-ctl px-3 py-2 text-sm"
                >
                  {t("cancel", "Annuleren")}
                </Button>
              </div>
            </div>
          ) : note ? (
            <div className="mt-3 space-y-2">
              <blockquote className="rounded-ctl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground">
                {note}
              </blockquote>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {shareWithProvider ? (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {shareWithProvider
                    ? t("prep_state_shared", "{{provider}} kan dit vooraf lezen", { provider })
                    : t("prep_state_private", "Alleen voor jou")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDraft(note);
                    setEditing(true);
                  }}
                  className="h-auto rounded-ctl px-2.5 py-1.5 text-xs"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {t("prep_edit", "Aanpassen")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant={isBond ? "ghost" : "outline"}
              onClick={() => {
                setDraft("");
                setEditing(true);
              }}
              className={
                isBond
                  ? "mt-3 h-auto rounded-ctl border border-mint/40 bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-mint/10"
                  : "mt-3 h-auto rounded-ctl px-3.5 py-2 text-sm font-medium"
              }
            >
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t("prep_start", "Schrijf het op")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

export default SessionPrepPrompt;

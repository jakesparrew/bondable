import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BellRing, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Session } from '@/services/api/SessionService';
import { sessionNotificationService } from '@/services/api/sessionNotificationService';
import { hoursUntil, isWithin24h, prepNoteStorageKey } from './sessionLoopUtils';

interface PreSessionNudgeProps {
  session: Session;
  /** Only the client gets the prep-note affordance; therapists see info only. */
  canAddPrepNote?: boolean;
  className?: string;
}

/**
 * (3) Pre-session nudge.
 *
 * A 24h-before reminder surfaced in the UI, with an optional prep note ("what
 * would you like to focus on?"). On the dev mock there is no live mail backend,
 * so `sessionNotificationService.sendPreSessionReminder` is a no-op/log — but
 * the affordance is fully visible so the value reads end-to-end. The prep note
 * is remembered locally (the mock doesn't persist mutations) and passed to the
 * reminder payload.
 *
 * Renders nothing unless the session starts within the next 24h.
 */
const PreSessionNudge = ({ session, canAddPrepNote = false, className }: PreSessionNudgeProps) => {
  const { t } = useTranslation();

  const [prepNote, setPrepNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const storageKey = prepNoteStorageKey(session.id);

  // Restore any locally-saved prep note + fire the (mock) reminder once.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setPrepNote(stored);
      void sessionNotificationService.sendPreSessionReminder({
        sessionId: session.id,
        sessionDate: session.session_date,
        sessionTime: session.session_time,
        prepNote: stored || undefined,
      });
    } catch {
      /* localStorage may be unavailable; ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  if (!isWithin24h(session)) return null;

  const hrs = hoursUntil(session);
  const whenLabel =
    hrs <= 1
      ? t('nudge_starts_soon', 'Starts within the hour')
      : t('nudge_starts_in_hours', 'In about {{count}}h', { count: hrs });

  const handleSavePrepNote = () => {
    const trimmed = draft.trim();
    setPrepNote(trimmed);
    setEditing(false);
    try {
      if (trimmed) window.localStorage.setItem(storageKey, trimmed);
      else window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    void sessionNotificationService.sendPreSessionReminder({
      sessionId: session.id,
      sessionDate: session.session_date,
      sessionTime: session.session_time,
      prepNote: trimmed || undefined,
    });
    toast.success(t('nudge_prep_saved', 'Saved — your therapist will see this before the session.'));
  };

  return (
    <div
      className={[
        'rounded-2xl border border-mint/30 bg-mint/10 p-3',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint/20 text-mint">
          <BellRing className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground">
            {t('nudge_title', 'Upcoming session reminder')}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{whenLabel}</p>

          {canAddPrepNote && (
            <div className="mt-2">
              {editing ? (
                <div className="space-y-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder={t('nudge_prep_placeholder', 'Anything you want to focus on next session? (optional)')}
                    className="resize-none bg-background text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSavePrepNote}
                      className="h-7 gap-1 bg-primary px-2 text-[11px] text-primary-foreground hover:bg-primary/90"
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                      {t('save', 'Save')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDraft(prepNote);
                        setEditing(false);
                      }}
                      className="h-7 px-2 text-[11px]"
                    >
                      {t('cancel', 'Cancel')}
                    </Button>
                  </div>
                </div>
              ) : prepNote ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(prepNote);
                    setEditing(true);
                  }}
                  className="group flex w-full items-start gap-1.5 rounded-lg border border-border bg-card/60 p-2 text-left"
                >
                  <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
                  <span className="text-[11px] text-muted-foreground">{prepNote}</span>
                </button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDraft('');
                    setEditing(true);
                  }}
                  className="h-7 gap-1 px-2 text-[11px]"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  {t('nudge_add_prep', 'Add a prep note')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreSessionNudge;

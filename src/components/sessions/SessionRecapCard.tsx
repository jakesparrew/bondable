import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotebookPen, Pencil, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { SessionFeedbackService } from '@/services/api/sessionFeedbackService';

interface SessionRecapCardProps {
  sessionId: string;
  /** Existing recap (from `sessions.recap`); may be null/empty. */
  recap?: string | null;
  /** Therapists can author/edit; clients (and others) see read-only. */
  canEdit: boolean;
  compact?: boolean;
  className?: string;
  /** Bubble the saved value up so the parent can keep optimistic state. */
  onSaved?: (recap: string) => void;
}

/**
 * (2) Session recap card.
 *
 * A short shared summary the THERAPIST writes on a completed session ("what we
 * covered, the next step"). Saved to `sessions.recap` and shown to BOTH the
 * client and the therapist — continuity between sessions, and a warm signal to
 * the client that the work is remembered.
 *
 * - Therapist (canEdit): inline view → edit → save, with optimistic local state
 *   (the dev mock echoes updates rather than persisting them).
 * - Client (read-only): sees the recap, or a soft empty state if none yet.
 */
const SessionRecapCard = ({
  sessionId,
  recap,
  canEdit,
  compact = false,
  className,
  onSaved,
}: SessionRecapCardProps) => {
  const { t } = useTranslation();

  const [value, setValue] = useState(recap ?? '');
  const [draft, setDraft] = useState(recap ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasRecap = Boolean(value.trim());

  // Read-only client view with no recap yet: stay quiet to avoid clutter.
  if (!canEdit && !hasRecap) {
    if (compact) return null;
    return (
      <Card className={['border-dashed border-border p-4', className ?? ''].join(' ').trim()}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <NotebookPen className="h-4 w-4" aria-hidden="true" />
          <span>{t('recap_none_client', 'No recap yet — your therapist may add one after the session.')}</span>
        </div>
      </Card>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await SessionFeedbackService.saveRecap(sessionId, draft);
      const next = draft.trim();
      setValue(next);
      setEditing(false);
      onSaved?.(next);
      toast.success(t('recap_saved', 'Recap saved and shared.'));
    } catch {
      toast.error(t('recap_save_failed', 'Could not save the recap. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-4 w-4 text-primary" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-foreground">{t('recap_title', 'Session recap')}</h4>
      </div>
      {canEdit && !editing && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {hasRecap ? t('edit', 'Edit') : t('recap_add', 'Add recap')}
        </Button>
      )}
    </div>
  );

  const inner = editing ? (
    <div className="space-y-3">
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        placeholder={t('recap_placeholder', 'What did you cover? What is the next step? (shared with your client)')}
        className="resize-none bg-background text-sm"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={handleSave}
          className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {saving ? t('saving', 'Saving…') : t('save', 'Save')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
          className="gap-1"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          {t('cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  ) : hasRecap ? (
    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{value}</p>
  ) : (
    <p className="text-sm text-muted-foreground">
      {t('recap_none_therapist', 'No recap yet. Add a short summary your client can revisit.')}
    </p>
  );

  if (compact) {
    return (
      <div className={['rounded-2xl border border-border bg-card p-3', className ?? ''].join(' ').trim()}>
        {header}
        {inner}
      </div>
    );
  }

  return (
    <Card className={['border-border p-4', className ?? ''].join(' ').trim()}>
      {header}
      {inner}
    </Card>
  );
};

export default SessionRecapCard;

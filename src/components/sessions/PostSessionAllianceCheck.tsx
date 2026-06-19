import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuthManager } from '@/hooks/api/useAuthManager';
import { SessionFeedbackService } from '@/services/api/sessionFeedbackService';

interface PostSessionAllianceCheckProps {
  sessionId: string;
  /** Compact rendering for tight surfaces (e.g. inside a session card). */
  compact?: boolean;
  className?: string;
  onSubmitted?: () => void;
}

/**
 * (1) Post-session alliance micro-check.
 *
 * A tiny one-question prompt shown to the CLIENT after a session is complete:
 * "How connected did you feel this session?" rated 1–5, with an optional note.
 * Saves to the `session_feedback` table. This is the single most predictive
 * proxy for therapeutic outcome (working-alliance), so we capture it with the
 * lightest possible touch — one tap, no required typing.
 *
 * Gracefully handles the dev mock (mutations are echoed, not persisted): once
 * submitted in-session we flip to a "thank you" state and remember it locally.
 */
const PostSessionAllianceCheck = ({
  sessionId,
  compact = false,
  className,
  onSubmitted,
}: PostSessionAllianceCheckProps) => {
  const { t } = useTranslation();
  const { user } = useAuthManager();

  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checking, setChecking] = useState(true);

  // Don't re-prompt a client who already answered for this session.
  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setChecking(false);
      return;
    }
    SessionFeedbackService.hasClientSubmitted(sessionId, user.id)
      .then((already) => {
        if (active && already) setSubmitted(true);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId, user?.id]);

  const handleSubmit = async () => {
    if (rating == null || !user?.id) return;
    setSubmitting(true);
    try {
      await SessionFeedbackService.submitFeedback({
        sessionId,
        clientId: user.id,
        allianceRating: rating,
        note,
      });
      setSubmitted(true);
      onSubmitted?.();
      toast.success(t('alliance_check_thanks', 'Thanks — your therapist will see this.'));
    } catch {
      toast.error(t('alliance_check_failed', 'Could not save your feedback. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return null;

  const scale = [1, 2, 3, 4, 5];

  const body = submitted ? (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint/15">
        <Check className="h-3.5 w-3.5 text-mint" aria-hidden="true" />
      </span>
      <span>{t('alliance_check_done', 'Feedback shared. Thank you.')}</span>
    </div>
  ) : (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          {t('alliance_check_question', 'How connected did you feel this session?')}
        </p>
      </div>

      <div
        className="flex items-center gap-2"
        role="radiogroup"
        aria-label={t('alliance_check_question', 'How connected did you feel this session?')}
      >
        {scale.map((value) => {
          const active = rating === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={String(value)}
              onClick={() => setRating(value)}
              className={
                active
                  ? 'flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground transition-colors'
                  : 'flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'
              }
            >
              {value}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{t('alliance_check_low', 'Not connected')}</span>
        <span>{t('alliance_check_high', 'Very connected')}</span>
      </div>

      {!compact && rating != null && (
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={t('alliance_check_note_placeholder', 'Anything you want your therapist to know? (optional)')}
          className="resize-none bg-background text-sm"
        />
      )}

      <Button
        type="button"
        size="sm"
        disabled={rating == null || submitting}
        onClick={handleSubmit}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {submitting ? t('saving', 'Saving…') : t('alliance_check_submit', 'Share with my therapist')}
      </Button>
    </div>
  );

  if (compact) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Card className={['border-border p-4', className ?? ''].join(' ').trim()}>{body}</Card>
  );
};

export default PostSessionAllianceCheck;

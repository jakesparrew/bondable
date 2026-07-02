import * as React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  canShowNudge,
  recordNudge,
  recordNudgeClicked,
  recordNudgeDismissed,
} from '@/services/api/nudgeService';

import { ProBadge } from './ProBadge';

/**
 * UpgradeMoment — the event-triggered upgrade nudge (tickets T-MG-5/6, ruling R15).
 *
 * R15 IS LAW: THIS IS NOT A MODAL. It is a quiet slide-in CARD anchored bottom-right
 * that never blocks the page, never dims the background, never traps focus, and
 * never demands a choice. It auto-dismisses after ~12s and can be dismissed at any
 * time (the decline is a real, equal-weight button — no dark-pattern asymmetry).
 *
 * Governance stacks two caps:
 *   1. The nudgeService governor (provider-only, forbidden-route, per-id 30-day
 *      dedupe, one-visible-per-page).
 *   2. A dialog-family cap: at most ONE UpgradeMoment per rolling 7 days across
 *      all ids (master-plan §3.2), tracked here in localStorage.
 *
 * DESIGN LAW: standard card styling on tokens — border-first, `shadow-overlay`
 * (this IS an overlay layer), no gradient, no confetti, no red, no mint, no lock,
 * no exclamation marks. Copy always states no loss.
 */

const MOMENT_CAP_KEY = 'bondable_nudge_moment_last';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const AUTO_DISMISS_MS = 12_000;
const hasWindow = typeof window !== 'undefined';

/** True when a moment was shown within the last 7 days (dialog-family cap). */
function isWithinWeeklyCap(): boolean {
  if (!hasWindow) return false;
  try {
    const raw = window.localStorage.getItem(MOMENT_CAP_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}

/** Stamp the weekly cap clock. */
function stampWeeklyCap(): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(MOMENT_CAP_KEY, String(Date.now()));
  } catch {
    /* silent-fail */
  }
}

export interface UpgradeMomentProps {
  /** Nudge/trigger id — the dedupe + analytics key. */
  id: string;
  /** Card title. Pass already-localized text. */
  title: string;
  /** Two-sentence body (must state no loss). Pass already-localized text. */
  body: string;
  /** Which tier this sells toward. */
  tier?: 'pro' | 'practice';
  /** Primary CTA label. */
  ctaLabel?: string;
  /** Secondary/decline label. */
  dismissLabel?: string;
  /** Called when the primary CTA is clicked (route to plans). */
  onCta?: () => void;
  /** Called after dismiss/auto-dismiss (optional). */
  onClose?: () => void;
}

export function UpgradeMoment({
  id,
  title,
  body,
  tier = 'pro',
  ctaLabel,
  dismissLabel,
  onCta,
  onClose,
}: UpgradeMomentProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  // Governor + weekly cap on mount.
  React.useEffect(() => {
    if (isWithinWeeklyCap()) return;
    if (!canShowNudge(id)) return;
    recordNudge(id); // logs nudge_shown, consumes page budget, stamps 30-day dedupe
    stampWeeklyCap();
    setOpen(true);
  }, [id]);

  // Auto-dismiss timer.
  React.useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      recordNudgeDismissed(id);
      setOpen(false);
      onClose?.();
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [open, id, onClose]);

  if (!open) return null;

  const close = (permanent = false) => {
    recordNudgeDismissed(id, permanent);
    setOpen(false);
    onClose?.();
  };

  const handleCta = () => {
    recordNudgeClicked(id);
    setOpen(false);
    onCta?.();
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))]',
        'rounded-card border bg-card p-4 shadow-overlay animate-enter',
      )}
      role="complementary"
      aria-label={title}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <ProBadge tier={tier} />
        <button
          type="button"
          onClick={() => close(false)}
          className="-mr-1 -mt-1 shrink-0 rounded-ctl p-1 text-muted-foreground transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={t('monetization.dismiss', 'Sluiten')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={handleCta}>
          {ctaLabel ?? t('monetization.moment.cta', 'Bekijk Pro')}
        </Button>
        {/* Decline is a real, equal-family button — no dark-pattern asymmetry. */}
        <Button variant="ghost" size="sm" onClick={() => close(false)}>
          {dismissLabel ?? t('monetization.moment.later', 'Later')}
        </Button>
      </div>
    </div>
  );
}

export default UpgradeMoment;

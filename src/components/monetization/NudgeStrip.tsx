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
 * NudgeStrip — a flat, inset upgrade banner (ticket T-MG-5).
 *
 * Grammar: a quiet `bg-secondary` inset strip that sits in the content flow (not
 * an overlay, never modal per R15). One value line, an optional ProBadge, a quiet
 * CTA and a dismiss. Governed by `nudgeService`: it self-suppresses on forbidden
 * routes, for non-providers, when muted, inside the 30-day dedupe window, or when
 * the page's single-nudge budget is spent. Dismissal persists for 30 days.
 *
 * Used for the always-inline banners (§3.3 #2 cap-approaching, #9 trial) that do
 * NOT interrupt — they read as a calm heads-up, never an alert.
 *
 * DESIGN LAW: no gradient, no red, no mint, no lock icon, no exclamation marks.
 */
export interface NudgeStripProps {
  /** Nudge id — the dedupe/analytics key. */
  id: string;
  /** The single value line. Pass already-localized text. */
  message: string;
  /** Optional Pro/Practice tag. */
  tier?: 'pro' | 'practice';
  /** CTA label. */
  ctaLabel?: string;
  /** Called when the CTA is clicked (route to plans). */
  onCta?: () => void;
  className?: string;
}

export function NudgeStrip({
  id,
  message,
  tier,
  ctaLabel,
  onCta,
  className,
}: NudgeStripProps) {
  const { t } = useTranslation();
  const [allowed, setAllowed] = React.useState(false);

  // Governor decision on mount; record the impression if we pass.
  React.useEffect(() => {
    if (canShowNudge(id)) {
      recordNudge(id);
      setAllowed(true);
    }
  }, [id]);

  if (!allowed) return null;

  const handleCta = () => {
    recordNudgeClicked(id);
    onCta?.();
  };

  const handleDismiss = () => {
    recordNudgeDismissed(id);
    setAllowed(false);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-ctl bg-secondary px-4 py-3 animate-enter',
        className,
      )}
      role="region"
      aria-label={t('monetization.strip.region', 'Suggestie')}
    >
      {tier && <ProBadge tier={tier} />}
      <p className="min-w-0 flex-1 text-sm text-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={handleCta} className="shrink-0">
        {ctaLabel ?? t('monetization.strip.cta', 'Bekijk Pro')}
      </Button>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-ctl p-1 text-muted-foreground transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('monetization.dismiss', 'Sluiten')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default NudgeStrip;

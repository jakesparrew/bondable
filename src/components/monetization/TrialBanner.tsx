import * as React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ANALYTICS_EVENTS } from '@/config/analyticsEvents';
import { analyticsService } from '@/services/api/analyticsService';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTrialState } from '@/services/api/signupService';

/**
 * TrialBanner — a quiet, non-modal heads-up that the 14-day full-Pro trial is
 * running (Track 1).
 *
 * Grammar: border-first quiet keyline, one factual line, one outline CTA to
 * /pricing, one dismiss. It renders NOTHING when there is no active trial, so it
 * is safe to mount unconditionally on any provider surface.
 *
 * Not a nudge in the `nudgeService` sense — it states a fact about the account
 * ("nog 9 dagen"), it does not sell. Dismissal is remembered for the rest of the
 * trial: once you have seen it, we do not keep asking.
 *
 * DESIGN LAW: no mint (mint is AI-only), no gradient, no red, no lock icon, no
 * modal, no exclamation marks.
 */

const DISMISS_KEY = 'bondable_trial_banner_dismissed_until';

function readDismissedUntil(): number {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const parsed = raw === null ? NaN : Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export interface TrialBannerProps {
  className?: string;
  /** Analytics tag so we can tell dashboard from settings placements apart. */
  source?: string;
}

export function TrialBanner({ className, source = 'trial_banner' }: TrialBannerProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);
  const [daysLeft, setDaysLeft] = React.useState(0);

  React.useEffect(() => {
    const trial = getTrialState();
    if (!trial.active || !trial.endsAt) return;
    // Dismissed for this trial window → stay quiet.
    if (readDismissedUntil() >= Date.parse(trial.endsAt)) return;

    setDaysLeft(trial.daysLeft);
    setVisible(true);
    analyticsService.track(ANALYTICS_EVENTS.nudge_shown, { trigger: source });
  }, [source]);

  if (!visible) return null;

  const handleDismiss = () => {
    try {
      const trial = getTrialState();
      if (trial.endsAt) window.localStorage.setItem(DISMISS_KEY, trial.endsAt);
    } catch {
      /* silent-fail */
    }
    analyticsService.track(ANALYTICS_EVENTS.nudge_dismissed, { trigger: source });
    setVisible(false);
  };

  const message =
    daysLeft === 1
      ? t('trial_banner_one_day', 'Nog 1 dag volledig Pro in je proefperiode.')
      : t('trial_banner_days', 'Nog {{n}} dagen volledig Pro in je proefperiode.', {
          n: daysLeft,
        });

  return (
    <div
      role="region"
      aria-label={t('trial_banner_region', 'Proefperiode')}
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-ctl border border-border bg-card px-4 py-3 animate-enter',
        className,
      )}
    >
      <p className="min-w-0 flex-1 text-sm text-foreground">
        <span className="tabular">{message}</span>{' '}
        <span className="text-muted-foreground">
          {t(
            'trial_banner_after',
            'Daarna ga je verder op het gratis plan. Je gegevens blijven staan.',
          )}
        </span>
      </p>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() =>
          analyticsService.track(ANALYTICS_EVENTS.nudge_clicked, { trigger: source })
        }
      >
        <Link to="/pricing">{t('trial_banner_cta', 'Bekijk de plannen')}</Link>
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

export default TrialBanner;

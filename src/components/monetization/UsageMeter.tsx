import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/**
 * UsageMeter — a calm, persistent quota counter (ticket T-MG-5).
 *
 * Pattern: "2/3 actieve cliënten" with a thin progress bar. Lives in the provider
 * Clients header / sidebar footer. Clicking routes to the plans page.
 *
 * DESIGN LAW (§3.1):
 *   - Renders NOTHING below 60% usage (unless `alwaysShow`) — no meter until it
 *     is worth knowing. Below-cap it is muted; AT cap it shifts to primary ink,
 *     NEVER red (red is reserved for crisis/destructive).
 *   - No mint, no gradient. A single flat bar on a secondary track.
 */
export interface UsageMeterProps {
  /** Current count (e.g. active clients). */
  value: number;
  /** The cap. `Infinity` (Pro/Practice) renders nothing. */
  limit: number;
  /** Noun label, e.g. "actieve cliënten". Pass already-localized text. */
  label: string;
  /** Route to plans when the meter is clicked. */
  onClick?: () => void;
  /** Force render even below the 60% threshold. */
  alwaysShow?: boolean;
  className?: string;
}

const SHOW_THRESHOLD = 0.6;

export function UsageMeter({
  value,
  limit,
  label,
  onClick,
  alwaysShow = false,
  className,
}: UsageMeterProps) {
  const { t } = useTranslation();

  // Unlimited tiers have nothing to meter.
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const ratio = Math.min(value / limit, 1);
  if (!alwaysShow && ratio < SHOW_THRESHOLD) return null;

  const atCap = value >= limit;
  const pct = Math.round(ratio * 100);

  const content = (
    <>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span
          className={cn(
            'text-label font-medium tabular-nums',
            atCap ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {value}/{limit} {label}
        </span>
        {atCap && (
          <span className="text-label text-primary">
            {t('monetization.meter.atCap', 'limiet bereikt')}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-ctl bg-secondary">
        <div
          className={cn('h-full rounded-ctl transition-all', atCap ? 'bg-primary' : 'bg-primary/50')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full rounded-ctl text-left transition-colors hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'px-2 py-1.5',
          className,
        )}
        aria-label={`${value}/${limit} ${label}`}
      >
        {content}
      </button>
    );
  }

  return <div className={cn('w-full px-2 py-1.5', className)}>{content}</div>;
}

export default UsageMeter;

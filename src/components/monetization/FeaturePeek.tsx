import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { analyticsService } from '@/services/api/analyticsService';
import { ANALYTICS_EVENTS } from '@/config/analyticsEvents';

import { ProBadge } from './ProBadge';

/**
 * FeaturePeek — an honest teaser for a Pro/Practice surface (ticket T-MG-5).
 *
 * Renders the provider's REAL feature UI (their actual children) at reduced
 * emphasis inside a dashed keyline frame, with a ProBadge, one value sentence, and
 * a quiet outline "Ontdek Pro" button that routes to the plans page.
 *
 * DESIGN LAW (§3.1 / anti-slop):
 *   - NEVER blur, NEVER a frosted overlay, NEVER a lock icon, NEVER a gradient.
 *     The peek uses opacity + a dashed keyline — the content stays legible and
 *     learnable (the provider sees exactly WHERE the feature lives).
 *   - The children must be the provider's OWN real data (no fabricated
 *     up-and-to-the-right curves). Honesty is the whole point of the peek.
 *   - No mint (AI-only), no red.
 *
 * Emits `feature_peek_viewed` once on mount (per surface/session is enforced by
 * the caller/governor; this component logs the raw view).
 */
export interface FeaturePeekProps {
  /** The gated feature id (analytics + copy lookup). */
  feature: string;
  /** One short value sentence stating what Pro reveals. NL default via i18n. */
  valueSentence: string;
  /** Which tier this peeks toward (drives the badge). */
  tier?: 'pro' | 'practice';
  /** The real feature UI, rendered de-emphasized behind the frame. */
  children: React.ReactNode;
  /** Called when the provider clicks "Ontdek Pro" (route to plans). */
  onDiscover?: () => void;
  /** i18n key for the CTA label. */
  ctaKey?: string;
  className?: string;
}

export function FeaturePeek({
  feature,
  valueSentence,
  tier = 'pro',
  children,
  onDiscover,
  ctaKey = 'monetization.peek.cta',
  className,
}: FeaturePeekProps) {
  const { t } = useTranslation();

  React.useEffect(() => {
    analyticsService.track(ANALYTICS_EVENTS.feature_peek_viewed, { feature });
  }, [feature]);

  return (
    <div
      className={cn(
        'rounded-card border border-dashed border-border bg-card p-4',
        className,
      )}
      data-feature-peek={feature}
    >
      <div className="mb-3 flex items-center gap-2">
        <ProBadge tier={tier} />
        <p className="text-sm text-muted-foreground">{valueSentence}</p>
      </div>

      {/* Real UI, de-emphasized — opacity only, never blur. Non-interactive. */}
      <div
        className="pointer-events-none select-none opacity-60"
        aria-hidden="true"
      >
        {children}
      </div>

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={onDiscover}>
          {t(ctaKey, 'Ontdek Pro')}
        </Button>
      </div>
    </div>
  );
}

export default FeaturePeek;

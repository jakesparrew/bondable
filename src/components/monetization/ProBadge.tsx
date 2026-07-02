import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * ProBadge — the quiet keyline chip that marks a Pro/Practice feature in
 * provider-facing nav and settings (ticket T-MG-5).
 *
 * Grammar: uses the existing Badge `pro`/`practice` variants — a hairline keyline
 * in ink, uppercase, tracked. NEVER gold, NEVER a lock/crown icon, NEVER mint
 * (mint is AI-only). And per the dichotomieverbod fence, this must NEVER appear in
 * the public finder — it is provider-facing only.
 *
 * @example <ProBadge />              // "Pro"
 * @example <ProBadge tier="practice" /> // "Practice"
 */
export interface ProBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which paid tier this marks. Defaults to Pro. */
  tier?: 'pro' | 'practice';
  /** Override the label text (defaults to the tier name). */
  label?: string;
}

export function ProBadge({ tier = 'pro', label, className, ...props }: ProBadgeProps) {
  const text = label ?? (tier === 'practice' ? 'Practice' : 'Pro');
  return (
    <Badge variant={tier} className={cn('shrink-0', className)} {...props}>
      {text}
    </Badge>
  );
}

export default ProBadge;

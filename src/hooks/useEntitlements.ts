/**
 * useEntitlements.ts — the provider-side entitlement hook (ticket T-MG-1).
 *
 * Reads a DEMO tier from localStorage (`bondable_demo_tier`) and exposes the pure
 * `entitlements.ts` config as ergonomic, reactive helpers. This is the single
 * place gates, meters, and the pricing/billing pages ask "what can this provider
 * do?".
 *
 * DORMANT-FIRST (master-plan §7 / decision 7): the machinery is fully built now
 * and flips live in Phase 4 when Stripe is wired. Until then there is no real
 * subscription — the tier comes from the demo override. We intentionally DEFAULT
 * TO "free" (not all-unlocked) so gates, peeks and meters are VISIBLE in the demo
 * and can be reviewed in-product. `can()` is honest per tier; a developer flips
 * `setDemoTier('pro')` to preview the unlocked experience.
 *
 * @remarks When plan 08 lands, the only change is the SOURCE of `tier`: this hook
 * reads it from the real `subscriptions` row instead of localStorage. Every
 * consumer of `can()` / `limit()` / `usage` stays identical.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  coerceTier,
  tierCan,
  tierLimit,
  TIER_META,
  type Feature,
  type LimitKey,
  type Tier,
  type TierMeta,
} from '@/config/entitlements';

const DEMO_TIER_KEY = 'bondable_demo_tier';
const DEMO_TIER_EVENT = 'bondable:demo-tier-changed';

const hasWindow = typeof window !== 'undefined';

/** Read the demo tier from storage, defaulting to `free` (see file header). */
function readDemoTier(): Tier {
  if (!hasWindow) return 'free';
  try {
    return coerceTier(window.localStorage.getItem(DEMO_TIER_KEY));
  } catch {
    return 'free';
  }
}

/**
 * Set the demo tier (dev/demo control). Persists to localStorage and broadcasts a
 * same-tab event so every mounted `useEntitlements()` re-reads immediately — the
 * native `storage` event only fires across tabs, so we add our own for this one.
 */
export function setDemoTier(tier: Tier): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(DEMO_TIER_KEY, tier);
    window.dispatchEvent(new CustomEvent(DEMO_TIER_EVENT, { detail: tier }));
  } catch {
    /* ignore storage failures */
  }
}

/** The shape returned by `useEntitlements()`. */
export interface Entitlements {
  /** The current provider tier. */
  tier: Tier;
  /** Display metadata (name, prices) for the current tier. */
  meta: TierMeta;
  /** True when `feature` is unlocked at the current tier. */
  can: (feature: Feature) => boolean;
  /** The numeric limit for `key` at the current tier (may be `Infinity`). */
  limit: (key: LimitKey) => number;
  /** Convenience: tier is at least Pro. */
  isPro: boolean;
  /** Convenience: tier is Practice. */
  isPractice: boolean;
  /** Convenience: tier is Free (the capped tier). */
  isFree: boolean;
  /** Flip the demo tier (dev/demo control; persists + broadcasts). */
  setDemoTier: (tier: Tier) => void;
}

/**
 * Reactive access to the current provider's entitlements.
 *
 * @example
 * const { can, limit, isPro } = useEntitlements();
 * if (!can('invoicing')) return <FeaturePeek feature="invoicing">{...}</FeaturePeek>;
 * const cap = limit('activeClients'); // 3 on Free, Infinity on Pro/Practice
 */
export function useEntitlements(): Entitlements {
  const [tier, setTier] = useState<Tier>(() => readDemoTier());

  useEffect(() => {
    if (!hasWindow) return;
    const sync = () => setTier(readDemoTier());
    // Same-tab changes (our custom event) + cross-tab changes (native storage).
    window.addEventListener(DEMO_TIER_EVENT, sync as EventListener);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DEMO_TIER_EVENT, sync as EventListener);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const can = useCallback((feature: Feature) => tierCan(tier, feature), [tier]);
  const limit = useCallback((key: LimitKey) => tierLimit(tier, key), [tier]);

  return {
    tier,
    meta: TIER_META[tier],
    can,
    limit,
    isPro: tier === 'pro' || tier === 'practice',
    isPractice: tier === 'practice',
    isFree: tier === 'free',
    setDemoTier,
  };
}

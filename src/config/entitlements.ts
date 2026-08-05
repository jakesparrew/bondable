/**
 * entitlements.ts — the single source of truth for Bondable's commercial tiers,
 * limits, and feature gating (ticket T-MG-1, ruling R15/R16).
 *
 * This file is PURE CONFIG: no React, no localStorage, no side effects. The hook
 * `useEntitlements()` reads it; the pricing page (T-MG-12) and every gate render
 * from it so page copy and gate behaviour can never drift.
 *
 * Commercial model (master-plan §2 — canonical numbers):
 *   - Clients are FREE forever (not represented here — this file is provider-side).
 *   - FREE     = 3 active clients + full core tools + finder/leads.
 *   - PRO      = €39/mo or €390/yr — unlimited clients, caseload outcomes,
 *                Bond supervision console, advanced scheduling, invoicing.
 *   - PRACTICE = €29/seat/mo annual (min 2 seats) — shared calendar, staff roles,
 *                manager views; a superset of Pro.
 *
 * DICHOTOMIEVERBOD: paid tiers buy WORKFLOW, never PRESENCE. No feature here
 * touches finder ranking or visibility — marketplace rank is identical on every
 * tier (enforced structurally by the ranking fence, T-MG-3).
 */

// ── Tiers ──────────────────────────────────────────────────────────────────────

/** The provider subscription tiers, in ascending order of capability. */
export const TIERS = ['free', 'pro', 'practice'] as const;

/** A single provider tier. */
export type Tier = (typeof TIERS)[number];

/** Ascending rank used for "at least this tier" comparisons. Higher = more. */
export const TIER_RANK: Record<Tier, number> = {
  free: 0,
  pro: 1,
  practice: 2,
} as const;

/**
 * Human-facing tier labels + price anchors, for the pricing page and plan cards.
 * Prices are EUR, VAT-exclusive (Stripe Tax adds BE/NL 21%). `null` price = Free.
 */
export interface TierMeta {
  /** Stable id. */
  id: Tier;
  /** Display name (locale-agnostic proper noun). */
  name: string;
  /** Monthly price in EUR, VAT-exclusive. `null` for Free. */
  monthlyEur: number | null;
  /** Yearly price in EUR, VAT-exclusive. `null` for Free. Pro is per-account; Practice is per-seat. */
  yearlyEur: number | null;
  /** True when the price is charged per seat (Practice). */
  perSeat: boolean;
  /** Minimum seat count when per-seat (Practice = 2). */
  minSeats?: number;
}

export const TIER_META: Record<Tier, TierMeta> = {
  free: {
    id: 'free',
    name: 'Gratis',
    monthlyEur: null,
    yearlyEur: null,
    perSeat: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyEur: 39,
    yearlyEur: 390,
    perSeat: false,
  },
  practice: {
    id: 'practice',
    name: 'Practice',
    // €29/seat/mo billed annually (=€348/seat/yr); no monthly-billed option at launch.
    monthlyEur: 29,
    yearlyEur: 348,
    perSeat: true,
    minSeats: 2,
  },
} as const;

// ── Limits ───────────────────────────────────────────────────────────────────

/** The numeric quota keys. `Infinity` means "no cap on this tier". */
export type LimitKey = 'activeClients' | 'intakeTemplates';

/**
 * Per-tier numeric limits. Free is the only capped tier; Pro/Practice are
 * unlimited (`Infinity`). An "active client" is a `clients` row with status
 * `active` — archived clients don't count, and archiving is one reversible click
 * (never hold data hostage — GDPR posture).
 */
export const LIMITS: Record<Tier, Record<LimitKey, number>> = {
  free: {
    // 15, not 3. Three active clients is not a small practice — it is a demo,
    // and it forces the upgrade decision BEFORE the provider has felt any
    // value ("I'll have to pay anyway, so why start"). At 15 a starting or
    // part-time practitioner can run their whole practice for free and
    // upgrades on GROWTH rather than on frustration. The real paywall sits on
    // features (invoicing + attesten, outcomes, Bond supervision console,
    // advanced scheduling), not on the caseload.
    activeClients: 15,
    intakeTemplates: 1,
  },
  pro: {
    activeClients: Infinity,
    intakeTemplates: Infinity,
  },
  practice: {
    activeClients: Infinity,
    intakeTemplates: Infinity,
  },
} as const;

// ── Features ─────────────────────────────────────────────────────────────────

/**
 * The gated feature keys. Each maps to the MINIMUM tier that unlocks it. A
 * provider `can(feature)` when their tier rank ≥ the mapped tier's rank.
 *
 * Naming mirrors the plan §1.1 feature table. Practice-only capabilities are
 * prefixed `practice_`. Core tools (sessions, calendar, messages, tasks, journal,
 * finder profile, leads inbox, GDPR export) are NOT listed here — they are free
 * for everyone and must never be gated.
 */
export type Feature =
  // Pro
  | 'outcomes_dashboard' // caseload-level outcomes rollups (per-client Verloop stays Free per R16)
  | 'bond_supervision' // Bond supervision console: review queue, escalation inbox, weekly digest
  | 'advanced_scheduling' // recurring sessions, buffers, calendar sync
  | 'invoicing' // client invoices + payment links
  | 'lead_analytics' // lead response-time + conversion analytics, saved replies
  | 'template_library' // unlimited intake templates + library
  // Practice
  | 'practice_staff_roles' // manager/staff roles, staff onboarding, seat management
  | 'practice_shared_calendar' // shared rooms/resources, org calendar
  | 'practice_manager_views' // cross-caseload rollups, per-staff reconciliation
  | 'practice_org_supervision'; // org-level Bond supervision oversight

/** Minimum tier required for each gated feature. */
export const FEATURES: Record<Feature, Tier> = {
  // Pro-tier features
  outcomes_dashboard: 'pro',
  bond_supervision: 'pro',
  advanced_scheduling: 'pro',
  invoicing: 'pro',
  lead_analytics: 'pro',
  template_library: 'pro',
  // Practice-tier features (superset of Pro)
  practice_staff_roles: 'practice',
  practice_shared_calendar: 'practice',
  practice_manager_views: 'practice',
  practice_org_supervision: 'practice',
} as const;

// ── Pure predicates (no React, no storage) ──────────────────────────────────

/** True when `tier` unlocks `feature` (tier rank ≥ the feature's minimum tier). */
export function tierCan(tier: Tier, feature: Feature): boolean {
  const required = FEATURES[feature];
  return TIER_RANK[tier] >= TIER_RANK[required];
}

/** The numeric limit for `key` on `tier` (may be `Infinity`). */
export function tierLimit(tier: Tier, key: LimitKey): number {
  return LIMITS[tier][key];
}

/** Narrow, defensive parse of an unknown string into a valid `Tier` (fallback `free`). */
export function coerceTier(value: string | null | undefined): Tier {
  return (TIERS as readonly string[]).includes(String(value)) ? (value as Tier) : 'free';
}

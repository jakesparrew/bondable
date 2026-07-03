/**
 * opsService — mock (localStorage-backed) ops-data engine for the Bondable owner
 * cockpit (plan 07 tickets T-OC-8 revenue, T-OC-9 feature flags, T-OC-14 GDPR,
 * T-OC-16 LLM cost meter).
 *
 * This is a FRONT-END MOCKUP. There is no backend: everything is seeded with
 * realistic, deterministic Flemish data (concrete names, real dates, EUR). Any
 * owner mutation (toggle a flag, mark a GDPR request delivered, log a refund)
 * persists to localStorage so a demo survives a reload. When the real backend
 * lands (plan 08 / Neon + Stripe) these signatures swap behind unchanged shapes:
 *  - subscriptions/billing_events mirror plan 05's Stripe schema,
 *  - feature_flags mirror plan 07 §5,
 *  - gdpr_requests mirror plan 07 §6,
 *  - llm_usage mirrors plan 07 §7.
 *
 * Determinism note: no Math.random() and no bare `new Date()` at module scope.
 * The seed "today" is 2026-07-03 (matches the demo clock). Countdown helpers
 * accept an explicit `now` so callers control the clock; the default reads the
 * real clock only inside methods, never at import time.
 */

// ── Constants ──────────────────────────────────────────────────────────────────

/** Demo reference date — the owner opens the cockpit on this day. */
export const OPS_TODAY = '2026-07-03';

const FLAGS_KEY = 'bondable_ops_feature_flags';
const GDPR_KEY = 'bondable_ops_gdpr_requests';

const hasWindow = typeof window !== 'undefined';

// ── Types ───────────────────────────────────────────────────────────────────────

export type SubTier = 'free' | 'pro' | 'practice';
export type SubStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

/** One provider/practice subscription row (mirrors plan 05 `subscriptions`). */
export interface Subscription {
  id: string;
  /** Provider or practice display name. */
  accountName: string;
  /** True for a group practice seat bundle. */
  isPractice: boolean;
  tier: SubTier;
  status: SubStatus;
  /** Monthly recurring amount in cents (EUR). 0 for free/comp. */
  amountCents: number;
  /** ISO start date. */
  startedAt: string;
  /** Dunning stage for past_due rows (0 = none). */
  dunningStage?: number;
  /** True when this seat is a comp — excluded from MRR. */
  isComp?: boolean;
}

export type BillingEventKind =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'refund_issued'
  | 'comp_granted'
  | 'subscription_canceled';

/** An append-only billing/audit event (mirrors plan 05 `billing_events`). */
export interface BillingEvent {
  id: string;
  kind: BillingEventKind;
  accountName: string;
  amountCents: number;
  /** ISO timestamp. */
  at: string;
  note?: string;
}

/** A comp account grant (plan 07 §4 `account_comps`). */
export interface CompAccount {
  id: string;
  accountName: string;
  tier: SubTier;
  reason: string;
  grantedBy: string;
  /** ISO expiry date. */
  expiresAt: string;
}

/** A feature flag with a kill switch (plan 07 §5 `feature_flags`). */
export interface FeatureFlag {
  key: string;
  /** NL description shown in the flag table. */
  description: string;
  enabled: boolean;
  /** Audience note, human-readable (rollout cohort). */
  audience: string;
  /** True → toggling gates a LIVE feature and needs a confirm. */
  gatesLiveFeature: boolean;
  /** Kill switch: when true the feature is force-off for everyone. */
  killSwitch: boolean;
  updatedBy: string;
  /** ISO timestamp of the last change. */
  updatedAt: string;
}

export type GdprKind = 'export' | 'erasure' | 'rectification';
export type GdprStatus = 'received' | 'in_progress' | 'delivered' | 'denied';

/** A GDPR data-subject request (plan 07 §6 `gdpr_requests`). */
export interface GdprRequest {
  id: string;
  /** Pseudonymous subject label — never raw content. */
  subjectName: string;
  subjectEmail: string;
  kind: GdprKind;
  status: GdprStatus;
  /** ISO statutory deadline (received + 30d, Art. 12(3)). */
  deadlineAt: string;
  /** ISO received date. */
  receivedAt: string;
  handledBy?: string;
  notes?: string;
}

/** One day of aggregated Bond LLM usage (plan 07 §7 `llm_usage` rollup). */
export interface LlmUsageDay {
  /** ISO date (day). */
  date: string;
  costCents: number;
  /** Distinct Bond DAU that day. */
  dau: number;
  p95LatencyMs: number;
  /** Share of calls that tripped a guardrail (0..1). */
  guardrailRate: number;
}

export interface LlmUsageSummary {
  days: LlmUsageDay[];
  /** € this month (cents). */
  monthCostCents: number;
  /** € per DAU (cents), latest day. */
  costPerDauCents: number;
  p95LatencyMs: number;
  guardrailRate: number;
  /** Whether Bond is live-LLM yet — the meter is dark until then. */
  live: boolean;
}

// ── Seeds ────────────────────────────────────────────────────────────────────────

const SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-1',
    accountName: 'Dr. Anke Willems',
    isPractice: false,
    tier: 'pro',
    status: 'active',
    amountCents: 3900,
    startedAt: '2026-01-14',
  },
  {
    id: 'sub-2',
    accountName: 'Praktijk De Vlonder',
    isPractice: true,
    tier: 'practice',
    status: 'active',
    amountCents: 14900,
    startedAt: '2025-11-02',
  },
  {
    id: 'sub-3',
    accountName: 'Maarten Claes',
    isPractice: false,
    tier: 'pro',
    status: 'active',
    amountCents: 3900,
    startedAt: '2026-02-21',
  },
  {
    id: 'sub-4',
    accountName: 'Naïma Bakkali',
    isPractice: false,
    tier: 'pro',
    status: 'trialing',
    amountCents: 3900,
    startedAt: '2026-06-20',
  },
  {
    id: 'sub-5',
    accountName: 'Tom Vandenberghe',
    isPractice: false,
    tier: 'free',
    status: 'active',
    amountCents: 0,
    startedAt: '2026-03-11',
  },
  {
    id: 'sub-6',
    accountName: 'Sara Goossens',
    isPractice: false,
    tier: 'pro',
    status: 'past_due',
    amountCents: 3900,
    startedAt: '2026-04-05',
    dunningStage: 2,
  },
  {
    id: 'sub-7',
    accountName: 'Praktijk Het Anker',
    isPractice: true,
    tier: 'practice',
    status: 'past_due',
    amountCents: 14900,
    startedAt: '2026-01-30',
    dunningStage: 1,
  },
  {
    id: 'sub-8',
    accountName: 'Karim Benali',
    isPractice: false,
    tier: 'pro',
    status: 'canceled',
    amountCents: 3900,
    startedAt: '2025-12-08',
  },
  // Comp — excluded from MRR, labelled in the table.
  {
    id: 'sub-9',
    accountName: 'CGG Waas (pilot)',
    isPractice: true,
    tier: 'practice',
    status: 'active',
    amountCents: 0,
    startedAt: '2026-05-19',
    isComp: true,
  },
];

const BILLING_EVENTS: BillingEvent[] = [
  {
    id: 'be-1',
    kind: 'payment_succeeded',
    accountName: 'Dr. Anke Willems',
    amountCents: 3900,
    at: '2026-07-01T06:12:00Z',
  },
  {
    id: 'be-2',
    kind: 'payment_failed',
    accountName: 'Sara Goossens',
    amountCents: 3900,
    at: '2026-06-30T04:20:00Z',
    note: 'Kaart geweigerd — insufficient_funds',
  },
  {
    id: 'be-3',
    kind: 'payment_failed',
    accountName: 'Praktijk Het Anker',
    amountCents: 14900,
    at: '2026-07-02T05:03:00Z',
    note: 'Kaart verlopen',
  },
  {
    id: 'be-4',
    kind: 'comp_granted',
    accountName: 'CGG Waas (pilot)',
    amountCents: 0,
    at: '2026-05-19T09:00:00Z',
    note: 'Pilotpraktijk — 6 maanden Practice',
  },
];

const COMPS: CompAccount[] = [
  {
    id: 'comp-1',
    accountName: 'CGG Waas (pilot)',
    tier: 'practice',
    reason: 'Pilotpraktijk — feedback op de finder',
    grantedBy: 'Gaëtan',
    expiresAt: '2026-11-19',
  },
  {
    id: 'comp-2',
    accountName: 'Lien Devos',
    tier: 'pro',
    reason: 'Bevriende klinisch psycholoog — vroege tester',
    grantedBy: 'Gaëtan',
    expiresAt: '2026-09-30',
  },
];

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: 'bond_live_llm',
    description: 'Bond draait op het live-LLM in plaats van het scripted mockup.',
    enabled: false,
    audience: 'Niemand — nog niet uitgerold',
    gatesLiveFeature: true,
    killSwitch: false,
    updatedBy: 'Gaëtan',
    updatedAt: '2026-06-28T10:00:00Z',
  },
  {
    key: 'stripe_checkout',
    description: 'Echte Stripe-checkout voor Pro- en Practice-abonnementen.',
    enabled: false,
    audience: 'Niemand — wacht op Neon-cutover',
    gatesLiveFeature: true,
    killSwitch: false,
    updatedBy: 'Gaëtan',
    updatedAt: '2026-06-25T14:30:00Z',
  },
  {
    key: 'group_practices',
    description: 'Groepspraktijken met meerdere zetels en een praktijkbeheerder.',
    enabled: true,
    audience: 'Alle providers',
    gatesLiveFeature: false,
    killSwitch: false,
    updatedBy: 'Gaëtan',
    updatedAt: '2026-05-30T08:15:00Z',
  },
];

const DEFAULT_GDPR: GdprRequest[] = [
  {
    id: 'gdpr-1',
    subjectName: 'Jeroen Peeters',
    subjectEmail: 'jeroen.peeters@example.be',
    kind: 'export',
    status: 'in_progress',
    receivedAt: '2026-06-16',
    deadlineAt: '2026-07-16',
    handledBy: 'Gaëtan',
    notes: 'Cliënt vroeg een volledige export van zijn gegevens.',
  },
  {
    id: 'gdpr-2',
    subjectName: 'Bram Wouters',
    subjectEmail: 'bram.wouters@example.be',
    kind: 'erasure',
    status: 'received',
    receivedAt: '2026-06-08',
    deadlineAt: '2026-07-08',
    notes: 'Traject afgerond — vraagt volledige verwijdering.',
  },
];

// ── LLM usage seed (deterministic 14-day series; Bond not yet live) ─────────────

function seedLlmDays(): LlmUsageDay[] {
  // 14 days ending on OPS_TODAY. Cost/DAU derived deterministically so the meter
  // shows a plausible shape once Bond flips to live-LLM.
  const days: LlmUsageDay[] = [];
  const end = new Date(`${OPS_TODAY}T00:00:00Z`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(end - i * dayMs);
    const date = d.toISOString().slice(0, 10);
    const seed = 13 - i;
    const dau = 40 + ((seed * 7 + 5) % 22); // 40..61
    const costPerDau = 6 + ((seed * 3) % 5); // 6..10 cents
    days.push({
      date,
      costCents: dau * costPerDau,
      dau,
      p95LatencyMs: 900 + ((seed * 37) % 500),
      guardrailRate: 0.01 + ((seed * 3) % 4) / 1000,
    });
  }
  return days;
}

const LLM_DAYS = seedLlmDays();

// ── localStorage helpers ─────────────────────────────────────────────────────────

function readStore<T>(key: string, fallback: T): T {
  if (!hasWindow) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* silent-fail (quota / private mode) */
  }
}

// ── Public API ───────────────────────────────────────────────────────────────────

export const opsService = {
  // Revenue ─────────────────────────────────────────────────────────────────────

  listSubscriptions(): Subscription[] {
    return [...SUBSCRIPTIONS];
  },

  /** MRR in cents — active/trialing paid rows only; comps excluded. */
  mrrCents(): number {
    return SUBSCRIPTIONS.filter(
      (s) => !s.isComp && (s.status === 'active' || s.status === 'trialing'),
    ).reduce((sum, s) => sum + s.amountCents, 0);
  },

  /** Past_due rows with the € at risk. */
  pastDue(): Subscription[] {
    return SUBSCRIPTIONS.filter((s) => s.status === 'past_due');
  },

  atRiskCents(): number {
    return this.pastDue().reduce((sum, s) => sum + s.amountCents, 0);
  },

  listBillingEvents(): BillingEvent[] {
    return [...BILLING_EVENTS].sort((a, b) => b.at.localeCompare(a.at));
  },

  listComps(): CompAccount[] {
    return [...COMPS];
  },

  // Feature flags ─────────────────────────────────────────────────────────────────

  listFlags(): FeatureFlag[] {
    return readStore<FeatureFlag[]>(FLAGS_KEY, DEFAULT_FLAGS);
  },

  /** Toggle enabled. Persists. Returns the updated flag list. */
  setFlagEnabled(key: string, enabled: boolean, updatedBy = 'Gaëtan'): FeatureFlag[] {
    const flags = this.listFlags().map((f) =>
      f.key === key
        ? { ...f, enabled, updatedBy, updatedAt: new Date().toISOString() }
        : f,
    );
    writeStore(FLAGS_KEY, flags);
    return flags;
  },

  /** Pull the kill switch — force-off for everyone, bypassing rollout. */
  setKillSwitch(key: string, killSwitch: boolean, updatedBy = 'Gaëtan'): FeatureFlag[] {
    const flags = this.listFlags().map((f) =>
      f.key === key
        ? {
            ...f,
            killSwitch,
            // Kill switch also disables the feature.
            enabled: killSwitch ? false : f.enabled,
            updatedBy,
            updatedAt: new Date().toISOString(),
          }
        : f,
    );
    writeStore(FLAGS_KEY, flags);
    return flags;
  },

  resetFlags(): FeatureFlag[] {
    writeStore(FLAGS_KEY, DEFAULT_FLAGS);
    return [...DEFAULT_FLAGS];
  },

  // GDPR ────────────────────────────────────────────────────────────────────────

  listGdprRequests(): GdprRequest[] {
    return readStore<GdprRequest[]>(GDPR_KEY, DEFAULT_GDPR);
  },

  setGdprStatus(id: string, status: GdprStatus, handledBy = 'Gaëtan'): GdprRequest[] {
    const rows = this.listGdprRequests().map((r) =>
      r.id === id ? { ...r, status, handledBy } : r,
    );
    writeStore(GDPR_KEY, rows);
    return rows;
  },

  resetGdpr(): GdprRequest[] {
    writeStore(GDPR_KEY, DEFAULT_GDPR);
    return [...DEFAULT_GDPR];
  },

  /**
   * Whole days until a statutory deadline, relative to `now` (defaults to the
   * real clock). Negative = overdue.
   */
  daysToDeadline(deadlineAt: string, now?: Date): number {
    const ref = now ?? new Date();
    const dl = new Date(`${deadlineAt}T23:59:59Z`).getTime();
    return Math.ceil((dl - ref.getTime()) / (24 * 60 * 60 * 1000));
  },

  // LLM cost meter ────────────────────────────────────────────────────────────────

  llmUsage(): LlmUsageSummary {
    const days = [...LLM_DAYS];
    const month = OPS_TODAY.slice(0, 7); // '2026-07'
    const monthCostCents = days
      .filter((d) => d.date.startsWith(month))
      .reduce((sum, d) => sum + d.costCents, 0);
    const latest = days[days.length - 1];
    const live = this.listFlags().some((f) => f.key === 'bond_live_llm' && f.enabled);
    return {
      days,
      monthCostCents,
      costPerDauCents: latest ? Math.round(latest.costCents / Math.max(1, latest.dau)) : 0,
      p95LatencyMs: latest?.p95LatencyMs ?? 0,
      guardrailRate: latest?.guardrailRate ?? 0,
      live,
    };
  },
};

export default opsService;

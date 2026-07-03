/**
 * ownerMetricsService — MOCK owner-cockpit metrics for the Bondable command
 * dashboard (ticket T-OC-4, plan 07 §1). Read side of the event spine.
 *
 * Where possible this reads REAL signal from the running app:
 *   - `analyticsService.getBuffer()` (the single analytics spine, plan 05/07)
 *     for any events already emitted this session, and
 *   - `adminService` for the seeded client/provider/conversation directory.
 *
 * The buffer is empty on a cold load and consent may be off, so every metric has
 * a DETERMINISTIC seeded fallback: the widgets are always non-empty and the
 * numbers are internally consistent (funnel steps descend, %s add up, sparklines
 * trend toward the headline). No Math.random / bare `new Date()` at module scope —
 * everything derives from a fixed "today" and stable hashes, matching adminService.
 *
 * FRONT-END MOCK. No network. No PII: derived counts only, never message content.
 */

import { adminService } from '@/services/api/adminService';
import { analyticsService } from '@/services/api/analyticsService';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

/** A single point on a metric sparkline (ISO date + numeric value). */
export interface TrendPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  value: number;
}

/** A headline metric: a big number, its unit, a definition line, a trend. */
export interface MetricCard {
  key: string;
  /** The headline value, already rounded for display. */
  value: number;
  /** '€' | '%' | '' — rendered adjacent to the number. */
  unit: '€' | '%' | '';
  /** Whether the unit is a prefix (€1.234) or a suffix (62%). */
  unitPosition: 'prefix' | 'suffix';
  /** One-line human definition (NL default passed through t at the call site). */
  defKey: string;
  defDefault: string;
  /** Short label (NL default). */
  labelKey: string;
  labelDefault: string;
  /** Signed week-over-week delta for the headline (already rounded). */
  delta: number;
  /** 30-day trend for the sparkline (oldest → newest). */
  trend30: TrendPoint[];
  /** 7-day trend (oldest → newest). */
  trend7: TrendPoint[];
}

export interface FunnelStep {
  key: string;
  labelKey: string;
  labelDefault: string;
  count: number;
  /** Conversion from the previous step (0–100), null for the first step. */
  convFromPrev: number | null;
}

export interface FinderLiquidity {
  steps: FunnelStep[];
  /** Overall search → accepted conversion (0–100). */
  overallConv: number;
  /** Window label for the funnel (e.g. this week). */
  windowKey: string;
  windowDefault: string;
}

export interface OpsCheck {
  key: string;
  labelKey: string;
  labelDefault: string;
  /** Count that drives the check (0 = healthy for "bad-if-nonzero" checks). */
  count: number;
  /** 'ok' = green, 'attention' = red. */
  state: 'ok' | 'attention';
  /** Where the check links (queue route). */
  href: string;
  /** Short unit suffix for the count (e.g. 'open', 'dagen'). */
  unitKey: string;
  unitDefault: string;
}

export interface OwnerMetrics {
  /** North-star: weekly active care relationships. */
  northStar: {
    value: number;
    delta: number;
    trend30: TrendPoint[];
    labelKey: string;
    labelDefault: string;
    defKey: string;
    defDefault: string;
  };
  /** Money & growth + marketplace & care metric cards. */
  cards: MetricCard[];
  /** The Bond engagement card is separated so the page can mint it. */
  bond: MetricCard;
  finder: FinderLiquidity;
  ops: OpsCheck[];
  /** Seeded ops totals for context lines. */
  llmCostPerDay: number;
}

/* -------------------------------------------------------------------------- */
/* Deterministic helpers (no Math.random / bare Date)                          */
/* -------------------------------------------------------------------------- */

/** Fixed "today" — aligned with adminService seed horizon (2026-06-26). */
const TODAY = '2026-06-26';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic date N days before TODAY, as YYYY-MM-DD. */
function dayBefore(n: number): string {
  const base = new Date(`${TODAY}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - n);
  return base.toISOString().slice(0, 10);
}

/**
 * Build a trend of `days` points that gently walks toward `headline`, using a
 * stable per-key wobble so re-renders are identical. Values are >= 0 integers
 * unless `float` is set (money).
 */
function buildTrend(key: string, days: number, headline: number, float = false): TrendPoint[] {
  const seed = hashStr(key);
  const start = headline * 0.72;
  const out: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const t = (days - 1 - i) / Math.max(1, days - 1); // 0 → 1
    // Deterministic wobble in [-0.06, 0.06] of headline.
    const wobble = (((seed + i * 41) % 13) / 13 - 0.5) * 0.12 * headline;
    const raw = start + (headline - start) * t + wobble;
    const v = Math.max(0, raw);
    out.push({ date: dayBefore(i), value: float ? Math.round(v * 100) / 100 : Math.round(v) });
  }
  // Pin the last point to the exact headline for a clean read.
  if (out.length) out[out.length - 1] = { date: dayBefore(0), value: float ? Math.round(headline * 100) / 100 : Math.round(headline) };
  return out;
}

function makeCard(args: {
  key: string;
  labelDefault: string;
  defDefault: string;
  value: number;
  unit: '€' | '%' | '';
  unitPosition?: 'prefix' | 'suffix';
  delta: number;
  float?: boolean;
}): MetricCard {
  const { key, value, unit, delta } = args;
  const trend30 = buildTrend(key, 30, value, args.float);
  const trend7 = trend30.slice(-7);
  return {
    key,
    value,
    unit,
    unitPosition: args.unitPosition ?? (unit === '€' ? 'prefix' : 'suffix'),
    labelKey: `owner_metric_${key}`,
    labelDefault: args.labelDefault,
    defKey: `owner_metric_${key}_def`,
    defDefault: args.defDefault,
    delta,
    trend30,
    trend7,
  };
}

/* -------------------------------------------------------------------------- */
/* Seeded business constants                                                   */
/* -------------------------------------------------------------------------- */

const TIER_PRICE = { pro: 39, practice: 29 } as const; // € / provider / month

/** Seeded subscription mix (excludes comp accounts, per plan 07 §4). */
const SEED_SUBS = { pro: 34, practice: 18 } as const;

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export const ownerMetricsService = {
  /**
   * Compute the full command-dashboard metric set. Async to mirror the real
   * service shape and to await the admin directory; returns instantly on mock.
   */
  async getMetrics(): Promise<OwnerMetrics> {
    // Real signal where available.
    const buffer = safeBuffer();
    const [clients, providers, conversations] = await Promise.all([
      adminService.listClients().catch(() => []),
      adminService.listProviders().catch(() => []),
      adminService.listConversations().catch(() => []),
    ]);

    const flagged = conversations.filter((c) => c.status === 'flagged').length;
    const riskClients = clients.filter((c) => c.riskFlag).length;
    const acceptingProviders = providers.filter((p) => p.acceptingNewClients).length;
    const regulatedProviders = providers.filter((p) => p.isRegulated).length;

    // ── Money & growth ──────────────────────────────────────────────────────
    const mrr = SEED_SUBS.pro * TIER_PRICE.pro + SEED_SUBS.practice * TIER_PRICE.practice;
    const arr = mrr * 12;
    const trialsActive = 23;
    const trialToPaid = 41; // %

    // WAU/MAU derive from real buffer distinct sessions, floored by a seed so the
    // widget never reads zero on a fresh load.
    const distinctSessions = new Set(buffer.map((r) => r.session_id)).size;
    const wauClient = Math.max(148, distinctSessions * 3);
    const wauProvider = Math.max(37, Math.round(distinctSessions * 0.8));

    const activationProvider = 68; // %
    const activationClient = 54; // %

    // ── North-star: weekly active care relationships ────────────────────────
    // A care relationship = a client with an assigned provider active in 7d.
    const seededRelationships = 126;
    const liveRelationships = clients.filter(
      (c) => c.assignedProviderName && c.status === 'active',
    ).length;
    const northStarValue = Math.max(seededRelationships, seededRelationships + liveRelationships);

    const cards: MetricCard[] = [
      makeCard({
        key: 'mrr',
        labelDefault: 'MRR',
        defDefault: 'Maandelijks terugkerende omzet uit actieve abonnementen, comp-accounts niet meegerekend',
        value: mrr,
        unit: '€',
        delta: 214,
        float: false,
      }),
      makeCard({
        key: 'arr',
        labelDefault: 'ARR',
        defDefault: 'Jaarlijkse terugkerende omzet, afgeleid van de huidige MRR maal twaalf',
        value: arr,
        unit: '€',
        delta: 2568,
      }),
      makeCard({
        key: 'trials',
        labelDefault: 'Actieve proefperiodes',
        defDefault: 'Hulpverleners in een lopende Pro-proefperiode, met conversie naar betaald van 41 procent',
        value: trialsActive,
        unit: '',
        delta: 4,
      }),
      makeCard({
        key: 'trial_conv',
        labelDefault: 'Proef naar betaald',
        defDefault: 'Aandeel proefperiodes dat de voorbije 30 dagen overging in een betaald abonnement',
        value: trialToPaid,
        unit: '%',
        delta: 3,
      }),
      makeCard({
        key: 'wau_client',
        labelDefault: 'WAU cliënten',
        defDefault: 'Unieke cliënten met minstens één gebeurtenis in de voorbije zeven dagen',
        value: wauClient,
        unit: '',
        delta: 9,
      }),
      makeCard({
        key: 'wau_provider',
        labelDefault: 'WAU hulpverleners',
        defDefault: 'Unieke hulpverleners actief in de voorbije zeven dagen',
        value: wauProvider,
        unit: '',
        delta: 2,
      }),
      makeCard({
        key: 'activation_provider',
        labelDefault: 'Activatie hulpverlener',
        defDefault: 'Aandeel nieuwe hulpverleners dat de activatiedrempel haalt, zoals gedefinieerd in plan 06',
        value: activationProvider,
        unit: '%',
        delta: 5,
      }),
      makeCard({
        key: 'activation_client',
        labelDefault: 'Activatie cliënt',
        defDefault: 'Aandeel nieuwe cliënten dat de eerste betekenisvolle actie voltooit',
        value: activationClient,
        unit: '%',
        delta: -2,
      }),
      makeCard({
        key: 'provider_supply',
        labelDefault: 'Beschikbare hulpverleners',
        defDefault: `Gepubliceerde profielen die nieuwe cliënten aannemen — ${regulatedProviders} erkend`,
        value: Math.max(acceptingProviders, 42),
        unit: '',
        delta: 3,
      }),
      makeCard({
        key: 'crisis',
        labelDefault: 'Crisis-escalaties (7d)',
        defDefault: 'Door Bond geactiveerde crisis-signalen deze week, waarvan open zaken rood kleuren',
        value: Math.max(flagged, 1),
        unit: '',
        delta: 0,
      }),
      makeCard({
        key: 'verification_depth',
        labelDefault: 'Verificatie in wachtrij',
        defDefault: 'Ingediende verificaties in afwachting, met de oudste zaak als bewakingssignaal',
        value: 6,
        unit: '',
        delta: -1,
      }),
      makeCard({
        key: 'llm_cost',
        labelDefault: 'Bond LLM-kost (maand)',
        defDefault: 'Geschatte modelkost deze maand, opgevolgd per DAU om de Free-tier gezond te houden',
        value: 486,
        unit: '€',
        delta: 38,
      }),
    ];

    // ── Bond engagement (the only mint widget) ──────────────────────────────
    const bondMsgs = buffer.filter((r) => r.event === 'bond_message_sent').length;
    const bondDau = Math.max(64, bondMsgs + 64);
    const bond = makeCard({
      key: 'bond_engagement',
      labelDefault: 'Bond DAU',
      defDefault: 'Dagelijks actieve Bond-gebruikers, met een 7-daagse retentie van 58 procent en gedeelde weeksamenvattingen bij 46 procent',
      value: bondDau,
      unit: '',
      delta: 7,
    });

    // ── Finder liquidity funnel ─────────────────────────────────────────────
    const searches = countEvent(buffer, 'finder_search', 620);
    const views = deriveStep(buffer, 'finder_profile_view', searches, 0.46);
    const requests = deriveStep(buffer, 'finder_request_sent', views, 0.31);
    const accepted = deriveStep(buffer, 'lead_accepted', requests, 0.64);

    const finder: FinderLiquidity = {
      windowKey: 'owner_finder_window',
      windowDefault: 'deze week',
      overallConv: pct(accepted, searches),
      steps: [
        { key: 'searches', labelKey: 'owner_funnel_searches', labelDefault: 'Zoekopdrachten', count: searches, convFromPrev: null },
        { key: 'views', labelKey: 'owner_funnel_views', labelDefault: 'Profielweergaves', count: views, convFromPrev: pct(views, searches) },
        { key: 'requests', labelKey: 'owner_funnel_requests', labelDefault: 'Aanvragen', count: requests, convFromPrev: pct(requests, views) },
        { key: 'accepted', labelKey: 'owner_funnel_accepted', labelDefault: 'Geaccepteerd', count: accepted, convFromPrev: pct(accepted, requests) },
      ],
    };

    // ── Daily ops strip ─────────────────────────────────────────────────────
    const openSafety = Math.max(flagged, riskClients > 1 ? 1 : 0);
    const ops: OpsCheck[] = [
      makeOps('safety', 'Open veiligheidszaken', openSafety, '/dashboard/admin/safety', 'open', 'open'),
      makeOps('verifications', 'Verificaties in wachtrij', 6, '/dashboard/admin/verification', 'in wachtrij', 'open'),
      makeOps('payments', 'Mislukte betalingen', 2, '/dashboard/admin/revenue', 'mislukt', 'open'),
      makeOps('gdpr', 'GDPR-deadline binnen 7 dagen', 1, '/dashboard/admin/support', 'dringend', 'open'),
      makeOps('jobs', 'Mislukte jobs (nacht)', 0, '/dashboard/admin/health', 'mislukt', 'ok'),
      makeOps('leads', 'Trage lead-respons (>48u)', 0, '/dashboard/admin/comms', 'traag', 'ok'),
    ];

    return {
      northStar: {
        value: northStarValue,
        delta: 8,
        trend30: buildTrend('north_star', 30, northStarValue),
        labelKey: 'owner_north_star',
        labelDefault: 'Wekelijks actieve zorgrelaties',
        defKey: 'owner_north_star_def',
        defDefault: 'Cliënten met een gekoppelde hulpverlener die deze week actief waren — de kern van het platform',
      },
      cards,
      bond,
      finder,
      ops,
      llmCostPerDay: 16,
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Local helpers                                                               */
/* -------------------------------------------------------------------------- */

function safeBuffer() {
  try {
    return analyticsService.getBuffer();
  } catch {
    return [];
  }
}

/** Count real occurrences of an event, floored by a seeded minimum. */
function countEvent(buffer: ReturnType<typeof safeBuffer>, event: string, seedFloor: number): number {
  const real = buffer.filter((r) => r.event === event).length;
  return Math.max(seedFloor, seedFloor + real);
}

/**
 * A funnel step count: real events if present, otherwise a deterministic
 * fraction of the previous step so the funnel always descends monotonically.
 */
function deriveStep(
  buffer: ReturnType<typeof safeBuffer>,
  event: string,
  prev: number,
  ratio: number,
): number {
  const real = buffer.filter((r) => r.event === event).length;
  const seeded = Math.round(prev * ratio);
  const v = Math.max(seeded, real);
  return Math.min(v, prev); // never exceed the previous step
}

/** Percentage a/b clamped to [0,100], rounded. */
function pct(a: number, b: number): number {
  if (!b) return 0;
  return Math.min(100, Math.round((a / b) * 100));
}

function makeOps(
  key: string,
  labelDefault: string,
  count: number,
  href: string,
  unitDefault: string,
  forceState?: 'ok',
): OpsCheck {
  return {
    key,
    labelKey: `owner_ops_${key}`,
    labelDefault,
    count,
    state: forceState === 'ok' && count === 0 ? 'ok' : count > 0 ? 'attention' : 'ok',
    href,
    unitKey: `owner_ops_${key}_unit`,
    unitDefault,
  };
}

export default ownerMetricsService;

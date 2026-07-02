/**
 * riskEngine.ts — transparent, rule-based caseload risk (ticket T-PX-6, plan §3).
 *
 * PURE and DETERMINISTIC. No ML, no network, no clock reads except the `asOf`
 * you pass in (defaults to now, but tests pass a fixed instant). Given a
 * client context bundle it returns a flat list of RiskFlags, each carrying the
 * VERBATIM evidence lines the "Waarom?" popover renders — transparency is the
 * feature (§3): a provider can always inspect why someone is flagged.
 *
 * WHY rule-based (plan Decision 4): explainable under GDPR, trustable, and an ML
 * model on zero real users is fiction. Output is always "attention suggested",
 * never an automated action and never a diagnosis. Copy never diagnoses
 * ("Signalen die aandacht verdienen", never "at risk of relapse").
 *
 * HARD RULE (plan risk 1 + analytics contract): this module reads clinical
 * signals but emits NOTHING to analytics. Callers must never forward a flag's
 * reason/evidence (which can reveal health state) into `analyticsService`. Feed
 * analytics structural counts only, elsewhere.
 *
 * Six rules, from plan §3:
 *   1. Bond signal        — crisis pattern hit / repeated low-mood intents.
 *   2. Check-in flag      — unacknowledged distress check-in > 24h.
 *   3. Session pattern    — consecutive cancels/no-shows or long booking gap.
 *   4. Alliance slide     — allianceRating drop ≥2, or two consecutive ≤2.
 *   5. Homework collapse  — task completion collapses from a higher baseline.
 *   6. Silence            — no activity for 14 days between sessions.
 *
 * Each rule is a pure `(ctx, asOf) => RiskFlag | null`. `computeRisk` runs them
 * all and returns the flags, highest severity first. This is the spine both the
 * ClientPrepCard dot and the /clients "Aandacht" filter read; ActionInbox can
 * consume it later.
 */

// ── Public levels ────────────────────────────────────────────────────────────

/**
 * Severity, low → high. Plan §3 uses watch|attend|urgent internally; the ticket
 * surface asks for info|warning|urgent. We expose BOTH: `level` is the ticket's
 * three-way for badge tinting, `severity` is the plan's finer label for copy.
 */
export type RiskLevel = 'info' | 'warning' | 'urgent';
export type RiskSeverity = 'watch' | 'attend' | 'urgent';

export type RiskRuleType =
  | 'bond_signal'
  | 'checkin_flag'
  | 'session_pattern'
  | 'alliance_slide'
  | 'homework_collapse'
  | 'silence';

/** A single, transparent risk finding. */
export interface RiskFlag {
  type: RiskRuleType;
  level: RiskLevel;
  severity: RiskSeverity;
  /** One-line, non-diagnostic summary (NL). */
  reason: string;
  /** Verbatim lines the "Waarom?" popover renders (NL). Never diagnostic. */
  evidence: string[];
  /** ISO date the signal began, when known. */
  since?: string;
}

// ── Input bundle ─────────────────────────────────────────────────────────────

/** A Bond distress/crisis observation (client-side detection, mirrored to us). */
export interface BondSignal {
  /** 'crisis' = a self-harm/crisis pattern hit; 'low_mood' = distress-adjacent. */
  kind: 'crisis' | 'low_mood';
  at: string; // ISO
}

/** A between-session check-in. */
export interface CheckinSignal {
  /** True when the client flagged distress. */
  distress: boolean;
  /** True once the provider has acknowledged it. */
  acknowledged: boolean;
  at: string; // ISO
}

/** A past session outcome, oldest → newest is not required (we sort). */
export interface SessionOutcome {
  date: string; // ISO date
  status: 'completed' | 'cancelled' | 'no_show' | 'confirmed' | 'pending';
  /** For a client on a weekly cadence, used by the booking-gap rule. */
  cadenceDays?: number;
}

/** One alliance micro-check rating (1–5), from session_feedback. */
export interface AllianceRating {
  rating: number; // 1..5
  date: string; // ISO
}

/** Weekly task-completion ratio (0..1) for the homework-collapse rule. */
export interface HomeworkWeek {
  weekStart: string; // ISO date
  completedRatio: number; // 0..1
}

/** The full per-client context the engine reasons over. Everything optional. */
export interface ClientRiskContext {
  clientId: string;
  clientName?: string;
  bondSignals?: BondSignal[];
  checkins?: CheckinSignal[];
  sessions?: SessionOutcome[];
  alliance?: AllianceRating[];
  homeworkWeeks?: HomeworkWeek[];
  /** ISO of the last ANY activity (message/journal/Bond/task) between sessions. */
  lastActivityAt?: string;
  /** ISO of the last booked-or-held session (silence rule reference point). */
  lastSessionAt?: string;
  /** ISO of the next booked session, if any (session-pattern gap rule). */
  nextSessionAt?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const toMs = (iso: string): number => new Date(iso).getTime();
const daysBetween = (a: number, b: number): number => Math.floor(Math.abs(a - b) / DAY_MS);
const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' });

/** severity → level mapping (plan watch/attend/urgent → ticket info/warning/urgent). */
const LEVEL: Record<RiskSeverity, RiskLevel> = {
  watch: 'info',
  attend: 'warning',
  urgent: 'urgent',
};

const flag = (
  type: RiskRuleType,
  severity: RiskSeverity,
  reason: string,
  evidence: string[],
  since?: string,
): RiskFlag => ({ type, severity, level: LEVEL[severity], reason, evidence, since });

// ── Rules ────────────────────────────────────────────────────────────────────

/** 1. Bond signal — crisis pattern → urgent; ≥3 low-mood intents in 7 days → watch. */
function ruleBondSignal(ctx: ClientRiskContext, asOf: number): RiskFlag | null {
  const signals = ctx.bondSignals ?? [];
  const crisis = signals.filter((s) => s.kind === 'crisis').sort((a, b) => toMs(b.at) - toMs(a.at));
  if (crisis.length > 0) {
    const at = crisis[0].at;
    return flag(
      'bond_signal',
      'urgent',
      'Crisissignaal in Bond',
      [`Bond ving een crisissignaal op op ${fmtDate(at)}.`],
      at,
    );
  }
  const recentLow = signals
    .filter((s) => s.kind === 'low_mood' && daysBetween(asOf, toMs(s.at)) <= 7)
    .sort((a, b) => toMs(a.at) - toMs(b.at));
  if (recentLow.length >= 3) {
    return flag(
      'bond_signal',
      'watch',
      'Herhaalde neerslachtigheid in Bond',
      [`${recentLow.length} keer een sombere toon in Bond deze week, voor het eerst op ${fmtDate(recentLow[0].at)}.`],
      recentLow[0].at,
    );
  }
  return null;
}

/** 2. Check-in flag — unacknowledged distress check-in older than 24h → urgent. */
function ruleCheckin(ctx: ClientRiskContext, asOf: number): RiskFlag | null {
  const stale = (ctx.checkins ?? [])
    .filter((c) => c.distress && !c.acknowledged && asOf - toMs(c.at) > DAY_MS)
    .sort((a, b) => toMs(a.at) - toMs(b.at));
  if (stale.length === 0) return null;
  const oldest = stale[0];
  const hours = Math.floor((asOf - toMs(oldest.at)) / (60 * 60 * 1000));
  return flag(
    'checkin_flag',
    'urgent',
    'Check-in met spanning nog niet opgevolgd',
    [`Een check-in met een signaal van spanning staat al ${hours} u open, sinds ${fmtDate(oldest.at)}.`],
    oldest.at,
  );
}

/** 3. Session pattern — 2 consecutive cancels/no-shows, or a 21+ day booking gap. */
function ruleSessionPattern(ctx: ClientRiskContext, asOf: number): RiskFlag | null {
  const sessions = [...(ctx.sessions ?? [])].sort((a, b) => toMs(a.date) - toMs(b.date));

  // (a) two consecutive cancels/no-shows among the most recent sessions.
  const tail = sessions.slice(-2);
  if (
    tail.length === 2 &&
    tail.every((s) => s.status === 'cancelled' || s.status === 'no_show')
  ) {
    const labels = tail.map(
      (s) => `${s.status === 'no_show' ? 'Niet gekomen' : 'Geannuleerd'} op ${fmtDate(s.date)}`,
    );
    return flag('session_pattern', 'attend', 'Twee afspraken na elkaar niet doorgegaan', labels, tail[0].date);
  }

  // (b) nothing booked for 21+ days for a weekly-cadence client.
  const last = ctx.lastSessionAt ?? (sessions.length ? sessions[sessions.length - 1].date : undefined);
  if (last && !ctx.nextSessionAt) {
    const gap = daysBetween(asOf, toMs(last));
    const cadence = sessions.find((s) => s.cadenceDays)?.cadenceDays ?? 7;
    if (cadence <= 7 && gap >= 21) {
      return flag(
        'session_pattern',
        'attend',
        'Al een tijd geen afspraak meer',
        [`Laatste sessie op ${fmtDate(last)} — ${gap} dagen geleden, en niets nieuws ingepland.`],
        last,
      );
    }
  }
  return null;
}

/** 4. Alliance slide — a drop ≥2 points, or two consecutive ratings ≤2. */
function ruleAlliance(ctx: ClientRiskContext): RiskFlag | null {
  const ratings = [...(ctx.alliance ?? [])].sort((a, b) => toMs(a.date) - toMs(b.date));
  if (ratings.length < 2) return null;

  // Two consecutive ≤2.
  const lastTwo = ratings.slice(-2);
  if (lastTwo.every((r) => r.rating <= 2)) {
    return flag(
      'alliance_slide',
      'attend',
      'Alliantiescore blijft laag',
      [`Twee keer op rij een lage score: ${lastTwo[0].rating} op ${fmtDate(lastTwo[0].date)} en ${lastTwo[1].rating} op ${fmtDate(lastTwo[1].date)}.`],
      lastTwo[0].date,
    );
  }

  // Any drop of ≥2 between consecutive ratings.
  for (let i = 1; i < ratings.length; i += 1) {
    const drop = ratings[i - 1].rating - ratings[i].rating;
    if (drop >= 2) {
      return flag(
        'alliance_slide',
        'attend',
        'Alliantiescore zakte scherp',
        [`Alliantiescore zakte van ${ratings[i - 1].rating} naar ${ratings[i].rating} op ${fmtDate(ratings[i].date)}.`],
        ratings[i].date,
      );
    }
  }
  return null;
}

/** 5. Homework collapse — completion <25% over the last 3 weeks after a higher baseline. */
function ruleHomework(ctx: ClientRiskContext): RiskFlag | null {
  const weeks = [...(ctx.homeworkWeeks ?? [])].sort((a, b) => toMs(a.weekStart) - toMs(b.weekStart));
  if (weeks.length < 4) return null; // need a baseline + a recent window

  const recent = weeks.slice(-3);
  const baseline = weeks.slice(0, weeks.length - 3);
  const recentAvg = recent.reduce((s, w) => s + w.completedRatio, 0) / recent.length;
  const baselineAvg = baseline.reduce((s, w) => s + w.completedRatio, 0) / baseline.length;

  if (recentAvg < 0.25 && baselineAvg >= 0.5) {
    return flag(
      'homework_collapse',
      'watch',
      'Huiswerk wordt nauwelijks nog afgerond',
      [`Afronding zakte van ${Math.round(baselineAvg * 100)}% naar ${Math.round(recentAvg * 100)}% in de laatste drie weken.`],
      recent[0].weekStart,
    );
  }
  return null;
}

/** 6. Silence — no message/journal/Bond/task activity for 14+ days between sessions. */
function ruleSilence(ctx: ClientRiskContext, asOf: number): RiskFlag | null {
  if (!ctx.lastActivityAt) return null;
  const gap = daysBetween(asOf, toMs(ctx.lastActivityAt));
  if (gap >= 14) {
    return flag(
      'silence',
      'watch',
      'Al even helemaal stil',
      [`Geen berichtje, dagboek of Bond-activiteit sinds ${fmtDate(ctx.lastActivityAt)} — ${gap} dagen.`],
      ctx.lastActivityAt,
    );
  }
  return null;
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<RiskSeverity, number> = { urgent: 0, attend: 1, watch: 2 };

/** The full ordered rule list — exported so tests can target a single rule. */
export const RISK_RULES = [
  ruleBondSignal,
  ruleCheckin,
  ruleSessionPattern,
  ruleAlliance,
  ruleHomework,
  ruleSilence,
] as const;

/**
 * Compute all risk flags for one client, highest severity first.
 *
 * @param ctx  The client context bundle (all fields optional; absent → no flag).
 * @param asOf Optional evaluation instant (ISO or ms). Defaults to now. Pass a
 *             fixed value in tests for determinism.
 */
export function computeRisk(ctx: ClientRiskContext, asOf?: string | number): RiskFlag[] {
  const now =
    asOf === undefined ? Date.now() : typeof asOf === 'number' ? asOf : toMs(asOf);

  const flags: RiskFlag[] = [];
  // Rules that need `asOf` vs. those that don't — call each with what it needs.
  const withClock: Array<(c: ClientRiskContext, n: number) => RiskFlag | null> = [
    ruleBondSignal,
    ruleCheckin,
    ruleSessionPattern,
    ruleSilence,
  ];
  const withoutClock: Array<(c: ClientRiskContext) => RiskFlag | null> = [
    ruleAlliance,
    ruleHomework,
  ];

  for (const rule of withClock) {
    const f = rule(ctx, now);
    if (f) flags.push(f);
  }
  for (const rule of withoutClock) {
    const f = rule(ctx);
    if (f) flags.push(f);
  }

  return flags.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/** The single highest-severity flag, or null. Drives the prep-card dot. */
export function topRisk(ctx: ClientRiskContext, asOf?: string | number): RiskFlag | null {
  const flags = computeRisk(ctx, asOf);
  return flags.length ? flags[0] : null;
}

/** Convenience: the level to tint a client's severity dot with, or null. */
export function riskDotLevel(ctx: ClientRiskContext, asOf?: string | number): RiskLevel | null {
  return topRisk(ctx, asOf)?.level ?? null;
}

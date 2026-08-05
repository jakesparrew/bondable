/**
 * checkinService.ts — the single source of truth for client check-ins.
 *
 * Before this module a check-in vanished into `localStorage` inside a component
 * and changed nothing. Everything now reads from here, so ONE check-in echoes in
 * four places:
 *
 *   1. the client dashboard reorders around it (support first on a heavy day,
 *      the zorgplan first on a good one),
 *   2. Bond opens with continuity ("Gisteren zat je op 2 op 5. Hoe voelt vandaag?"),
 *   3. a dip gently suggests ONE Bronnen-article (dismissible, never diagnostic),
 *   4. `getProviderVisibleSummary()` exposes a consent-gated, content-free
 *      summary the provider side can consume later.
 *
 * DESIGN CONTRACT — this is a mental-health surface:
 *   • NO streaks, NO "X dagen op rij", NO loss framing, NO fire emoji.
 *     `getStreakFreeContinuity()` is named for exactly that reason: it reports
 *     presence, never a chain you can break. A gap is data, not a failure.
 *   • Nothing here is diagnostic. A low mood surfaces support and an article,
 *     never a label.
 *   • Analytics NEVER receives the mood value, the tags, or the note text —
 *     only structural facts (a check-in happened, how many tags).
 *
 * ░░░ SWAP POINT ░░░
 * Mock/localStorage-backed to match the rest of demo mode. When the real backend
 * lands, keep this module's exported shape and replace the read/write helpers
 * with network calls; every caller stays untouched.
 */

import { useMemo, useSyncExternalStore } from "react";

import { consentService, type ConsentArtifactType } from "@/services/api/consentService";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

/** Mood is a 1–5 scale matching the check-in dots (1 = zwaar … 5 = sterk). */
export type CheckinMood = 1 | 2 | 3 | 4 | 5;

export interface CheckIn {
  id: string;
  /** 1–5. Stays local; never sent to analytics. */
  mood: CheckinMood;
  /** Theme ids chosen (max 3): slaap, energie, stress, contact, piekeren… */
  tags: string[];
  /** Optional single sentence. Stays local; never sent to analytics. */
  note: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface CheckinInput {
  mood: number;
  tags?: string[];
  note?: string;
}

/** One day in the trend window. `mood` is null on a day without a check-in. */
export interface CheckinTrendDay {
  /** Start-of-day epoch, stable key. */
  dayKey: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  mood: number | null;
  tags: string[];
  isToday: boolean;
}

/**
 * Presence over a window, WITHOUT any streak mechanic. We report how many days
 * carried a check-in and when the last one was — never a consecutive count, and
 * never a "broken" state.
 */
export interface CheckinContinuity {
  windowDays: number;
  /** Number of distinct days in the window with at least one check-in. */
  daysPresent: number;
  /** ISO timestamp of the most recent check-in, or null. */
  lastCheckinAt: string | null;
  /** Whole days since the last check-in (0 = today), or null when there is none. */
  daysSinceLast: number | null;
  /** True when the client is coming back after 3+ quiet days — welcome, not scold. */
  returningAfterQuiet: boolean;
}

/** The coarse read the UI branches on. Deliberately blunt — no diagnosis. */
export type CheckinSignal = "low" | "steady" | "bright" | "quiet";

export type CheckinDirection = "softening" | "steady" | "lifting" | "unknown";

export interface CheckinInsight {
  signal: CheckinSignal;
  direction: CheckinDirection;
  /** The most recent check-in, if any. */
  latest: CheckIn | null;
  /** The check-in before the latest (used for "gisteren zat je op…"). */
  previous: CheckIn | null;
  /** Mean mood over the trend window, rounded to 1 decimal. Null when empty. */
  averageMood: number | null;
  /** Tags seen most often in the window, most frequent first (max 3). */
  topTags: string[];
  continuity: CheckinContinuity;
}

/**
 * The ONLY shape the provider side may consume. Consent-gated and content-free:
 * no note text, no per-day moods, no raw records. A direction and a couple of
 * themes — enough to prepare a session, not enough to surveil.
 */
export interface ProviderVisibleSummary {
  /** False when the client has not granted the weekly-summary artifact. */
  consentGranted: boolean;
  artifactType: ConsentArtifactType;
  windowDays: number;
  /** Number of days with a check-in. Never a streak. */
  daysPresent: number;
  /** Rounded mean, 1 decimal. Null when there is nothing to summarise. */
  averageMood: number | null;
  direction: CheckinDirection;
  /** Up to three theme ids. Never free text. */
  topTags: string[];
  /** Structural only: did the client write anything? Not WHAT they wrote. */
  hasNotes: boolean;
  generatedAt: string;
}

/** A single, gentle reading suggestion. Never diagnostic, always dismissible. */
export interface ResourceSuggestion {
  resourceId: string;
  /** Why we picked it, in the client's own terms. One calm sentence, NL. */
  reasonKey: string;
  reasonDefault: string;
  /** The tag that drove the pick, if any (used for dismissal bookkeeping). */
  tag: string | null;
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

/** Kept from the original in-component store so existing demo data survives. */
export const CHECKINS_STORAGE_KEY = "bondable_bond_checkins";
const SEED_MARKER_KEY = "bondable_checkins_seeded_v1";
const DISMISSED_KEY = "bondable_checkin_resource_dismissed";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RECORDS = 120;
const hasWindow = typeof window !== "undefined";

const TREND_WINDOW = 7;
const CONTINUITY_WINDOW = 14;

function startOfDay(value: Date | number | string): number {
  const d = value instanceof Date ? value : new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isoDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function clampMood(value: number): CheckinMood {
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as CheckinMood;
}

function uid(): string {
  return `chk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readRaw(): CheckIn[] {
  if (!hasWindow) return [];
  try {
    const raw = window.localStorage.getItem(CHECKINS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Tolerate the pre-service record shape (no id) so nothing is lost.
    return parsed
      .filter((r): r is Partial<CheckIn> => !!r && typeof r === "object")
      .map((r) => ({
        id: typeof r.id === "string" && r.id ? r.id : uid(),
        mood: clampMood(Number(r.mood) || 3),
        tags: Array.isArray(r.tags) ? r.tags.filter((x): x is string => typeof x === "string") : [],
        note: typeof r.note === "string" ? r.note : "",
        createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
      }))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  } catch {
    return [];
  }
}

function writeRaw(records: CheckIn[]): void {
  if (!hasWindow) return;
  try {
    const capped =
      records.length > MAX_RECORDS ? records.slice(records.length - MAX_RECORDS) : records;
    window.localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(capped));
  } catch {
    /* silent-fail (quota / private mode) */
  }
}

/* -------------------------------------------------------------------------- */
/* Seed — so ribbons, trends and Bond's memory are never empty in demo mode    */
/* -------------------------------------------------------------------------- */

/**
 * Roughly ten days of plausible history for the demo client (Lotte Vermeulen).
 * Deliberately imperfect: two quiet days with no entry at all, a heavy stretch
 * mid-week, and a gentle lift toward the present. Today is left OPEN so the
 * check-in affordance still has a reason to exist on first load.
 *
 * The seed runs once (marker key). Once a client has cleared their history it
 * stays cleared — we never resurrect data behind their back.
 */
const SEED_DAYS: Array<{ ago: number; mood: CheckinMood; tags: string[]; note: string }> = [
  { ago: 1, mood: 2, tags: ["slaap", "piekeren"], note: "Weer laat wakker gelegen." },
  { ago: 2, mood: 2, tags: ["stress", "werk-school"], note: "" },
  { ago: 3, mood: 3, tags: ["energie"], note: "Middag ging beter dan de ochtend." },
  { ago: 4, mood: 1, tags: ["piekeren", "slaap", "stress"], note: "Zware dag, weinig gedaan." },
  { ago: 5, mood: 2, tags: ["contact"], note: "" },
  // day 6 quiet on purpose — a gap costs nothing
  { ago: 7, mood: 3, tags: ["rust"], note: "Gewandeld na het eten." },
  { ago: 8, mood: 4, tags: ["contact", "rust"], note: "Koffie met An gedaan." },
  // day 9 quiet on purpose
  { ago: 10, mood: 3, tags: ["slaap"], note: "" },
  { ago: 11, mood: 3, tags: ["werk-school", "energie"], note: "" },
];

function buildSeed(): CheckIn[] {
  const today = startOfDay(new Date());
  return SEED_DAYS.map(({ ago, mood, tags, note }) => {
    // Land each entry in a believable evening slot rather than at midnight.
    const at = today - ago * DAY_MS + (19 + (ago % 3)) * 60 * 60 * 1000;
    return {
      id: `chk_seed_${ago}`,
      mood,
      tags,
      note,
      createdAt: new Date(at).toISOString(),
    };
  }).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function ensureSeeded(): CheckIn[] {
  const existing = readRaw();
  if (!hasWindow) return existing;
  if (existing.length > 0) return existing;
  try {
    if (window.localStorage.getItem(SEED_MARKER_KEY)) return existing;
    const seeded = buildSeed();
    writeRaw(seeded);
    window.localStorage.setItem(SEED_MARKER_KEY, new Date().toISOString());
    return seeded;
  } catch {
    return existing;
  }
}

/* -------------------------------------------------------------------------- */
/* Change notification — so every echo refreshes at once                       */
/* -------------------------------------------------------------------------- */

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * A monotonic version counter. Derived reads (`getInsight`, `getTrend`) build a
 * fresh object each call, so React subscribers watch this scalar instead and
 * recompute in a `useMemo` — see `useCheckins` at the bottom of this file.
 */
let version = 0;

function emit(): void {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* a broken listener must never break a save */
    }
  });
}

function subscribeToCheckins(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getCheckinsVersion(): number {
  return version;
}

/* -------------------------------------------------------------------------- */
/* Derivations                                                                 */
/* -------------------------------------------------------------------------- */

function bucketByDay(records: CheckIn[]): Map<number, CheckIn[]> {
  const map = new Map<number, CheckIn[]>();
  for (const record of records) {
    const key = startOfDay(record.createdAt);
    const bucket = map.get(key);
    if (bucket) bucket.push(record);
    else map.set(key, [record]);
  }
  return map;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Math.round((total / values.length) * 10) / 10;
}

function deriveDirection(days: CheckinTrendDay[]): CheckinDirection {
  const filled = days.filter((d) => d.mood != null);
  if (filled.length < 3) return "unknown";
  const half = Math.floor(filled.length / 2);
  const earlier = mean(filled.slice(0, half).map((d) => d.mood as number));
  const later = mean(filled.slice(half).map((d) => d.mood as number));
  if (earlier == null || later == null) return "unknown";
  const delta = later - earlier;
  if (delta >= 0.5) return "lifting";
  if (delta <= -0.5) return "softening";
  return "steady";
}

function deriveTopTags(records: CheckIn[], max = 3): string[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const tag of record.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([tag]) => tag);
}

/* -------------------------------------------------------------------------- */
/* Resource mapping — ONE gentle suggestion, mapped to the seeded Bronnen ids   */
/* -------------------------------------------------------------------------- */

/**
 * Tag → article. These ids exist in `resourceService`'s seed. The mapping is
 * plain psychoeducation matching, never a diagnosis and never a prescription:
 * the copy always frames it as "misschien iets voor je", dismissible in one tap.
 */
const TAG_TO_RESOURCE: Record<string, { id: string; reasonKey: string; reason: string }> = {
  slaap: {
    id: "res-slaaphygiene",
    reasonKey: "checkin_res_reason_slaap",
    reason: "Je noteerde slaap. Dit stuk gaat over ritme vinden, in je eigen tempo.",
  },
  piekeren: {
    id: "res-piekercirkel",
    reasonKey: "checkin_res_reason_piekeren",
    reason: "Je noteerde piekeren. Dit stuk legt uit waarom gedachten blijven draaien.",
  },
  stress: {
    id: "res-ademhaling",
    reasonKey: "checkin_res_reason_stress",
    reason: "Je noteerde stress. Een korte ademoefening die je overal kunt doen.",
  },
  lichaam: {
    id: "res-stress-lichaam",
    reasonKey: "checkin_res_reason_lichaam",
    reason: "Je noteerde je lichaam. Dit stuk gaat over wat spanning lijfelijk doet.",
  },
  contact: {
    id: "res-grenzen",
    reasonKey: "checkin_res_reason_contact",
    reason: "Je noteerde contact. Dit stuk gaat over grenzen aangeven zonder ruzie.",
  },
  energie: {
    id: "res-energie",
    reasonKey: "checkin_res_reason_energie",
    reason: "Je noteerde energie. Dit stuk gaat over verdelen in plaats van doorduwen.",
  },
  "werk-school": {
    id: "res-energie",
    reasonKey: "checkin_res_reason_werk",
    reason: "Je noteerde werk of school. Dit stuk gaat over je energie verdelen.",
  },
  rust: {
    id: "res-zelfcompassie",
    reasonKey: "checkin_res_reason_rust",
    reason: "Je noteerde rust. Dit stuk gaat over milder zijn voor jezelf.",
  },
};

const FALLBACK_SUGGESTION: ResourceSuggestion = {
  resourceId: "res-zelfcompassie",
  reasonKey: "checkin_res_reason_default",
  reasonDefault: "Na een zwaardere dag lezen sommige mensen dit graag. Geheel vrijblijvend.",
  tag: null,
};

function readDismissed(): string[] {
  if (!hasWindow) return [];
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export const checkinService = {
  /** Persist a check-in. Returns the stored record. */
  save(input: CheckinInput): CheckIn {
    const record: CheckIn = {
      id: uid(),
      mood: clampMood(input.mood),
      tags: (input.tags ?? []).slice(0, 3),
      note: (input.note ?? "").trim(),
      createdAt: new Date().toISOString(),
    };
    writeRaw([...ensureSeeded(), record]);
    emit();
    return record;
  },

  /** The n most recent check-ins, NEWEST FIRST. */
  listRecent(n = 10): CheckIn[] {
    const all = ensureSeeded();
    return [...all].reverse().slice(0, Math.max(0, n));
  },

  /** Every stored check-in, oldest → newest. */
  listAll(): CheckIn[] {
    return ensureSeeded();
  },

  /** Today's most recent check-in, or null. Drives "already checked in" states. */
  getToday(): CheckIn | null {
    const today = startOfDay(new Date());
    const all = ensureSeeded();
    for (let i = all.length - 1; i >= 0; i -= 1) {
      if (startOfDay(all[i].createdAt) === today) return all[i];
    }
    return null;
  },

  /**
   * The last `days` calendar days, oldest → newest, ending today. Days without a
   * check-in are present with `mood: null` — a gap is rendered, never hidden and
   * never marked as a miss.
   */
  getTrend(days = TREND_WINDOW): CheckinTrendDay[] {
    const all = ensureSeeded();
    const buckets = bucketByDay(all);
    const today = startOfDay(new Date());
    const out: CheckinTrendDay[] = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const dayKey = today - offset * DAY_MS;
      const entries = buckets.get(dayKey) ?? [];
      // Multiple check-ins in one day: show the day's best, so the ribbon never
      // punishes someone for checking in again while they felt worse.
      const mood =
        entries.length > 0 ? entries.reduce((best, e) => Math.max(best, e.mood), 0) : null;
      out.push({
        dayKey,
        date: isoDate(dayKey),
        mood,
        tags: [...new Set(entries.flatMap((e) => e.tags))],
        isToday: dayKey === today,
      });
    }
    return out;
  },

  /**
   * Presence over a window — explicitly NOT a streak. No consecutive counting,
   * no chain to break, no guilt. `returningAfterQuiet` exists so the UI can say
   * "fijn dat je er weer bent", never "je hebt 4 dagen gemist".
   */
  getStreakFreeContinuity(windowDays = CONTINUITY_WINDOW): CheckinContinuity {
    const all = ensureSeeded();
    const today = startOfDay(new Date());
    const from = today - (windowDays - 1) * DAY_MS;
    const inWindow = all.filter((r) => startOfDay(r.createdAt) >= from);
    const daysPresent = new Set(inWindow.map((r) => startOfDay(r.createdAt))).size;
    const latest = all[all.length - 1] ?? null;
    const daysSinceLast = latest
      ? Math.round((today - startOfDay(latest.createdAt)) / DAY_MS)
      : null;
    return {
      windowDays,
      daysPresent,
      lastCheckinAt: latest?.createdAt ?? null,
      daysSinceLast,
      returningAfterQuiet: daysSinceLast != null && daysSinceLast >= 3,
    };
  },

  /**
   * The derived read everything branches on: signal, direction, latest/previous
   * records, average and top themes. One call, so the dashboard, Bond and the
   * ribbon can never disagree about how the week went.
   */
  getInsight(windowDays = TREND_WINDOW): CheckinInsight {
    const all = ensureSeeded();
    const recent = this.listRecent(2);
    const latest = recent[0] ?? null;
    const previous = recent[1] ?? null;
    const trend = this.getTrend(windowDays);
    const continuity = this.getStreakFreeContinuity();

    const today = startOfDay(new Date());
    const inWindow = all.filter(
      (r) => startOfDay(r.createdAt) >= today - (windowDays - 1) * DAY_MS,
    );

    let signal: CheckinSignal = "quiet";
    if (latest && continuity.daysSinceLast != null && continuity.daysSinceLast <= 2) {
      if (latest.mood <= 2) signal = "low";
      else if (latest.mood >= 4) signal = "bright";
      else signal = "steady";
    }

    return {
      signal,
      direction: deriveDirection(trend),
      latest,
      previous,
      averageMood: mean(inWindow.map((r) => r.mood)),
      topTags: deriveTopTags(inWindow),
      continuity,
    };
  },

  /**
   * ONE reading suggestion for a heavier day, or null. Returns null when the
   * signal is not low, when the pick was already dismissed, or when there is
   * nothing recent to go on — silence is the default, not a nudge.
   */
  getResourceSuggestion(): ResourceSuggestion | null {
    const insight = this.getInsight();
    if (insight.signal !== "low" || !insight.latest) return null;

    const dismissed = new Set(readDismissed());
    for (const tag of insight.latest.tags) {
      const mapped = TAG_TO_RESOURCE[tag];
      if (mapped && !dismissed.has(mapped.id)) {
        return {
          resourceId: mapped.id,
          reasonKey: mapped.reasonKey,
          reasonDefault: mapped.reason,
          tag,
        };
      }
    }
    if (dismissed.has(FALLBACK_SUGGESTION.resourceId)) return null;
    return FALLBACK_SUGGESTION;
  },

  /** Remember that a suggestion was waved away, so it never returns uninvited. */
  dismissResourceSuggestion(resourceId: string): void {
    if (!hasWindow) return;
    try {
      const next = [...new Set([...readDismissed(), resourceId])];
      window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      /* silent-fail */
    }
    emit();
  },

  /**
   * The consent-gated summary the PROVIDER side may read. Returns
   * `consentGranted: false` with everything nulled when the client has not
   * granted the weekly-summary artifact — the caller renders "niet gedeeld",
   * it never receives content it may not see.
   *
   * Note what is absent by design: no note text, no per-day values, no records.
   */
  getProviderVisibleSummary(windowDays = TREND_WINDOW): ProviderVisibleSummary {
    const artifactType: ConsentArtifactType = "weekly_summary";
    const generatedAt = new Date().toISOString();

    let granted = false;
    try {
      granted = consentService
        .listGrants()
        .some((g) => g.artifactType === artifactType && g.status === "granted");
    } catch {
      granted = false;
    }

    if (!granted) {
      return {
        consentGranted: false,
        artifactType,
        windowDays,
        daysPresent: 0,
        averageMood: null,
        direction: "unknown",
        topTags: [],
        hasNotes: false,
        generatedAt,
      };
    }

    const insight = this.getInsight(windowDays);
    const today = startOfDay(new Date());
    const inWindow = ensureSeeded().filter(
      (r) => startOfDay(r.createdAt) >= today - (windowDays - 1) * DAY_MS,
    );

    return {
      consentGranted: true,
      artifactType,
      windowDays,
      daysPresent: new Set(inWindow.map((r) => startOfDay(r.createdAt))).size,
      averageMood: insight.averageMood,
      direction: insight.direction,
      topTags: insight.topTags,
      hasNotes: inWindow.some((r) => r.note.length > 0),
      generatedAt,
    };
  },

  /** Subscribe to writes. Returns an unsubscribe function. */
  subscribe: subscribeToCheckins,

  /** Monotonic version, bumped on every write. Cheap React snapshot. */
  getVersion: getCheckinsVersion,

  /** Wipe the client's check-in history (and stop the seed coming back). */
  clearAll(): void {
    if (!hasWindow) return;
    try {
      window.localStorage.removeItem(CHECKINS_STORAGE_KEY);
      window.localStorage.setItem(SEED_MARKER_KEY, new Date().toISOString());
    } catch {
      /* silent-fail */
    }
    emit();
  },
};

/* -------------------------------------------------------------------------- */
/* React binding                                                               */
/* -------------------------------------------------------------------------- */

export interface UseCheckinsResult {
  insight: CheckinInsight;
  trend: CheckinTrendDay[];
  today: CheckIn | null;
  suggestion: ResourceSuggestion | null;
  save: (input: CheckinInput) => CheckIn;
  dismissSuggestion: (resourceId: string) => void;
}

/**
 * The one hook every check-in echo uses. Subscribing to a scalar version keeps
 * the derived objects referentially stable between writes, so the dashboard,
 * Bond and the ribbon all re-read together the moment a check-in lands — that
 * shared refresh IS the consequence the client feels.
 */
export function useCheckins(trendDays = TREND_WINDOW): UseCheckinsResult {
  const currentVersion = useSyncExternalStore(
    subscribeToCheckins,
    getCheckinsVersion,
    getCheckinsVersion,
  );

  return useMemo(
    () => ({
      insight: checkinService.getInsight(),
      trend: checkinService.getTrend(trendDays),
      today: checkinService.getToday(),
      suggestion: checkinService.getResourceSuggestion(),
      save: (input: CheckinInput) => checkinService.save(input),
      dismissSuggestion: (resourceId: string) =>
        checkinService.dismissResourceSuggestion(resourceId),
    }),
    // `currentVersion` is the invalidation key: every write bumps it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentVersion, trendDays],
  );
}

export default checkinService;

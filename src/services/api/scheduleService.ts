/**
 * scheduleService.ts — mock (localStorage) scheduling engine for the provider
 * side (tickets T-PX-11 recurrence, T-PX-12 availability, T-PX-13 waitlist).
 *
 * This is the data spine behind three provider surfaces:
 *   1. WeeklyTimetable  — availability_rules (weekly recurring blocks) +
 *      availability_exceptions (verlof/closures & extra hours).
 *   2. Create-session dialog — session_series recurrence (an RFC5545 subset:
 *      wekelijks/tweewekelijks with count OR until) via RecurrenceFields.
 *   3. WaitlistPanel — waitlist_entries with a preference shape the "stel moment
 *      voor" flow reads to match a free slot to a waiting client.
 *
 * MOCK: everything persists to localStorage, namespaced by providerId, so the
 * explorable demo works with no backend. When the real DB lands (schema owned by
 * the parent — availability_rules / availability_exceptions / session_series /
 * waitlist_entries per plan §5), it swaps behind these same signatures.
 *
 * NO HEALTH DATA travels through analytics here. The only event this module's
 * callers may emit is `session_created` (with `is_recurring`), which is already
 * registered in @/config/analyticsEvents — we never invent event names.
 *
 * Belgium note: times are local wall-clock "HH:mm" strings; dates are ISO
 * "yyyy-MM-dd". Weekday is 1..7 (Mon..Sun) to match date-fns ISO weekday and the
 * NL day ordering the UI paints.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

/** ISO weekday: 1 = maandag … 7 = zondag. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type SessionFormat = "in_person" | "online" | "both";

/** A weekly recurring block of availability (paint-grid cell run). */
export interface AvailabilityRule {
  id: string;
  providerId: string;
  weekday: Weekday;
  /** Inclusive block start, "HH:mm". */
  startTime: string;
  /** Exclusive block end, "HH:mm". */
  endTime: string;
  format: SessionFormat;
  location: string | null;
  /** ISO date the rule takes effect, or null = always. */
  validFrom: string | null;
  /** ISO date the rule stops applying, or null = open-ended. */
  validUntil: string | null;
}

export type ExceptionKind = "closed" | "extra";

/**
 * A one-off override for a specific date. `closed` = verlof / holiday (removes
 * availability that day); `extra` = an added block outside the weekly rules.
 */
export interface AvailabilityException {
  id: string;
  providerId: string;
  /** ISO date "yyyy-MM-dd". */
  date: string;
  kind: ExceptionKind;
  /** For `extra` (and optionally to close only part of a day). */
  startTime: string | null;
  endTime: string | null;
  note: string | null;
}

/** The recurrence cadence supported by the mock (RFC5545 subset). */
export type RecurrenceFreq = "weekly" | "biweekly";

/**
 * A recurring session series. Either `count` (N occurrences) or `until` (ISO
 * date, inclusive) bounds it — never both. `defaults` seed each generated
 * occurrence.
 */
export interface SessionSeries {
  id: string;
  providerId: string;
  clientId: string;
  freq: RecurrenceFreq;
  /** ISO date of the first occurrence. */
  startDate: string;
  /** Number of occurrences, or null when bounded by `until`. */
  count: number | null;
  /** Inclusive ISO end date, or null when bounded by `count`. */
  until: string | null;
  defaults: {
    time: string;
    durationMinutes: number;
    format: SessionFormat;
  };
  createdAt: string;
}

export type WaitlistDaypart = "morning" | "afternoon" | "evening";

export type WaitlistStatus = "active" | "offered" | "booked" | "removed";

/** Preference shape used to match a waiting client to a free slot. */
export interface WaitlistPreference {
  /** Preferred ISO weekdays; empty = no weekday preference. */
  weekdays: Weekday[];
  /** Preferred dayparts; empty = any. */
  dayparts: WaitlistDaypart[];
  format: SessionFormat;
}

export interface WaitlistEntry {
  id: string;
  providerId: string;
  clientId: string;
  /** Display name kept denormalized so the panel renders without a join. */
  clientName: string;
  preference: WaitlistPreference;
  note: string | null;
  status: WaitlistStatus;
  createdAt: string;
  /** Set when a slot has been proposed (status → offered). */
  offeredAt: string | null;
  /** The proposed slot, kept for the "je stelde … voor" line. */
  offeredSlot: { date: string; time: string } | null;
}

/* -------------------------------------------------------------------------- */
/* Persistence (localStorage mock, namespaced per provider)                    */
/* -------------------------------------------------------------------------- */

const NS = "bondable_schedule";
const keyRules = (p: string) => `${NS}:rules:${p}`;
const keyExc = (p: string) => `${NS}:exceptions:${p}`;
const keySeries = (p: string) => `${NS}:series:${p}`;
const keyWaitlist = (p: string) => `${NS}:waitlist:${p}`;

function read<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* best-effort mock persistence */
  }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* -------------------------------------------------------------------------- */
/* Time helpers (pure)                                                         */
/* -------------------------------------------------------------------------- */

/** "HH:mm" → minutes since midnight. Tolerates bad input by returning 0. */
export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** minutes since midnight → "HH:mm". */
export function toHHmm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** ISO weekday (1..7) of an ISO date string. */
export function weekdayOf(isoDate: string): Weekday {
  const d = new Date(`${isoDate}T00:00:00`);
  const js = d.getDay(); // 0 = Sunday
  return (js === 0 ? 7 : js) as Weekday;
}

/** Which daypart a "HH:mm" falls in (morning <12, afternoon <17, else evening). */
export function daypartOf(hhmm: string): WaitlistDaypart {
  const mins = toMinutes(hhmm);
  if (mins < 12 * 60) return "morning";
  if (mins < 17 * 60) return "afternoon";
  return "evening";
}

/** Two formats are compatible when either side is "both" or they are equal. */
export function formatMatches(a: SessionFormat, b: SessionFormat): boolean {
  return a === "both" || b === "both" || a === b;
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isWithin(
  date: string,
  from: string | null,
  until: string | null,
): boolean {
  if (from && date < from) return false;
  if (until && date > until) return false;
  return true;
}

/* -------------------------------------------------------------------------- */
/* Availability rules — CRUD                                                    */
/* -------------------------------------------------------------------------- */

function listRules(providerId: string): AvailabilityRule[] {
  return read<AvailabilityRule[]>(keyRules(providerId), []);
}

function saveRules(providerId: string, rules: AvailabilityRule[]): void {
  write(keyRules(providerId), rules);
}

/**
 * Replace all rules for a provider (the paint-grid editor computes the full set
 * on each save — simplest correct model for a mock). Merges adjacent same-format
 * cells into contiguous blocks is the caller's job; this stores verbatim.
 */
function setRules(
  providerId: string,
  rules: Omit<AvailabilityRule, "id" | "providerId">[],
): AvailabilityRule[] {
  const withIds: AvailabilityRule[] = rules.map((r) => ({
    ...r,
    id: uid("ar"),
    providerId,
  }));
  saveRules(providerId, withIds);
  return withIds;
}

function addRule(
  providerId: string,
  rule: Omit<AvailabilityRule, "id" | "providerId">,
): AvailabilityRule {
  const rules = listRules(providerId);
  const created: AvailabilityRule = { ...rule, id: uid("ar"), providerId };
  saveRules(providerId, [...rules, created]);
  return created;
}

function removeRule(providerId: string, ruleId: string): void {
  saveRules(
    providerId,
    listRules(providerId).filter((r) => r.id !== ruleId),
  );
}

/* -------------------------------------------------------------------------- */
/* Exceptions (verlof / extra) — CRUD                                          */
/* -------------------------------------------------------------------------- */

function listExceptions(providerId: string): AvailabilityException[] {
  return read<AvailabilityException[]>(keyExc(providerId), []).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

function addException(
  providerId: string,
  exc: Omit<AvailabilityException, "id" | "providerId">,
): AvailabilityException {
  const list = read<AvailabilityException[]>(keyExc(providerId), []);
  const created: AvailabilityException = { ...exc, id: uid("ex"), providerId };
  write(keyExc(providerId), [...list, created]);
  return created;
}

function removeException(providerId: string, excId: string): void {
  write(
    keyExc(providerId),
    read<AvailabilityException[]>(keyExc(providerId), []).filter(
      (e) => e.id !== excId,
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* Availability query helpers                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Is the provider available for the whole block [startTime, endTime) on the
 * given ISO date? Applies weekly rules, then subtracts `closed` exceptions and
 * adds `extra` exceptions. Pure over the stored mock data.
 */
function isAvailable(
  providerId: string,
  isoDate: string,
  startTime: string,
  endTime: string,
  format: SessionFormat = "both",
): boolean {
  const wantStart = toMinutes(startTime);
  const wantEnd = toMinutes(endTime);
  if (wantEnd <= wantStart) return false;

  const weekday = weekdayOf(isoDate);

  // A full-day close on this date removes everything.
  const exceptions = listExceptions(providerId).filter(
    (e) => e.date === isoDate,
  );
  const fullClose = exceptions.some(
    (e) => e.kind === "closed" && !e.startTime && !e.endTime,
  );
  if (fullClose) return false;

  // Candidate covering blocks = weekly rules for this weekday + extra exceptions.
  const ruleBlocks = listRules(providerId).filter(
    (r) =>
      r.weekday === weekday &&
      formatMatches(r.format, format) &&
      isWithin(isoDate, r.validFrom, r.validUntil),
  );
  const extraBlocks = exceptions.filter(
    (e) => e.kind === "extra" && e.startTime && e.endTime,
  );

  const covered = [
    ...ruleBlocks.map((r) => ({ s: toMinutes(r.startTime), e: toMinutes(r.endTime) })),
    ...extraBlocks.map((e) => ({
      s: toMinutes(e.startTime as string),
      e: toMinutes(e.endTime as string),
    })),
  ].some((b) => b.s <= wantStart && b.e >= wantEnd);

  if (!covered) return false;

  // Partial closes on this date carve out time.
  const partialCloses = exceptions.filter(
    (e) => e.kind === "closed" && e.startTime && e.endTime,
  );
  const clashesClose = partialCloses.some((e) => {
    const cs = toMinutes(e.startTime as string);
    const ce = toMinutes(e.endTime as string);
    return wantStart < ce && wantEnd > cs; // overlap
  });

  return !clashesClose;
}

/**
 * A compact, client-safe availability summary for the Finder profile payload.
 * Purely a fit signal (never price/rank). Returns e.g.
 *   { weekdays: [1,2,4], formats: ['in_person','online'], onHolidayUntil: null }
 * and a short NL/EN sentence the profile can render.
 */
export interface AvailabilitySummary {
  /** Weekdays the provider has any recurring availability. */
  weekdays: Weekday[];
  formats: SessionFormat[];
  /** ISO date the current verlof runs until, if a close covers today. */
  onHolidayUntil: string | null;
  /** Rough count of open weekly hours (fit signal, not a promise). */
  weeklyHours: number;
  summaryNl: string;
  summaryEn: string;
}

const DAY_NL = ["", "ma", "di", "wo", "do", "vr", "za", "zo"];
const DAY_EN = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getAvailabilitySummary(providerId: string): AvailabilitySummary {
  const rules = listRules(providerId);
  const weekdays = Array.from(new Set(rules.map((r) => r.weekday))).sort(
    (a, b) => a - b,
  ) as Weekday[];
  const formats = Array.from(new Set(rules.map((r) => r.format)));
  const weeklyMinutes = rules.reduce(
    (sum, r) => sum + Math.max(0, toMinutes(r.endTime) - toMinutes(r.startTime)),
    0,
  );
  const weeklyHours = Math.round(weeklyMinutes / 60);

  const today = new Date().toISOString().slice(0, 10);
  const activeClose = listExceptions(providerId).find(
    (e) => e.kind === "closed" && !e.startTime && !e.endTime && e.date >= today,
  );
  const onHolidayUntil = activeClose ? activeClose.date : null;

  const daysNl = weekdays.map((w) => DAY_NL[w]).join(", ");
  const daysEn = weekdays.map((w) => DAY_EN[w]).join(", ");

  const summaryNl = onHolidayUntil
    ? `Met verlof tot ${onHolidayUntil}`
    : weekdays.length
      ? `Meestal beschikbaar op ${daysNl}`
      : "Beschikbaarheid nog niet ingesteld";
  const summaryEn = onHolidayUntil
    ? `On leave until ${onHolidayUntil}`
    : weekdays.length
      ? `Usually available ${daysEn}`
      : "Availability not set yet";

  return {
    weekdays,
    formats,
    onHolidayUntil,
    weeklyHours,
    summaryNl,
    summaryEn,
  };
}

/* -------------------------------------------------------------------------- */
/* Recurring session series                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Compute the next N occurrence dates for a series definition, respecting
 * count/until. Does NOT touch availability — the caller reconciles clashes. Pure.
 */
function nextOccurrences(
  series: Pick<SessionSeries, "freq" | "startDate" | "count" | "until">,
  limit = 12,
): string[] {
  const step = series.freq === "biweekly" ? 14 : 7;
  const out: string[] = [];
  let cursor = series.startDate;
  const hardCap = series.count ?? limit;
  for (let i = 0; i < Math.min(hardCap, limit); i++) {
    if (series.until && cursor > series.until) break;
    out.push(cursor);
    cursor = addDaysIso(cursor, step);
  }
  return out;
}

function listSeries(providerId: string): SessionSeries[] {
  return read<SessionSeries[]>(keySeries(providerId), []);
}

/**
 * Persist a series definition and return it together with its computed
 * occurrence dates. The create-session dialog uses `occurrences` to spawn the
 * individual session rows via SessionService (kept out of this module so the
 * session state-machine stays single-owned).
 */
function createSeries(
  providerId: string,
  input: Omit<SessionSeries, "id" | "providerId" | "createdAt">,
): { series: SessionSeries; occurrences: string[] } {
  const series: SessionSeries = {
    ...input,
    id: uid("ss"),
    providerId,
    createdAt: new Date().toISOString(),
  };
  write(keySeries(providerId), [...listSeries(providerId), series]);
  return { series, occurrences: nextOccurrences(series) };
}

/* -------------------------------------------------------------------------- */
/* Waitlist                                                                     */
/* -------------------------------------------------------------------------- */

function listWaitlist(providerId: string): WaitlistEntry[] {
  return read<WaitlistEntry[]>(keyWaitlist(providerId), []).sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : 1,
  );
}

function saveWaitlist(providerId: string, entries: WaitlistEntry[]): void {
  write(keyWaitlist(providerId), entries);
}

function addWaitlistEntry(
  providerId: string,
  input: {
    clientId: string;
    clientName: string;
    preference: WaitlistPreference;
    note?: string | null;
  },
): WaitlistEntry {
  const created: WaitlistEntry = {
    id: uid("wl"),
    providerId,
    clientId: input.clientId,
    clientName: input.clientName,
    preference: input.preference,
    note: input.note ?? null,
    status: "active",
    createdAt: new Date().toISOString(),
    offeredAt: null,
    offeredSlot: null,
  };
  saveWaitlist(providerId, [...listWaitlist(providerId), created]);
  return created;
}

function updateWaitlistStatus(
  providerId: string,
  entryId: string,
  status: WaitlistStatus,
  offeredSlot?: { date: string; time: string },
): WaitlistEntry | null {
  const list = listWaitlist(providerId);
  let updated: WaitlistEntry | null = null;
  const next = list.map((e) => {
    if (e.id !== entryId) return e;
    updated = {
      ...e,
      status,
      offeredAt: status === "offered" ? new Date().toISOString() : e.offeredAt,
      offeredSlot: offeredSlot ?? (status === "offered" ? e.offeredSlot : e.offeredSlot),
    };
    return updated;
  });
  saveWaitlist(providerId, next);
  return updated;
}

function removeWaitlistEntry(providerId: string, entryId: string): void {
  saveWaitlist(
    providerId,
    listWaitlist(providerId).filter((e) => e.id !== entryId),
  );
}

/**
 * Rank active waitlist entries by how well they match a concrete free slot.
 * Higher score = better fit. Weekday match + daypart match + format compatible.
 * Pure — the "vul dit gat" picker on Today calls this.
 */
function matchWaitlistForSlot(
  providerId: string,
  slot: { date: string; time: string; format: SessionFormat },
): { entry: WaitlistEntry; score: number }[] {
  const weekday = weekdayOf(slot.date);
  const daypart = daypartOf(slot.time);
  return listWaitlist(providerId)
    .filter((e) => e.status === "active")
    .map((entry) => {
      const p = entry.preference;
      let score = 0;
      if (!formatMatches(p.format, slot.format)) return { entry, score: -1 };
      if (p.weekdays.length === 0 || p.weekdays.includes(weekday)) score += 2;
      if (p.dayparts.length === 0 || p.dayparts.includes(daypart)) score += 1;
      return { entry, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);
}

/* -------------------------------------------------------------------------- */
/* Public surface                                                              */
/* -------------------------------------------------------------------------- */

export const scheduleService = {
  // availability rules
  listRules,
  setRules,
  addRule,
  removeRule,
  // exceptions
  listExceptions,
  addException,
  removeException,
  // availability queries
  isAvailable,
  getAvailabilitySummary,
  // recurrence
  nextOccurrences,
  listSeries,
  createSeries,
  // waitlist
  listWaitlist,
  addWaitlistEntry,
  updateWaitlistStatus,
  removeWaitlistEntry,
  matchWaitlistForSlot,
  // pure helpers (exported for reuse/tests)
  toMinutes,
  toHHmm,
  weekdayOf,
  daypartOf,
  formatMatches,
};

export default scheduleService;

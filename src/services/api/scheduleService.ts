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

/** Parse "yyyy-MM-dd" as a UTC-anchored Date — no DST / offset drift. */
function isoToUtcDate(isoDate: string): Date {
  const [y, m, d] = isoDate
    .slice(0, 10)
    .split("-")
    .map((n) => Number(n));
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
}

/** ISO weekday (1..7) of an ISO date string. */
export function weekdayOf(isoDate: string): Weekday {
  const js = isoToUtcDate(isoDate).getUTCDay(); // 0 = Sunday
  return (js === 0 ? 7 : js) as Weekday;
}

/**
 * "yyyy-MM-ddTHH:mm" for the *local* clock. Availability is wall-clock, so a
 * UTC `toISOString()` would put the "not before now" floor an hour or two off
 * in Belgium — and offer moments that already passed.
 */
export function localNowIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

/** Today's date on the local clock, "yyyy-MM-dd". */
export function localTodayIso(): string {
  return localNowIso().slice(0, 10);
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
  const d = isoToUtcDate(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
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
/* Open slots — the derivation that turns painted availability into booking    */
/* -------------------------------------------------------------------------- */

/**
 * A block of time that is NOT bookable because something already sits there.
 * Kept deliberately dumb (date + wall-clock range) so any caller can build it:
 * from sessions, from a calendar sync, from a hold.
 */
export interface BusyBlock {
  /** ISO date "yyyy-MM-dd". */
  date: string;
  /** Inclusive start "HH:mm". */
  startTime: string;
  /** Exclusive end "HH:mm". */
  endTime: string;
}

/** One concrete, offerable moment. */
export interface OpenSlot {
  /** Stable list key: `${date}T${time}`. */
  id: string;
  date: string;
  weekday: Weekday;
  /** Inclusive start "HH:mm". */
  time: string;
  /** Exclusive end "HH:mm". */
  endTime: string;
  durationMinutes: number;
  format: SessionFormat;
  location: string | null;
  daypart: WaitlistDaypart;
}

/** Open slots grouped per day, so the picker never has to regroup. */
export interface OpenSlotDay {
  date: string;
  weekday: Weekday;
  slots: OpenSlot[];
}

export interface OpenSlotsOptions {
  /** Session length. Default 50 (the Belgian standard consult). */
  durationMinutes?: number;
  /** Start-time granularity inside a block. Default 30. */
  stepMinutes?: number;
  /** Only offer slots compatible with this format. Default "both". */
  format?: SessionFormat;
  /** Already-taken time. Build with `busyFromSessions`. */
  busy?: BusyBlock[];
  /** Keep the list calm — cap slots shown per day. Default 6. */
  maxPerDay?: number;
  /**
   * Drop slots starting before this instant. LOCAL wall-clock ISO datetime —
   * use `localNowIso()`, not `new Date().toISOString()`. Default: none.
   */
  notBefore?: string;
  /** Include days with zero open slots (default false = only real options). */
  includeEmptyDays?: boolean;
}

/** Tolerates "HH:mm", "HH:mm:ss" and stray whitespace. Returns "HH:mm". */
export function normalizeHHmm(value: string | null | undefined): string {
  if (!value) return "00:00";
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value).trim());
  if (!m) return "00:00";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** The minimal shape `busyFromSessions` needs — matches the sessions row. */
export interface SessionLike {
  session_date: string;
  session_time?: string | null;
  duration_minutes?: number | null;
  status?: string | null;
}

const FREED_STATUSES = new Set(["cancelled", "canceled", "denied", "no show", "no_show"]);

/**
 * Map session rows to busy blocks. Cancelled / denied / no-show sessions release
 * their time again. Pure.
 */
function busyFromSessions(sessions: SessionLike[]): BusyBlock[] {
  const out: BusyBlock[] = [];
  for (const s of sessions ?? []) {
    if (!s?.session_date) continue;
    const status = (s.status ?? "").toString().trim().toLowerCase();
    if (FREED_STATUSES.has(status)) continue;
    const start = normalizeHHmm(s.session_time ?? "00:00");
    const mins = toMinutes(start);
    const dur = Math.max(15, Number(s.duration_minutes) || 50);
    out.push({
      date: s.session_date.slice(0, 10),
      startTime: start,
      endTime: toHHmm(Math.min(24 * 60, mins + dur)),
    });
  }
  return out;
}

interface Span {
  s: number;
  e: number;
  format: SessionFormat;
  location: string | null;
}

const overlaps = (aS: number, aE: number, bS: number, bE: number) =>
  aS < bE && aE > bS;

/**
 * The booking derivation: weekly availability rules, MINUS verlof/closures,
 * MINUS what is already booked, sliced into session-length slots and grouped
 * per day.
 *
 * Pure over (stored rules + stored exceptions + the `busy` you hand in) — it
 * never writes and never fetches, so it is safe to call on every render and
 * trivial to test.
 *
 * @param providerId whose availability to read
 * @param fromISO    ISO date (or datetime — the date part is used) to start at
 * @param days       how many calendar days to scan forward, inclusive of `from`
 */
function getOpenSlots(
  providerId: string,
  fromISO: string,
  days = 14,
  options: OpenSlotsOptions = {},
): OpenSlotDay[] {
  const durationMinutes = Math.max(15, options.durationMinutes ?? 50);
  const stepMinutes = Math.max(5, options.stepMinutes ?? 30);
  const wantFormat = options.format ?? "both";
  const maxPerDay = Math.max(1, options.maxPerDay ?? 6);
  const busy = options.busy ?? [];

  const from = (fromISO || localTodayIso()).slice(0, 10);
  const notBeforeDate = options.notBefore ? options.notBefore.slice(0, 10) : null;
  const notBeforeMins = options.notBefore
    ? toMinutes(normalizeHHmm(options.notBefore.slice(11, 16)))
    : 0;

  const rules = listRules(providerId);
  const exceptions = listExceptions(providerId);

  const out: OpenSlotDay[] = [];

  for (let i = 0; i < Math.max(0, days); i++) {
    const date = addDaysIso(from, i);
    if (notBeforeDate && date < notBeforeDate) continue;

    const weekday = weekdayOf(date);
    const dayExceptions = exceptions.filter((e) => e.date === date);

    // Verlof for the whole day removes everything.
    if (
      dayExceptions.some(
        (e) => e.kind === "closed" && !e.startTime && !e.endTime,
      )
    ) {
      if (options.includeEmptyDays) out.push({ date, weekday, slots: [] });
      continue;
    }

    // Candidate coverage = weekly rules for this weekday + one-off extra hours.
    const spans: Span[] = [
      ...rules
        .filter(
          (r) =>
            r.weekday === weekday &&
            formatMatches(r.format, wantFormat) &&
            isWithin(date, r.validFrom, r.validUntil),
        )
        .map((r) => ({
          s: toMinutes(r.startTime),
          e: toMinutes(r.endTime),
          format: r.format,
          location: r.location,
        })),
      ...dayExceptions
        .filter((e) => e.kind === "extra" && e.startTime && e.endTime)
        .map((e) => ({
          s: toMinutes(e.startTime as string),
          e: toMinutes(e.endTime as string),
          format: "both" as SessionFormat,
          location: null,
        })),
    ].sort((a, b) => a.s - b.s);

    const closes = dayExceptions
      .filter((e) => e.kind === "closed" && e.startTime && e.endTime)
      .map((e) => ({
        s: toMinutes(e.startTime as string),
        e: toMinutes(e.endTime as string),
      }));

    const dayBusy = busy
      .filter((b) => b.date === date)
      .map((b) => ({ s: toMinutes(b.startTime), e: toMinutes(b.endTime) }));

    const floor =
      notBeforeDate && date === notBeforeDate ? notBeforeMins : -Infinity;

    const seen = new Set<number>();
    const slots: OpenSlot[] = [];

    for (const span of spans) {
      for (let s = span.s; s + durationMinutes <= span.e; s += stepMinutes) {
        const e = s + durationMinutes;
        if (s < floor) continue;
        if (seen.has(s)) continue;
        if (closes.some((c) => overlaps(s, e, c.s, c.e))) continue;
        if (dayBusy.some((b) => overlaps(s, e, b.s, b.e))) continue;

        seen.add(s);
        const time = toHHmm(s);
        slots.push({
          id: `${date}T${time}`,
          date,
          weekday,
          time,
          endTime: toHHmm(e),
          durationMinutes,
          format: span.format,
          location: span.location,
          daypart: daypartOf(time),
        });
      }
    }

    slots.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

    // Cap by sampling ACROSS the day, not by truncating it. Taking the first N
    // would hide every afternoon behind a full morning, and a client who only
    // works mornings would think their begeleider never has an evening free.
    let capped = slots;
    if (slots.length > maxPerDay) {
      if (maxPerDay === 1) {
        capped = [slots[0]];
      } else {
        const picked: OpenSlot[] = [];
        for (let k = 0; k < maxPerDay; k++) {
          const s = slots[Math.round((k * (slots.length - 1)) / (maxPerDay - 1))];
          if (s && (picked.length === 0 || picked[picked.length - 1].id !== s.id)) {
            picked.push(s);
          }
        }
        capped = picked;
      }
    }

    if (capped.length > 0 || options.includeEmptyDays) {
      out.push({ date, weekday, slots: capped });
    }
  }

  return out;
}

/**
 * Double-book guard. Re-checks a chosen moment right before it is written —
 * availability may have changed while a dialog was open, or two people may have
 * picked the same chip. Pure; hand in the same `busy` you derived the slot from.
 */
function isSlotStillFree(
  providerId: string,
  slot: {
    date: string;
    time: string;
    durationMinutes?: number;
    format?: SessionFormat;
  },
  busy: BusyBlock[] = [],
): boolean {
  const start = normalizeHHmm(slot.time);
  const startMins = toMinutes(start);
  const dur = Math.max(15, slot.durationMinutes ?? 50);
  const end = toHHmm(startMins + dur);

  if (!isAvailable(providerId, slot.date, start, end, slot.format ?? "both")) {
    return false;
  }
  return !busy.some(
    (b) =>
      b.date === slot.date &&
      overlaps(startMins, startMins + dur, toMinutes(b.startTime), toMinutes(b.endTime)),
  );
}

/**
 * First open slot that fits a waitlist preference — the engine behind
 * "stel dit moment voor". Pure over the days you already derived.
 */
function findSlotForPreference(
  preference: WaitlistPreference,
  days: OpenSlotDay[],
): OpenSlot | null {
  for (const day of days) {
    for (const slot of day.slots) {
      if (!formatMatches(preference.format, slot.format)) continue;
      if (
        preference.weekdays.length > 0 &&
        !preference.weekdays.includes(slot.weekday)
      ) {
        continue;
      }
      if (
        preference.dayparts.length > 0 &&
        !preference.dayparts.includes(slot.daypart)
      ) {
        continue;
      }
      return slot;
    }
  }
  return null;
}

/**
 * Demo seed: a plausible Flemish practice week, written ONLY when the provider
 * has never painted anything. Keeps the explorable demo from showing an empty
 * booking surface, and disappears the moment a real grid is saved.
 */
function seedDemoAvailability(providerId: string): AvailabilityRule[] {
  const existing = listRules(providerId);
  if (existing.length > 0) return existing;

  const morning = { startTime: "09:00", endTime: "12:30" };
  const afternoon = { startTime: "13:30", endTime: "17:00" };
  const base = {
    format: "both" as SessionFormat,
    location: "Praktijk De Brug",
    validFrom: null,
    validUntil: null,
  };

  return setRules(providerId, [
    { weekday: 1, ...morning, ...base },
    { weekday: 1, ...afternoon, ...base },
    { weekday: 2, ...morning, ...base },
    { weekday: 2, ...afternoon, ...base },
    { weekday: 3, ...morning, ...base },
    { weekday: 4, ...morning, ...base },
    { weekday: 4, ...afternoon, ...base },
    { weekday: 5, startTime: "09:00", endTime: "15:00", ...base },
  ]);
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
  // booking (open slots)
  getOpenSlots,
  isSlotStillFree,
  busyFromSessions,
  findSlotForPreference,
  seedDemoAvailability,
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
  normalizeHHmm,
  localNowIso,
  localTodayIso,
};

export default scheduleService;

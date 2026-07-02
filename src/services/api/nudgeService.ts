/**
 * nudgeService.ts — the ethical nudge governor (tickets T-MG-5/6, ruling R15).
 *
 * R15 is law: UPGRADE NUDGES ARE NEVER MODAL. There is no interrupting dialog,
 * no takeover, no confetti. Nudges are ambient, quiet, and dismissible. This
 * service is the single gatekeeper every monetization surface asks before it
 * renders — it decides whether a nudge MAY show, and records the outcome.
 *
 * The governor enforces (master-plan §3.2):
 *   1. Per-id 30-day dedupe — once a nudge id has been shown (or dismissed), it
 *      stays quiet for that id for 30 days, persisted in localStorage.
 *   2. Max ONE visible nudge per page — a module-level counter, reset on every
 *      route change via `resetPageBudget()`, so a single view never stacks nudges.
 *   3. Forbidden routes — monetization is banned from clinical/quiet surfaces:
 *      Bond chat, crisis flows, message threads, and the welcome/onboarding
 *      flow. A path match there suppresses every nudge.
 *   4. Never on client surfaces — clients pay nothing, so there is nothing to
 *      sell them; nudges only ever render for the provider role.
 *   5. "Toon dit niet meer" — a permanent per-id opt-out, honored forever.
 *
 * Every decision is instrumented: `nudge_shown` / `nudge_clicked` /
 * `nudge_dismissed` are emitted via `analyticsService` so suppressed demand is
 * measurable (the plan wants to see nudges we DIDN'T show, too).
 *
 * Mock-backed: state lives in localStorage until plan 08 wires the `nudge_events`
 * table. The API shape does not change when persistence moves server-side.
 */

import { analyticsService } from '@/services/api/analyticsService';
import { ANALYTICS_EVENTS } from '@/config/analyticsEvents';
import { getStoredDemoRole } from '@/hooks/api/useAuthManager';

// ── Storage keys ───────────────────────────────────────────────────────────────

/** Per-id record of the last time a nudge was shown/dismissed (30-day dedupe). */
const SEEN_KEY = 'bondable_nudge_seen';
/** Per-id permanent opt-outs ("Toon dit niet meer"). */
const MUTED_KEY = 'bondable_nudge_muted';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const hasWindow = typeof window !== 'undefined';

/**
 * Route fragments where monetization is FORBIDDEN. Matched as case-insensitive
 * substrings against the current path — a fragment here silences ALL nudges on
 * that route. These are the clinical/quiet zones per §3.2. Keep this list tight
 * and explicit; it is the brand-safety fence.
 */
const FORBIDDEN_ROUTE_FRAGMENTS = [
  'bond', // Bond AI chat and any mint surface
  'crisis', // crisis resources / safety flows
  'check-in', // between-session check-ins (safety-adjacent)
  'messages', // client-therapist message threads
  'message', // singular message routes
  'welcome', // onboarding / first-run flow
  'chat', // any live conversation surface
] as const;

// ── Module-level page budget (max 1 visible nudge per page) ────────────────────

let pageNudgeCount = 0;

/**
 * Reset the per-page nudge budget. Call this on every route change (e.g. from a
 * top-level `useEffect` keyed on `useLocation().pathname`) so a fresh view starts
 * with its single-nudge allowance restored.
 */
export function resetPageBudget(): void {
  pageNudgeCount = 0;
}

// ── Storage helpers ────────────────────────────────────────────────────────────

function readMap(key: string): Record<string, number> {
  if (!hasWindow) return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, number>): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* silent-fail (quota, private mode) */
  }
}

// ── Role / route guards ────────────────────────────────────────────────────────

/** Providers are the only role that may see monetization. */
function isProviderRole(): boolean {
  try {
    // Demo role stores the legacy value `therapist`; that is the provider role.
    return getStoredDemoRole() === 'therapist';
  } catch {
    return false;
  }
}

/** Resolve the path to check. Callers may pass one; else read `window.location`. */
function currentPath(explicit?: string): string {
  if (explicit) return explicit;
  if (!hasWindow) return '';
  try {
    return window.location.pathname || '';
  } catch {
    return '';
  }
}

/** True when the given path is a forbidden (clinical/quiet) zone. */
export function isForbiddenRoute(path?: string): boolean {
  const p = currentPath(path).toLowerCase();
  return FORBIDDEN_ROUTE_FRAGMENTS.some((frag) => p.includes(frag));
}

// ── Per-id state ───────────────────────────────────────────────────────────────

/** True when the id has been permanently muted via "Toon dit niet meer". */
function isMuted(id: string): boolean {
  return Boolean(readMap(MUTED_KEY)[id]);
}

/** True when the id was shown/dismissed within the last 30 days. */
function isDeduped(id: string): boolean {
  const at = readMap(SEEN_KEY)[id];
  if (!at) return false;
  return Date.now() - at < THIRTY_DAYS_MS;
}

// ── Public governor API ────────────────────────────────────────────────────────

export interface NudgeContext {
  /** Explicit path to test (defaults to `window.location.pathname`). */
  path?: string;
}

/**
 * The single gate every nudge surface calls before rendering. Returns `true` only
 * when ALL of the following hold:
 *   - the actor is a provider (never client/admin/anon),
 *   - the route is not a forbidden clinical/quiet zone,
 *   - the id is not permanently muted,
 *   - the id is outside its 30-day dedupe window,
 *   - the current page still has its single-nudge budget.
 *
 * IMPORTANT: this is a pure query with ONE side effect — the page-budget counter
 * is NOT consumed here (query stays idempotent). Call `recordNudge(id)` when you
 * actually render, which consumes the budget and logs `nudge_shown`.
 */
export function canShowNudge(id: string, ctx: NudgeContext = {}): boolean {
  try {
    if (!isProviderRole()) return false;
    if (isForbiddenRoute(ctx.path)) return false;
    if (isMuted(id)) return false;
    if (isDeduped(id)) return false;
    if (pageNudgeCount >= 1) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Record that a nudge with `id` was actually rendered. Consumes the per-page
 * budget, stamps the 30-day dedupe clock, and emits `nudge_shown`. Call this once,
 * at render time, after `canShowNudge(id)` returned true.
 */
export function recordNudge(id: string): void {
  try {
    pageNudgeCount += 1;
    const seen = readMap(SEEN_KEY);
    seen[id] = Date.now();
    writeMap(SEEN_KEY, seen);
    analyticsService.track(ANALYTICS_EVENTS.nudge_shown, { trigger: id });
  } catch {
    /* silent-fail — nudging must never break product code */
  }
}

/** Record a click-through on a nudge (feeds conversion attribution). */
export function recordNudgeClicked(id: string): void {
  try {
    analyticsService.track(ANALYTICS_EVENTS.nudge_clicked, { trigger: id });
  } catch {
    /* silent-fail */
  }
}

/**
 * Record a dismissal. Always refreshes the 30-day dedupe clock and logs
 * `nudge_dismissed`. When `permanent` is true (the "Toon dit niet meer" choice),
 * the id is muted forever.
 */
export function recordNudgeDismissed(id: string, permanent = false): void {
  try {
    const seen = readMap(SEEN_KEY);
    seen[id] = Date.now();
    writeMap(SEEN_KEY, seen);
    if (permanent) {
      const muted = readMap(MUTED_KEY);
      muted[id] = Date.now();
      writeMap(MUTED_KEY, muted);
    }
    analyticsService.track(ANALYTICS_EVENTS.nudge_dismissed, { trigger: id });
  } catch {
    /* silent-fail */
  }
}

/** Clear all nudge state (dev/testing). */
export function clearNudgeState(): void {
  if (!hasWindow) return;
  try {
    window.localStorage.removeItem(SEEN_KEY);
    window.localStorage.removeItem(MUTED_KEY);
    pageNudgeCount = 0;
  } catch {
    /* silent-fail */
  }
}

/** Grouped export for callers that prefer a namespace. */
export const nudgeService = {
  canShowNudge,
  recordNudge,
  recordNudgeClicked,
  recordNudgeDismissed,
  resetPageBudget,
  isForbiddenRoute,
  clearNudgeState,
};

/**
 * analyticsService.ts — the single analytics spine for Bondable (ticket T-MG-2,
 * ruling R12).
 *
 * ONE spine, not many. The monetization layer (plan 05) and the owner cockpit
 * (plan 07) both emit and read through this module — 07's `platform_events`/
 * `track.ts` is a thin re-export of this, never a second implementation. Event
 * names come from the typed registry in `@/config/analyticsEvents`, so a typo is
 * a compile error.
 *
 * Behaviour (per §6 of docs/plan/05-monetization-growth.md):
 *   - **Batched.** Calls to `track()` enqueue; the queue flushes on a short timer,
 *     on page hide, and when it reaches a size threshold.
 *   - **Consent-aware.** Nothing is buffered or "sent" unless analytics consent is
 *     granted. GDPR: analytics consent is separate from care-data consent; health
 *     data never enters properties (enforced by the registry's allowlist + review).
 *   - **Silent-fail.** Analytics must never throw into product code. Every path is
 *     wrapped; failures are swallowed (a dev-only console.debug at most).
 *
 * Mock mode (current): there is NO network. Events are appended to a capped ring
 * buffer in localStorage (cap 200) and, in dev, mirrored to `console.debug`. The
 * owner cockpit reads history via `getBuffer()`.
 *
 * @remarks PostHog EU (plan 08) is an OPTIONAL later sink, added behind the same
 * consent flag and using this exact taxonomy. When it lands, `flush()` gains a
 * network branch — callers and the registry do not change.
 */

import {
  ANALYTICS_EVENTS,
  isKnownEvent,
  type AnalyticsEvent,
  type AnalyticsProps,
} from '@/config/analyticsEvents';
import { getStoredDemoRole } from '@/hooks/api/useAuthManager';

/** A single buffered analytics record. */
export interface AnalyticsRecord {
  event: AnalyticsEvent;
  props: AnalyticsProps;
  /** Actor role at emit time: 'provider' | 'client' | 'admin' | 'anon'. */
  role: string;
  /** Stable-per-tab session id (not a user id; cookieless for anon finder). */
  session_id: string;
  /** ISO 8601 emit timestamp. */
  ts: string;
}

const BUFFER_KEY = 'bondable_analytics_buffer';
const CONSENT_KEY = 'bondable_analytics_consent';
const SESSION_KEY = 'bondable_analytics_session';
const RING_CAP = 200;
const FLUSH_DEBOUNCE_MS = 1500;
const FLUSH_AT_SIZE = 20;

const isDev = (() => {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
})();

const hasWindow = typeof window !== 'undefined';

/** Pending, not-yet-flushed records. Flushing appends them to the ring buffer. */
let queue: AnalyticsRecord[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// ── Consent ──────────────────────────────────────────────────────────────────

/**
 * Whether analytics consent is granted. Defaults to OFF: no event is buffered
 * until the user (or the demo shell) opts in. Health-care audience — consent is
 * explicit, never assumed.
 */
function hasConsent(): boolean {
  if (!hasWindow) return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

/** Grant or revoke analytics consent. Revoking also clears the buffer. */
function setConsent(granted: boolean): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
    if (!granted) {
      queue = [];
      window.localStorage.removeItem(BUFFER_KEY);
    }
  } catch {
    /* silent-fail */
  }
}

// ── Session id ────────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (!hasWindow) return 'ssr';
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      const rand =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      id = `s_${rand}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

// ── Role identity ─────────────────────────────────────────────────────────────

/**
 * Resolve the current actor role for tagging events. Reads the demo role
 * (`bondable_demo_role`); the raw demo value `therapist` is surfaced as `provider`
 * to match the shipped taxonomy (R4). Absence of a role means an anonymous actor
 * (e.g. a cookieless finder visitor).
 */
function identifyRole(): string {
  try {
    const raw = getStoredDemoRole();
    if (raw === 'therapist') return 'provider';
    if (raw === 'client' || raw === 'admin') return raw;
    return 'anon';
  } catch {
    return 'anon';
  }
}

// ── Ring buffer (mock sink) ───────────────────────────────────────────────────

function readBuffer(): AnalyticsRecord[] {
  if (!hasWindow) return [];
  try {
    const raw = window.localStorage.getItem(BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalyticsRecord[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(records: AnalyticsRecord[]): void {
  if (!hasWindow) return;
  try {
    // Keep only the most recent RING_CAP records.
    const capped = records.length > RING_CAP ? records.slice(records.length - RING_CAP) : records;
    window.localStorage.setItem(BUFFER_KEY, JSON.stringify(capped));
  } catch {
    /* silent-fail (quota, private mode, etc.) */
  }
}

// ── Flush ─────────────────────────────────────────────────────────────────────

function scheduleFlush(): void {
  if (flushTimer) return;
  try {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, FLUSH_DEBOUNCE_MS);
  } catch {
    flushTimer = null;
  }
}

/**
 * Flush the pending queue to the mock sink (ring buffer). In dev each flushed
 * record is mirrored to `console.debug`. This is where a real network sink
 * (PostHog EU) would attach later, behind consent — callers never change.
 */
function flush(): void {
  if (queue.length === 0) return;
  if (!hasConsent()) {
    // No consent → drop silently; nothing is persisted.
    queue = [];
    return;
  }
  try {
    const pending = queue;
    queue = [];
    const next = [...readBuffer(), ...pending];
    writeBuffer(next);
    if (isDev) {
      for (const rec of pending) {
        // eslint-disable-next-line no-console
        console.debug('[analytics]', rec.event, rec.props, `(${rec.role})`);
      }
    }
    // Later: POST `pending` to PostHog EU here when the sink is wired.
  } catch {
    /* silent-fail — never let analytics break product code */
  }
}

// Flush best-effort when the tab is hidden or unloaded.
if (hasWindow) {
  try {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', () => flush());
  } catch {
    /* silent-fail */
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const analyticsService = {
  /**
   * Track a product-analytics event. No-op unless consent is granted. Enqueues
   * (batched) rather than sending immediately. Never throws.
   *
   * @param event  A registered event name (typed — unknown names fail typecheck).
   * @param props  Structural, non-clinical properties only. NEVER health data.
   */
  track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
    try {
      if (!hasConsent()) return;
      // Defensive: guard against untyped callers slipping an unknown name through.
      if (!isKnownEvent(event)) {
        if (isDev) {
          // eslint-disable-next-line no-console
          console.debug('[analytics] dropped unknown event', event);
        }
        return;
      }
      queue.push({
        event,
        props: props ?? {},
        role: identifyRole(),
        session_id: getSessionId(),
        ts: new Date().toISOString(),
      });
      if (queue.length >= FLUSH_AT_SIZE) {
        flush();
      } else {
        scheduleFlush();
      }
    } catch {
      /* silent-fail */
    }
  },

  /**
   * Read the persisted event history (mock sink) for the owner cockpit and dev
   * tooling. Returns a copy, oldest-first, capped at the ring size.
   */
  getBuffer(): AnalyticsRecord[] {
    return readBuffer();
  },

  /** Clear all buffered events (dev/testing/consent-revocation). */
  clearBuffer(): void {
    queue = [];
    if (!hasWindow) return;
    try {
      window.localStorage.removeItem(BUFFER_KEY);
    } catch {
      /* silent-fail */
    }
  },

  /** Force-flush the pending queue now (e.g. before navigation in tests). */
  flush(): void {
    flush();
  },

  /** Resolve the current actor role ('provider' | 'client' | 'admin' | 'anon'). */
  identifyRole(): string {
    return identifyRole();
  },

  /** Whether analytics consent is currently granted. */
  hasConsent(): boolean {
    return hasConsent();
  },

  /** Grant or revoke analytics consent. Revoking clears the buffer. */
  setConsent(granted: boolean): void {
    setConsent(granted);
  },
};

// Re-export the registry surface so callers import a single module if they wish.
export { ANALYTICS_EVENTS, type AnalyticsEvent, type AnalyticsProps };

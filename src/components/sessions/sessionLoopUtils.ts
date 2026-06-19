import type { Session } from '@/services/api/SessionService';

/**
 * Shared helpers for the session-loop features (alliance micro-check, recap,
 * pre-session nudge). Pure functions — no I/O — so they're trivially testable
 * and safe to import from any component.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Build a comparable epoch from a session's date (+ optional time). */
export const sessionStartMs = (s: Pick<Session, 'session_date' | 'session_time'>): number => {
  const time = (s.session_time || '00:00:00').slice(0, 8);
  const normalized = time.length === 5 ? `${time}:00` : time;
  const ts = Date.parse(`${s.session_date}T${normalized}`);
  return Number.isNaN(ts) ? 0 : ts;
};

/**
 * A session counts as "past / completed" for the purpose of prompting the
 * client for an alliance micro-check. We treat an explicit Completed status OR
 * a start time already in the past as eligible (the dev mock's fixed seed clock
 * can drift from real `now`, so we accept both signals).
 */
export const isSessionPast = (s: Session, now = Date.now()): boolean => {
  if (s.status === 'Completed') return true;
  if (s.status === 'Cancelled' || s.status === 'Denied' || s.status === 'No Show') return false;
  const start = sessionStartMs(s);
  return start > 0 && start < now;
};

/** Is the session within the next 24h (and still upcoming)? Drives the nudge. */
export const isWithin24h = (s: Session, now = Date.now()): boolean => {
  const start = sessionStartMs(s);
  if (start <= 0) return false;
  const delta = start - now;
  return delta > 0 && delta <= DAY_MS;
};

/** Hours until the session starts (rounded, min 0). */
export const hoursUntil = (s: Session, now = Date.now()): number => {
  const start = sessionStartMs(s);
  if (start <= 0) return 0;
  return Math.max(0, Math.round((start - now) / (60 * 60 * 1000)));
};

/** localStorage key for a remembered, locally-set prep note (dev mock has no persistence). */
export const prepNoteStorageKey = (sessionId: string) => `bondable.prepNote.${sessionId}`;

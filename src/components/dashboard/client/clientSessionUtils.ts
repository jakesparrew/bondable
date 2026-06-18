import type { Session } from "@/services/api/SessionService";

/** A session is "upcoming" if its date+time is at or after now and not cancelled/denied. */
const TERMINAL = new Set(["Cancelled", "Denied", "Completed", "No Show"]);

export const sessionStart = (s: Session): number => {
  const time = (s.session_time || "00:00:00").slice(0, 8);
  // session_date is YYYY-MM-DD; build a comparable timestamp.
  const ts = Date.parse(`${s.session_date}T${time.length === 5 ? `${time}:00` : time}`);
  return Number.isNaN(ts) ? 0 : ts;
};

/**
 * Pick the soonest upcoming session for a client. Falls back to the most recent
 * non-terminal session if none are strictly in the future (covers the mock's
 * fixed "today" seed where the demo clock may differ from real `now`).
 */
export const getNextSession = (sessions: Session[], now = Date.now()): Session | null => {
  const live = sessions.filter((s) => !TERMINAL.has(s.status));
  if (live.length === 0) return null;
  const future = live
    .filter((s) => sessionStart(s) >= now)
    .sort((a, b) => sessionStart(a) - sessionStart(b));
  if (future.length > 0) return future[0];
  // No strictly-future session: return the soonest scheduled one overall.
  return [...live].sort((a, b) => sessionStart(a) - sessionStart(b))[0] ?? null;
};

/** Human-friendly date+time for a session, localized. */
export const formatSessionDateTime = (s: Session, locale?: string): string => {
  const ts = sessionStart(s);
  if (!ts) return "";
  const d = new Date(ts);
  const date = d.toLocaleDateString(locale || undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(locale || undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
};

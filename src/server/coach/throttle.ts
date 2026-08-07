/**
 * throttle.ts — rate limiting that actually holds on serverless.
 *
 * The counter lives in Postgres, not in module scope. A `Map` per serverless
 * instance is not a rate limit: Vercel runs many instances in parallel, each
 * starting with an empty Map, so parallel requests simply spread across them
 * and every one gets a fresh allowance.
 *
 * The increment is a single atomic upsert — read-then-write would race under
 * exactly the concurrency this is meant to stop.
 *
 * Fails OPEN when the database is unreachable. That is a deliberate trade:
 * this limiter shapes traffic, it is not the thing that guarantees the bill
 * stays finite — the global spend ceiling is (see `spendGuard.ts`). Refusing
 * every conversation because an analytics table is down would be the worse
 * failure, and the ceiling still caps the damage.
 */

import { getSql } from './db';

export interface ThrottleRule {
  /** Namespace, e.g. 'ip' or 'device'. Keeps buckets from colliding. */
  scope: string;
  /** The identity being limited (already hashed by the caller). */
  key: string;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Requests permitted inside one window. */
  max: number;
}

export interface ThrottleResult {
  allowed: boolean;
  /** Requests used in the current window, including this one. */
  count: number;
  /** Seconds until the window rolls over. */
  resetInSeconds: number;
}

/** 1-in-N chance of sweeping expired rows, so cleanup rides along with traffic. */
const SWEEP_ODDS = 50;

export async function consume(rule: ThrottleRule): Promise<ThrottleResult> {
  const sql = getSql();
  const now = Date.now();
  const windowMs = rule.windowSeconds * 1000;
  const windowIndex = Math.floor(now / windowMs);
  const resetInSeconds = Math.ceil(((windowIndex + 1) * windowMs - now) / 1000);

  // No database: fail open. See the module comment — the spend ceiling is the
  // guarantee, this is only shaping.
  if (!sql) return { allowed: true, count: 0, resetInSeconds };

  const bucket = `${rule.scope}:${rule.key}:${windowIndex}`;
  const expiresAt = new Date((windowIndex + 1) * windowMs);

  try {
    const rows = (await sql`
      insert into coach_throttle (bucket, count, expires_at)
      values (${bucket}, 1, ${expiresAt.toISOString()})
      on conflict (bucket) do update
        set count = coach_throttle.count + 1
      returning count
    `) as Array<{ count: number }>;

    const count = rows[0]?.count ?? 1;

    if (Math.random() * SWEEP_ODDS < 1) {
      // Not awaited: cleanup must never sit in front of someone's reply.
      void sql`delete from coach_throttle where expires_at < now()`.catch(() => {});
    }

    return { allowed: count <= rule.max, count, resetInSeconds };
  } catch (error) {
    console.error('[coach] throttle failed, allowing through', error);
    return { allowed: true, count: 0, resetInSeconds };
  }
}

/**
 * Read a bucket without consuming from it.
 *
 * Used to report "you have N left" without that read itself burning one — a
 * status endpoint that costs you quota is a trap.
 */
export async function peek(rule: Omit<ThrottleRule, 'max'>): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  const windowMs = rule.windowSeconds * 1000;
  const bucket = `${rule.scope}:${rule.key}:${Math.floor(Date.now() / windowMs)}`;
  try {
    const rows = (await sql`
      select count from coach_throttle where bucket = ${bucket} limit 1
    `) as Array<{ count: number }>;
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

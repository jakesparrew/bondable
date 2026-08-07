/**
 * spendGuard.ts — the hard ceiling on what Bond can cost in a day.
 *
 * Every other layer makes abuse harder. This one makes the damage FINITE, and
 * that is a different kind of promise. Bot checks can be beaten, cookies can be
 * cleared, IPs can be rotated — but if today's spend is over the ceiling, the
 * model does not run, full stop.
 *
 * When it trips, Bond does not break: the caller falls back to the scripted
 * companion, exactly as it does when the key is missing. Visitors keep getting
 * warm answers; you keep your money.
 *
 * Cached for a few seconds. The ceiling is a backstop measured in euros, not a
 * per-request quota measured in cents, so a slightly stale reading cannot
 * meaningfully overshoot — and querying the sum on every single turn would add
 * a database round-trip to every reply for no real precision.
 */

import { getSql } from './db';

const CACHE_TTL_MS = 20_000;

let cache: { spent: number; at: number } | null = null;

/** USD spent since midnight UTC. Returns 0 when unknown. */
export async function spentToday(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.spent;

  const sql = getSql();
  if (!sql) return 0;

  try {
    const rows = (await sql`
      select coalesce(sum(cost_usd), 0)::float8 as total
      from coach_usage
      where created_at >= date_trunc('day', now())
    `) as Array<{ total: number }>;
    const spent = rows[0]?.total ?? 0;
    cache = { spent, at: now };
    return spent;
  } catch (error) {
    // Unknown spend is NOT treated as "over budget": that would take Bond down
    // for everyone on a transient database blip. The per-request layers still
    // apply, and the next successful read re-arms the ceiling.
    console.error('[coach] spend read failed, treating as unknown', error);
    return 0;
  }
}

export interface SpendStatus {
  spent: number;
  cap: number;
  /** True when the model must not run. */
  exceeded: boolean;
}

export async function checkSpend(capUsd: number): Promise<SpendStatus> {
  // 0 disables the ceiling. Deliberately explicit, so "no cap" is a choice
  // someone made rather than a field they forgot to fill in.
  if (!capUsd || capUsd <= 0) {
    return { spent: await spentToday(), cap: 0, exceeded: false };
  }
  const spent = await spentToday();
  return { spent, cap: capUsd, exceeded: spent >= capUsd };
}

/**
 * Drop the cached figure.
 *
 * Called after a reply is billed so the admin console reflects spend promptly
 * instead of up to CACHE_TTL_MS late — the number people watch when they are
 * worried about a runaway bill should not lag behind reality.
 */
export function invalidateSpendCache(): void {
  cache = null;
}

/**
 * usage.ts — what Bond costs, and who is using how much.
 *
 * Records one row per reply in `coach_usage`. No message content is stored,
 * ever: this table answers "what did we spend" and "is this person over their
 * cap", and Bond conversations are GDPR Art. 9 special-category data that has
 * no business sitting in an analytics table.
 *
 * `userKey` is a salted hash of the client IP. Until real auth lands there is
 * no user id to key on, and storing raw IPs to count messages would be
 * collecting personal data for an operational metric that does not need it.
 * When auth arrives, pass the user id instead — nothing else changes.
 */

import { getSql } from './db';

/** Salted SHA-256, truncated. Enough to count per person, useless as an identifier. */
export async function hashUserKey(raw: string): Promise<string> {
  const salt = process.env.COACH_USAGE_SALT || 'bondable-local-salt';
  const bytes = new TextEncoder().encode(`${salt}:${raw}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface UsageRecord {
  userKey: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  ok: boolean;
}

/** Write one usage row. Failure is logged and swallowed — never blocks a reply. */
export async function recordUsage(record: UsageRecord): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`
      insert into coach_usage (user_key, model, input_tokens, output_tokens, cost_usd, ok)
      values (${record.userKey}, ${record.model}, ${record.inputTokens},
              ${record.outputTokens}, ${record.costUsd}, ${record.ok})
    `;
  } catch (error) {
    console.error('[coach] usage write failed', error);
  }
}

/**
 * Messages this person has sent in the last 24h.
 *
 * Returns 0 when there is no database. That is deliberate: without storage the
 * cap cannot be enforced, and silently blocking everyone (or pretending to
 * count) would be worse than falling back to the per-minute rate limiter that
 * always runs.
 */
export async function messagesLast24h(userKey: string): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;
  try {
    const rows = (await sql`
      select count(*)::int as n
      from coach_usage
      where user_key = ${userKey} and created_at > now() - interval '24 hours'
    `) as Array<{ n: number }>;
    return rows[0]?.n ?? 0;
  } catch (error) {
    console.error('[coach] cap check failed', error);
    return 0;
  }
}

export interface UsageSummary {
  last24h: { messages: number; inputTokens: number; outputTokens: number; costUsd: number };
  last30d: { messages: number; inputTokens: number; outputTokens: number; costUsd: number };
  activeUsers24h: number;
  topUsers24h: Array<{ userKey: string; messages: number; costUsd: number }>;
  byDay: Array<{ day: string; messages: number; costUsd: number }>;
}

const EMPTY_WINDOW = { messages: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };

/** Everything the admin console shows about spend. Returns zeroes on failure. */
export async function usageSummary(): Promise<UsageSummary> {
  const sql = getSql();
  const empty: UsageSummary = {
    last24h: { ...EMPTY_WINDOW },
    last30d: { ...EMPTY_WINDOW },
    activeUsers24h: 0,
    topUsers24h: [],
    byDay: [],
  };
  if (!sql) return empty;

  try {
    const [windows, users, top, days] = await Promise.all([
      sql`
        select
          count(*) filter (where created_at > now() - interval '24 hours')::int as m24,
          coalesce(sum(input_tokens)  filter (where created_at > now() - interval '24 hours'), 0)::int as i24,
          coalesce(sum(output_tokens) filter (where created_at > now() - interval '24 hours'), 0)::int as o24,
          coalesce(sum(cost_usd)      filter (where created_at > now() - interval '24 hours'), 0)::float8 as c24,
          count(*)::int as m30,
          coalesce(sum(input_tokens), 0)::int as i30,
          coalesce(sum(output_tokens), 0)::int as o30,
          coalesce(sum(cost_usd), 0)::float8 as c30
        from coach_usage
        where created_at > now() - interval '30 days'
      `,
      sql`
        select count(distinct user_key)::int as n from coach_usage
        where created_at > now() - interval '24 hours'
      `,
      sql`
        select user_key, count(*)::int as messages, coalesce(sum(cost_usd),0)::float8 as cost
        from coach_usage
        where created_at > now() - interval '24 hours'
        group by user_key order by messages desc limit 10
      `,
      sql`
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
               count(*)::int as messages, coalesce(sum(cost_usd),0)::float8 as cost
        from coach_usage
        where created_at > now() - interval '30 days'
        group by 1 order by 1
      `,
    ]);

    const w = (windows as Array<Record<string, number>>)[0] ?? {};
    return {
      last24h: {
        messages: w.m24 ?? 0,
        inputTokens: w.i24 ?? 0,
        outputTokens: w.o24 ?? 0,
        costUsd: w.c24 ?? 0,
      },
      last30d: {
        messages: w.m30 ?? 0,
        inputTokens: w.i30 ?? 0,
        outputTokens: w.o30 ?? 0,
        costUsd: w.c30 ?? 0,
      },
      activeUsers24h: (users as Array<{ n: number }>)[0]?.n ?? 0,
      topUsers24h: (top as Array<{ user_key: string; messages: number; cost: number }>).map((r) => ({
        userKey: r.user_key,
        messages: r.messages,
        costUsd: r.cost,
      })),
      byDay: (days as Array<{ day: string; messages: number; cost: number }>).map((r) => ({
        day: r.day,
        messages: r.messages,
        costUsd: r.cost,
      })),
    };
  } catch (error) {
    console.error('[coach] usage summary failed', error);
    return empty;
  }
}

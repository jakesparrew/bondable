/**
 * settings.ts — Bond's operator-controlled configuration.
 *
 * Stored in the existing `ai_settings` key-value table (`setting_name='bond'`)
 * so the admin console can change how Bond behaves without a redeploy. The
 * settings live server-side ON PURPOSE: model choice and usage caps are cost
 * controls, and a control the browser can set is not a control.
 *
 * Precedence, highest first:
 *   1. `ai_settings` row  — what the admin console writes
 *   2. environment vars   — the deploy-time default
 *   3. the constants here — the last resort, so Bond always has a valid config
 *
 * Cached briefly in module scope. A serverless instance handling a burst of
 * turns should not hit the database for every token stream, but an admin who
 * changes the model should see it take effect in seconds, not on redeploy.
 */

import { getSql } from './db';

export interface BondSettings {
  /** Gateway model slug, `creator/model`. */
  model: string;
  /** Ceiling on a single reply. Bond answers in a few sentences. */
  maxOutputTokens: number;
  /** Messages one person may send per rolling 24h. 0 = unlimited. */
  dailyMessageCap: number;
  /**
   * Extra guidance appended to the system prompt. Tone and emphasis only —
   * it can never remove Bond's boundaries, because it is appended AFTER them
   * and the core prompt states them as absolutes.
   */
  toneInstructions: string;
  /** Turn the model off and serve the scripted companion (kill switch). */
  modelEnabled: boolean;

  /**
   * Hard ceiling on total spend per day, in USD. 0 = no ceiling.
   *
   * This is the only setting that bounds the worst case. Everything else makes
   * abuse harder; this makes it finite.
   */
  dailySpendCapUsd: number;

  /** Turns an anonymous visitor gets per device per 24h. 0 = unlimited. */
  anonymousTurnCap: number;

  /** Requests per IP per minute, shared across all serverless instances. */
  ipRequestsPerMinute: number;

  /**
   * Require a passed bot check for anonymous visitors.
   *
   * Only has an effect when TURNSTILE_SECRET_KEY is configured — a switch that
   * silently does nothing would be worse than no switch, so the admin console
   * reports whether the check is actually wired.
   */
  requireBotCheck: boolean;
}

/**
 * Last-resort defaults, used when there is neither a settings row nor an env
 * var — a fresh deploy, or a database that is briefly unreachable.
 *
 * Sonnet 5 rather than 4.6: it is the current generation AND cheaper
 * ($2/$10 per 1M vs $3/$15), so there is no tradeoff to weigh here.
 */
const FALLBACK: BondSettings = {
  model: 'anthropic/claude-sonnet-5',
  maxOutputTokens: 700,
  dailyMessageCap: 60,
  toneInstructions: '',
  modelEnabled: true,
  // $5/day ≈ 1000 replies at measured cost. Low enough that a runaway loop is
  // an annoyance rather than an incident, high enough not to trip on real use.
  dailySpendCapUsd: 5,
  // Eight turns is enough for a conversation to become worth saving, which is
  // where the "create an account" prompt belongs.
  anonymousTurnCap: 8,
  ipRequestsPerMinute: 20,
  requireBotCheck: true,
};

const SETTING_NAME = 'bond';
const CACHE_TTL_MS = 15_000;

let cache: { value: BondSettings; at: number } | null = null;

function fromEnv(): BondSettings {
  const cap = Number(process.env.COACH_DAILY_MESSAGE_CAP);
  const max = Number(process.env.COACH_MAX_OUTPUT_TOKENS);
  const spend = Number(process.env.COACH_DAILY_SPEND_CAP_USD);
  const anon = Number(process.env.COACH_ANONYMOUS_TURN_CAP);
  const rpm = Number(process.env.COACH_IP_REQUESTS_PER_MINUTE);
  return {
    model: process.env.COACH_MODEL || FALLBACK.model,
    maxOutputTokens: Number.isFinite(max) && max > 0 ? max : FALLBACK.maxOutputTokens,
    dailyMessageCap: Number.isFinite(cap) && cap >= 0 ? cap : FALLBACK.dailyMessageCap,
    toneInstructions: FALLBACK.toneInstructions,
    modelEnabled: FALLBACK.modelEnabled,
    dailySpendCapUsd:
      Number.isFinite(spend) && spend >= 0 ? spend : FALLBACK.dailySpendCapUsd,
    anonymousTurnCap:
      Number.isFinite(anon) && anon >= 0 ? anon : FALLBACK.anonymousTurnCap,
    ipRequestsPerMinute:
      Number.isFinite(rpm) && rpm > 0 ? rpm : FALLBACK.ipRequestsPerMinute,
    requireBotCheck: FALLBACK.requireBotCheck,
  };
}

/** Coerce a stored blob into valid settings. Never trusts what it reads back. */
export function normalize(raw: unknown, base: BondSettings): BondSettings {
  if (!raw || typeof raw !== 'object') return base;
  const v = raw as Record<string, unknown>;
  return {
    model:
      typeof v.model === 'string' && /^[\w.-]+\/[\w.-]+$/.test(v.model) ? v.model : base.model,
    maxOutputTokens:
      typeof v.maxOutputTokens === 'number' && Number.isFinite(v.maxOutputTokens)
        ? Math.max(64, Math.min(4000, Math.round(v.maxOutputTokens)))
        : base.maxOutputTokens,
    dailyMessageCap:
      typeof v.dailyMessageCap === 'number' && Number.isFinite(v.dailyMessageCap)
        ? Math.max(0, Math.min(10_000, Math.round(v.dailyMessageCap)))
        : base.dailyMessageCap,
    toneInstructions:
      typeof v.toneInstructions === 'string' ? v.toneInstructions.slice(0, 2000) : base.toneInstructions,
    modelEnabled: typeof v.modelEnabled === 'boolean' ? v.modelEnabled : base.modelEnabled,
    dailySpendCapUsd: clamp(v.dailySpendCapUsd, base.dailySpendCapUsd, 0, 10_000),
    anonymousTurnCap: clamp(v.anonymousTurnCap, base.anonymousTurnCap, 0, 1000),
    // Never let this reach 0 through the API: a 0/minute limit would lock out
    // every visitor, and "I typed a zero" should not be able to take the
    // product offline. The kill switch is the intentional way to stop Bond.
    ipRequestsPerMinute: clamp(v.ipRequestsPerMinute, base.ipRequestsPerMinute, 1, 1000),
    requireBotCheck:
      typeof v.requireBotCheck === 'boolean' ? v.requireBotCheck : base.requireBotCheck,
  };
}

/** Coerce an unknown into a bounded number, falling back when it is not one. */
function clamp(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

/** The effective settings for this request. */
export async function loadSettings(): Promise<BondSettings> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;

  const base = fromEnv();
  const sql = getSql();
  if (!sql) {
    cache = { value: base, at: now };
    return base;
  }

  try {
    const rows = (await sql`
      select setting_value from ai_settings where setting_name = ${SETTING_NAME} limit 1
    `) as Array<{ setting_value: unknown }>;
    const value = rows.length > 0 ? normalize(rows[0].setting_value, base) : base;
    cache = { value, at: now };
    return value;
  } catch (error) {
    // Database hiccup must not take Bond down — serve the env defaults.
    console.error('[coach] settings read failed, using env defaults', error);
    cache = { value: base, at: now };
    return base;
  }
}

/** Persist settings from the admin console. Returns what was actually stored. */
export async function saveSettings(patch: unknown): Promise<BondSettings> {
  const current = await loadSettings();
  const next = normalize(patch, current);

  const sql = getSql();
  if (!sql) throw new Error('no_database');

  await sql`
    insert into ai_settings (setting_name, setting_value, updated_at)
    values (${SETTING_NAME}, ${JSON.stringify(next)}::jsonb, now())
    on conflict (setting_name) do update
      set setting_value = excluded.setting_value, updated_at = now()
  `;

  // Invalidate immediately so the admin sees the change on the next turn
  // rather than up to CACHE_TTL_MS later.
  cache = { value: next, at: Date.now() };
  return next;
}

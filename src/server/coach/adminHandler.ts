/**
 * adminHandler.ts — the operator API behind the Bond admin console.
 *
 * GET  → effective settings, the live model catalogue with real prices, and
 *        what Bond has actually cost.
 * POST → change the settings.
 *
 * ⚠️ AUTHORISATION. This endpoint decides which model runs and how many
 * messages people get — direct control over spend, so writes are gated.
 *
 * A signed-in Bondable admin (`profiles.role = 'admin'`) is now the primary
 * proof. The shared `COACH_ADMIN_TOKEN` remains as a fallback only because the
 * console itself has not been moved onto the login yet; it is one secret for
 * everyone, revocable only by rotating it for everyone, and it goes away as
 * soon as the console signs in (backlog B8).
 *
 * With no token configured the endpoint is READ-ONLY. Refusing to write is the
 * safe default; refusing to read would leave the console blank in local dev
 * for no security benefit, since none of what it returns is a secret.
 */

import { isAdmin } from '../auth/profile';
import { isBotCheckConfigured } from './botCheck';
import { fetchCatalogue } from './catalogue';
import { hasDatabase } from './db';
import { isDeviceBudgetSecure } from './deviceBudget';
import { loadSettings, saveSettings } from './settings';
import { spentToday } from './spendGuard';
import { usageSummary } from './usage';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Constant-time-ish comparison, so the token cannot be guessed byte by byte. */
function tokenMatches(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * May this caller change Bond's settings?
 *
 * Two accepted proofs, in order of preference:
 *
 *  1. A signed-in Bondable admin (`profiles.role = 'admin'`). This is real
 *     identity: revocable per person, auditable, and tied to the same account
 *     that owns the clinical data.
 *  2. The shared `COACH_ADMIN_TOKEN`. A stopgap from before auth existed —
 *     one secret for everyone, revocable only by rotating it for everyone.
 *
 * The token path stays for now because the admin console still sends it and
 * the operator may not have a profile yet; it is a fallback, not an equal.
 * Once the console signs in, delete it (backlog B8).
 */
async function authorized(request: Request): Promise<boolean> {
  if (await isAdmin(request)) return true;

  const expected = process.env.COACH_ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.get('x-admin-token') ?? '';
  return tokenMatches(header, expected);
}

export async function handleCoachAdmin(request: Request): Promise<Response> {
  const apiKey = process.env.AI_GATEWAY_API_KEY ?? '';

  if (request.method === 'GET') {
    const [settings, models, usage] = await Promise.all([
      loadSettings(),
      apiKey ? fetchCatalogue(apiKey) : Promise.resolve([]),
      usageSummary(),
    ]);

    return json(200, {
      settings,
      models,
      usage,
      /** What the console needs to explain itself instead of failing silently. */
      status: {
        hasApiKey: Boolean(apiKey),
        hasDatabase: hasDatabase(),
        // Whether THIS caller can write, so the UI can disable the form rather
        // than let someone type a change that will be rejected. A signed-in
        // admin can always write; the shared token is the legacy path.
        writable: (await isAdmin(request)) || Boolean(process.env.COACH_ADMIN_TOKEN),
        gatewayUrl:
          process.env.COACH_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1/chat/completions',
        // Whether each protection layer is genuinely wired. A control that is
        // switched on in settings but has no secret behind it does nothing,
        // and the console must say so rather than imply protection.
        botCheckConfigured: isBotCheckConfigured(),
        deviceBudgetSecure: isDeviceBudgetSecure(),
        spentTodayUsd: await spentToday(),
      },
    });
  }

  if (request.method === 'POST') {
    if (!(await authorized(request))) {
      return json(401, {
        error: 'unauthorized',
        message: process.env.COACH_ADMIN_TOKEN
          ? 'Verkeerd admin-token.'
          : 'COACH_ADMIN_TOKEN is niet ingesteld; wijzigen is uitgeschakeld.',
      });
    }
    if (!hasDatabase()) {
      return json(503, {
        error: 'no_database',
        message: 'Geen database gekoppeld; instellingen kunnen niet bewaard worden.',
      });
    }

    let patch: unknown;
    try {
      patch = await request.json();
    } catch {
      return json(400, { error: 'bad_json', message: 'Ongeldige JSON.' });
    }

    try {
      const saved = await saveSettings(patch);
      return json(200, { settings: saved });
    } catch (error) {
      console.error('[coach-admin] save failed', error);
      return json(500, { error: 'save_failed', message: 'Bewaren mislukt.' });
    }
  }

  return json(405, { error: 'method_not_allowed' });
}

/**
 * adminHandler.ts — the operator API behind the Bond admin console.
 *
 * GET  → effective settings, the live model catalogue with real prices, and
 *        what Bond has actually cost.
 * POST → change the settings.
 *
 * ⚠️ AUTHORISATION. This endpoint decides which model runs and how many
 * messages people get — that is direct control over spend, so it is gated on a
 * shared secret (`COACH_ADMIN_TOKEN`) rather than left open. That is a
 * stopgap, honestly: a shared token is not identity, it cannot be revoked per
 * person and it cannot be audited. When real auth lands this must become a
 * role check on the signed-in superadmin (backlog B8).
 *
 * With no token configured the endpoint is READ-ONLY. Refusing to write is the
 * safe default; refusing to read would leave the console blank in local dev
 * for no security benefit, since none of what it returns is a secret.
 */

import { fetchCatalogue } from './catalogue';
import { hasDatabase } from './db';
import { loadSettings, saveSettings } from './settings';
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

function authorized(request: Request): boolean {
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
        // Whether writes are possible at all, so the UI can disable the form
        // rather than let someone type a change that will be rejected.
        writable: Boolean(process.env.COACH_ADMIN_TOKEN),
        gatewayUrl:
          process.env.COACH_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1/chat/completions',
      },
    });
  }

  if (request.method === 'POST') {
    if (!authorized(request)) {
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

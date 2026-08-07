/**
 * handler.ts — the server side of Bond.
 *
 * Transport-agnostic on purpose: it takes a standard `Request` and returns a
 * standard `Response`, so the exact same code runs as a Vercel function
 * (`api/coach.ts`) and inside the Vite dev server (`vite.config.ts`). One
 * implementation, no "works locally, breaks in prod" gap.
 *
 * WHY THIS EXISTS AT ALL: the model key must never reach the browser. Anything
 * prefixed `VITE_` is compiled into the client bundle and is therefore public.
 * `AI_GATEWAY_API_KEY` is read here and nowhere else.
 *
 * Provider: Vercel AI Gateway's OpenAI-compatible endpoint. That shape is
 * chosen because a Gateway key is what we have — it is a proxy credential, not
 * an Anthropic API key, and the Gateway does not expose Anthropic's native
 * Messages API. If we later hold an Anthropic key directly, swap the fetch in
 * `streamFromGateway` for `@anthropic-ai/sdk`; nothing else here changes.
 */

import { verifyHuman } from './botCheck';
import { priceFor } from './catalogue';
import { budgetCookie, readBudget } from './deviceBudget';
import { loadSettings, type BondSettings } from './settings';
import { checkSpend, invalidateSpendCache } from './spendGuard';
import { consume } from './throttle';
import { buildSystemPrompt } from './systemPrompt';
import {
  MAX_HISTORY_TURNS,
  MAX_MESSAGE_CHARS,
  type CoachContext,
  type CoachRequest,
  type CoachTurn,
} from './types';
import { hashUserKey, messagesLast24h, recordUsage } from './usage';

/**
 * OpenAI-compatible chat-completions endpoint. Overridable via
 * `COACH_GATEWAY_URL` so the same handler can point at a self-hosted proxy, a
 * different provider, or a local mock — which is also how the streaming path is
 * tested without spending real tokens.
 */
const GATEWAY_URL =
  process.env.COACH_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1/chat/completions';

/*
 * Model, output ceiling and daily cap are no longer constants here — they are
 * operator settings (see `settings.ts`), editable from the admin console and
 * enforced server-side, because a cost control the browser can set is not a
 * control.
 */

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                              */
/* -------------------------------------------------------------------------- */

/*
 * The in-memory `Map` limiter that used to live here has been removed.
 *
 * It counted per serverless instance, and Vercel runs many in parallel — each
 * starting empty — so concurrent requests simply spread across them and every
 * one got a fresh allowance. It read like protection and was not. Rate limiting
 * now lives in `throttle.ts`, shared through the database.
 */

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/* -------------------------------------------------------------------------- */
/* Input sanitisation                                                         */
/* -------------------------------------------------------------------------- */

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/**
 * Rebuild the context field by field.
 *
 * The client is not a trust boundary. Copying known fields (rather than
 * spreading and deleting) means an attacker-controlled body cannot smuggle an
 * extra key into the prompt, and a future field on the client can't leak here
 * until someone adds it on purpose.
 */
function sanitizeContext(raw: unknown): CoachContext | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const input = raw as Record<string, unknown>;
  const out: CoachContext = {};

  out.firstName = str(input.firstName, 60);
  out.therapistName = str(input.therapistName, 80);
  out.openTaskTitle = str(input.openTaskTitle, 140);
  out.lastTopic = str(input.lastTopic, 60);

  if (typeof input.openTaskCount === 'number' && Number.isFinite(input.openTaskCount)) {
    out.openTaskCount = Math.max(0, Math.min(999, Math.floor(input.openTaskCount)));
  }

  if (input.returningAfterQuiet === true) out.returningAfterQuiet = true;

  const direction = input.checkinDirection;
  if (
    direction === 'softening' ||
    direction === 'steady' ||
    direction === 'lifting' ||
    direction === 'unknown'
  ) {
    out.checkinDirection = direction;
  }

  const checkin = input.lastCheckin as Record<string, unknown> | undefined;
  if (checkin && typeof checkin.mood === 'number') {
    out.lastCheckin = {
      mood: Math.max(1, Math.min(5, Math.round(checkin.mood))),
      tags: Array.isArray(checkin.tags)
        ? checkin.tags.filter((t): t is string => typeof t === 'string').slice(0, 8)
        : [],
      daysAgo:
        typeof checkin.daysAgo === 'number' && Number.isFinite(checkin.daysAgo)
          ? Math.max(0, Math.min(365, Math.floor(checkin.daysAgo)))
          : 0,
    };
  }

  const session = input.nextSession as Record<string, unknown> | undefined;
  if (session && typeof session.daysUntil === 'number') {
    out.nextSession = {
      daysUntil: Math.max(0, Math.min(365, Math.floor(session.daysUntil))),
      providerName: str(session.providerName, 80),
    };
  }

  return out;
}

function sanitizeHistory(raw: unknown): CoachTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((turn): turn is Record<string, unknown> => !!turn && typeof turn === 'object')
    .map((turn) => ({
      role: turn.role === 'user' ? ('user' as const) : ('bond' as const),
      text: typeof turn.text === 'string' ? turn.text.slice(0, MAX_MESSAGE_CHARS) : '',
    }))
    .filter((turn) => turn.text.trim().length > 0)
    .slice(-MAX_HISTORY_TURNS);
}

/* -------------------------------------------------------------------------- */
/* Responses                                                                  */
/* -------------------------------------------------------------------------- */

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/* -------------------------------------------------------------------------- */
/* Gateway call                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Call the Gateway and re-emit the model's text as a plain UTF-8 stream.
 *
 * We deliberately do NOT proxy the provider's SSE envelope to the browser: the
 * client should not care which provider is behind this, and a plain text stream
 * is trivial to consume with a ReadableStream reader. Suggestion chips are
 * built client-side from context, so the model only ever produces prose — no
 * JSON to parse out of a half-finished stream.
 */
async function streamFromGateway(
  apiKey: string,
  settings: BondSettings,
  system: string,
  history: CoachTurn[],
  userKey: string,
  signal: AbortSignal,
): Promise<Response> {
  const model = settings.model;
  const upstream = await fetch(GATEWAY_URL, {
    method: 'POST',
    signal,
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: true,
      // Ask for token counts on the final frame so spend is recorded from what
      // was actually billed, rather than estimated from character counts.
      stream_options: { include_usage: true },
      max_tokens: settings.maxOutputTokens,
      messages: [
        { role: 'system', content: system },
        ...history.map((turn) => ({
          role: turn.role === 'user' ? 'user' : 'assistant',
          content: turn.text,
        })),
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    // Log server-side; never hand the provider's raw error to the browser —
    // it can carry account and routing details the client has no business with.
    console.error(`[coach] gateway ${upstream.status}: ${detail.slice(0, 500)}`);

    // A 403 is usually NOT a bad key — the Gateway also returns it when the
    // account's plan does not cover the requested model. Conflating the two
    // sends whoever is debugging to rotate a perfectly good key.
    const planBlocked =
      upstream.status === 403 &&
      /no_providers_available|do not have access|RestrictedModels/i.test(detail);

    if (planBlocked) {
      return jsonError(
        502,
        'model_not_allowed',
        `Het gateway-account mag "${model}" niet gebruiken. Kies een ander model of upgrade het plan.`,
      );
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return jsonError(502, 'gateway_auth', 'De AI-sleutel werd geweigerd.');
    }
    if (upstream.status === 404) {
      return jsonError(
        502,
        'gateway_model',
        `Model "${model}" bestaat niet op de gateway. Zet COACH_MODEL op een geldige slug.`,
      );
    }
    if (upstream.status === 429) {
      return jsonError(429, 'gateway_rate_limit', 'Even te druk. Probeer zo opnieuw.');
    }
    return jsonError(502, 'gateway_error', 'De AI-dienst antwoordde niet.');
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // Carries an incomplete trailing line between chunks — SSE frames are not
  // guaranteed to align with network chunk boundaries, so a `data:` line can
  // arrive split in two.
  let buffer = '';

  /**
   * A TransformStream, not a ReadableStream with a `pull`.
   *
   * With `pull`, a chunk that yields no text (the trailing `data: [DONE]` frame
   * is the common one) enqueues nothing, the consumer's pending read never
   * settles, and end-of-stream is never propagated — the response hangs open
   * until something times out and kills the socket. `pipeThrough` propagates
   * close and cancel for us, so a frame that produces no output is simply a
   * frame that produces no output.
   */
  let inputTokens = 0;
  let outputTokens = 0;

  const parseSse = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta) {
            controller.enqueue(encoder.encode(delta));
          }
          // The usage frame arrives last and carries no choices.
          const usage = parsed?.usage;
          if (usage) {
            inputTokens = Number(usage.prompt_tokens) || inputTokens;
            outputTokens = Number(usage.completion_tokens) || outputTokens;
          }
        } catch {
          // A malformed frame is not worth killing a live answer over.
        }
      }
    },

    /**
     * Record spend once the answer is complete.
     *
     * Not awaited: the reader is waiting on this to close the response, and a
     * slow analytics write must not hold the last token of someone's reply.
     */
    flush() {
      void (async () => {
        const price = await priceFor(apiKey, model).catch(() => null);
        const costUsd = price
          ? inputTokens * price.inputPerToken + outputTokens * price.outputPerToken
          : 0;
        await recordUsage({
          userKey,
          model,
          inputTokens,
          outputTokens,
          costUsd,
          ok: true,
        });
        // The spend ceiling reads a cached sum; drop it so the next request
        // (and the admin console) sees this reply's cost immediately. Without
        // this, a burst inside the cache window could overshoot the ceiling.
        invalidateSpendCache();
      })();
    },
  });

  return new Response(upstream.body.pipeThrough(parseSse), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      // Streamed token-by-token; a buffering proxy would defeat the point.
      'x-accel-buffering': 'no',
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export async function handleCoach(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError(405, 'method_not_allowed', 'Gebruik POST.');
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    // 503, not 500: the service is correctly built and simply not configured.
    // The client uses this exact code to fall back to scripted Bond.
    return jsonError(
      503,
      'not_configured',
      'AI_GATEWAY_API_KEY ontbreekt. Zet hem in .env.local (zonder VITE_-prefix).',
    );
  }

  const ip = clientIp(request);

  let body: CoachRequest;
  try {
    body = (await request.json()) as CoachRequest;
  } catch {
    return jsonError(400, 'bad_json', 'Ongeldige JSON.');
  }

  const history = sanitizeHistory(body.history);
  if (history.length === 0) {
    return jsonError(400, 'empty_history', 'Geen bericht om op te antwoorden.');
  }

  const settings = await loadSettings();

  // Operator kill switch. 503 rather than an error page: the client treats it
  // exactly like a missing key and falls back to the scripted companion, so
  // turning the model off degrades Bond instead of breaking it.
  if (!settings.modelEnabled) {
    return jsonError(503, 'model_disabled', 'Bond draait tijdelijk zonder AI-model.');
  }

  /* ── Protection layers ────────────────────────────────────────────────────
   *
   * Ordered cheapest-and-hardest first, so an attacker burns the least of our
   * resources before being turned away, and so a tripped ceiling never costs a
   * database round-trip it did not need.
   *
   *   4. global spend ceiling — the only guarantee; bounds the worst case
   *   1. bot check            — filters scripted traffic at the door
   *   3. shared IP throttle   — one database round-trip, catches bursts
   *   2. device budget        — the polite fence for ordinary visitors
   *
   * Layers 1–3 fail OPEN when their dependency is unreachable; layer 4 is what
   * makes that safe. See each module for the reasoning.
   */

  // ── 4. Global daily spend ceiling ──
  const spend = await checkSpend(settings.dailySpendCapUsd);
  if (spend.exceeded) {
    console.warn(`[coach] daily spend ceiling hit: $${spend.spent.toFixed(4)} / $${spend.cap}`);
    // Same code as the kill switch: the visitor gets the scripted companion,
    // not an error. They are not the ones who did anything wrong.
    return jsonError(503, 'model_disabled', 'Bond draait tijdelijk zonder AI-model.');
  }

  // ── 1. Bot check ──
  if (settings.requireBotCheck) {
    const check = await verifyHuman(str(body.botToken, 4000), ip);
    if (check.outcome === 'failed') {
      console.warn(`[coach] bot check failed: ${check.codes?.join(',') ?? 'unknown'}`);
      return jsonError(403, 'bot_check_failed', 'Verificatie mislukt. Herlaad de pagina.');
    }
  }

  // ── 3. Shared IP throttle ──
  const ipKey = await hashUserKey(ip);
  const burst = await consume({
    scope: 'ip',
    key: ipKey,
    windowSeconds: 60,
    max: settings.ipRequestsPerMinute,
  });
  if (!burst.allowed) {
    return jsonError(429, 'rate_limited', 'Te veel berichten na elkaar. Even wachten.');
  }

  // ── 2. Signed device budget ──
  const budget = await readBudget(request);
  const anonymousCapped =
    settings.anonymousTurnCap > 0 && budget.used >= settings.anonymousTurnCap;
  if (anonymousCapped) {
    // 402-ish in spirit but 429 in code: this is a quota, and the client turns
    // it into the "save your conversation" prompt rather than an error.
    return jsonError(
      429,
      'anonymous_cap',
      'Je hebt het gratis aantal berichten bereikt. Maak een account om verder te praten.',
    );
  }

  // Per-person daily message cap (independent of spend; an operator control
  // over volume rather than cost).
  const userKey = budget.deviceId ? await hashUserKey(budget.deviceId) : ipKey;
  if (settings.dailyMessageCap > 0) {
    const used = await messagesLast24h(userKey);
    if (used >= settings.dailyMessageCap) {
      return jsonError(
        429,
        'daily_cap',
        'Je hebt je dagelijkse aantal Bond-berichten bereikt.',
      );
    }
  }

  const system = buildSystemPrompt(
    sanitizeContext(body.context),
    str(body.summary, 2000),
    settings.toneInstructions,
  );

  try {
    const response = await streamFromGateway(
      apiKey,
      settings,
      system,
      history,
      userKey,
      request.signal,
    );

    // Spend the turn only on a response we are actually going to stream — a
    // gateway error should not cost the visitor part of their allowance.
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.append(
        'set-cookie',
        await budgetCookie({ ...budget, used: budget.used + 1 }, request),
      );
      // Let the client show "3 of 8 messages left" without a second request.
      headers.set('x-coach-turns-used', String(budget.used + 1));
      headers.set('x-coach-turns-cap', String(settings.anonymousTurnCap));
      return new Response(response.body, { status: response.status, headers });
    }

    return response;
  } catch (error) {
    console.error('[coach] unexpected failure', error);
    return jsonError(502, 'gateway_error', 'De AI-dienst was niet bereikbaar.');
  }
}

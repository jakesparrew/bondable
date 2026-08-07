/**
 * coachClient.ts — browser side of `/api/coach`.
 *
 * Reads a plain UTF-8 text stream and hands over deltas as they arrive. There
 * is no provider SDK in the browser and no API key: the endpoint is the only
 * thing this file knows about, by design.
 *
 * Failure is a first-class outcome here, not an exception to swallow. Bond is
 * a mental-health surface; "the model is unavailable" must degrade to the
 * scripted companion rather than to a spinner that never resolves or an error
 * toast in the middle of someone's sentence. Every failure path returns a
 * typed reason so the caller can decide.
 */

import type { CoachContext, CoachTurn } from '@/server/coach/types';

export type CoachFailure =
  /** No AI_GATEWAY_API_KEY on the server — expected until the key is wired. */
  | 'not_configured'
  /**
   * The model is deliberately off: operator kill switch, or the daily spend
   * ceiling tripped. Behaves like `not_configured` for the visitor (scripted
   * fallback), but is a distinct reason so a silent ceiling hit is not
   * misfiled as a network problem when someone goes looking.
   */
  | 'disabled'
  /** Endpoint missing entirely (static preview, or dev middleware not loaded). */
  | 'unavailable'
  /** Too many messages too fast. */
  | 'rate_limited'
  /**
   * The free anonymous allowance is spent. NOT an error — this is the moment
   * the "save your conversation" prompt is meant to appear, so the caller must
   * treat it as a conversion point rather than a failure to apologise for.
   */
  | 'anonymous_cap'
  /** Bot check rejected the request. */
  | 'bot_check_failed'
  /** Network dropped, or the provider errored. */
  | 'network';

export interface CoachResult {
  /** Whatever text arrived. Empty when the call failed before any output. */
  text: string;
  /** Absent on success. When set, the caller should fall back. */
  failure?: CoachFailure;
  /** Turns spent on this device, when the server reported them. */
  turnsUsed?: number;
  /** The anonymous allowance, 0 when unlimited. */
  turnsCap?: number;
}

export interface CoachOptions {
  history: CoachTurn[];
  context?: CoachContext;
  summary?: string;
  /** Turnstile token, when a bot check is configured. */
  botToken?: string;
  /** Called with each chunk of text as it streams in. */
  onDelta?: (delta: string) => void;
  signal?: AbortSignal;
}

/** How long to wait for the first byte before giving up and falling back. */
const REQUEST_TIMEOUT_MS = 30_000;

export async function streamCoachReply(options: CoachOptions): Promise<CoachResult> {
  const { history, context, summary, botToken, onDelta, signal } = options;

  const timeout = new AbortController();
  const timer = window.setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  // Abort if either the caller cancels or the timeout fires.
  const onAbort = () => timeout.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ history, context, summary, botToken }),
      // Send and accept the signed device-budget cookie. Without this the
      // allowance silently resets on every request in cross-origin setups.
      credentials: 'same-origin',
      signal: timeout.signal,
    });

    if (!response.ok) {
      // 404 means the route isn't served at all (e.g. a plain static build),
      // which is a different problem from a server that answered with an error.
      if (response.status === 404) return { text: '', failure: 'unavailable' };

      const body = await response.json().catch(() => null);

      if (response.status === 429) {
        // Distinguish "slow down" from "your free turns are spent" — they call
        // for completely different UI, and conflating them turns a conversion
        // moment into an error message.
        return {
          text: '',
          failure: body?.error === 'anonymous_cap' ? 'anonymous_cap' : 'rate_limited',
        };
      }
      if (response.status === 403 && body?.error === 'bot_check_failed') {
        return { text: '', failure: 'bot_check_failed' };
      }
      if (body?.error === 'not_configured') {
        return { text: '', failure: 'not_configured' };
      }
      if (body?.error === 'model_disabled') {
        return { text: '', failure: 'disabled' };
      }
      return { text: '', failure: 'network' };
    }

    if (!response.body) return { text: '', failure: 'network' };

    const turnsUsed = Number(response.headers.get('x-coach-turns-used'));
    const turnsCap = Number(response.headers.get('x-coach-turns-cap'));

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const delta = decoder.decode(value, { stream: true });
      if (!delta) continue;
      text += delta;
      onDelta?.(delta);
    }

    // A 200 that produced nothing is a failure from the user's point of view —
    // an empty bubble is worse than the scripted reply.
    if (!text.trim()) return { text: '', failure: 'network' };

    return {
      text,
      turnsUsed: Number.isFinite(turnsUsed) ? turnsUsed : undefined,
      turnsCap: Number.isFinite(turnsCap) ? turnsCap : undefined,
    };
  } catch {
    return { text: '', failure: 'network' };
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

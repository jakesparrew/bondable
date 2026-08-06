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
  /** Endpoint missing entirely (static preview, or dev middleware not loaded). */
  | 'unavailable'
  /** Too many messages too fast. */
  | 'rate_limited'
  /** Network dropped, or the provider errored. */
  | 'network';

export interface CoachResult {
  /** Whatever text arrived. Empty when the call failed before any output. */
  text: string;
  /** Absent on success. When set, the caller should fall back. */
  failure?: CoachFailure;
}

export interface CoachOptions {
  history: CoachTurn[];
  context?: CoachContext;
  summary?: string;
  /** Called with each chunk of text as it streams in. */
  onDelta?: (delta: string) => void;
  signal?: AbortSignal;
}

/** How long to wait for the first byte before giving up and falling back. */
const REQUEST_TIMEOUT_MS = 30_000;

export async function streamCoachReply(options: CoachOptions): Promise<CoachResult> {
  const { history, context, summary, onDelta, signal } = options;

  const timeout = new AbortController();
  const timer = window.setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  // Abort if either the caller cancels or the timeout fires.
  const onAbort = () => timeout.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ history, context, summary }),
      signal: timeout.signal,
    });

    if (!response.ok) {
      // 404 means the route isn't served at all (e.g. a plain static build),
      // which is a different problem from a server that answered with an error.
      if (response.status === 404) return { text: '', failure: 'unavailable' };
      if (response.status === 429) return { text: '', failure: 'rate_limited' };

      const body = await response.json().catch(() => null);
      if (body?.error === 'not_configured') {
        return { text: '', failure: 'not_configured' };
      }
      return { text: '', failure: 'network' };
    }

    if (!response.body) return { text: '', failure: 'network' };

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

    return { text };
  } catch {
    return { text: '', failure: 'network' };
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

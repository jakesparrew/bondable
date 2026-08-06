/**
 * types.ts — the wire contract between the Bond client and `/api/coach`.
 *
 * Deliberately duplicated from `BondContext` in `src/components/bond/bondEngine.ts`
 * rather than imported: that module pulls in i18next and other browser-only
 * code, and this file has to be loadable inside a serverless function. The two
 * shapes are structurally identical, so the client passes its context straight
 * through and TypeScript still checks the call site.
 *
 * WHITELIST, NOT BLACKLIST. Every field the model is allowed to see is named
 * here. A new column on a client record can never leak into a prompt by
 * accident — someone has to add it to this file on purpose. Sanitisation on the
 * server (`sanitizeContext`) enforces it a second time, because the client is
 * not a trust boundary.
 *
 * Explicitly NOT here, and not to be added without a deliberate decision:
 * session notes. Those are the provider's clinical record. A client receiving
 * an AI paraphrase of what their therapist wrote about them is an incident,
 * not a feature.
 */

/** The last check-in, as Bond remembers it. */
export interface CoachCheckinMemory {
  /** 1–5. */
  mood: number;
  /** Theme ids: slaap, energie, stress, contact, piekeren… */
  tags: string[];
  /** Whole days ago (0 = today, 1 = yesterday). */
  daysAgo: number;
}

/** The upcoming session, as Bond remembers it. */
export interface CoachSessionMemory {
  daysUntil: number;
  providerName?: string;
}

/** Everything the model is permitted to know about the person it is talking to. */
export interface CoachContext {
  firstName?: string;
  therapistName?: string;
  openTaskCount?: number;
  openTaskTitle?: string;
  lastCheckin?: CoachCheckinMemory;
  checkinDirection?: 'softening' | 'steady' | 'lifting' | 'unknown';
  returningAfterQuiet?: boolean;
  nextSession?: CoachSessionMemory;
  lastTopic?: string;
}

/** One turn of the conversation as sent to the server. */
export interface CoachTurn {
  role: 'user' | 'bond';
  text: string;
}

/** Request body for POST /api/coach. */
export interface CoachRequest {
  /** Oldest → newest. The server trims this; the client should too. */
  history: CoachTurn[];
  context?: CoachContext;
  /**
   * A rolling summary of everything older than `history`, produced by an
   * earlier call. Keeps long-term continuity without resending the whole
   * conversation on every turn.
   */
  summary?: string;
}

/** How many turns of raw history the server will forward to the model. */
export const MAX_HISTORY_TURNS = 20;

/** Hard cap on a single message, in characters. Anything longer is truncated. */
export const MAX_MESSAGE_CHARS = 4000;

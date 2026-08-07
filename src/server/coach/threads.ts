/**
 * threads.ts — persistence for a signed-in user's Coach conversation.
 *
 * Ownership model: the CLIENT is the source of truth for the thread. It holds
 * the full message objects (ids, timestamps, crisis flags) and PUTs the whole
 * thread after each completed reply. The server validates, trims and stores.
 * The alternative — the coach handler appending to the stored thread per turn —
 * was rejected because the server only ever sees the sanitised turn shapes,
 * so restores would lose ids and timestamps, and a client whose local state
 * diverged (cleared storage, anonymous turns before signup) would fork the
 * thread invisibly.
 *
 * What the SERVER owns is the rolling summary: it requires a model call, the
 * prompt for it must not be client-supplied, and /api/coach reads it
 * server-side — three reasons it cannot live in the browser.
 */

import { getSql } from './db';
import { MAX_MESSAGE_CHARS } from './types';

/** The client's own message shape, stored losslessly. */
export interface StoredMessage {
  id: string;
  role: 'bond' | 'user';
  text: string;
  createdAt: string;
  crisis?: boolean;
}

export interface StoredThread {
  messages: StoredMessage[];
  summary: string | null;
  updatedAt: string;
}

/**
 * Hard cap on stored messages. Bond trims the model's context far below this;
 * the extra headroom exists purely so the user's visible history reaches back
 * further than the model's memory does.
 */
const MAX_STORED_MESSAGES = 200;

/** Re-summarise once the thread outgrows the window by this many messages. */
const SUMMARY_THRESHOLD = 28;
const SUMMARY_STEP = 12;
/** Messages the summary deliberately leaves out: the model sees these raw. */
const SUMMARY_TAIL = 12;

/** Validate one message from the wire. Returns null for anything malformed. */
function sanitizeMessage(raw: unknown): StoredMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (m.role !== 'bond' && m.role !== 'user') return null;
  if (typeof m.text !== 'string' || !m.text.trim()) return null;
  return {
    id: typeof m.id === 'string' ? m.id.slice(0, 80) : crypto.randomUUID(),
    role: m.role,
    text: m.text.slice(0, MAX_MESSAGE_CHARS),
    createdAt:
      typeof m.createdAt === 'string' ? m.createdAt.slice(0, 40) : new Date().toISOString(),
    ...(m.crisis === true ? { crisis: true } : {}),
  };
}

/** Validate a whole incoming thread; malformed entries are dropped, not fatal. */
export function sanitizeMessages(raw: unknown): StoredMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeMessage)
    .filter((m): m is StoredMessage => m !== null)
    .slice(-MAX_STORED_MESSAGES);
}

export async function loadThread(authUserId: string): Promise<StoredThread | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = (await sql`
      select messages, summary, updated_at from coach_threads
      where auth_user_id = ${authUserId}::uuid limit 1
    `) as Array<{ messages: unknown; summary: string | null; updated_at: string }>;
    if (rows.length === 0) return null;
    return {
      messages: sanitizeMessages(rows[0].messages),
      summary: rows[0].summary,
      updatedAt: new Date(rows[0].updated_at).toISOString(),
    };
  } catch (error) {
    console.error('[coach-thread] load failed', error);
    return null;
  }
}

/** The stored summary only — what /api/coach needs per turn. */
export async function loadSummary(authUserId: string): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = (await sql`
      select summary from coach_threads where auth_user_id = ${authUserId}::uuid limit 1
    `) as Array<{ summary: string | null }>;
    return rows[0]?.summary ?? null;
  } catch {
    return null;
  }
}

export async function saveThread(
  authUserId: string,
  messages: StoredMessage[],
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await sql`
      insert into coach_threads (auth_user_id, messages, updated_at)
      values (${authUserId}::uuid, ${JSON.stringify(messages)}::jsonb, now())
      on conflict (auth_user_id) do update
        set messages = excluded.messages, updated_at = now()
    `;
    return true;
  } catch (error) {
    console.error('[coach-thread] save failed', error);
    return false;
  }
}

/** The user's erase button. A hard delete — this is Art. 9-adjacent content. */
export async function deleteThread(authUserId: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await sql`delete from coach_threads where auth_user_id = ${authUserId}::uuid`;
    return true;
  } catch (error) {
    console.error('[coach-thread] delete failed', error);
    return false;
  }
}

/**
 * Refresh the rolling summary when the thread has outgrown it.
 *
 * Runs AFTER the thread is saved, awaited by the PUT handler (an edge runtime
 * may kill work that outlives the response, so fire-and-forget is not a real
 * option there). It is rare by construction: first at message 28, then every
 * 12 messages — so the occasional slower save buys continuity beyond the
 * model's raw window.
 *
 * The summary is written in Dutch and instructed to carry themes and agreed
 * next steps, never a diagnosis — same boundary as the system prompt.
 */
export async function maybeSummarize(
  authUserId: string,
  messages: StoredMessage[],
  apiKey: string,
  model: string,
  gatewayUrl: string,
): Promise<void> {
  if (!apiKey || messages.length < SUMMARY_THRESHOLD) return;

  const sql = getSql();
  if (!sql) return;

  try {
    const rows = (await sql`
      select summarized_count, summary from coach_threads
      where auth_user_id = ${authUserId}::uuid limit 1
    `) as Array<{ summarized_count: number; summary: string | null }>;
    const summarizedCount = rows[0]?.summarized_count ?? 0;
    const previousSummary = rows[0]?.summary ?? null;

    const targetCount = messages.length - SUMMARY_TAIL;
    if (targetCount - summarizedCount < SUMMARY_STEP) return;

    const toSummarize = messages.slice(0, targetCount);
    const transcript = toSummarize
      .map((m) => `${m.role === 'user' ? 'Cliënt' : 'Bond'}: ${m.text}`)
      .join('\n');

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 350,
        messages: [
          {
            role: 'system',
            content:
              'Vat dit begeleidende gesprek samen in maximaal 150 woorden Nederlands. ' +
              'Bewaar: terugkerende thema’s, wat de persoon belangrijk vindt, concrete afspraken of oefeningen, en de emotionele lijn. ' +
              'Geen diagnoses, geen advies, geen opsomming van elke beurt. Schrijf in de derde persoon ("de persoon ..."). ' +
              (previousSummary ? `Eerdere samenvatting om op voort te bouwen:\n${previousSummary}` : ''),
          },
          { role: 'user', content: transcript },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`[coach-thread] summary call failed: ${response.status}`);
      return;
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary = body.choices?.[0]?.message?.content?.trim();
    if (!summary) return;

    await sql`
      update coach_threads
      set summary = ${summary.slice(0, 2000)}, summarized_count = ${targetCount}, updated_at = now()
      where auth_user_id = ${authUserId}::uuid
    `;
  } catch (error) {
    // A failed summary costs continuity, never a conversation.
    console.error('[coach-thread] summarize failed', error);
  }
}

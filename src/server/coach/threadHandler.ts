/**
 * threadHandler.ts — serves /api/coach-thread: the saved conversation.
 *
 * GET    → the signed-in caller's stored thread (or `thread: null`).
 * PUT    → replace the stored thread with the client's copy. The client owns
 *          the thread (see threads.ts for why); this is called after each
 *          completed reply and once at signup to adopt the anonymous
 *          conversation — the moment Bond's "dan bewaar ik dit gesprek"
 *          promise is kept.
 * DELETE → the user's erase button. Hard delete.
 *
 * Every verb requires a session. There is no admin view into these threads,
 * deliberately: this is Art. 9-adjacent content, and the operator's job is
 * running the service, not reading conversations.
 */

import { getServerSession } from '../auth/session';
import { loadSettings } from './settings';
import {
  deleteThread,
  loadThread,
  maybeSummarize,
  sanitizeMessages,
  saveThread,
} from './threads';

const GATEWAY_URL =
  process.env.COACH_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1/chat/completions';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function handleCoachThread(request: Request): Promise<Response> {
  const session = await getServerSession(request);
  if (!session) {
    return json(401, { error: 'unauthorized', message: 'Niet ingelogd.' });
  }
  const userId = session.user.id;

  if (request.method === 'GET') {
    const thread = await loadThread(userId);
    return json(200, { thread });
  }

  if (request.method === 'PUT') {
    let body: { messages?: unknown } = {};
    try {
      body = (await request.json()) as { messages?: unknown };
    } catch {
      return json(400, { error: 'bad_json', message: 'Ongeldige JSON.' });
    }

    const messages = sanitizeMessages(body.messages);
    if (messages.length === 0) {
      // An empty PUT is almost certainly a client bug; the explicit way to
      // clear a thread is DELETE, and guessing here risks wiping a real
      // conversation on a glitch.
      return json(400, { error: 'empty_thread', message: 'Lege thread; gebruik DELETE om te wissen.' });
    }

    const saved = await saveThread(userId, messages);
    if (!saved) {
      return json(503, { error: 'save_failed', message: 'Opslaan mislukt.' });
    }

    // Awaited on purpose: an edge runtime may kill work that outlives the
    // response. It is cheap in the common case — maybeSummarize checks its
    // thresholds before doing anything expensive.
    const settings = await loadSettings();
    const apiKey = process.env.AI_GATEWAY_API_KEY ?? '';
    await maybeSummarize(userId, messages, apiKey, settings.model, GATEWAY_URL);

    return json(200, { saved: true, count: messages.length });
  }

  if (request.method === 'DELETE') {
    const deleted = await deleteThread(userId);
    return deleted
      ? json(200, { deleted: true })
      : json(503, { error: 'delete_failed', message: 'Wissen mislukt.' });
  }

  return json(405, { error: 'method_not_allowed' });
}

/**
 * coachThreadClient.ts — browser side of /api/coach-thread.
 *
 * The client owns the thread (full message objects); the server stores it and
 * maintains the rolling summary. Three verbs, all requiring the API token:
 * load on page mount, save after each completed reply (and once at signup, to
 * adopt the anonymous conversation), delete when the user erases.
 *
 * All failures resolve to a harmless value rather than throwing: a save that
 * fails costs at most the latest exchange after a reload, and surfacing that
 * as an error mid-conversation would be worse than the loss.
 */

import type { BondMessage } from '@/components/bond/bondEngine';

export async function loadServerThread(authToken: string): Promise<BondMessage[] | null> {
  try {
    const response = await fetch('/api/coach-thread', {
      headers: { authorization: `Bearer ${authToken}` },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { thread: { messages: BondMessage[] } | null };
    return body.thread?.messages ?? null;
  } catch {
    return null;
  }
}

export async function saveServerThread(
  authToken: string,
  messages: BondMessage[],
): Promise<boolean> {
  if (messages.length === 0) return false;
  try {
    const response = await fetch('/api/coach-thread', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ messages }),
      // Survive a tab close right after the reply: the browser may finish the
      // request in the background instead of aborting it.
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** The user's erase button — see threadHandler.ts for why this is a hard delete. */
export async function deleteServerThread(authToken: string): Promise<boolean> {
  try {
    const response = await fetch('/api/coach-thread', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${authToken}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

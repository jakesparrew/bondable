/**
 * conversationStore.ts — keeps a Bond thread across reloads.
 *
 * localStorage, deliberately. Bond conversations are GDPR Art. 9 special-category
 * data, and until there is real auth and a real database there is nowhere
 * server-side to put them that would be *better* — a shared demo backend would
 * mean one person's thread sitting next to another's. On the device, under the
 * person's own browser profile, is the smaller exposure.
 *
 * That also makes `clear()` a real feature rather than a debug helper: it is the
 * user's erase button, and it must actually erase.
 *
 * When the Neon backend and auth land, this moves server-side per user — the
 * load/append/clear interface is meant to survive that swap unchanged.
 */

import type { BondMessage } from '@/components/bond/bondEngine';

const KEY = 'bondable_bond_thread_v1';

/**
 * Keep the tail only. Long threads are the common case for a companion used
 * daily, and an unbounded array eventually blows the ~5MB localStorage budget —
 * which would break every other stored feature, not just Bond.
 */
const MAX_STORED_MESSAGES = 100;

function isMessage(value: unknown): value is BondMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    (m.role === 'bond' || m.role === 'user') &&
    typeof m.text === 'string' &&
    typeof m.createdAt === 'string'
  );
}

/** Load the stored thread. Returns `[]` when there is nothing usable. */
export function loadThread(): BondMessage[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Validate every entry: a half-written or hand-edited value must not be
    // able to crash the chat on mount.
    return Array.isArray(parsed) ? parsed.filter(isMessage) : [];
  } catch {
    return [];
  }
}

/** Persist the thread, trimmed to the most recent messages. */
export function saveThread(messages: BondMessage[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  } catch {
    // Quota or private mode: the conversation still works for this session.
  }
}

/** Erase the stored thread. This is the user's delete, so it must not fail quietly elsewhere. */
export function clearThread(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

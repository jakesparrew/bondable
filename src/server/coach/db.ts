/**
 * db.ts — the Neon connection used by the Bond server code.
 *
 * Separate from `src/server/db/index.ts` (the Drizzle setup, which no app file
 * imports yet) because this path has to run inside an Edge function: it uses
 * the HTTP driver only, no connection pooling, no Node APIs.
 *
 * Everything here is fail-soft by design. Bond must keep answering when the
 * database is unreachable — settings fall back to environment defaults and
 * usage simply goes unrecorded. A missing analytics row is not a reason to
 * refuse someone a conversation.
 */

import { neon } from '@neondatabase/serverless';

/**
 * Read DATABASE_URL, tolerating the quotes that `KEY="value"` lines leave
 * behind. Some tooling strips them, some doesn't; `neon()` rejects the quoted
 * form with a confusing "not a valid URL" that points at the wrong problem.
 */
function connectionString(): string | null {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^["']|["']$/g, '');
  return cleaned || null;
}

type SqlClient = ReturnType<typeof neon>;

let cached: SqlClient | null | undefined;

/** The SQL client, or `null` when no database is configured. */
export function getSql(): SqlClient | null {
  if (cached !== undefined) return cached;
  const url = connectionString();
  if (!url) {
    cached = null;
    return null;
  }
  try {
    cached = neon(url);
  } catch (error) {
    console.error('[coach] invalid DATABASE_URL', error);
    cached = null;
  }
  return cached;
}

/** True when a database is configured — used to tell the admin UI what is live. */
export function hasDatabase(): boolean {
  return getSql() !== null;
}

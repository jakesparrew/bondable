/**
 * apply-migration.mjs — apply one SQL file to the Neon database.
 *
 * Usage:  node scripts/apply-migration.mjs drizzle/0011_better_auth.sql
 *
 * This project has no migration runner wired yet, and the last three
 * migrations were applied with hand-written throwaway one-liners. That is how
 * a table gets dropped by accident, so the steps are captured here instead:
 * read DATABASE_URL the same way every other server module does, split on
 * statement boundaries, run each one in order, and stop at the first failure.
 *
 * Migrations are expected to be idempotent (CREATE ... IF NOT EXISTS), because
 * without a runner there is no ledger of what already ran.
 */

import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const file = process.argv[2];
if (!file) {
  console.error('gebruik: node scripts/apply-migration.mjs <pad/naar/migratie.sql>');
  process.exit(2);
}

/** Same quote-tolerant read as src/server/coach/db.ts. */
function connectionString() {
  const fromEnv = process.env.DATABASE_URL;
  const raw =
    fromEnv ??
    fs
      .readFileSync('.env.local', 'utf8')
      .split('\n')
      .find((l) => l.startsWith('DATABASE_URL='))
      ?.split('=')
      .slice(1)
      .join('=');
  if (!raw) throw new Error('DATABASE_URL niet gevonden (env of .env.local)');
  return raw.trim().replace(/^["']|["']$/g, '');
}

/**
 * Split into statements on semicolons that end a line.
 *
 * Deliberately simple, and safe for the migrations in this repo: it would
 * mis-split a semicolon inside a string literal or a $$-quoted function body,
 * so if a future migration needs either, give it its own file rather than
 * making this cleverer.
 */
function statements(sql) {
  return sql
    .split(/;\s*$/m)
    .map((s) =>
      s
        .split('\n')
        .filter((line) => !/^\s*--/.test(line))
        .join('\n')
        .trim(),
    )
    .filter(Boolean);
}

const sql = neon(connectionString());
const parts = statements(fs.readFileSync(file, 'utf8'));

console.log(`${file}: ${parts.length} statements`);

for (const [i, statement] of parts.entries()) {
  const label = statement.split('\n')[0].slice(0, 62);
  try {
    await sql.query(statement);
    console.log(`  ${String(i + 1).padStart(2)}. ok   ${label}`);
  } catch (error) {
    console.error(`  ${String(i + 1).padStart(2)}. FOUT ${label}`);
    console.error(`      ${error.message}`);
    process.exit(1);
  }
}

console.log('klaar.');

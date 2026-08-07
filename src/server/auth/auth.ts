/**
 * auth.ts — the Better Auth instance, and the only place credentials are handled.
 *
 * WHY THIS EXISTS: `supabase.auth.*` (36 call sites) resolves to a mock that
 * hands back the same fake user regardless of what anyone types, and in a
 * production build to a Supabase project whose domain no longer resolves. There
 * is no real login anywhere in the app today. This replaces it.
 *
 * ── Table naming ──────────────────────────────────────────────────────────
 * The tables are named `auth_user`, `auth_session`, `auth_account` and
 * `auth_verification` rather than Better Auth's defaults (`user`, `session`,
 * `account`, `verification`).
 *
 * That is not cosmetic. This database ALREADY has a `sessions` table holding
 * therapy sessions — real appointments between a client and their provider.
 * Better Auth's default `session` differs from it by one letter. A migration
 * that guesses wrong about which one it owns would drop clinical data, and no
 * amount of care at review time is worth relying on when a prefix removes the
 * ambiguity entirely.
 *
 * ── Relationship to `profiles` ───────────────────────────────────────────
 * `auth_user` holds credentials and nothing else. Everything about the PERSON
 * — name, role, avatar, emergency contact — stays in `profiles`, linked by id.
 * Health-adjacent profile data has no business sitting in a credentials table,
 * and keeping them apart means an auth library upgrade can never reshape a
 * clinical record.
 */

import { Pool } from '@neondatabase/serverless';
import { betterAuth } from 'better-auth';

/**
 * Read DATABASE_URL, tolerating the quotes a `KEY="value"` line leaves behind.
 * Same normalisation as `src/server/coach/db.ts` — the driver rejects the
 * quoted form with a "not a valid URL" that points at the wrong problem.
 */
function connectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error(
      'DATABASE_URL ontbreekt. Auth kan niet starten zonder database.',
    );
  }
  return raw.trim().replace(/^["']|["']$/g, '');
}

export const auth = betterAuth({
  database: new Pool({ connectionString: connectionString() }),

  /**
   * Signing key for session tokens. Rotating it logs everyone out — which is
   * the correct behaviour, and the reason it must be a real secret in
   * production rather than a value derived from something guessable.
   */
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3002',

  emailAndPassword: {
    enabled: true,
    /**
     * Verification is required, but the email that carries it cannot be sent
     * until Resend has a verified sending domain (backlog B1). `sendVerificationEmail`
     * is wired below and currently logs instead of sending; flipping this to
     * `true` before mail works would lock every new account out on signup.
     */
    requireEmailVerification: false,
    minPasswordLength: 10,
  },

  user: { modelName: 'auth_user' },
  session: { modelName: 'auth_session' },
  account: { modelName: 'auth_account' },
  verification: { modelName: 'auth_verification' },
});

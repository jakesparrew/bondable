/**
 * profile.ts — from "who is logged in" to "what may they do here".
 *
 * Two different questions, deliberately answered by two modules:
 *   `session.ts` → is there a valid login? (Neon Auth's business)
 *   this file    → which Bondable person is that, and what is their role?
 *
 * The role lives in `profiles.role`, not in the auth provider. That matters:
 * `neon_auth.user` has its own `role` column ('user' | 'admin') which is Neon's
 * notion of an admin, not Bondable's. Trusting it would mean an account that is
 * an admin of the auth project becomes an admin of the clinical data — two
 * unrelated permissions collapsed into one.
 */

import { getSql } from '../coach/db';
import { getServerSession } from './session';

/** The Bondable roles, as stored in `profiles.role`. */
export type BondableRole = 'client' | 'therapist' | 'admin';

export interface ServerProfile {
  /** `profiles.id` — the uuid all 231 existing data calls key on. */
  id: string;
  email: string | null;
  role: BondableRole;
  firstName: string | null;
  lastName: string | null;
  /** The Neon Auth user id this profile is attached to. */
  authUserId: string;
}

/**
 * The signed-in person's Bondable profile, or `null`.
 *
 * `null` covers every failure the caller should treat identically: no session,
 * a session whose user has no profile yet (signed up but onboarding unfinished),
 * or the database being unreachable. None of those may be treated as "allowed".
 */
export async function getServerProfile(request: Request): Promise<ServerProfile | null> {
  const session = await getServerSession(request);
  if (!session) return null;

  const sql = getSql();
  if (!sql) return null;

  try {
    const rows = (await sql`
      select id, email, role, first_name, last_name, auth_user_id
      from profiles
      where auth_user_id = ${session.user.id}::uuid
      limit 1
    `) as Array<{
      id: string;
      email: string | null;
      role: string;
      first_name: string | null;
      last_name: string | null;
      auth_user_id: string;
    }>;

    const row = rows[0];
    if (!row) return null;

    // Anything unrecognised falls back to the LEAST privileged role rather than
    // being passed through — a typo or a new enum value must never widen access.
    const role: BondableRole =
      row.role === 'admin' || row.role === 'therapist' ? row.role : 'client';

    return {
      id: row.id,
      email: row.email,
      role,
      firstName: row.first_name,
      lastName: row.last_name,
      authUserId: row.auth_user_id,
    };
  } catch (error) {
    console.error('[auth] profile lookup failed', error);
    return null;
  }
}

/** True when the caller is a signed-in Bondable admin. */
export async function isAdmin(request: Request): Promise<boolean> {
  const profile = await getServerProfile(request);
  return profile?.role === 'admin';
}

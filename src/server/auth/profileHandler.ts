/**
 * profileHandler.ts — serves /api/profile: the bridge from a login to a person.
 *
 * GET  → the signed-in caller's Bondable profile (or `profile: null`).
 * POST → ensure a profile exists for the signed-in caller. Idempotent: if one
 *        is already linked, it is returned untouched — re-posting can never
 *        overwrite a profile.
 *
 * Two rules here are security decisions, not conveniences:
 *
 * 1. Role is capped at client/therapist. `admin` cannot be self-assigned
 *    through a public endpoint under any circumstances; admin is granted by
 *    hand in the database. Anything unrecognised becomes 'client'.
 *
 * 2. Linking to a PRE-EXISTING profile by email (the provider-invited-client
 *    flow: the provider created the profile, the client signs up later with
 *    the same address) happens ONLY when the session's email is verified.
 *    Without that gate, anyone could sign up with a victim's address —
 *    unverified — and be attached to their clinical record. Unverified
 *    signups get a fresh profile instead; the invited one can be linked
 *    later once the address is confirmed.
 */

import { getSql } from '../coach/db';
import { getServerProfile, type ServerProfile } from './profile';
import { getServerSession } from './session';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function shape(profile: ServerProfile) {
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
  };
}

export async function handleProfile(request: Request): Promise<Response> {
  const session = await getServerSession(request);
  if (!session) {
    return json(401, { error: 'unauthorized', message: 'Niet ingelogd.' });
  }

  if (request.method === 'GET') {
    const profile = await getServerProfile(request);
    return json(200, { profile: profile ? shape(profile) : null });
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const sql = getSql();
  if (!sql) {
    return json(503, { error: 'no_database', message: 'Geen database gekoppeld.' });
  }

  // Idempotency first: an existing link wins over anything in the body.
  const existing = await getServerProfile(request);
  if (existing) return json(200, { profile: shape(existing), created: false });

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // An empty body is fine — everything has a default.
  }

  // Rule 1: never admin via self-serve.
  const role = body.role === 'therapist' ? 'therapist' : 'client';

  const str = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

  // Name preference: explicit body values, else split the auth display name.
  const nameParts = (session.user.name ?? '').trim().split(/\s+/).filter(Boolean);
  const firstName = str(body.firstName, 60) ?? nameParts[0] ?? null;
  const lastName = str(body.lastName, 80) ?? (nameParts.slice(1).join(' ') || null);

  try {
    // Rule 2: adopt a provider-invited profile only on a VERIFIED address.
    if (session.user.email && session.user.emailVerified) {
      const invited = (await sql`
        update profiles
        set auth_user_id = ${session.user.id}::uuid
        where auth_user_id is null
          and lower(email) = lower(${session.user.email})
          and id = (
            select id from profiles
            where auth_user_id is null and lower(email) = lower(${session.user.email})
            order by created_at asc limit 1
          )
        returning id, email, role, first_name, last_name, auth_user_id
      `) as Array<{
        id: string; email: string | null; role: string;
        first_name: string | null; last_name: string | null; auth_user_id: string;
      }>;

      if (invited.length > 0) {
        const p = invited[0];
        return json(200, {
          profile: {
            id: p.id,
            email: p.email,
            role: p.role === 'admin' || p.role === 'therapist' ? p.role : 'client',
            firstName: p.first_name,
            lastName: p.last_name,
          },
          created: false,
          linked: true,
        });
      }
    }

    const rows = (await sql`
      insert into profiles (id, email, role, first_name, last_name, auth_user_id, created_at, updated_at)
      values (gen_random_uuid(), ${session.user.email || null}, ${role},
              ${firstName}, ${lastName}, ${session.user.id}::uuid, now(), now())
      returning id, email, role, first_name, last_name
    `) as Array<{
      id: string; email: string | null; role: string;
      first_name: string | null; last_name: string | null;
    }>;

    const p = rows[0];
    return json(201, {
      profile: {
        id: p.id,
        email: p.email,
        role: p.role === 'therapist' ? 'therapist' : 'client',
        firstName: p.first_name,
        lastName: p.last_name,
      },
      created: true,
    });
  } catch (error) {
    // The unique index on auth_user_id turns a double-submit race into a
    // constraint error; answer with the row the other request created.
    console.error('[profile] create failed', error);
    const raced = await getServerProfile(request);
    if (raced) return json(200, { profile: shape(raced), created: false });
    return json(500, { error: 'create_failed', message: 'Profiel aanmaken mislukt.' });
  }
}

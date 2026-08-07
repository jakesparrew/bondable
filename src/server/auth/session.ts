/**
 * session.ts — who is calling this API route?
 *
 * Replaces the 17 server-side `supabase.auth.getUser()` calls, all of which
 * resolved to a mock that returned the same fake user regardless of the request.
 *
 * ── Why a Bearer JWT and not the session cookie ───────────────────────────
 * Neon Auth runs on its own origin (ep-….neonauth.….neon.tech). The browser's
 * session cookie belongs to THAT origin and is never sent to our API routes on
 * localhost/bondable.be — so "read the cookie" can never work for real browser
 * traffic. The supported pattern is: the client fetches a short-lived JWT from
 * the auth server's `/token` endpoint (authenticated by its cookie there) and
 * sends it to us as `Authorization: Bearer`. We verify it LOCALLY against the
 * JWKS — no network hop per request.
 *
 * Verified empirically against this project's endpoint before writing this
 * code: the JWT is EdDSA-signed, expires in 15 minutes, and carries
 * sub/id (uuid), email, name, emailVerified and banned.
 *
 * The 15-minute expiry is also the honest revocation story: a signed-out or
 * banned user keeps a valid JWT for at most 15 minutes. For spend-sensitive
 * writes that is acceptable; anything stricter can re-check `/get-session`
 * explicitly.
 *
 * A cookie-forwarding fallback stays for server-to-server calls and tests,
 * where the caller CAN attach the Neon cookie directly.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const AUTH_BASE = (process.env.VITE_NEON_AUTH_URL || process.env.NEON_AUTH_URL || '')
  .trim()
  .replace(/\/+$/, '');

export interface AuthUser {
  /** neon_auth."user".id — link target of profiles.auth_user_id. */
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export interface AuthSession {
  user: AuthUser;
  /** ISO timestamp of expiry (JWT `exp`, or the session record's expiry). */
  expiresAt: string;
}

/** True when an auth endpoint is configured at all. */
export function isAuthConfigured(): boolean {
  return Boolean(AUTH_BASE);
}

/**
 * JWKS fetcher, cached at module scope. `createRemoteJWKSet` handles its own
 * key caching and re-fetch on unknown `kid`, so one instance serves the
 * process for its lifetime.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks && AUTH_BASE) {
    jwks = createRemoteJWKSet(new URL(`${AUTH_BASE}/.well-known/jwks.json`));
  }
  return jwks;
}

/**
 * Per-request memo. A WeakMap so entries disappear with the request object —
 * this module lives in a long-running dev server, where a plain Map keyed on
 * requests would be a slow leak.
 */
const cache = new WeakMap<Request, Promise<AuthSession | null>>();

/**
 * The signed-in user, or `null`.
 *
 * `null` covers every failure mode — no credential, expired or forged JWT,
 * banned account, auth server unreachable — and it never throws. Routes that
 * must refuse should check for `null` rather than rely on an exception they
 * might forget to catch.
 */
export function getServerSession(request: Request): Promise<AuthSession | null> {
  const cached = cache.get(request);
  if (cached) return cached;
  const promise = resolve(request);
  cache.set(request, promise);
  return promise;
}

async function resolve(request: Request): Promise<AuthSession | null> {
  if (!AUTH_BASE) return null;

  // ── 1. Bearer JWT — the browser path ──
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice(7).trim();
    const verified = await verifyJwt(token);
    if (verified) return verified;
    // An invalid Bearer is a hard "not signed in": falling through to the
    // cookie path here would let a forged header ride along on a stale cookie.
    return null;
  }

  // ── 2. Cookie forward — server-to-server calls and tests ──
  const cookie = request.headers.get('cookie');
  if (cookie && cookie.includes('neon-auth.session_token')) {
    return fetchSessionWithCookie(cookie);
  }

  return null;
}

async function verifyJwt(token: string): Promise<AuthSession | null> {
  const keySet = getJwks();
  if (!keySet) return null;

  try {
    const { payload } = await jwtVerify(token, keySet, {
      // Both observed to equal the auth origin. Pinning them stops a token
      // minted by a DIFFERENT Neon Auth project (same signing scheme, other
      // tenant) from being replayed against this app.
      issuer: AUTH_BASE.replace(/\/neondb\/auth$/, ''),
      audience: AUTH_BASE.replace(/\/neondb\/auth$/, ''),
    });
    return toSession(payload);
  } catch {
    // Expired, wrong signature, wrong issuer — all just "not signed in".
    return null;
  }
}

function toSession(payload: JWTPayload): AuthSession | null {
  const id = typeof payload.sub === 'string' ? payload.sub : null;
  if (!id) return null;

  // The ban travels in the claims (observed), so it is enforced here even
  // though the JWT signature itself would still validate.
  if (payload.banned === true) return null;

  return {
    user: {
      id,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
      emailVerified: payload.emailVerified === true,
    },
    expiresAt:
      typeof payload.exp === 'number' ? new Date(payload.exp * 1000).toISOString() : '',
  };
}

async function fetchSessionWithCookie(cookie: string): Promise<AuthSession | null> {
  try {
    const response = await fetch(`${AUTH_BASE}/get-session`, { headers: { cookie } });
    if (!response.ok) return null;

    // Neon Auth answers 200 with a literal `null` body when there is no
    // session, so an ok status is not by itself proof of a login.
    const body = (await response.json()) as {
      user?: { id: string; email?: string; name?: string; emailVerified?: boolean; banned?: boolean };
      session?: { expiresAt?: string };
    } | null;

    if (!body?.user?.id || body.user.banned === true) return null;

    return {
      user: {
        id: body.user.id,
        email: body.user.email ?? '',
        name: body.user.name ?? '',
        emailVerified: body.user.emailVerified === true,
      },
      expiresAt: body.session?.expiresAt ?? '',
    };
  } catch (error) {
    console.error('[auth] session lookup failed', error);
    return null;
  }
}

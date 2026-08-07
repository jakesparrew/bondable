/**
 * session.ts — who is calling this API route?
 *
 * Replaces the 17 server-side `supabase.auth.getUser()` calls, all of which
 * resolved to a mock that returned the same fake user regardless of the request.
 *
 * The session is read from the request's COOKIE and verified by Neon Auth.
 * Never from the body, a query parameter or a header the caller controls —
 * those would let anyone claim to be anyone, which is the whole failure mode
 * this module exists to close.
 *
 * Verification is a round-trip to the auth server rather than local JWT
 * checking. Neon Auth does publish a JWKS endpoint, and stateless verification
 * would be faster — but a revoked or expired session keeps validating until its
 * token expires. For a health product, "log out actually logs out" is worth one
 * network hop; the result is cached per request so a route asking twice pays once.
 */

const AUTH_BASE = process.env.VITE_NEON_AUTH_URL || process.env.NEON_AUTH_URL || '';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  /** Neon Auth's own role field ('user' | 'admin'). NOT the Bondable role. */
  role?: string;
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: string;
}

/** True when an auth endpoint is configured. */
export function isAuthConfigured(): boolean {
  return Boolean(AUTH_BASE);
}

/**
 * Per-request memo, keyed by the Request object itself.
 *
 * A WeakMap so entries disappear with the request rather than accumulating —
 * this module lives in a long-running dev server, where a plain Map would be a
 * slow leak keyed on objects that are otherwise garbage.
 */
const cache = new WeakMap<Request, Promise<AuthSession | null>>();

/**
 * The signed-in user, or `null`.
 *
 * Returns `null` for every failure mode — no cookie, expired session, auth
 * server unreachable — and never throws. Callers decide what missing auth
 * means for them; a route that must refuse should check for `null`, not rely
 * on an exception it may forget to catch.
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

  const cookie = request.headers.get('cookie');
  if (!cookie) return null;

  try {
    const response = await fetch(`${AUTH_BASE}/get-session`, {
      headers: { cookie },
    });
    if (!response.ok) return null;

    // Neon Auth answers 200 with a literal `null` body when there is no
    // session, so an ok status is not by itself proof of a logged-in user.
    const body = (await response.json()) as { user?: AuthUser; session?: { expiresAt: string } } | null;
    if (!body?.user) return null;

    return {
      user: body.user,
      expiresAt: body.session?.expiresAt ?? '',
    };
  } catch (error) {
    console.error('[auth] session lookup failed', error);
    return null;
  }
}

/**
 * authClient.ts — the browser's connection to Neon Auth.
 *
 * Neon Auth is Better Auth, hosted by Neon on this project's own database
 * (`neon_auth` schema, EU region). So the users live in OUR database, not at a
 * third-party identity provider — which is what makes it defensible for a
 * health product under GDPR.
 *
 * The auth server is a DIFFERENT ORIGIN from the app. Two consequences that are
 * easy to get wrong:
 *   1. Every call needs credentials included, or the session cookie is neither
 *      sent nor stored and the user appears logged out on the next request.
 *   2. The cookie comes back `SameSite=None; Secure; Partitioned`. That is
 *      correct for cross-site auth, and it means a browser blocking third-party
 *      cookies without CHIPS support will not keep the session. Worth knowing
 *      before blaming the code.
 *
 * `VITE_NEON_AUTH_URL` is deliberately VITE_-prefixed: it is a public endpoint
 * URL, not a secret. Nothing secret is ever exposed here — the signing keys stay
 * with Neon, and the app verifies sessions server-side (see server/auth/session.ts).
 */

import { createAuthClient } from 'better-auth/react';

const baseURL = import.meta.env.VITE_NEON_AUTH_URL;

if (!baseURL) {
  // Loud on purpose. A silently missing base URL makes every auth call fail
  // with an opaque network error, which is a miserable thing to debug.
  console.error(
    '[auth] VITE_NEON_AUTH_URL ontbreekt — inloggen en registreren werken niet.',
  );
}

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    // Cross-origin auth server: without this the session cookie is dropped.
    credentials: 'include',
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

/** True when the app has an auth endpoint configured at all. */
export const isAuthConfigured = Boolean(baseURL);

/* -------------------------------------------------------------------------- */
/* API token                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Why this exists: the session cookie belongs to the AUTH origin and is never
 * sent to our own /api routes. Talking to our API therefore means fetching a
 * short-lived JWT from the auth server's /token endpoint (authenticated there
 * by its cookie) and sending it as `Authorization: Bearer`. The server
 * verifies it locally against the JWKS — see src/server/auth/session.ts.
 */

let tokenCache: { token: string; expiresAt: number } | null = null;

/** Read `exp` out of a JWT without verifying — the SERVER does the verifying. */
function tokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/**
 * A JWT for calling our own API, or `undefined` when signed out.
 *
 * Cached until shortly before expiry (observed lifetime: 15 minutes), with a
 * 60s safety margin so a token never expires mid-request. `undefined` on any
 * failure — callers treat that as "call anonymously", and the server decides
 * what anonymous callers may do.
 */
export async function getApiToken(): Promise<string | undefined> {
  if (!baseURL) return undefined;

  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  try {
    const response = await fetch(`${baseURL}/token`, { credentials: 'include' });
    if (!response.ok) {
      tokenCache = null;
      return undefined;
    }
    const body = (await response.json()) as { token?: string };
    if (!body.token) return undefined;
    tokenCache = { token: body.token, expiresAt: tokenExpiry(body.token) };
    return body.token;
  } catch {
    return undefined;
  }
}

/** Drop the cached token — call on sign-out so the next call is anonymous. */
export function clearApiToken(): void {
  tokenCache = null;
}

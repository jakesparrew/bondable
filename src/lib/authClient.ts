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

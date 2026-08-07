/**
 * handler.ts — serves every `/api/auth/*` route.
 *
 * Better Auth ships one handler that takes a standard `Request` and returns a
 * standard `Response`, which is exactly the shape the Vite dev middleware and
 * the Vercel edge entry already speak — so signup, signin, signout, session
 * lookup, password reset and verification all arrive through this one function
 * rather than a route file each.
 *
 * Kept as a thin wrapper (rather than exporting `auth.handler` directly) for
 * the same reason `api/coach.ts` is thin: one place to add logging or a guard
 * later without touching the entry points.
 */

import { auth } from './auth';

export function handleAuth(request: Request): Promise<Response> {
  return auth.handler(request);
}

/**
 * Resolve the signed-in user for a server route.
 *
 * This is what replaces `supabase.auth.getUser()` (17 call sites) on the
 * server. It reads the session cookie off the incoming request — never a
 * user id from the body or a query parameter, which would let any caller
 * claim to be anyone.
 *
 * Returns `null` when there is no valid session. Callers decide what that
 * means; this function never throws for the ordinary logged-out case.
 */
export async function getServerSession(request: Request) {
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.error('[auth] session lookup failed', error);
    return null;
  }
}

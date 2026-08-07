/**
 * api/auth/[...all].ts — Vercel entry for every `/api/auth/*` route.
 *
 * Catch-all, because Better Auth serves many sub-routes behind one handler
 * (`sign-in/email`, `sign-up/email`, `get-session`, `verify-email`, …) and a
 * file per route would go stale the moment the library adds one.
 *
 * Thin, like `api/coach.ts`: the logic lives in `src/server/auth/handler.ts`
 * so the Vite dev middleware serves the identical implementation and local
 * behaviour cannot drift from production.
 */

import { handleAuth } from '../../src/server/auth/handler';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleAuth(request);
}

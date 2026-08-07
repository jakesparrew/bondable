/**
 * api/profile.ts — Vercel entry for /api/profile.
 *
 * Thin, like api/coach.ts: the logic lives in src/server/auth/profileHandler.ts
 * so the Vite dev middleware serves the identical implementation.
 */

import { handleProfile } from '../src/server/auth/profileHandler';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleProfile(request);
}

/**
 * api/coach-admin.ts — Vercel entry point for the Bond admin console API.
 *
 * Thin, like `api/coach.ts`: all logic lives in
 * `src/server/coach/adminHandler.ts` so the Vite dev middleware serves the
 * identical implementation.
 *
 * Edge runtime: Neon's serverless driver talks HTTP, so the usage queries work
 * here without a connection pool, and there is no Node API in this path.
 */

import { handleCoachAdmin } from '../src/server/coach/adminHandler';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleCoachAdmin(request);
}

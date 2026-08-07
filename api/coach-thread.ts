/**
 * api/coach-thread.ts — Vercel entry for /api/coach-thread.
 *
 * Thin, like api/coach.ts: the logic lives in
 * src/server/coach/threadHandler.ts so the Vite dev middleware serves the
 * identical implementation.
 */

import { handleCoachThread } from '../src/server/coach/threadHandler';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleCoachThread(request);
}

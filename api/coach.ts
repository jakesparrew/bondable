/**
 * api/coach.ts — Vercel entry point for Bond.
 *
 * Deliberately thin. All logic lives in `src/server/coach/handler.ts` so the
 * exact same function serves this route in production and the Vite dev
 * middleware locally (see `vite.config.ts`) — no second implementation to
 * drift out of sync.
 *
 * Edge runtime: the handler is plain Web-standard `Request`/`Response` with a
 * streamed body, which is what Edge does best. It also means no Node APIs may
 * be introduced downstream.
 */

import { handleCoach } from '../src/server/coach/handler';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleCoach(request);
}

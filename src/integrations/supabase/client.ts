
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { mockSupabase } from './mockClient';

// Using hardcoded Supabase configuration (Lovable doesn't support VITE_ env vars)
const SUPABASE_URL = 'https://cvoilvhdqczdhpijutyt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f2FBfGYNo-9k5PMzN74wGw_kYaqQPmX';

const realSupabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 50,
        heartbeatIntervalMs: 15000,
        timeout: 20000,
      },
    },
  }
);

/**
 * DEV / DEMO explore mode: use the in-memory mock backend (seeded demo data) so
 * the whole app is explorable without a live database. Active whenever we're in
 * `vite` dev (import.meta.env.DEV) OR a shareable demo build (VITE_DEMO_MODE).
 *
 * NOTE: this is intentionally INDEPENDENT of the login-role bypass. The homepage
 * now lets you enter as therapist/client/admin at runtime, so the mock must stay
 * on for the whole dev/demo session regardless of which role (if any) is active.
 * In a real production build both flags are false, so the real client is used.
 */
const _env = (import.meta as { env: Record<string, string | undefined> }).env;
const USE_MOCK_BACKEND =
  import.meta.env.DEV ||
  String(_env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true';

export const supabase = (USE_MOCK_BACKEND ? mockSupabase : realSupabase) as typeof realSupabase;

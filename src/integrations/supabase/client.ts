
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
 * DEV-ONLY explore mode: when running `vite` dev (import.meta.env.DEV) AND
 * VITE_DEV_BYPASS_AUTH is set, use the in-memory mock backend (seeded demo data)
 * so the whole app is explorable without a live database. In production builds
 * import.meta.env.DEV is false, so the real client is always used.
 */
const _env = (import.meta as { env: Record<string, string | undefined> }).env;
const USE_MOCK_BACKEND =
  (import.meta.env.DEV && !!_env.VITE_DEV_BYPASS_AUTH) ||
  String(_env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true';

export const supabase = (USE_MOCK_BACKEND ? mockSupabase : realSupabase) as typeof realSupabase;

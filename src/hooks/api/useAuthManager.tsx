import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  clearApiToken,
  getApiToken,
  signOut as neonSignOut,
  useSession as useNeonSession,
} from '@/lib/authClient';

export type UserRole = 'client' | 'therapist' | 'admin' | null;

/**
 * useAuthManager — the single answer to "who is using the app right now?"
 *
 * Three providers, chosen once at mount:
 *
 *   1. Demo role chosen (dev/demo builds) → the seeded mock user, so the
 *      dashboards stay explorable with seeded data. Unchanged.
 *   2. Everything else → RealAuthProvider on NEON AUTH. This replaced a
 *      Supabase-based provider whose project no longer even resolves in DNS —
 *      there was no real login anywhere in the app.
 *
 * The interface still speaks Supabase's `User`/`Session` TYPES because ~37
 * call sites consume that shape; the objects are constructed compatibly. The
 * types are compile-time only — no Supabase code runs here.
 *
 * One identity rule worth stating: `user.id` is the PROFILE id
 * (`profiles.id`), not the auth user id. Every data query in the app keys on
 * profiles.id; the auth id is a credential detail that stays inside the
 * provider. Until the profile has loaded (or when none exists yet), user.id
 * falls back to the auth id and `role` stays null — protected routes treat
 * that as "not authorised yet", which is the safe reading.
 */

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  role: UserRole;
  roleLoading: boolean;
  error: string | null;
}

interface UseAuthManagerReturn extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getCurrentUserType: () => 'therapist' | 'client' | 'admin' | null;
}

const AuthManagerContext = createContext<UseAuthManagerReturn | null>(null);

export const useAuthManager = () => {
  const context = useContext(AuthManagerContext);
  if (!context) {
    throw new Error('useAuthManager must be used within AuthManagerProvider');
  }
  return context;
};

interface AuthManagerProviderProps {
  children: ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Demo / dev bypass — runtime-switchable, unchanged behaviour                 */
/* -------------------------------------------------------------------------- */

const DEMO_ROLE_STORAGE_KEY = 'bondable_demo_role';

/** True when the demo bypass is available at all (dev or demo build). */
export const isBypassAvailable = (): boolean => {
  const env = (import.meta as { env: Record<string, string | undefined> }).env;
  return import.meta.env.DEV || String(env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true';
};

const normalizeRole = (v: string | null | undefined): UserRole => {
  const s = String(v ?? '').toLowerCase();
  if (s === 'therapist' || s === 'client' || s === 'admin') return s as UserRole;
  if (s === 'true' || s === '1') return 'therapist';
  return null;
};

/** The role chosen on the homepage (localStorage), if any. */
export const getStoredDemoRole = (): UserRole => {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeRole(window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY));
  } catch {
    return null;
  }
};

/** Enter the app as a given role (used by the homepage / login bypass buttons). */
export const setDemoRole = (role: 'therapist' | 'client' | 'admin'): void => {
  try {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);
  } catch {
    /* ignore storage failures */
  }
};

/** Leave the demo (back to the public homepage / real login). */
export const clearDemoRole = (): void => {
  try {
    window.localStorage.removeItem(DEMO_ROLE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

/**
 * Resolve the active bypass role at module load: localStorage first (the
 * homepage choice), then the VITE_DEV_BYPASS_AUTH env fallback. The homepage
 * buttons do a full navigation, so this re-evaluates with the fresh choice.
 */
const DEV_BYPASS_ROLE: UserRole = (() => {
  if (!isBypassAvailable()) return null;
  const stored = getStoredDemoRole();
  if (stored) return stored;
  const env = (import.meta as { env: Record<string, string | undefined> }).env;
  return normalizeRole(env.VITE_DEV_BYPASS_AUTH);
})();

const DevBypassAuthProvider = ({ children, role }: { children: ReactNode; role: 'therapist' | 'client' | 'admin' }) => {
  // The client role maps to a SEEDED client ("Lotte Vermeulen") so the client
  // dashboard populates from the mock data; therapist/admin keep the seeded
  // therapist id. Emails stay role-scoped (dev-client@bondable.local, …).
  const mockUser = {
    id: role === 'client'
      ? '00000000-0000-0000-0000-000000000002'
      : '00000000-0000-0000-0000-000000000001',
    email: `dev-${role}@bondable.local`,
    user_metadata: role === 'client'
      ? { first_name: 'Lotte', last_name: 'Vermeulen', full_name: 'Lotte Vermeulen' }
      : { first_name: 'Dev', last_name: role.charAt(0).toUpperCase() + role.slice(1), full_name: `Dev ${role}` },
    app_metadata: { provider: 'email', providers: ['email'] },
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
  } as unknown as User;
  const mockSession = {
    access_token: 'dev-bypass', refresh_token: 'dev-bypass', token_type: 'bearer',
    expires_in: 3600, expires_at: 9999999999, user: mockUser,
  } as unknown as Session;
  const value: UseAuthManagerReturn = {
    user: mockUser, session: mockSession, loading: false, initialized: true,
    role, roleLoading: false, error: null,
    // Under the demo bypass, "sign out" means leaving the demo: drop the chosen
    // role and return to the public homepage (full reload re-reads localStorage).
    signOut: async () => {
      clearDemoRole();
      if (typeof window !== 'undefined') window.location.assign('/');
    },
    refreshProfile: async () => {},
    getCurrentUserType: () => (role === 'admin' ? 'admin' : role),
  };
  return <AuthManagerContext.Provider value={value}>{children}</AuthManagerContext.Provider>;
};

/* -------------------------------------------------------------------------- */
/* Real authentication — Neon Auth                                            */
/* -------------------------------------------------------------------------- */

interface ApiProfile {
  id: string;
  email: string | null;
  role: Exclude<UserRole, null>;
  firstName: string | null;
  lastName: string | null;
}

const RealAuthProvider = ({ children }: { children: ReactNode }) => {
  const neonSession = useNeonSession();
  const authUser = neonSession.data?.user ?? null;

  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  // Bumping this re-runs the profile fetch — that is all refreshProfile is.
  const [profileVersion, setProfileVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!authUser?.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    void (async () => {
      try {
        const token = await getApiToken();
        if (!token) {
          if (!cancelled) setProfile(null);
          return;
        }
        const response = await fetch('/api/profile', {
          headers: { authorization: `Bearer ${token}` },
        });
        const body = response.ok
          ? ((await response.json()) as { profile: ApiProfile | null })
          : { profile: null };
        if (!cancelled) setProfile(body.profile);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, profileVersion]);

  const refreshProfile = useCallback(async () => {
    setProfileVersion((v) => v + 1);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await neonSignOut();
    } finally {
      clearApiToken();
      // Full navigation: every consumer derives from this provider, and a hard
      // boundary beats chasing each piece of state down individually.
      if (typeof window !== 'undefined') window.location.assign('/');
    }
  }, []);

  // Compatibility shape for the ~37 call sites that expect Supabase's User.
  const user: User | null = authUser
    ? ({
        // The app's identity is the PROFILE id — see the module comment.
        id: profile?.id ?? authUser.id,
        email: authUser.email ?? undefined,
        user_metadata: {
          first_name: profile?.firstName ?? authUser.name?.split(' ')[0] ?? '',
          last_name:
            profile?.lastName ?? authUser.name?.split(' ').slice(1).join(' ') ?? '',
          full_name: authUser.name ?? '',
        },
        app_metadata: { provider: 'neon-auth', providers: ['neon-auth'] },
        aud: 'authenticated',
        created_at:
          typeof authUser.createdAt === 'string'
            ? authUser.createdAt
            : new Date().toISOString(),
      } as unknown as User)
    : null;

  const session: Session | null = user
    ? ({
        // No secrets here on purpose: real credentials are the httpOnly cookie
        // on the auth origin plus short-lived JWTs from getApiToken().
        access_token: 'neon-auth',
        refresh_token: 'neon-auth',
        token_type: 'bearer',
        expires_in: 900,
        expires_at: Math.floor(Date.now() / 1000) + 900,
        user,
      } as unknown as Session)
    : null;

  const value: UseAuthManagerReturn = {
    user,
    session,
    loading: neonSession.isPending,
    initialized: !neonSession.isPending,
    role: profile?.role ?? null,
    roleLoading: profileLoading,
    error: null,
    signOut: handleSignOut,
    refreshProfile,
    getCurrentUserType: () => profile?.role ?? null,
  };

  return <AuthManagerContext.Provider value={value}>{children}</AuthManagerContext.Provider>;
};

/* -------------------------------------------------------------------------- */
/* Provider selection                                                          */
/* -------------------------------------------------------------------------- */

export const AuthManagerProvider = ({ children }: AuthManagerProviderProps) => {
  // Constant at module load, so the same branch is taken for the lifetime of
  // the mount — no conditional-hook hazards.
  if (DEV_BYPASS_ROLE) {
    return <DevBypassAuthProvider role={DEV_BYPASS_ROLE}>{children}</DevBypassAuthProvider>;
  }

  // No demo role chosen → real auth, in dev too. A visitor who signed up on
  // /coach is genuinely signed in here; a visitor who did not is genuinely
  // signed out — which also kills the old "dashboard flash" the previous
  // demo-logged-out shim existed to suppress.
  return <RealAuthProvider>{children}</RealAuthProvider>;
};

/* -------------------------------------------------------------------------- */
/* Legacy compatibility hooks                                                  */
/* -------------------------------------------------------------------------- */

export const useAuth = () => {
  const authManager = useAuthManager();
  return {
    user: authManager.user,
    session: authManager.session,
    loading: authManager.loading,
    signOut: authManager.signOut,
    refreshProfile: authManager.refreshProfile,
    error: authManager.error,
  };
};

export const useUserRole = () => {
  const authManager = useAuthManager();
  return {
    role: authManager.role,
    loading: authManager.roleLoading,
    error: authManager.error,
  };
};

export const useCurrentUserType = (): 'therapist' | 'client' | 'admin' | null => {
  const authManager = useAuthManager();
  return authManager.getCurrentUserType();
};

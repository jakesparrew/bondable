import { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import console from "@/lib/production-console";
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { avatarCache, profileCache } from '@/services/cache';

export type UserRole = 'client' | 'therapist' | 'admin' | null;

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
  getCurrentUserType: () => "therapist" | "client" | "admin" | null;
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

/**
 * DEV-ONLY login bypass. Active only under `vite` dev (import.meta.env.DEV) AND
 * when VITE_DEV_BYPASS_AUTH is set ("therapist" | "client" | "admin", or "true"
 * => therapist). Completely stripped from production builds. Lets you view the
 * UI without a working backend while the Supabase->Neon migration is in progress.
 */
const DEV_BYPASS_ROLE: UserRole = (() => {
  const env = (import.meta as { env: Record<string, string | undefined> }).env;
  const demo = String(env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true';
  // Active in `vite` dev, OR in ANY build when VITE_DEMO_MODE=true (shareable demo deploy).
  if (!import.meta.env.DEV && !demo) return null;
  const v = String(env.VITE_DEV_BYPASS_AUTH ?? '').toLowerCase();
  if (v === 'therapist' || v === 'client' || v === 'admin') return v as UserRole;
  if (v === 'true' || v === '1') return 'therapist';
  return demo ? 'therapist' : null;
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
    signOut: async () => { /* no-op under dev bypass */ },
    refreshProfile: async () => {},
    getCurrentUserType: () => (role === 'admin' ? 'admin' : role),
  };
  return <AuthManagerContext.Provider value={value}>{children}</AuthManagerContext.Provider>;
};

export const AuthManagerProvider = ({ children }: AuthManagerProviderProps) => {
  if (DEV_BYPASS_ROLE) {
    return <DevBypassAuthProvider role={DEV_BYPASS_ROLE}>{children}</DevBypassAuthProvider>;
  }

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
    role: null,
    roleLoading: true,
    error: null,
  });

  // Prevent duplicate listener setup and track session stability
  const initializationRef = useRef(false);
  const sessionStableRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 3;
  const authStateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enhanced session persistence with stability checks
  const persistSession = useCallback((session: Session | null) => {
    try {
      if (session) {
        localStorage.setItem('supabase_session_backup', JSON.stringify({
          session: session,
          timestamp: Date.now(),
          user_id: session.user.id
        }));
        sessionStableRef.current = true;
        reconnectAttemptRef.current = 0;
      } else {
        localStorage.removeItem('supabase_session_backup');
        sessionStableRef.current = false;
      }
    } catch (error) {
      console.warn('Failed to persist session:', error);
    }
  }, []);

  // Session recovery mechanism
  const attemptSessionRecovery = useCallback(async () => {
    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return null;
    }

    try {
      reconnectAttemptRef.current++;
      console.log(`🔄 Attempting session recovery (${reconnectAttemptRef.current}/${maxReconnectAttempts})`);

      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionError && currentSession) {
        console.log('✅ Current session recovered');
        return currentSession;
      }

      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && refreshedSession) {
        console.log('✅ Session refreshed successfully');
        return refreshedSession;
      }

      const backup = localStorage.getItem('supabase_session_backup');
      if (backup) {
        const { session: backupSession, timestamp } = JSON.parse(backup);
        const age = Date.now() - timestamp;
        
        if (age < 3600000 && backupSession) {
          console.log('🔄 Attempting to restore from backup session');
          
          const { error: setError } = await supabase.auth.setSession({
            access_token: backupSession.access_token,
            refresh_token: backupSession.refresh_token
          });
          
          if (!setError) {
            console.log('✅ Session restored from backup');
            return backupSession;
          }
        }
      }

      console.warn('❌ All session recovery attempts failed');
      return null;
    } catch (error) {
      console.error('❌ Session recovery error:', error);
      return null;
    }
  }, []);

  // Fetch user role
  const fetchUserRole = useCallback(async (user: User | null): Promise<UserRole> => {
    if (!user) return null;

    try {
      console.log('🔍 useAuthManager: Fetching user role for:', user.email);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      console.log('🔍 useAuthManager: Profile query result:', { profile, error });

      if (error) {
        console.error('❌ Error fetching user role:', error);
        return null;
      }

      const userRole = profile?.role as UserRole;
      console.log('✅ User role fetched:', userRole);
      return userRole;
    } catch (error) {
      console.error('❌ User role fetch failed:', error);
      return null;
    }
  }, []);

  // Ensure profile exists
  const ensureProfileExists = useCallback(
    async (
      userId: string,
      email: string,
      fullName: string,
      role: 'client' | 'therapist' = 'client'
    ) => {
      const { data: existing, error: checkErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (checkErr) {
        console.error('❌ Error checking profile:', checkErr);
        return null;
      }
      if (existing) {
        console.log('✅ Profile already exists:', existing.id);
        return existing;
      }

      console.log('🆕 Creating new profile for user:', userId);
      const { data: newProfile, error: insertErr } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          email, 
          first_name: fullName.split(' ')[0] || '', 
          last_name: fullName.split(' ').slice(1).join(' ') || '', 
          role 
        })
        .select()
        .single();

      if (insertErr) {
        console.error('❌ Error creating profile:', insertErr);
        return null;
      }
      console.log('✅ Profile created successfully:', newProfile.id);
      return newProfile;
    },
    []
  );

  // Send new user notification
  const sendNewUserNotification = useCallback(async (user: User) => {
    console.log('🔔 Sending admin notification for new user:', user.id);
    try {
      const { error } = await supabase.functions.invoke('send-admin-notification', {
        body: {
          notification_type: 'new_user_registration',
          subject: 'New User Registration',
          message: `A new user has registered on the platform.`,
          user_data: {
            user_id: user.id,
            email: user.email,
            first_name: user.user_metadata?.first_name || 
              user.user_metadata?.full_name?.split(' ')[0] ||
              user.user_metadata?.name || 'User',
            last_name: user.user_metadata?.last_name || 
              user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ||
              'New User',
            registration_date: new Date().toISOString(),
            provider: user.app_metadata?.providers?.[0] || 'email',
          },
          email_addresses: [],
        },
      });
      if (error) {
        console.error('❌ Failed to send admin notification:', error);
      } else {
        console.log('✅ Admin notification sent successfully');
      }
    } catch (err) {
      console.error('❌ Error sending admin notification:', err);
    }
  }, []);

  // Enhanced auth state change handler
  const handleAuthStateChange = useCallback(async (_event: string, session: Session | null) => {
    if (authStateDebounceRef.current) {
      clearTimeout(authStateDebounceRef.current);
    }

    authStateDebounceRef.current = setTimeout(async () => {
      console.log('🔄 Auth state change:', _event, session?.user?.id ?? 'No user');
      
      if (_event === 'TOKEN_REFRESHED' && session?.user?.id === authState.user?.id) {
        console.log('⏭️ Skipping token refresh - same user');
        return;
      }
      
      if (!session && sessionStableRef.current && _event !== 'SIGNED_OUT') {
        console.log('⚠️ Unexpected session loss detected, attempting recovery');
        
        const recoveredSession = await attemptSessionRecovery();
        if (recoveredSession) {
          session = recoveredSession;
          console.log('✅ Session recovered successfully');
        } else {
          console.log('❌ Session recovery failed');
          setAuthState(prev => ({ ...prev, error: 'Session expired. Please log in again.' }));
        }
      }
      
      // Fetch role if we have a user
      let role: UserRole = null;
      let roleLoading = false;
      
      if (session?.user) {
        roleLoading = true;
        setAuthState(prev => ({ ...prev, roleLoading: true }));
        role = await fetchUserRole(session.user);
        roleLoading = false;
      }
      
      // Update state
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
        role,
        roleLoading,
        error: session ? null : prev.error,
      }));
      
      persistSession(session);
    }, 50);
  }, [attemptSessionRecovery, persistSession, authState.user?.id, fetchUserRole]);

  // Initialize auth on mount
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      console.log('🚀 Initializing enhanced auth manager...');
      
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
      subscription = authSubscription;

      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Initial session error:', error);
          
          const recoveredSession = await attemptSessionRecovery();
          if (recoveredSession) {
            const role = await fetchUserRole(recoveredSession.user);
            setAuthState({
              session: recoveredSession,
              user: recoveredSession.user,
              loading: false,
              initialized: true,
              role,
              roleLoading: false,
              error: null,
            });
            persistSession(recoveredSession);
          } else {
            setAuthState(prev => ({ 
              ...prev, 
              user: null, 
              session: null, 
              loading: false, 
              initialized: true,
              role: null,
              roleLoading: false,
              error: 'Failed to load session' 
            }));
          }
        } else {
          console.log('✅ Initial session loaded:', data.session?.user?.id ?? 'No user');
          const role = data.session?.user ? await fetchUserRole(data.session.user) : null;
          setAuthState({
            session: data.session,
            user: data.session?.user ?? null,
            loading: false,
            initialized: true,
            role,
            roleLoading: false,
            error: null,
          });
          persistSession(data.session);
        }
      } catch (err) {
        console.error('❌ Session initialization failed:', err);
        setAuthState(prev => ({ 
          ...prev, 
          user: null, 
          session: null, 
          loading: false, 
          initialized: true,
          role: null,
          roleLoading: false,
          error: 'Failed to initialize authentication' 
        }));
      }
    };

    initializeAuth();

    return () => {
      if (subscription && initializationRef.current) {
        console.log('🧹 Cleaning up enhanced auth manager subscription');
        subscription.unsubscribe();
        initializationRef.current = false;
      }
    };
  }, []);

  // Handle new user profile creation and notifications
  useEffect(() => {
    const user = authState.user;
    if (!user) return;

    (async () => {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      const isNewUser = !existingProfile;
      if (isNewUser) {
        console.log('👤 New user detected, sending admin notification…');
        sendNewUserNotification(user);
      }

      const providers = user.app_metadata?.providers || [];
      const fullName =
        `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User';

      // For non-Google users, ensure profile exists immediately.
      // For Google users, defer profile creation to the role selection flow.
      if (!providers.includes('google')) {
        await ensureProfileExists(user.id, user.email ?? '', fullName);
      }
      // If Google user, sync avatar_url from Google metadata when missing
      if (providers.includes('google')) {
        const googleAvatar = (user.user_metadata as any)?.avatar_url || (user.user_metadata as any)?.picture;
        if (googleAvatar) {
          const { data: prof, error: profErr } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .maybeSingle();
          if (profErr) {
            console.warn('Profile fetch error while syncing Google avatar:', profErr);
          }
          if (!prof?.avatar_url) {
            const { error: upErr } = await supabase
              .from('profiles')
              .update({ avatar_url: googleAvatar })
              .eq('id', user.id);
            if (upErr) {
              console.warn('Failed to update avatar_url from Google:', upErr);
            } else {
              // Warm caches for instant UI
              avatarCache.set(`avatar:${user.id}`, googleAvatar, 15 * 60 * 1000);
              profileCache.delete(`profile:${user.id}`);
            }
          }
        }
      }
    })();
  }, [authState.user, ensureProfileExists, sendNewUserNotification]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    const u = authState.session?.user;
    if (!u) return;
    const fullName =
      `${u.user_metadata?.first_name || ''} ${u.user_metadata?.last_name || ''}`.trim() ||
      u.user_metadata?.name ||
      u.email?.split('@')[0] ||
      'User';
    try {
      await ensureProfileExists(u.id, u.email ?? '', fullName);
      // Refresh role after profile update
      const newRole = await fetchUserRole(u);
      setAuthState(prev => ({ ...prev, role: newRole }));
    } catch {
      setAuthState(prev => ({ ...prev, error: 'Failed to refresh profile' }));
    }
  }, [authState.session, ensureProfileExists, fetchUserRole]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Starting sign out process...');
      
      sessionStableRef.current = false;
      reconnectAttemptRef.current = 0;
      localStorage.removeItem('supabase_session_backup');
      
      setAuthState({
        user: null, 
        session: null, 
        loading: false, 
        initialized: true,
        role: null,
        roleLoading: false,
        error: null,
      });
      
      if (authStateDebounceRef.current) {
        clearTimeout(authStateDebounceRef.current);
        authStateDebounceRef.current = null;
      }
      
      await supabase.auth.signOut();
      console.log('✅ Successfully signed out');
    } catch (e) {
      console.error('❌ Sign out error:', e);
      setAuthState({
        user: null, 
        session: null, 
        loading: false, 
        initialized: true,
        role: null,
        roleLoading: false,
        error: null,
      });
    }
  }, []);

  // Get current user type (for URL-based routing)
  const getCurrentUserType = useCallback((): "therapist" | "client" | "admin" | null => {
    // For admin users, always return admin regardless of URL
    if (authState.role === 'admin') {
      return 'admin';
    }
    
    // For regular users, return their role
    return authState.role;
  }, [authState.role]);

  const value: UseAuthManagerReturn = {
    ...authState,
    signOut,
    refreshProfile,
    getCurrentUserType,
  };

  return (
    <AuthManagerContext.Provider value={value}>
      {children}
    </AuthManagerContext.Provider>
  );
};

// Legacy compatibility hooks
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

export const useCurrentUserType = (): "therapist" | "client" | "admin" | null => {
  const authManager = useAuthManager();
  return authManager.getCurrentUserType();
};
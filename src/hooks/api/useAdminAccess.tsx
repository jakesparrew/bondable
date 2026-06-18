
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { useAuthManager } from './useAuthManager';
import { supabase } from '@/integrations/supabase/client';

export interface AdminAccessState {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export const useAdminAccess = (): AdminAccessState => {
  const { user, loading: authLoading } = useAuthManager();
  const [adminState, setAdminState] = useOptimizedState<AdminAccessState>({
    isAdmin: false,
    loading: true,
    error: null,
  });

  useOptimizedEffect(() => {
    const checkAdminAccess = async () => {
      if (authLoading) {
        return; // Wait for auth to load
      }

      if (!user) {
        setAdminState({
          isAdmin: false,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        console.log('🔍 Checking admin access for user:', user.email);
        
        const { data, error } = await supabase
          .from('admin_users')
          .select('user_email')
          .eq('user_email', user.email)
          .maybeSingle();

        if (error) {
          console.error('❌ Error checking admin access:', error);
          setAdminState({
            isAdmin: false,
            loading: false,
            error: 'Failed to check admin access',
          });
          return;
        }

        const isAdmin = !!data;
        console.log('✅ Admin access check result:', isAdmin);
        
        setAdminState({
          isAdmin,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('❌ Admin access check failed:', error);
        setAdminState({
          isAdmin: false,
          loading: false,
          error: 'Failed to verify admin access',
        });
      }
    };

    checkAdminAccess();
  }, [user, authLoading]);

  return adminState;
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Session, SessionService } from '@/services/api/SessionService';
import { useAuthManager } from './useAuthManager';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { 
  sessionsCache, 
  sessionStatsCache,
  filterPersonsCache,
  generateSessionsCacheKey,
  generateSessionStatsCacheKey,
  generateFilterPersonsCacheKey,
  invalidateSessionCaches
} from '@/services/cache/sessionCache';
import { optimizedClientTherapistService } from '@/services/api/optimized/clientTherapistService';

// Query keys for cache management
export const sessionQueryKeys = {
  all: ['sessions'] as const,
  byUser: (userId: string, userType: string) => ['sessions', userType, userId] as const,
  stats: (userId: string, userType: string) => ['session_stats', userType, userId] as const,
  filterPersons: (userId: string, userType: string) => ['filter_persons', userType, userId] as const,
  byId: (sessionId: string) => ['session', sessionId] as const,
};

export const useOptimizedSessions = (userType: 'client' | 'therapist', enabled = true) => {
  const { user } = useAuthManager();
  
  return useQuery({
    queryKey: sessionQueryKeys.byUser(user?.id || '', userType),
    queryFn: async (): Promise<Session[]> => {
      if (!user?.id) return [];
      
      const cacheKey = generateSessionsCacheKey(user.id, userType);
      
      return sessionsCache.getOrSet(
        cacheKey,
        async () => {
          console.log('🔍 Fetching sessions for user:', user.id, 'type:', userType);
          
          if (userType === 'therapist') {
            return await SessionService.getSessionsByTherapist(user.id);
          } else {
            return await SessionService.getSessionsByClient(user.id);
          }
        },
        enabled ? undefined : 0 // Skip cache if not enabled
      );
    },
    enabled: enabled && !!user?.id,
    staleTime: 90 * 1000, // 90 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
};

export const useSessionStats = (userType: 'client' | 'therapist', enabled = true) => {
  const { user } = useAuthManager();
  
  return useQuery({
    queryKey: sessionQueryKeys.stats(user?.id || '', userType),
    queryFn: async () => {
      if (!user?.id) return null;
      
      const cacheKey = generateSessionStatsCacheKey(user.id, userType);
      
      return sessionStatsCache.getOrSet(
        cacheKey,
        async () => {
          console.log('📊 Fetching session stats for user:', user.id, 'type:', userType);
          return await SessionService.getSessionStats(user.id, userType);
        }
      );
    },
    enabled: enabled && !!user?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useFilterPersons = (userType: 'client' | 'therapist', enabled = true) => {
  const { user } = useAuthManager();
  
  return useQuery({
    queryKey: sessionQueryKeys.filterPersons(user?.id || '', userType),
    queryFn: async (): Promise<Array<{ value: string; label: string }>> => {
      if (!user?.id) return [];
      
      const cacheKey = generateFilterPersonsCacheKey(user.id, userType);
      
      return filterPersonsCache.getOrSet(
        cacheKey,
        async () => {
          console.log('👥 Fetching filter persons for user:', user.id, 'type:', userType);
          
          if (userType === 'therapist') {
            const clients = await optimizedClientTherapistService.getClientsForTherapist(user.id);
            return clients.map(client => ({
              value: client.name,
              label: client.name
            }));
          } else {
            const therapists = await optimizedClientTherapistService.getConnectedTherapists(user.id);
            return therapists.map(therapist => ({
              value: therapist.name,
              label: therapist.name
            }));
          }
        }
      );
    },
    enabled: enabled && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateSession = () => {
  const { user } = useAuthManager();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: SessionService.createSession,
    onSuccess: (newSession) => {
      toast.success(t('session_scheduled_successfully'));
      
      // Invalidate all session-related caches
      if (user?.id) {
        invalidateSessionCaches(user.id);
        
        // Invalidate React Query caches
        queryClient.invalidateQueries({
          queryKey: sessionQueryKeys.all
        });
      }
      
      console.log('✅ Session created successfully:', newSession.id);
    },
    onError: (error) => {
      console.error('❌ Session creation failed:', error);
      toast.error(t('session_creation_failed'));
    }
  });
};

export const useUpdateSession = () => {
  const { user } = useAuthManager();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, updates }: { sessionId: string; updates: Partial<Session> }) =>
      SessionService.updateSession(sessionId, updates),
    onSuccess: (updatedSession) => {
      toast.success(t('session_updated_successfully'));
      
      // Invalidate caches
      if (user?.id) {
        invalidateSessionCaches(user.id, undefined, updatedSession.id);
        
        queryClient.invalidateQueries({
          queryKey: sessionQueryKeys.all
        });
      }
      
      console.log('✅ Session updated successfully:', updatedSession.id);
    },
    onError: (error) => {
      console.error('❌ Session update failed:', error);
      toast.error(t('session_update_failed'));
    }
  });
};

export const useDeleteSession = () => {
  const { user } = useAuthManager();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: SessionService.deleteSession,
    onSuccess: (_, sessionId) => {
      toast.success(t('session_deleted_successfully'));
      
      // Invalidate caches
      if (user?.id) {
        invalidateSessionCaches(user.id, undefined, sessionId);
        
        queryClient.invalidateQueries({
          queryKey: sessionQueryKeys.all
        });
      }
      
      console.log('✅ Session deleted successfully:', sessionId);
    },
    onError: (error) => {
      console.error('❌ Session deletion failed:', error);
      toast.error(t('session_deletion_failed'));
    }
  });
};

export const useConfirmSession = () => {
  const { user } = useAuthManager();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => 
      SessionService.updateSession(sessionId, { status: 'Confirmed' }),
    onSuccess: (updatedSession) => {
      toast.success(t('session_confirmed_successfully'));
      
      // Invalidate caches
      if (user?.id) {
        invalidateSessionCaches(user.id, undefined, updatedSession.id);
        
        queryClient.invalidateQueries({
          queryKey: sessionQueryKeys.all
        });
      }
      
      console.log('✅ Session confirmed successfully:', updatedSession.id);
    },
    onError: (error) => {
      console.error('❌ Session confirmation failed:', error);
      toast.error(t('session_confirmation_failed'));
    }
  });
};

export const useDenySession = () => {
  const { user } = useAuthManager();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => SessionService.denySession(sessionId),
    onSuccess: (updatedSession) => {
      toast.success(t('session_denied_successfully'));
      
      // Invalidate caches
      if (user?.id) {
        invalidateSessionCaches(user.id, undefined, updatedSession.id);
        
        queryClient.invalidateQueries({
          queryKey: sessionQueryKeys.all
        });
      }
      
      console.log('✅ Session denied successfully:', updatedSession.id);
    },
    onError: (error) => {
      console.error('❌ Session denial failed:', error);
      toast.error(t('session_denial_failed'));
    }
  });
};
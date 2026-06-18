import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import console from '@/lib/production-console';
import {
  optimizedClientProfileService,
  type ClientProfileData,
  type SessionData,
  type TaskData,
  type ClientProfileResponse,
} from '@/services/api/optimized/clientProfileService';

// Query keys
export const clientProfileQueryKeys = {
  all: ['clientProfile'] as const,
  profile: (clientId: string) => [...clientProfileQueryKeys.all, 'profile', clientId] as const,
  sessions: (clientId: string) => [...clientProfileQueryKeys.all, 'sessions', clientId] as const,
  tasks: (clientId: string) => [...clientProfileQueryKeys.all, 'tasks', clientId] as const,
  fullProfile: (clientId: string) => [...clientProfileQueryKeys.all, 'fullProfile', clientId] as const,
};

// Hook for getting client profile
export const useClientProfile = (clientId: string | undefined) => {
  return useQuery({
    queryKey: clientProfileQueryKeys.profile(clientId || ''),
    queryFn: () => optimizedClientProfileService.getClientProfile(clientId || ''),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for getting client sessions
export const useClientSessions = (clientId: string | undefined) => {
  return useQuery({
    queryKey: clientProfileQueryKeys.sessions(clientId || ''),
    queryFn: () => optimizedClientProfileService.getClientSessions(clientId || ''),
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for getting client tasks
export const useClientTasks = (clientId: string | undefined) => {
  return useQuery({
    queryKey: clientProfileQueryKeys.tasks(clientId || ''),
    queryFn: () => optimizedClientProfileService.getClientTasks(clientId || ''),
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for getting full client profile (all data at once)
export const useFullClientProfile = (clientId: string | undefined) => {
  return useQuery({
    queryKey: clientProfileQueryKeys.fullProfile(clientId || ''),
    queryFn: () => optimizedClientProfileService.getFullClientProfile(clientId || ''),
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for updating client profile
export const useUpdateClientProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, updates }: { clientId: string; updates: Partial<ClientProfileData> }) =>
      optimizedClientProfileService.updateClientProfile(clientId, updates),
    onMutate: async ({ clientId, updates }) => {
      console.log('🔄 Optimistically updating client profile...');
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: clientProfileQueryKeys.profile(clientId) 
      });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData<ClientProfileData>(
        clientProfileQueryKeys.profile(clientId)
      );

      // Optimistically update the cache
      if (previousProfile) {
        const optimisticProfile = { ...previousProfile, ...updates };
        queryClient.setQueryData(
          clientProfileQueryKeys.profile(clientId),
          optimisticProfile
        );
      }

      return { previousProfile, clientId };
    },
    onError: (error, { clientId }, context) => {
      console.error('❌ Error updating client profile:', error);
      
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(
          clientProfileQueryKeys.profile(clientId),
          context.previousProfile
        );
      }
      
      toast.error('Failed to update client profile. Please try again.');
    },
    onSuccess: (success, { clientId }) => {
      if (success) {
        console.log('✅ Client profile updated successfully');
        toast.success('Client profile updated successfully');
        
        // Invalidate related queries
        queryClient.invalidateQueries({ 
          queryKey: clientProfileQueryKeys.profile(clientId) 
        });
        queryClient.invalidateQueries({ 
          queryKey: clientProfileQueryKeys.fullProfile(clientId) 
        });
      } else {
        toast.error('Failed to update client profile');
      }
    },
    onSettled: (data, error, { clientId }) => {
      // Always refetch after settled
      queryClient.invalidateQueries({ 
        queryKey: clientProfileQueryKeys.profile(clientId) 
      });
    },
  });
};

// Hook for invalidating client profile cache
export const useInvalidateClientProfile = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (clientId: string) => {
      console.log(`🗑️ Invalidating client profile cache for: ${clientId}`);
      
      // Invalidate service cache
      optimizedClientProfileService.invalidateClientProfileCache(clientId);
      
      // Invalidate React Query caches
      queryClient.invalidateQueries({ 
        queryKey: clientProfileQueryKeys.profile(clientId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: clientProfileQueryKeys.sessions(clientId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: clientProfileQueryKeys.tasks(clientId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: clientProfileQueryKeys.fullProfile(clientId) 
      });
    },
    [queryClient]
  );
};

// Hook for cache management
export const useClientProfileCacheManager = () => {
  const queryClient = useQueryClient();

  const clearAllCaches = useCallback(() => {
    console.log('🗑️ Clearing all client profile caches...');
    
    // Clear service caches
    optimizedClientProfileService.clearAllCaches();
    
    // Clear React Query caches
    queryClient.invalidateQueries({ 
      queryKey: clientProfileQueryKeys.all 
    });
    
    toast.success('Client profile caches cleared');
  }, [queryClient]);

  const preloadClientProfile = useCallback(
    async (clientId: string) => {
      console.log(`⏳ Preloading client profile: ${clientId}`);
      
      try {
        await queryClient.prefetchQuery({
          queryKey: clientProfileQueryKeys.fullProfile(clientId),
          queryFn: () => optimizedClientProfileService.getFullClientProfile(clientId),
          staleTime: 3 * 60 * 1000, // 3 minutes
        });
        
        console.log(`✅ Preloaded client profile: ${clientId}`);
      } catch (error) {
        console.error(`❌ Failed to preload client profile: ${clientId}`, error);
      }
    },
    [queryClient]
  );

  return {
    clearAllCaches,
    preloadClientProfile,
  };
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import console from '@/lib/production-console';
import {
  optimizedSettingsService,
  type UserSettings,
  type AdminNotificationSetting,
  type AISettings,
} from '@/services/api/optimized/settingsService';

// Query keys
export const settingsQueryKeys = {
  all: ['settings'] as const,
  user: (userId: string) => [...settingsQueryKeys.all, 'user', userId] as const,
  inviteCode: (userId: string) => [...settingsQueryKeys.all, 'inviteCode', userId] as const,
  adminNotifications: () => [...settingsQueryKeys.all, 'adminNotifications'] as const,
  aiSettings: () => [...settingsQueryKeys.all, 'aiSettings'] as const,
};

// Hook for getting user settings
export const useUserSettings = (userId: string | undefined) => {
  return useQuery({
    queryKey: settingsQueryKeys.user(userId || ''),
    queryFn: () => optimizedSettingsService.getUserSettings(userId || ''),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for updating user settings
export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, settings }: { userId: string; settings: Partial<UserSettings> }) =>
      optimizedSettingsService.updateUserSettings(userId, settings),
    onMutate: async ({ userId, settings }) => {
      console.log('🔄 Optimistically updating user settings...');
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: settingsQueryKeys.user(userId) 
      });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<UserSettings>(
        settingsQueryKeys.user(userId)
      );

      // Optimistically update the cache
      if (previousSettings) {
        const optimisticSettings = { ...previousSettings, ...settings };
        queryClient.setQueryData(
          settingsQueryKeys.user(userId),
          optimisticSettings
        );
      }

      return { previousSettings, userId };
    },
    onError: (error, { userId }, context) => {
      console.error('❌ Error updating user settings:', error);
      
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(
          settingsQueryKeys.user(userId),
          context.previousSettings
        );
      }
      
      toast.error('Failed to update settings. Please try again.');
    },
    onSuccess: (success, { userId }) => {
      if (success) {
        console.log('✅ User settings updated successfully');
        toast.success('Settings updated successfully');
        
        // Invalidate related queries
        queryClient.invalidateQueries({ 
          queryKey: settingsQueryKeys.user(userId) 
        });
      } else {
        toast.error('Failed to update settings');
      }
    },
  });
};

// Hook for getting therapist invite code
export const useTherapistInviteCode = (userId: string | undefined) => {
  return useQuery({
    queryKey: settingsQueryKeys.inviteCode(userId || ''),
    queryFn: () => optimizedSettingsService.getTherapistInviteCode(userId || ''),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes (invite codes don't change often)
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for getting admin notification settings
export const useAdminNotificationSettings = () => {
  return useQuery({
    queryKey: settingsQueryKeys.adminNotifications(),
    queryFn: () => optimizedSettingsService.getAdminNotificationSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for updating admin notification settings
export const useUpdateAdminNotificationSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      optimizedSettingsService.updateAdminNotificationSetting(id, updates),
    onMutate: async ({ id, updates }) => {
      console.log('🔄 Optimistically updating admin notification setting...');
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: settingsQueryKeys.adminNotifications() 
      });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<AdminNotificationSetting[]>(
        settingsQueryKeys.adminNotifications()
      );

      // Optimistically update the cache
      if (previousSettings) {
        const optimisticSettings = previousSettings.map(setting => 
          setting.id === id ? { ...setting, ...updates } : setting
        );
        queryClient.setQueryData(
          settingsQueryKeys.adminNotifications(),
          optimisticSettings
        );
      }

      return { previousSettings, id };
    },
    onError: (error, { id }, context) => {
      console.error('❌ Error updating admin notification setting:', error);
      
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(
          settingsQueryKeys.adminNotifications(),
          context.previousSettings
        );
      }
      
      toast.error('Failed to update notification setting. Please try again.');
    },
    onSuccess: (success, { id }) => {
      if (success) {
        console.log('✅ Admin notification setting updated successfully');
        toast.success('Notification setting updated successfully');
        
        // Invalidate related queries
        queryClient.invalidateQueries({ 
          queryKey: settingsQueryKeys.adminNotifications() 
        });
      } else {
        toast.error('Failed to update notification setting');
      }
    },
  });
};

// Hook for getting AI settings
export const useAISettings = () => {
  return useQuery({
    queryKey: settingsQueryKeys.aiSettings(),
    queryFn: () => optimizedSettingsService.getAISettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for updating AI settings
export const useUpdateAISetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ settingName, settingValue }: { settingName: string; settingValue: any }) =>
      optimizedSettingsService.updateAISetting(settingName, settingValue),
    onMutate: async ({ settingName, settingValue }) => {
      console.log('🔄 Optimistically updating AI setting...');
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: settingsQueryKeys.aiSettings() 
      });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<AISettings>(
        settingsQueryKeys.aiSettings()
      );

      // Optimistically update the cache
      if (previousSettings) {
        const optimisticSettings = { 
          ...previousSettings, 
          [settingName]: settingValue 
        };
        queryClient.setQueryData(
          settingsQueryKeys.aiSettings(),
          optimisticSettings
        );
      }

      return { previousSettings, settingName };
    },
    onError: (error, { settingName }, context) => {
      console.error('❌ Error updating AI setting:', error);
      
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(
          settingsQueryKeys.aiSettings(),
          context.previousSettings
        );
      }
      
      toast.error('Failed to update AI setting. Please try again.');
    },
    onSuccess: (success, { settingName }) => {
      if (success) {
        console.log('✅ AI setting updated successfully');
        toast.success('AI setting updated successfully');
        
        // Invalidate related queries
        queryClient.invalidateQueries({ 
          queryKey: settingsQueryKeys.aiSettings() 
        });
      } else {
        toast.error('Failed to update AI setting');
      }
    },
  });
};

// Hook for cache management
export const useSettingsCacheManager = () => {
  const queryClient = useQueryClient();

  const clearAllCaches = useCallback(() => {
    console.log('🗑️ Clearing all settings caches...');
    
    // Clear service caches
    optimizedSettingsService.clearAllCaches();
    
    // Clear React Query caches
    queryClient.invalidateQueries({ 
      queryKey: settingsQueryKeys.all 
    });
    
    toast.success('Settings caches cleared');
  }, [queryClient]);

  const invalidateUserSettings = useCallback(
    (userId: string) => {
      console.log(`🗑️ Invalidating user settings cache for: ${userId}`);
      
      // Invalidate service cache
      optimizedSettingsService.invalidateSettingsCache(userId);
      
      // Invalidate React Query caches
      queryClient.invalidateQueries({ 
        queryKey: settingsQueryKeys.user(userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: settingsQueryKeys.inviteCode(userId) 
      });
    },
    [queryClient]
  );

  const preloadSettings = useCallback(
    async (userId: string) => {
      console.log(`⏳ Preloading settings for: ${userId}`);
      
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: settingsQueryKeys.user(userId),
            queryFn: () => optimizedSettingsService.getUserSettings(userId),
            staleTime: 10 * 60 * 1000, // 10 minutes
          }),
          queryClient.prefetchQuery({
            queryKey: settingsQueryKeys.inviteCode(userId),
            queryFn: () => optimizedSettingsService.getTherapistInviteCode(userId),
            staleTime: 30 * 60 * 1000, // 30 minutes
          }),
        ]);
        
        console.log(`✅ Preloaded settings for: ${userId}`);
      } catch (error) {
        console.error(`❌ Failed to preload settings for: ${userId}`, error);
      }
    },
    [queryClient]
  );

  return {
    clearAllCaches,
    invalidateUserSettings,
    preloadSettings,
  };
};
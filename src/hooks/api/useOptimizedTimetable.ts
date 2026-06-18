import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { startOfWeek } from 'date-fns';
import console from '@/lib/production-console';
import {
  optimizedTimetableService,
  type WeeklyTimetableData,
  type WeeklyAvailabilityData,
  type SessionData,
  type TimeSlot,
} from '@/services/api/optimized/timetableService';

// Query keys
export const timetableQueryKeys = {
  all: ['timetable'] as const,
  weekly: (userId: string, weekStart: string) => [...timetableQueryKeys.all, 'weekly', userId, weekStart] as const,
  availability: (userId: string, weekStart: string) => [...timetableQueryKeys.all, 'availability', userId, weekStart] as const,
  sessions: (userId: string, weekStart: string) => [...timetableQueryKeys.all, 'sessions', userId, weekStart] as const,
  availableSlots: (userId: string, date: string) => [...timetableQueryKeys.all, 'availableSlots', userId, date] as const,
};

// Hook for getting weekly timetable data
export const useWeeklyTimetable = (userId: string | undefined, weekStart: Date) => {
  const weekStartKey = weekStart.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: timetableQueryKeys.weekly(userId || '', weekStartKey),
    queryFn: () => optimizedTimetableService.getWeeklyTimetable(userId || '', weekStart),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for getting weekly availability
export const useWeeklyAvailability = (userId: string | undefined, weekStart: Date) => {
  const weekStartKey = weekStart.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: timetableQueryKeys.availability(userId || '', weekStartKey),
    queryFn: () => optimizedTimetableService.getWeeklyAvailability(userId || '', weekStart),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for getting user sessions
export const useUserSessions = (userId: string | undefined, weekStart: Date) => {
  const weekStartKey = weekStart.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: timetableQueryKeys.sessions(userId || '', weekStartKey),
    queryFn: () => optimizedTimetableService.getUserSessions(userId || '', weekStart),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for getting available slots for a specific date
export const useAvailableSlots = (userId: string | undefined, date: Date) => {
  const dateKey = date.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: timetableQueryKeys.availableSlots(userId || '', dateKey),
    queryFn: () => optimizedTimetableService.getAvailableSlots(userId || '', date),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for updating weekly availability
export const useUpdateWeeklyAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, availability }: { userId: string; availability: WeeklyAvailabilityData }) =>
      optimizedTimetableService.updateWeeklyAvailability(userId, availability),
    onMutate: async ({ userId, availability }) => {
      console.log('🔄 Optimistically updating weekly availability...');
      
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekStartKey = weekStart.toISOString().split('T')[0];

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: timetableQueryKeys.availability(userId, weekStartKey) 
      });
      await queryClient.cancelQueries({ 
        queryKey: timetableQueryKeys.weekly(userId, weekStartKey) 
      });

      // Snapshot the previous values
      const previousAvailability = queryClient.getQueryData<WeeklyAvailabilityData>(
        timetableQueryKeys.availability(userId, weekStartKey)
      );
      const previousWeeklyData = queryClient.getQueryData<WeeklyTimetableData>(
        timetableQueryKeys.weekly(userId, weekStartKey)
      );

      // Optimistically update the cache
      queryClient.setQueryData(
        timetableQueryKeys.availability(userId, weekStartKey),
        availability
      );

      if (previousWeeklyData) {
        queryClient.setQueryData(
          timetableQueryKeys.weekly(userId, weekStartKey),
          { ...previousWeeklyData, weeklyAvailability: availability }
        );
      }

      return { previousAvailability, previousWeeklyData, userId, weekStartKey };
    },
    onError: (error, { userId }, context) => {
      console.error('❌ Error updating weekly availability:', error);
      
      // Rollback on error
      if (context?.previousAvailability) {
        queryClient.setQueryData(
          timetableQueryKeys.availability(userId, context.weekStartKey),
          context.previousAvailability
        );
      }
      if (context?.previousWeeklyData) {
        queryClient.setQueryData(
          timetableQueryKeys.weekly(userId, context.weekStartKey),
          context.previousWeeklyData
        );
      }
      
      toast.error('Failed to update availability. Please try again.');
    },
    onSuccess: (success, { userId }) => {
      if (success) {
        console.log('✅ Weekly availability updated successfully');
        toast.success('Availability updated successfully');
        
        // Invalidate related queries
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekStartKey = weekStart.toISOString().split('T')[0];
        
        queryClient.invalidateQueries({ 
          queryKey: timetableQueryKeys.availability(userId, weekStartKey) 
        });
        queryClient.invalidateQueries({ 
          queryKey: timetableQueryKeys.weekly(userId, weekStartKey) 
        });
      } else {
        toast.error('Failed to update availability');
      }
    },
  });
};

// Hook for updating a single time slot
export const useUpdateTimeSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      userId, 
      dayKey, 
      timeSlot, 
      available 
    }: { 
      userId: string; 
      dayKey: string; 
      timeSlot: string; 
      available: boolean; 
    }) =>
      optimizedTimetableService.updateTimeSlot(userId, dayKey, timeSlot, available),
    onMutate: async ({ userId, dayKey, timeSlot, available }) => {
      console.log('🔄 Optimistically updating time slot...');
      
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekStartKey = weekStart.toISOString().split('T')[0];

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: timetableQueryKeys.availability(userId, weekStartKey) 
      });

      // Snapshot the previous value
      const previousAvailability = queryClient.getQueryData<WeeklyAvailabilityData>(
        timetableQueryKeys.availability(userId, weekStartKey)
      );

      // Optimistically update the cache
      if (previousAvailability) {
        const optimisticAvailability = {
          ...previousAvailability,
          [dayKey]: (previousAvailability[dayKey] || []).map(slot =>
            slot.time === timeSlot
              ? { ...slot, available }
              : slot
          )
        };
        
        queryClient.setQueryData(
          timetableQueryKeys.availability(userId, weekStartKey),
          optimisticAvailability
        );
      }

      return { previousAvailability, userId, weekStartKey };
    },
    onError: (error, { userId }, context) => {
      console.error('❌ Error updating time slot:', error);
      
      // Rollback on error
      if (context?.previousAvailability) {
        queryClient.setQueryData(
          timetableQueryKeys.availability(userId, context.weekStartKey),
          context.previousAvailability
        );
      }
      
      toast.error('Failed to update time slot. Please try again.');
    },
    onSuccess: (success, { userId, timeSlot }) => {
      if (success) {
        console.log('✅ Time slot updated successfully');
        // Don't show toast for individual slot updates to avoid spam
        
        // Invalidate related queries
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekStartKey = weekStart.toISOString().split('T')[0];
        
        queryClient.invalidateQueries({ 
          queryKey: timetableQueryKeys.availability(userId, weekStartKey) 
        });
        queryClient.invalidateQueries({ 
          queryKey: timetableQueryKeys.weekly(userId, weekStartKey) 
        });
      }
    },
  });
};

// Hook for cache management
export const useTimetableCacheManager = () => {
  const queryClient = useQueryClient();

  const clearAllCaches = useCallback(() => {
    console.log('🗑️ Clearing all timetable caches...');
    
    // Clear service caches
    optimizedTimetableService.clearAllCaches();
    
    // Clear React Query caches
    queryClient.invalidateQueries({ 
      queryKey: timetableQueryKeys.all 
    });
    
    toast.success('Timetable caches cleared');
  }, [queryClient]);

  const invalidateUserTimetable = useCallback(
    (userId: string, weekStart?: Date) => {
      console.log(`🗑️ Invalidating timetable cache for: ${userId}`);
      
      // Invalidate service cache
      optimizedTimetableService.invalidateTimetableCache(userId, weekStart);
      
      // Invalidate React Query caches
      if (weekStart) {
        const weekStartKey = weekStart.toISOString().split('T')[0];
        queryClient.invalidateQueries({ 
          queryKey: timetableQueryKeys.weekly(userId, weekStartKey) 
        });
        queryClient.invalidateQueries({ 
          queryKey: timetableQueryKeys.availability(userId, weekStartKey) 
        });
        queryClient.invalidateQueries({ 
          queryKey: timetableQueryKeys.sessions(userId, weekStartKey) 
        });
      } else {
        queryClient.invalidateQueries({ 
          predicate: (query) => 
            query.queryKey[0] === 'timetable' && 
            query.queryKey.some(key => key === userId)
        });
      }
    },
    [queryClient]
  );

  const preloadTimetable = useCallback(
    async (userId: string, weekStart: Date) => {
      console.log(`⏳ Preloading timetable for: ${userId}`);
      
      try {
        await queryClient.prefetchQuery({
          queryKey: timetableQueryKeys.weekly(userId, weekStart.toISOString().split('T')[0]),
          queryFn: () => optimizedTimetableService.getWeeklyTimetable(userId, weekStart),
          staleTime: 5 * 60 * 1000, // 5 minutes
        });
        
        console.log(`✅ Preloaded timetable for: ${userId}`);
      } catch (error) {
        console.error(`❌ Failed to preload timetable for: ${userId}`, error);
      }
    },
    [queryClient]
  );

  return {
    clearAllCaches,
    invalidateUserTimetable,
    preloadTimetable,
  };
};
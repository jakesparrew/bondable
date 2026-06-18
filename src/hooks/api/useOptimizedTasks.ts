import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OptimizedTasksService } from "@/services/api/optimized/tasksService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/use-toast";
import type { TaskWithProfiles, TaskCreate, TaskUpdate, TaskFilters } from "@/services/api/TaskService";

interface UseOptimizedTasksOptions {
  filters?: TaskFilters;
  enableRealtime?: boolean;
  enableStats?: boolean;
  enableClients?: boolean;
  refetchInterval?: number;
}

export function useOptimizedTasks(
  userType: "therapist" | "client",
  userId: string,
  options: UseOptimizedTasksOptions = {}
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    filters = {},
    enableRealtime = true,
    enableStats = true,
    enableClients = true,
    refetchInterval = 5 * 60 * 1000, // 5 minutes
  } = options;

  // Memoize query keys
  const tasksQueryKey = useMemo(() => 
    ["optimized-tasks", userType, userId, filters], 
    [userType, userId, filters]
  );
  
  const statsQueryKey = useMemo(() => 
    ["optimized-task-stats", userType, userId], 
    [userType, userId]
  );
  
  const clientsQueryKey = useMemo(() => 
    ["optimized-task-clients", userId], 
    [userId]
  );

  // Prepare filters based on user type
  const taskFilters = useMemo(() => {
    const baseFilters = { ...filters };
    if (userType === "therapist") {
      baseFilters.therapistId = userId;
    } else {
      baseFilters.clientId = userId;
    }
    return baseFilters;
  }, [userType, userId, filters]);

  // Tasks query with optimistic caching
  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: tasksQueryKey,
    queryFn: () => OptimizedTasksService.getTasks(taskFilters),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval,
    retry: (failureCount, error) => {
      if (error?.message?.includes('row-level security policy')) {
        console.error("RLS policy error - not retrying:", error);
        return false;
      }
      return failureCount < 2;
    },
  });

  // Task stats query
  const {
    data: taskStats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: statsQueryKey,
    queryFn: () => OptimizedTasksService.getTaskStats(userId, userType),
    enabled: !!userId && enableStats,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Clients query (for therapists)
  const {
    data: clients = [],
    isLoading: isLoadingClients,
  } = useQuery({
    queryKey: clientsQueryKey,
    queryFn: () => OptimizedTasksService.getClientsForTherapist(userId),
    enabled: userType === "therapist" && !!userId && enableClients,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Optimistic create mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskCreate) => {
      return OptimizedTasksService.createTask(taskData);
    },
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: tasksQueryKey });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<TaskWithProfiles[]>(tasksQueryKey);

      // Optimistically update
      if (previousTasks) {
        const optimisticTask = {
          id: `temp-${Date.now()}`,
          ...newTask,
          status: "assigned",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          client: null,
          therapist: null,
        } as TaskWithProfiles;

        queryClient.setQueryData(tasksQueryKey, [optimisticTask, ...previousTasks]);
      }

      return { previousTasks };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousTasks) {
        queryClient.setQueryData(tasksQueryKey, context.previousTasks);
      }
      
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to assign task. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["optimized-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["optimized-task-stats"] });
      
      toast({
        title: "Success",
        description: "Task assigned successfully",
      });
    },
  });

  // Optimistic update mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      return OptimizedTasksService.updateTask(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: tasksQueryKey });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<TaskWithProfiles[]>(tasksQueryKey);

      // Optimistically update
      if (previousTasks) {
        const updatedTasks = previousTasks.map(task =>
          task.id === id
            ? { ...task, ...updates, updated_at: new Date().toISOString() }
            : task
        );
        queryClient.setQueryData(tasksQueryKey, updatedTasks);
      }

      return { previousTasks };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousTasks) {
        queryClient.setQueryData(tasksQueryKey, context.previousTasks);
      }
      
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ["optimized-task-stats"] });
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
  });

  // Delete mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => OptimizedTasksService.deleteTask(taskId),
    onMutate: async (taskId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: tasksQueryKey });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<TaskWithProfiles[]>(tasksQueryKey);

      // Optimistically remove
      if (previousTasks) {
        const filteredTasks = previousTasks.filter(task => task.id !== taskId);
        queryClient.setQueryData(tasksQueryKey, filteredTasks);
      }

      return { previousTasks };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousTasks) {
        queryClient.setQueryData(tasksQueryKey, context.previousTasks);
      }
      
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ["optimized-task-stats"] });
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime || !userId) return;

    console.log("🔄 Setting up real-time subscription for tasks");

    const channel = supabase
      .channel("optimized-tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          console.log("🔄 Real-time task change detected:", payload);
          
          // Invalidate queries to refetch fresh data
          queryClient.invalidateQueries({ queryKey: ["optimized-tasks"] });
          queryClient.invalidateQueries({ queryKey: ["optimized-task-stats"] });
        }
      )
      .subscribe();

    return () => {
      console.log("🔄 Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [queryClient, enableRealtime, userId]);

  // Preload data on mount
  useEffect(() => {
    if (userId) {
      OptimizedTasksService.preloadData(taskFilters);
    }
  }, [userId, taskFilters]);

  // Invalidate cache helper
  const invalidateCache = useCallback(() => {
    OptimizedTasksService.invalidateAllCaches();
    queryClient.invalidateQueries({ queryKey: ["optimized-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["optimized-task-stats"] });
    queryClient.invalidateQueries({ queryKey: ["optimized-task-clients"] });
  }, [queryClient]);

  return {
    // Data
    tasks,
    taskStats,
    clients,
    
    // Loading states
    isLoading: isLoadingTasks,
    isLoadingStats,
    isLoadingClients,
    
    // Error states
    error: tasksError,
    
    // Actions
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    
    // Action states
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    
    // Utilities
    refetch: refetchTasks,
    invalidateCache,
  };
}
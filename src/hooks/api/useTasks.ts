
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskService, type TaskWithProfiles, type TaskInsert, type TaskUpdate } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/use-toast";

export function useTasks(userType: "therapist" | "client", userId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tasks based on user type
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["tasks", userType, userId],
    queryFn: async () => {
      console.log(`Fetching tasks for ${userType} with userId:`, userId);
      
      if (userType === "therapist") {
        const therapistTasks = await TaskService.getTasks({ therapistId: userId });
        console.log("Therapist tasks fetched:", therapistTasks);
        return therapistTasks;
      } else {
        const clientTasks = await TaskService.getTasks({ clientId: userId });
        console.log("Client tasks fetched:", clientTasks);
        return clientTasks;
      }
    },
    enabled: !!userId,
    retry: (failureCount, error) => {
      // Don't retry on RLS policy errors
      if (error?.message?.includes('row-level security policy')) {
        console.error("RLS policy error - not retrying:", error);
        return false;
      }
      return failureCount < 3;
    },
  });

  // Fetch clients for therapist (for task assignment)
  const { data: clients = [] } = useQuery({
    queryKey: ["clients", userId],
    queryFn: async () => {
      console.log("Fetching clients for therapist:", userId);
      const clientsData = await TaskService.getClientsForTherapist(userId);
      console.log("Clients data fetched:", clientsData);
      return clientsData;
    },
    enabled: userType === "therapist" && !!userId,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskInsert) => {
      console.log("Creating task with data:", taskData);
      const result = await TaskService.createTask(taskData);
      console.log("Task created successfully:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Success",
        description: "Task assigned successfully",
      });
    },
    onError: (error) => {
      console.error("Error creating task:", error);
      toast({
        title: "Error", 
        description: "Failed to assign task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      console.log("Updating task via mutation:", id, updates);
      return TaskService.updateTask(id, updates);
    },
    onSuccess: (data) => {
      console.log("Task update mutation succeeded:", data);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: TaskService.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          console.log("Real-time task change detected:", payload);
          // Invalidate and refetch tasks when changes occur
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    tasks,
    clients,
    isLoading,
    error,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}

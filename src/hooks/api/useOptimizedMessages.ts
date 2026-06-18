import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OptimizedMessagesService } from "@/services/api/optimized/messagesService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/use-toast";

interface UseOptimizedMessagesOptions {
  enableRealtime?: boolean;
  enableUnreadCounts?: boolean;
  refetchInterval?: number;
  messagesLimit?: number;
}

export function useOptimizedMessages(
  userId: string,
  userRole: "client" | "therapist",
  options: UseOptimizedMessagesOptions = {}
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    enableRealtime = true,
    enableUnreadCounts = true,
    refetchInterval = 30 * 1000, // 30 seconds
    messagesLimit = 50,
  } = options;

  // Memoize query keys
  const conversationsQueryKey = useMemo(() => 
    ["optimized-conversations", userId, userRole], 
    [userId, userRole]
  );
  
  const unreadCountsQueryKey = useMemo(() => 
    ["optimized-unread-counts", userId], 
    [userId]
  );

  // Conversations query
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: conversationsError,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: conversationsQueryKey,
    queryFn: () => OptimizedMessagesService.getConversations(userId, userRole),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval,
    retry: (failureCount, error) => {
      if (error?.message?.includes('row-level security policy')) {
        console.error("RLS policy error - not retrying:", error);
        return false;
      }
      return failureCount < 2;
    },
  });

  // Unread counts query
  const {
    data: unreadCounts = {},
    isLoading: isLoadingUnreadCounts,
  } = useQuery({
    queryKey: unreadCountsQueryKey,
    queryFn: () => OptimizedMessagesService.getUnreadCounts(userId),
    enabled: !!userId && enableUnreadCounts,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 10 * 1000, // 10 seconds for unread counts
  });

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      conversation_id: string;
      recipient_id: string;
      content: string;
      message_type?: string;
    }) => {
      return OptimizedMessagesService.sendMessage({
        ...messageData,
        sender_id: userId,
      });
    },
    onMutate: async (newMessage) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationsQueryKey });

      // Snapshot previous value
      const previousConversations = queryClient.getQueryData<any[]>(conversationsQueryKey);

      // Optimistically update conversations list
      if (previousConversations) {
        const updatedConversations = previousConversations.map(conv =>
          conv.id === newMessage.conversation_id
            ? {
                ...conv,
                last_message_at: new Date().toISOString(),
                last_message_preview: newMessage.content.substring(0, 100),
              }
            : conv
        );
        queryClient.setQueryData(conversationsQueryKey, updatedConversations);
      }

      return { previousConversations };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousConversations) {
        queryClient.setQueryData(conversationsQueryKey, context.previousConversations);
      }
      
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["optimized-messages", variables.conversation_id] });
      queryClient.invalidateQueries({ queryKey: unreadCountsQueryKey });
      
      console.log("✅ Message sent successfully");
    },
  });

  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: ({ conversationId }: { conversationId: string }) => {
      return OptimizedMessagesService.markMessagesAsRead(conversationId, userId);
    },
    onSuccess: (data, variables) => {
      // Update unread counts optimistically
      queryClient.setQueryData(unreadCountsQueryKey, (prev: Record<string, number> = {}) => ({
        ...prev,
        [variables.conversationId]: 0,
      }));
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["optimized-messages", variables.conversationId] });
    },
    onError: (error) => {
      console.error("Error marking messages as read:", error);
    },
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: ({ clientId, therapistId }: { clientId: string; therapistId: string }) => {
      return OptimizedMessagesService.createConversation(clientId, therapistId);
    },
    onSuccess: () => {
      // Invalidate conversations
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      
      toast({
        title: "Success",
        description: "Conversation created successfully",
      });
    },
    onError: (error) => {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create conversation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Real-time subscription for conversations and messages
  useEffect(() => {
    if (!enableRealtime || !userId) return;

    console.log("🔄 Setting up real-time subscription for messages");

    const conversationsChannel = supabase
      .channel("optimized-conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          console.log("🔄 Real-time conversation change detected:", payload);
          queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
          queryClient.invalidateQueries({ queryKey: unreadCountsQueryKey });
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("optimized-messages-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("🔄 Real-time message change detected:", payload);
          
          // Invalidate specific conversation messages
          if ((payload.new as any)?.conversation_id) {
            queryClient.invalidateQueries({ 
              queryKey: ["optimized-messages", (payload.new as any).conversation_id] 
            });
          }
          
          // Invalidate conversations and unread counts
          queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
          queryClient.invalidateQueries({ queryKey: unreadCountsQueryKey });
        }
      )
      .subscribe();

    return () => {
      console.log("🔄 Cleaning up real-time subscriptions");
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [queryClient, enableRealtime, userId, conversationsQueryKey, unreadCountsQueryKey]);

  // Preload data on mount
  useEffect(() => {
    if (userId) {
      OptimizedMessagesService.preloadData(userId, userRole);
    }
  }, [userId, userRole]);

  // Calculate total unread count
  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  }, [unreadCounts]);

  // Invalidate cache helper
  const invalidateCache = useCallback(() => {
    OptimizedMessagesService.invalidateMessageCaches();
    queryClient.invalidateQueries({ queryKey: ["optimized-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["optimized-messages"] });
    queryClient.invalidateQueries({ queryKey: ["optimized-unread-counts"] });
  }, [queryClient]);

  return {
    // Data
    conversations,
    unreadCounts,
    totalUnreadCount,
    
    // Loading states
    isLoading: isLoadingConversations,
    isLoadingUnreadCounts,
    
    // Error states
    error: conversationsError,
    
    // Actions
    sendMessage: sendMessageMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    createConversation: createConversationMutation.mutate,
    
    // Action states
    isSending: sendMessageMutation.isPending,
    isMarkingAsRead: markAsReadMutation.isPending,
    isCreatingConversation: createConversationMutation.isPending,
    
    // Utilities
    refetch: refetchConversations,
    invalidateCache,
  };
}

// Hook for getting messages for a specific conversation
export function useOptimizedConversationMessages(
  conversationId: string,
  options: { limit?: number; enabled?: boolean } = {}
) {
  const queryClient = useQueryClient();
  const { limit = 50, enabled = true } = options;

  const messagesQueryKey = useMemo(() => 
    ["optimized-messages", conversationId, limit], 
    [conversationId, limit]
  );

  return useQuery({
    queryKey: messagesQueryKey,
    queryFn: () => OptimizedMessagesService.getMessages(conversationId, limit),
    enabled: !!conversationId && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('row-level security policy')) {
        console.error("RLS policy error - not retrying:", error);
        return false;
      }
      return failureCount < 2;
    },
  });
}
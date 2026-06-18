import { useState, useEffect, useCallback, useRef } from 'react';
import { SimpleMessage, simpleMessageService } from '@/services/utils';
import { useAuthManager } from '@/hooks/api/useAuthManager';

import { toast } from 'sonner';

interface UsePaginatedMessagesProps {
  conversationId?: string;
  pageSize?: number;
}

export const usePaginatedMessages = ({ 
  conversationId, 
  pageSize = 20 
}: UsePaginatedMessagesProps) => {
  const { user } = useAuthManager();
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const optimisticMessagesRef = useRef<Map<string, SimpleMessage>>(new Map());
  const lastMessageIdRef = useRef<string | null>(null);

  // Load initial messages
  const loadInitialMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(true);
      lastMessageIdRef.current = null;
      return;
    }

    setInitialLoading(true);
    try {
      console.log('📥 Loading initial messages for conversation:', conversationId);
      const fetchedMessages = await simpleMessageService.getMessages(conversationId);
      
      // Get the latest messages (most recent pageSize messages)
      const latestMessages = fetchedMessages.slice(-pageSize);
      
      setMessages(latestMessages);
      setHasMore(fetchedMessages.length > pageSize);
      
      if (latestMessages.length > 0) {
        lastMessageIdRef.current = latestMessages[0].id;
      }
      
      console.log(`✅ Loaded ${latestMessages.length} initial messages, hasMore: ${fetchedMessages.length > pageSize}`);
    } catch (err) {
      console.error('❌ Failed to load initial messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setInitialLoading(false);
    }
  }, [conversationId, pageSize]);

  // Load more messages (for scrolling up) with scroll position preservation
  const loadMoreMessages = useCallback(async (preserveScrollCallback?: () => void) => {
    if (!conversationId || loading || !hasMore) return;

    setLoading(true);
    try {
      console.log('📥 Loading more messages for conversation:', conversationId);
      const allMessages = await simpleMessageService.getMessages(conversationId);
      
      // Find the current oldest message index
      const oldestMessageId = lastMessageIdRef.current;
      const oldestIndex = allMessages.findIndex(msg => msg.id === oldestMessageId);
      
      if (oldestIndex > 0) {
        // Get previous pageSize messages
        const startIndex = Math.max(0, oldestIndex - pageSize);
        const olderMessages = allMessages.slice(startIndex, oldestIndex);
        
        setMessages(prev => {
          const newMessages = [...olderMessages, ...prev];
          
          // Call the preserve scroll callback if provided
          if (preserveScrollCallback) {
            setTimeout(preserveScrollCallback, 0);
          }
          
          return newMessages;
        });
        
        setHasMore(startIndex > 0);
        
        if (olderMessages.length > 0) {
          lastMessageIdRef.current = olderMessages[0].id;
        }
        
        console.log(`✅ Loaded ${olderMessages.length} more messages, hasMore: ${startIndex > 0}`);
      } else {
        setHasMore(false);
        console.log('✅ No more messages to load');
      }
    } catch (err) {
      console.error('❌ Failed to load more messages:', err);
      toast.error('Failed to load more messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading, hasMore, pageSize]);

  // Send text message
  const sendMessage = useCallback(async (
    recipientId: string,
    content: string,
    messageType: 'app' | 'sms' | 'ai' = 'app'
  ): Promise<void> => {
    if (!user || !conversationId) {
      toast.error('Cannot send message');
      return;
    }

    // Create optimistic message
    const optimisticId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: SimpleMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      recipient_id: recipientId,
      content,
      message_type: messageType,
      status: 'sending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachments: []
    };

    // Show optimistic message immediately at the end
    optimisticMessagesRef.current.set(optimisticId, optimisticMessage);
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const sentMessage = await simpleMessageService.sendMessage(
        conversationId,
        user.id,
        recipientId,
        content,
        messageType
      );

      // Update optimistic message to show as sent immediately
      const updatedOptimistic = { ...optimisticMessage, status: 'sent' as const };
      optimisticMessagesRef.current.set(optimisticId, updatedOptimistic);
      setMessages(prev => 
        prev.map(msg => msg.id === optimisticId ? updatedOptimistic : msg)
      );

      console.log('✅ Message sent successfully');
    } catch (err) {
      // Remove failed optimistic message
      optimisticMessagesRef.current.delete(optimisticId);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      console.error('❌ Failed to send message:', err);
      toast.error('Failed to send message');
    }
  }, [user, conversationId]);

  // Send file messages
  const sendFileMessages = useCallback(async (
    recipientId: string,
    files: File[]
  ): Promise<void> => {
    if (!user || !conversationId) {
      toast.error('Cannot send files');
      return;
    }

    for (const file of files) {
      // Create optimistic message with blob preview
      const optimisticId = `temp-${Date.now()}-${Math.random()}`;
      const blobUrl = URL.createObjectURL(file);
      const optimisticMessage: SimpleMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: recipientId,
        content: file.name,
        message_type: 'app',
        status: 'sending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attachments: [{
          id: `temp-${Date.now()}`,
          message_id: optimisticId,
          file_name: file.name,
          file_type: file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/')
            ? 'video'
            : file.type === 'application/pdf'
            ? 'pdf'
            : 'file',
          file_size: file.size,
          file_url: blobUrl,
          mime_type: file.type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };

      // Show optimistic message immediately
      optimisticMessagesRef.current.set(optimisticId, optimisticMessage);
      setMessages(prev => [...prev, optimisticMessage]);

      try {
        const sentMessage = await simpleMessageService.sendMessage(
          conversationId,
          user.id,
          recipientId,
          file.name,
          'app',
          [file]
        );

        // Update optimistic message to show as sent immediately
        const updatedOptimistic = { ...optimisticMessage, status: 'sent' as const };
        optimisticMessagesRef.current.set(optimisticId, updatedOptimistic);
        setMessages(prev => 
          prev.map(msg => msg.id === optimisticId ? updatedOptimistic : msg)
        );

        console.log('✅ File sent successfully');
      } catch (err) {
        // Remove failed optimistic message
        optimisticMessagesRef.current.delete(optimisticId);
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        URL.revokeObjectURL(blobUrl);
        console.error('❌ Failed to send file:', err);
        toast.error(`Failed to send ${file.name}`);
      }
    }
  }, [user, conversationId]);

  // Send voice message
  const sendVoiceMessage = useCallback(async (
    recipientId: string,
    audioBlob: Blob,
    duration: number
  ): Promise<void> => {
    if (!user || !conversationId) {
      toast.error('Cannot send voice message');
      return;
    }

    // Create optimistic message with blob preview
    const optimisticId = `temp-${Date.now()}-${Math.random()}`;
    const blobUrl = URL.createObjectURL(audioBlob);
    const durationText = `Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")})`;
    const mimeType = audioBlob.type || 'audio/mp4';
    const fileExt = mimeType.includes('audio/mp4') ? 'm4a' : mimeType.includes('audio/mpeg') ? 'mp3' : 'webm';
    const optimisticMessage: SimpleMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      recipient_id: recipientId,
      content: durationText,
      message_type: 'app',
      status: 'sending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachments: [{
        id: `temp-${Date.now()}`,
        message_id: optimisticId,
        file_name: `voice_${Date.now()}.${fileExt}`,
        file_type: 'voice',
        file_size: audioBlob.size,
        file_url: blobUrl,
        mime_type: mimeType,
        duration_seconds: duration,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    };

    // Show optimistic message immediately
    optimisticMessagesRef.current.set(optimisticId, optimisticMessage);
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const sentMessage = await simpleMessageService.sendMessage(
        conversationId,
        user.id,
        recipientId,
        durationText,
        'app',
        undefined,
        audioBlob,
        duration
      );

      // Update optimistic message to show as sent immediately
      const updatedOptimistic = { ...optimisticMessage, status: 'sent' as const };
      optimisticMessagesRef.current.set(optimisticId, updatedOptimistic);
        setMessages(prev => 
          prev.map(msg => msg.id === optimisticId ? updatedOptimistic : msg)
        );

      console.log('✅ Voice message sent successfully');
    } catch (err) {
        // Remove failed optimistic message
        optimisticMessagesRef.current.delete(optimisticId);
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
      URL.revokeObjectURL(blobUrl);
      console.error('❌ Failed to send voice message:', err);
      toast.error('Failed to send voice message');
    }
  }, [user, conversationId]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!user || !conversationId) return;

    try {
      await simpleMessageService.markAsRead(conversationId, user.id);
    } catch (err) {
      console.error('❌ Failed to mark messages as read:', err);
    }
  }, [user, conversationId]);

  // Load initial messages when conversation changes
  useEffect(() => {
    optimisticMessagesRef.current.clear();
    loadInitialMessages();
  }, [loadInitialMessages]);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      optimisticMessagesRef.current.clear();
      return;
    }

    const unsubscribe = simpleMessageService.subscribeToConversation(
      conversationId,
      (message) => {
        console.log('📨 Real-time message received:', message.id);

        setMessages(prev => {
          // 1) If the real message already exists, update it
          const existingIndex = prev.findIndex(m => m.id === message.id);
          if (existingIndex >= 0) {
            const prevMsg = prev[existingIndex];
            const merged = {
              ...prevMsg,
              ...message,
              attachments: (message.attachments && message.attachments.length > 0)
                ? message.attachments
                : prevMsg.attachments,
              content: (message.content && message.content.trim().length > 0)
                ? message.content
                : prevMsg.content,
            } as SimpleMessage;
            const next = [...prev];
            next[existingIndex] = merged;
            console.log('🔄 Merged existing message:', message.id, 'status:', message.status);
            return next;
          }

          // 2) Try to find a matching optimistic message and replace it IN PLACE
          const matchIdx = prev.findIndex(m => {
            if (!m.id.startsWith('temp-')) return false;
            const similarSender = m.sender_id === message.sender_id;
            const sameConv = m.conversation_id === message.conversation_id;
            const closeInTime = Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 15000;
            const sameContent = m.content === message.content;
            const bothHaveAttachments = (m.attachments?.length || 0) > 0 && (message.attachments?.length || 0) > 0;
            return similarSender && sameConv && closeInTime && (sameContent || bothHaveAttachments);
          });

          if (matchIdx >= 0) {
            const next = [...prev];
            const tempMsg = next[matchIdx];
            const tempId = tempMsg.id;
            optimisticMessagesRef.current.delete(tempId);

            const merged = {
              ...message,
              // Preserve optimistic attachments (blob previews) until real ones are present
              attachments: (message.attachments && message.attachments.length > 0)
                ? message.attachments
                : tempMsg.attachments,
              // Preserve content if backend sends empty
              content: (message.content && message.content.trim().length > 0)
                ? message.content
                : tempMsg.content,
              // Prefer real status, fallback to optimistic
              status: (message.status as any) || tempMsg.status,
            } as SimpleMessage;

            next[matchIdx] = merged; // replace, no removal step
            console.log('🔁 Replaced optimistic message', tempId, 'with real', message.id);
            return next;
          }

          // 3) Otherwise append at the end
          console.log('➕ Added new real-time message:', message.id);
          return [...prev, message];
        });
      }
    );

    return unsubscribe;
  }, [conversationId]);

  // Auto-mark messages as read
  useEffect(() => {
    if (conversationId && user && messages.length > 0) {
      const unreadMessages = messages.filter(msg => 
        msg.recipient_id === user.id && 
        msg.sender_id !== user.id && 
        msg.status !== 'read' &&
        !msg.id.startsWith('temp-') // Don't try to mark optimistic messages as read
      );
      
      if (unreadMessages.length > 0) {
        console.log(`📖 Found ${unreadMessages.length} unread messages, marking as read...`);
        const timeoutId = setTimeout(() => {
          markAsRead();
        }, 1000);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, conversationId, user, markAsRead]);

  return {
    messages,
    loading,
    initialLoading,
    hasMore,
    loadMoreMessages,
    sendMessage,
    sendFileMessages,
    sendVoiceMessage,
    markAsRead,
    refreshMessages: loadInitialMessages,
  };
};
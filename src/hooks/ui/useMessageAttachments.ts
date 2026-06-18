
import { useState, useEffect, useRef } from 'react';
import { messageAttachmentService, MessageAttachment } from '@/services/api';
import { messageCacheService, CachedMessage } from '@/services/cache';
import { supabase } from '@/integrations/supabase/client';

export interface MessageWithAttachments {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: "app" | "sms" | "ai";
  status: "sending" | "sent" | "delivered" | "read";
  sequence_number: number;
  created_at: string;
  updated_at: string;
  read_at?: string;
  attachments?: MessageAttachment[];
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: "app" | "sms" | "ai";
  status: "sending" | "sent" | "delivered" | "read";
  created_at: string;
  updated_at: string;
  read_at?: string;
}

export const useMessageAttachments = (messages: Message[]) => {
  const [messagesWithAttachments, setMessagesWithAttachments] = useState<MessageWithAttachments[]>([]);
  const attachmentCacheRef = useRef<Map<string, MessageAttachment[] | null>>(new Map());
  const processingRef = useRef<Set<string>>(new Set());
  const lastMessageCountRef = useRef<number>(0);

  useEffect(() => {
    const loadAttachmentsForNewMessages = async () => {
      if (messages.length === 0) {
        setMessagesWithAttachments([]);
        return;
      }

      // Get conversation ID from messages
      const conversationId = messages[0]?.conversation_id;
      if (!conversationId) return;

      console.log('📎 Processing messages with latest status updates');

      // If we have new messages or the message count changed significantly, 
      // we might need to refresh attachment data
      const messageCountChanged = Math.abs(messages.length - lastMessageCountRef.current) > 0;
      lastMessageCountRef.current = messages.length;

      // Find messages that need attachment loading
      const messagesToProcess = messages.filter(message => {
        // Skip temporary messages
        if (message.id.startsWith('temp-')) return false;
        
        // Always process if we don't have cached data
        if (!attachmentCacheRef.current.has(message.id)) {
          return true;
        }
        
        // Also reprocess messages that might have new attachments
        // Check if this message has attachment-related content but no cached attachments
        const cachedAttachments = attachmentCacheRef.current.get(message.id);
        const hasAttachmentContent = message.content.includes('📎') || message.content.includes('🎤');
        const hasNoCachedAttachments = !cachedAttachments || cachedAttachments.length === 0;
        
        if (hasAttachmentContent && hasNoCachedAttachments && !processingRef.current.has(message.id)) {
          console.log(`🔄 Reprocessing message ${message.id} - has attachment content but no cached attachments`);
          return true;
        }
        
        return false;
      });

      // Process messages that need attachment loading
      if (messagesToProcess.length > 0) {
        console.log(`📎 Loading attachments for ${messagesToProcess.length} messages`);
        
        // Mark messages as being processed
        messagesToProcess.forEach(msg => processingRef.current.add(msg.id));

        try {
          await Promise.all(
            messagesToProcess.map(async (message) => {
              try {
                const attachments = await messageAttachmentService.getMessageAttachments(message.id);
                attachmentCacheRef.current.set(message.id, attachments);
                
                // Update cache service
                messageCacheService.updateMessageAttachments(conversationId, message.id, attachments);
                
                console.log(`✅ Cached ${attachments.length} attachments for message: ${message.id}`);
              } catch (error) {
                console.error(`❌ Failed to load attachments for message ${message.id}:`, error);
                // Cache empty array to prevent retrying immediately
                attachmentCacheRef.current.set(message.id, []);
              } finally {
                processingRef.current.delete(message.id);
              }
            })
          );
        } catch (error) {
          console.error('❌ Error in batch attachment loading:', error);
          // Clean up processing set
          messagesToProcess.forEach(msg => processingRef.current.delete(msg.id));
        }
      }

      // Build the final messages array with cached attachments
      const result: MessageWithAttachments[] = messages.map(message => {
        if (message.id.startsWith('temp-')) {
          return { ...message, sequence_number: 0, attachments: [] };
        }

        const cachedAttachments = attachmentCacheRef.current.get(message.id);
        return {
          ...message, // This includes the latest status from real-time updates
          sequence_number: 0, // Add default sequence_number, will be updated from database
          attachments: cachedAttachments || []
        };
      });

      setMessagesWithAttachments(result);
      
      // Cache the complete messages with attachments only if we processed new ones
      if (messagesToProcess.length > 0) {
        messageCacheService.cacheMessages(conversationId, result, true);
        messageCacheService.markAttachmentsLoaded(conversationId);
      }
    };

    loadAttachmentsForNewMessages();
  }, [messages]); // This dependency ensures we react to all message changes including status updates

  // Set up real-time subscription for attachment changes
  useEffect(() => {
    if (messages.length === 0) return;

    const conversationId = messages[0]?.conversation_id;
    if (!conversationId) return;

    console.log('🔄 Setting up attachment subscription for conversation:', conversationId);

    const channel = supabase
      .channel(`attachments-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_attachments',
          filter: `message_id=in.(${messages.map(m => m.id).join(',')})`,
        },
        (payload) => {
          console.log('📎 New attachment detected:', payload.new);
          const attachment = payload.new as MessageAttachment;
          const messageId = attachment.message_id;
          
          // Update cache
          const existingAttachments = attachmentCacheRef.current.get(messageId) || [];
          const updatedAttachments = [...existingAttachments, attachment];
          attachmentCacheRef.current.set(messageId, updatedAttachments);
          
          // Update state
          setMessagesWithAttachments(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, attachments: updatedAttachments }
              : msg
          ));
          
          console.log(`✅ Added attachment to message ${messageId}`);
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Cleaning up attachment subscription');
      supabase.removeChannel(channel);
    };
  }, [messages]);

  return messagesWithAttachments;
};

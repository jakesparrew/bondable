import { supabase } from "@/integrations/supabase/client";
import { messageAttachmentService } from "../api/messageAttachmentService";

export interface SimpleMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'app' | 'sms' | 'ai';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  created_at: string;
  updated_at: string;
  read_at?: string;
  attachments?: any[];
}

class SimpleMessageService {
  private messageListeners = new Map<string, Set<(message: SimpleMessage) => void>>();
  private subscriptions = new Map<string, any>();
  private recoveryState = new Map<string, boolean>();

  // Send any type of message - text, file, or voice
  async sendMessage(
    conversationId: string,
    senderId: string,
    recipientId: string,
    content: string,
    messageType: 'app' | 'sms' | 'ai' = 'app',
    files?: File[],
    audioBlob?: Blob,
    duration?: number
  ): Promise<SimpleMessage> {
    try {
      // Insert message to database immediately
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          recipient_id: recipientId,
          content,
          message_type: messageType,
          status: 'sent'
        })
        .select()
        .single();

      if (error) throw error;

      const message = data as SimpleMessage;

      // Handle file uploads in background if provided
      if (files && files.length > 0) {
        this.handleFileUploads(files, senderId, message.id);
      }

      // Handle voice upload in background if provided
      if (audioBlob && duration) {
        this.handleVoiceUpload(audioBlob, duration, senderId, message.id);
      }

      // Immediately notify all listeners in this conversation
      this.notifyListeners(conversationId, message);

      // Fire-and-forget push notification to recipient (works even if their app is closed)
      try {
        await supabase.functions.invoke('send-push', {
          body: {
            userId: recipientId,
            title: 'New message',
            body: content?.slice(0, 120) || '',
            data: { conversation_id: conversationId, type: 'message' },
          },
        });
      } catch (e) {
        console.warn('send-push invocation failed (non-blocking):', e);
      }

      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Subscribe to messages for a conversation
  subscribeToConversation(
    conversationId: string,
    callback: (message: SimpleMessage) => void
  ): () => void {
    // Add to local listeners
    if (!this.messageListeners.has(conversationId)) {
      this.messageListeners.set(conversationId, new Set());
    }
    this.messageListeners.get(conversationId)!.add(callback);

    // Set up database subscription if not exists
    if (!this.subscriptions.has(conversationId)) {
      this.setupDatabaseSubscription(conversationId);
    }

    // Return cleanup function
    return () => {
      const listeners = this.messageListeners.get(conversationId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.messageListeners.delete(conversationId);
          this.cleanupSubscription(conversationId);
        }
      }
    };
  }

  // Get messages for a conversation
  async getMessages(conversationId: string): Promise<SimpleMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        message_attachments (*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(msg => ({
      ...msg,
      attachments: msg.message_attachments || []
    })) as SimpleMessage[];
  }

  // Mark messages as read
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await supabase.rpc('mark_conversation_messages_read', {
      conv_id: conversationId,
      reader_id: userId
    });
  }

  private setupDatabaseSubscription(conversationId: string) {
    console.log('🚀 Setting up simple subscription for:', conversationId);
    
    const channel = supabase
      .channel(`simple-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('📨 Database message update:', payload);
          
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            // Get full message with attachments
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                message_attachments (*)
              `)
              .eq('id', (payload.new as any).id)
              .single();

            if (data) {
              const message = {
                ...data,
                attachments: data.message_attachments || []
              } as SimpleMessage;

              this.notifyListeners(conversationId, message);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_attachments',
        },
        async (payload) => {
          console.log('📎 Attachment updated:', payload);
          
          // Refresh the message with updated attachment
          const attachment = payload.new as any;
          const messageId = attachment.message_id;
          
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              message_attachments (*)
            `)
            .eq('id', messageId)
            .eq('conversation_id', conversationId)
            .single();

          if (data) {
            const message = {
              ...data,
              attachments: data.message_attachments || []
            } as SimpleMessage;

            this.notifyListeners(conversationId, message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_attachments',
        },
        async (payload) => {
          console.log('📎 New attachment:', payload);
          
          // Refresh the message with new attachment
          const attachment = payload.new as any;
          const messageId = attachment.message_id;
          
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              message_attachments (*)
            `)
            .eq('id', messageId)
            .eq('conversation_id', conversationId)
            .single();

          if (data) {
            const message = {
              ...data,
              attachments: data.message_attachments || []
            } as SimpleMessage;

            this.notifyListeners(conversationId, message);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📊 Simple subscription status: ${status}`);
        
        // Handle connection issues more gracefully
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          console.warn(`⚠️ Subscription ${conversationId} had issue: ${status}`);
          this.handleSubscriptionRecovery(conversationId);
        }
      });

    this.subscriptions.set(conversationId, channel);
  }

  private notifyListeners(conversationId: string, message: SimpleMessage) {
    const listeners = this.messageListeners.get(conversationId);
    if (listeners) {
      listeners.forEach(callback => callback(message));
    }
  }

  private handleSubscriptionRecovery(conversationId: string) {
    // Prevent multiple recovery attempts for the same conversation
    if (this.recoveryState.get(conversationId)) {
      console.log(`🔄 Recovery already in progress for: ${conversationId}`);
      return;
    }

    this.recoveryState.set(conversationId, true);
    console.log(`🔄 Starting recovery for subscription: ${conversationId}`);

    // Wait 10 seconds before attempting recovery to avoid thrashing
    setTimeout(() => {
      try {
        // Only attempt recovery if there are still listeners
        if (this.messageListeners.has(conversationId)) {
          console.log(`🔄 Attempting to recover subscription: ${conversationId}`);
          
          // First, completely clean up the old subscription
          this.forceCleanupSubscription(conversationId);
          
          // Then create a fresh subscription
          this.setupDatabaseSubscription(conversationId);
        } else {
          console.log(`⏹️ No listeners for ${conversationId}, skipping recovery`);
        }
      } catch (error) {
        console.error(`❌ Failed to recover subscription for ${conversationId}:`, error);
      } finally {
        // Clear recovery state
        this.recoveryState.delete(conversationId);
      }
    }, 10000);
  }

  private forceCleanupSubscription(conversationId: string) {
    const channel = this.subscriptions.get(conversationId);
    if (channel) {
      try {
        // Force unsubscribe and remove from tracking
        channel.unsubscribe();
        console.log('🧹 Force cleaned up old subscription:', conversationId);
      } catch (error) {
        console.warn('⚠️ Error force cleaning subscription:', error);
      } finally {
        // Always remove from subscriptions map
        this.subscriptions.delete(conversationId);
      }
    }
  }

  private cleanupSubscription(conversationId: string) {
    const channel = this.subscriptions.get(conversationId);
    if (channel) {
      try {
        channel.unsubscribe();
        this.subscriptions.delete(conversationId);
        console.log('🧹 Cleaned up subscription:', conversationId);
      } catch (error) {
        console.warn('⚠️ Error cleaning up subscription:', error);
        this.subscriptions.delete(conversationId);
      }
    }
    // Clear any recovery state
    this.recoveryState.delete(conversationId);
  }

  private async handleFileUploads(files: File[], userId: string, messageId: string) {
    for (const file of files) {
      try {
        const filePath = await messageAttachmentService.uploadFile(file, userId, messageId);
        const fileType = messageAttachmentService.getFileType(file.type);

        await messageAttachmentService.createAttachment(
          messageId,
          file.name,
          fileType,
          file.size,
          filePath,
          file.type
        );

        console.log(`✅ File ${file.name} uploaded successfully`);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error);
      }
    }
  }

  private async handleVoiceUpload(audioBlob: Blob, duration: number, userId: string, messageId: string) {
    try {
      const mimeType = audioBlob.type || 'audio/mp4';
      const fileExt = mimeType.includes('audio/mp4') ? 'm4a' : mimeType.includes('audio/mpeg') ? 'mp3' : 'webm';
      const audioFile = new File([audioBlob], `voice_${Date.now()}.${fileExt}`, { type: mimeType });
      const filePath = await messageAttachmentService.uploadFile(audioFile, userId, messageId);

      await messageAttachmentService.createAttachment(
        messageId,
        audioFile.name,
        'voice',
        audioFile.size,
        filePath,
        audioFile.type,
        duration
      );

      console.log('✅ Voice message uploaded successfully');
    } catch (error) {
      console.error('❌ Failed to upload voice message:', error);
    }
  }

  cleanup() {
    console.log('🧹 Cleaning up all subscriptions...');
    for (const [conversationId] of this.subscriptions) {
      this.cleanupSubscription(conversationId);
    }
    this.messageListeners.clear();
    this.subscriptions.clear();
    this.recoveryState.clear();
  }
}

export const simpleMessageService = new SimpleMessageService();
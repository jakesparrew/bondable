import { supabase } from "@/integrations/supabase/client";
import { messageAttachmentService } from "../api/messageAttachmentService";

export interface RealtimeMessage {
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

interface MessageSubscription {
  conversationId: string;
  callback: (message: RealtimeMessage) => void;
  unsubscribe: () => void;
}

class RealtimeMessageService {
  private subscriptions = new Map<string, MessageSubscription>();
  private messageCache = new Map<string, RealtimeMessage[]>();
  private optimisticMessages = new Map<string, RealtimeMessage>();

  async sendMessage(
    conversationId: string,
    senderId: string,
    recipientId: string,
    content: string,
    messageType: 'app' | 'sms' | 'ai' = 'app'
  ): Promise<RealtimeMessage> {
    try {
      // Send to database immediately (no optimistic messages for text)
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

      const realMessage = data as RealtimeMessage;
      
      // Update cache
      const cached = this.messageCache.get(conversationId) || [];
      cached.push(realMessage);
      cached.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      this.messageCache.set(conversationId, cached);

      return realMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async sendFileMessage(
    conversationId: string,
    senderId: string,
    recipientId: string,
    files: File[]
  ): Promise<void> {
    for (const file of files) {
      // Create optimistic message with blob preview
      const optimisticId = `temp-${Date.now()}-${Math.random()}`;
      const blobUrl = URL.createObjectURL(file);
      const fileType = messageAttachmentService.getFileType(file.type);
      
      const optimisticMessage: RealtimeMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        content: file.name,
        message_type: 'app',
        status: 'sending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attachments: [{
          id: `temp-attachment-${Date.now()}`,
          message_id: optimisticId,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          file_url: blobUrl,
          mime_type: file.type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };

      // Store and show optimistic message immediately
      this.optimisticMessages.set(optimisticId, optimisticMessage);
      const subscription = this.subscriptions.get(conversationId);
      if (subscription) {
        subscription.callback(optimisticMessage);
      }

      try {
        // Create real message
        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            recipient_id: recipientId,
            content: file.name,
            message_type: 'app',
            status: 'sent'
          })
          .select()
          .single();

        if (error) throw error;

        // Update optimistic message status to sent while keeping preview
        const updatedOptimistic = { ...optimisticMessage, status: 'sent' as const };
        this.optimisticMessages.set(optimisticId, updatedOptimistic);
        if (subscription) {
          subscription.callback(updatedOptimistic);
        }

        // Upload file in background
        this.handleFileUpload(file, senderId, data.id, optimisticId, blobUrl);

      } catch (error) {
        console.error(`Failed to send file message for ${file.name}:`, error);
        // Show error state
        const errorMessage = { ...optimisticMessage, status: 'sent' as const, content: `❌ ${file.name}` };
        this.optimisticMessages.set(optimisticId, errorMessage);
        if (subscription) {
          subscription.callback(errorMessage);
        }
        setTimeout(() => {
          this.optimisticMessages.delete(optimisticId);
          URL.revokeObjectURL(blobUrl);
        }, 5000);
      }
    }
  }

  async sendVoiceMessage(
    conversationId: string,
    senderId: string,
    recipientId: string,
    audioBlob: Blob,
    duration: number
  ): Promise<void> {
    // Create optimistic voice message with blob preview
    const optimisticId = `temp-${Date.now()}-${Math.random()}`;
    const blobUrl = URL.createObjectURL(audioBlob);
    const durationText = `Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")})`;
    const mimeType = audioBlob.type || 'audio/mp4';
    const fileExt = mimeType.includes('audio/mp4') ? 'm4a' : mimeType.includes('audio/mpeg') ? 'mp3' : 'webm';
    
    const optimisticMessage: RealtimeMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      content: durationText,
      message_type: 'app',
      status: 'sending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachments: [{
        id: `temp-attachment-${Date.now()}`,
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

    // Store and show optimistic message immediately
    this.optimisticMessages.set(optimisticId, optimisticMessage);
    const subscription = this.subscriptions.get(conversationId);
    if (subscription) {
      subscription.callback(optimisticMessage);
    }

    try {
      // Create real message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          recipient_id: recipientId,
          content: durationText,
          message_type: 'app',
          status: 'sent'
        })
        .select()
        .single();

      if (error) throw error;

      // Update optimistic message status to sent while keeping preview
      const updatedOptimistic = { ...optimisticMessage, status: 'sent' as const };
      this.optimisticMessages.set(optimisticId, updatedOptimistic);
      if (subscription) {
        subscription.callback(updatedOptimistic);
      }

      // Upload voice in background
      const audioFile = new File([audioBlob], `voice_${Date.now()}.${fileExt}`, { type: mimeType });
      this.handleFileUpload(audioFile, senderId, data.id, optimisticId, blobUrl, duration);

    } catch (error) {
      console.error('Failed to send voice message:', error);
      // Show error state
      const errorMessage = { ...optimisticMessage, status: 'sent' as const, content: `❌ ${durationText}` };
      this.optimisticMessages.set(optimisticId, errorMessage);
      if (subscription) {
        subscription.callback(errorMessage);
      }
      setTimeout(() => {
        this.optimisticMessages.delete(optimisticId);
        URL.revokeObjectURL(blobUrl);
      }, 5000);
      throw error;
    }
  }

  private async handleFileUpload(
    file: File,
    userId: string,
    messageId: string,
    optimisticId?: string,
    blobUrl?: string,
    duration?: number
  ): Promise<void> {
    // Background upload - don't await
    setTimeout(async () => {
      try {
        const filePath = await messageAttachmentService.uploadFile(file, userId, messageId);
        const fileType = messageAttachmentService.getFileType(file.type);
        const actualDuration = duration || (fileType === 'voice' ? await messageAttachmentService.getAudioDuration(file) : undefined);

        await messageAttachmentService.createAttachment(
          messageId,
          file.name,
          fileType,
          file.size,
          filePath,
          file.type,
          actualDuration
        );

        // Clean up optimistic message and blob URL after successful upload
        if (optimisticId && blobUrl) {
          this.optimisticMessages.delete(optimisticId);
          URL.revokeObjectURL(blobUrl);
        }

        console.log(`✅ File ${file.name} uploaded and attached successfully`);
      } catch (error) {
        console.error(`❌ Failed to upload file ${file.name}:`, error);
        
        // Clean up on error too
        if (optimisticId && blobUrl) {
          this.optimisticMessages.delete(optimisticId);
          URL.revokeObjectURL(blobUrl);
        }
      }
    }, 100);
  }

  async getMessages(conversationId: string): Promise<RealtimeMessage[]> {
    // Check cache first
    if (this.messageCache.has(conversationId)) {
      return this.messageCache.get(conversationId)!;
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const messages = data as RealtimeMessage[];
    this.messageCache.set(conversationId, messages);
    return messages;
  }

  subscribeToMessages(
    conversationId: string,
    callback: (message: RealtimeMessage) => void
  ): () => void {
    console.log('🚀 Setting up real-time subscription for:', conversationId);

    // Clean up any existing subscription for this conversation
    const existing = this.subscriptions.get(conversationId);
    if (existing) {
      existing.unsubscribe();
    }

    // Enhanced real-time subscription with retry logic
    const channelName = `messages-realtime-${conversationId}-${Date.now()}`;
    let retryCount = 0;
    const maxRetries = 3;

    const createSubscription = () => {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            console.log('📨 Real-time message update:', payload);
            
            if (payload.new) {
              const message = payload.new as RealtimeMessage;
              
              // Update cache
              const cached = this.messageCache.get(conversationId) || [];
              const existingIndex = cached.findIndex(m => m.id === message.id);
              
              if (existingIndex >= 0) {
                cached[existingIndex] = message;
              } else {
                cached.push(message);
                cached.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              }
              
              this.messageCache.set(conversationId, cached);
              callback(message);
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`📊 Subscription status for ${conversationId}:`, status);
          
          if (err) {
            console.error(`❌ Subscription error for ${conversationId}:`, err);
            
            // Retry logic for failed connections
            if (retryCount < maxRetries && status === 'CLOSED') {
              retryCount++;
              console.log(`🔄 Retrying subscription (${retryCount}/${maxRetries})...`);
              setTimeout(() => createSubscription(), 1000 * retryCount);
            }
          } else if (status === 'SUBSCRIBED') {
            retryCount = 0; // Reset on successful connection
          }
        });

      return channel;
    };

    const channel = createSubscription();

    const unsubscribe = () => {
      console.log('🧹 Unsubscribing from messages:', conversationId);
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Error removing channel:', error);
      }
      this.subscriptions.delete(conversationId);
    };

    // Store subscription
    this.subscriptions.set(conversationId, {
      conversationId,
      callback,
      unsubscribe
    });

    return unsubscribe;
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_conversation_messages_read', {
      conv_id: conversationId,
      reader_id: userId
    });

    if (error) {
      console.error('Failed to mark messages as read:', error);
      throw error;
    }
  }

  clearCache(conversationId?: string): void {
    if (conversationId) {
      this.messageCache.delete(conversationId);
    } else {
      this.messageCache.clear();
    }
  }

  cleanup(): void {
    // Unsubscribe from all subscriptions
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
    this.messageCache.clear();
    this.optimisticMessages.clear();
  }
}

// Export singleton instance
export const realtimeMessageService = new RealtimeMessageService();
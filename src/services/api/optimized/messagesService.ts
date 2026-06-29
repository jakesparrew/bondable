import { supabase } from "@/integrations/supabase/client";
import { CacheManager } from "@/services/cache/CacheManager";

export class OptimizedMessagesService {
  private static cacheManager = new CacheManager({ defaultTTL: 2 * 60 * 1000, namespace: "messages" }); // 2 minutes
  private static conversationsCache = new CacheManager({ defaultTTL: 5 * 60 * 1000, namespace: "conversations" }); // 5 minutes
  private static unreadCountsCache = new CacheManager({ defaultTTL: 1 * 60 * 1000, namespace: "unread-counts" }); // 1 minute

  static async getConversations(
    userId: string,
    userRole: 'client' | 'therapist',
    useCache: boolean = true
  ): Promise<any[]> {
    const cacheKey = `${userId}-${userRole}`;
    
    if (useCache) {
      const cached = this.conversationsCache.get(cacheKey) as any[];
      if (cached) {
        console.log("💬 Returning cached conversations data");
        return cached;
      }
    }

    console.log("💬 Fetching fresh conversations data");

    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          client:profiles!conversations_client_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          therapist:profiles!conversations_therapist_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .order('last_message_at', { ascending: false });

      if (userRole === 'therapist') {
        query = query.eq('therapist_id', userId);
      } else {
        query = query.eq('client_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error fetching conversations:", error);
        throw error;
      }

      const conversations = data || [];
      
      if (useCache) {
        this.conversationsCache.set(cacheKey, conversations);
      }

      console.log(`✅ Fetched ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      console.error("❌ Error in getConversations:", error);
      throw error;
    }
  }

  static async getMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0,
    useCache: boolean = true
  ): Promise<any[]> {
    const cacheKey = `${conversationId}-${limit}-${offset}`;
    
    if (useCache) {
      const cached = this.cacheManager.get(cacheKey) as any[];
      if (cached) {
        console.log("📨 Returning cached messages data");
        return cached;
      }
    }

    console.log("📨 Fetching fresh messages data");

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          message_attachments (
            id,
            file_name,
            file_url,
            file_type,
            mime_type,
            file_size,
            duration_seconds
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("❌ Error fetching messages:", error);
        throw error;
      }

      const messages = (data || []).reverse(); // Reverse to get chronological order
      
      if (useCache) {
        this.cacheManager.set(cacheKey, messages);
      }

      console.log(`✅ Fetched ${messages.length} messages`);
      return messages;
    } catch (error) {
      console.error("❌ Error in getMessages:", error);
      throw error;
    }
  }

  static async sendMessage(messageData: {
    conversation_id: string;
    sender_id: string;
    recipient_id: string;
    content: string;
    message_type?: string;
  }): Promise<any> {
    console.log("📤 Sending message:", messageData);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          ...messageData,
          message_type: messageData.message_type || 'app',
          status: 'sent'
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error("❌ Error sending message:", error);
        throw error;
      }

      // Invalidate relevant caches
      this.invalidateMessageCaches(messageData.conversation_id);

      // Fire-and-forget push to recipient
      try {
        await supabase.functions.invoke('send-push', {
          body: {
            userId: messageData.recipient_id,
            title: 'New message',
            body: messageData.content?.slice(0, 120) || '',
            data: { conversation_id: messageData.conversation_id, type: 'message' },
          },
        });
      } catch (e) {
        console.warn('send-push invocation failed (non-blocking):', e);
      }

      console.log("✅ Message sent successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error in sendMessage:", error);
      throw error;
    }
  }

  static async markMessagesAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    console.log("👀 Marking messages as read:", conversationId, userId);

    try {
      const { error } = await supabase.rpc('mark_messages_as_read', {
        conv_id: conversationId,
        reader_id: userId
      });

      if (error) {
        console.error("❌ Error marking messages as read:", error);
        throw error;
      }

      // Invalidate relevant caches
      this.invalidateMessageCaches(conversationId);
      this.unreadCountsCache.clear();

      console.log("✅ Messages marked as read");
    } catch (error) {
      console.error("❌ Error in markMessagesAsRead:", error);
      throw error;
    }
  }

  static async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const cacheKey = userId;
    
    const cached = this.unreadCountsCache.get(cacheKey) as Record<string, number>;
    if (cached) {
      console.log("🔢 Returning cached unread counts");
      return cached;
    }

    console.log("🔢 Fetching fresh unread counts");

    try {
      const { data, error } = await supabase.rpc('get_unread_message_counts', {
        p_user_id: userId
      });

      if (error) {
        console.error("❌ Error fetching unread counts:", error);
        throw error;
      }

      const unreadCounts = (data || []).reduce((acc: Record<string, number>, item: any) => {
        acc[item.conversation_id] = item.unread_count;
        return acc;
      }, {});

      this.unreadCountsCache.set(cacheKey, unreadCounts);

      console.log("✅ Fetched unread counts:", unreadCounts);
      return unreadCounts;
    } catch (error) {
      console.error("❌ Error in getUnreadCounts:", error);
      return {};
    }
  }

  static async createConversation(
    clientId: string,
    therapistId: string
  ): Promise<any> {
    console.log("💬 Creating conversation:", clientId, therapistId);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          client_id: clientId,
          therapist_id: therapistId
        })
        .select(`
          *,
          client:profiles!conversations_client_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          therapist:profiles!conversations_therapist_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error("❌ Error creating conversation:", error);
        throw error;
      }

      // Invalidate conversations cache
      this.conversationsCache.clear();

      console.log("✅ Conversation created successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error in createConversation:", error);
      throw error;
    }
  }

  static invalidateMessageCaches(conversationId?: string): void {
    if (conversationId) {
      // Clear specific conversation messages
      const keys = Array.from((this.cacheManager as any).cache.keys());
      keys.forEach(key => {
        if (typeof key === 'string' && key.startsWith(conversationId)) {
          this.cacheManager.delete(key);
        }
      });
    } else {
      // Clear all message caches
      this.cacheManager.clear();
    }
    
    // Always clear conversations cache when messages change
    this.conversationsCache.clear();
    this.unreadCountsCache.clear();
  }

  static preloadData(userId: string, userRole: 'client' | 'therapist'): void {
    console.log("🚀 Preloading messages data");
    this.getConversations(userId, userRole, false).catch(console.error);
    this.getUnreadCounts(userId).catch(console.error);
  }
}
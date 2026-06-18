
import { MessageAttachment } from '@/services/api/messageAttachmentService';

export interface CachedMessage {
  id: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  created_at: string;
  updated_at: string;
  read_at?: string;
  content?: string;
  attachments?: MessageAttachment[];
}

interface ConversationCache {
  messages: CachedMessage[];
  lastUpdated: number;
  attachmentsLoaded: boolean;
}

class MessageCacheService {
  private cache = new Map<string, ConversationCache>();
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'message_cache';

  constructor() {
    this.loadFromStorage();
  }

  // Get cached messages for a conversation
  getCachedMessages(conversationId: string): CachedMessage[] | null {
    const cached = this.cache.get(conversationId);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.lastUpdated > this.CACHE_EXPIRY) {
      this.cache.delete(conversationId);
      this.saveToStorage();
      return null;
    }

    console.log(`📋 Retrieved ${cached.messages.length} cached messages for conversation: ${conversationId}`);
    return cached.messages;
  }

  // Cache messages for a conversation
  cacheMessages(conversationId: string, messages: CachedMessage[], attachmentsLoaded = false): void {
    this.cache.set(conversationId, {
      messages: [...messages],
      lastUpdated: Date.now(),
      attachmentsLoaded
    });
    
    console.log(`💾 Cached ${messages.length} messages for conversation: ${conversationId}`);
    this.saveToStorage();
  }

  // Update a single message in cache
  updateMessageInCache(conversationId: string, updatedMessage: CachedMessage): void {
    const cached = this.cache.get(conversationId);
    if (!cached) return;

    const messageIndex = cached.messages.findIndex(msg => msg.id === updatedMessage.id);
    if (messageIndex >= 0) {
      cached.messages[messageIndex] = updatedMessage;
      cached.lastUpdated = Date.now();
      this.saveToStorage();
      console.log(`🔄 Updated cached message: ${updatedMessage.id} (status: ${updatedMessage.status})`);
    }
  }

  // Update multiple messages status in cache
  updateMessagesStatus(conversationId: string, messageIds: string[], newStatus: 'sent' | 'delivered' | 'read'): void {
    const cached = this.cache.get(conversationId);
    if (!cached) return;

    let updatedCount = 0;
    cached.messages = cached.messages.map(msg => {
      if (messageIds.includes(msg.id)) {
        updatedCount++;
        return {
          ...msg,
          status: newStatus,
          read_at: newStatus === 'read' ? new Date().toISOString() : msg.read_at,
          updated_at: new Date().toISOString()
        };
      }
      return msg;
    });

    if (updatedCount > 0) {
      cached.lastUpdated = Date.now();
      this.saveToStorage();
      console.log(`🔄 Updated ${updatedCount} messages to status '${newStatus}' in cache`);
    }
  }

  // Add a new message to cache
  addMessageToCache(conversationId: string, newMessage: CachedMessage): void {
    const cached = this.cache.get(conversationId);
    if (!cached) return;

    // Remove any existing message with the same ID (for optimistic updates)
    cached.messages = cached.messages.filter(msg => msg.id !== newMessage.id);
    
    // Add new message and sort by timestamp
    cached.messages.push(newMessage);
    cached.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    cached.lastUpdated = Date.now();
    this.saveToStorage();
    console.log(`➕ Added new message to cache: ${newMessage.id}`);
  }

  // Remove a message from cache
  removeMessageFromCache(conversationId: string, messageId: string): void {
    const cached = this.cache.get(conversationId);
    if (!cached) return;

    const initialLength = cached.messages.length;
    cached.messages = cached.messages.filter(msg => msg.id !== messageId);
    
    if (cached.messages.length !== initialLength) {
      cached.lastUpdated = Date.now();
      this.saveToStorage();
      console.log(`🗑️ Removed message from cache: ${messageId}`);
    }
  }

  // Update attachments for a message
  updateMessageAttachments(conversationId: string, messageId: string, attachments: MessageAttachment[]): void {
    const cached = this.cache.get(conversationId);
    if (!cached) return;

    const messageIndex = cached.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex >= 0) {
      cached.messages[messageIndex].attachments = attachments;
      cached.lastUpdated = Date.now();
      this.saveToStorage();
      console.log(`📎 Updated attachments for cached message: ${messageId}`);
    }
  }

  // Check if attachments are loaded for a conversation
  areAttachmentsLoaded(conversationId: string): boolean {
    const cached = this.cache.get(conversationId);
    return cached?.attachmentsLoaded || false;
  }

  // Mark attachments as loaded for a conversation
  markAttachmentsLoaded(conversationId: string): void {
    const cached = this.cache.get(conversationId);
    if (cached) {
      cached.attachmentsLoaded = true;
      cached.lastUpdated = Date.now();
      this.saveToStorage();
      console.log(`✅ Marked attachments as loaded for conversation: ${conversationId}`);
    }
  }

  // Clear cache for a specific conversation
  clearConversationCache(conversationId: string): void {
    this.cache.delete(conversationId);
    this.saveToStorage();
    console.log(`🗑️ Cleared cache for conversation: ${conversationId}`);
  }

  // Clear all cache
  clearAllCache(): void {
    this.cache.clear();
    this.saveToStorage();
    console.log('🗑️ Cleared all message cache');
  }

  // Invalidate expired cache entries
  invalidateExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.lastUpdated > this.CACHE_EXPIRY) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      this.saveToStorage();
      console.log(`🧹 Invalidated ${expiredKeys.length} expired cache entries`);
    }
  }

  // Save cache to localStorage
  private saveToStorage(): void {
    try {
      const cacheData: Record<string, ConversationCache> = {};
      for (const [key, value] of this.cache.entries()) {
        cacheData[key] = value;
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save message cache to storage:', error);
    }
  }

  // Load cache from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const cacheData = JSON.parse(stored) as Record<string, ConversationCache>;
        this.cache = new Map(Object.entries(cacheData));
        console.log(`📋 Loaded message cache from storage: ${this.cache.size} conversations`);
        
        // Invalidate expired entries on load
        this.invalidateExpiredCache();
      }
    } catch (error) {
      console.warn('Failed to load message cache from storage:', error);
      this.cache = new Map();
    }
  }

  // Get cache statistics
  getCacheStats(): { conversations: number; totalMessages: number; averageMessages: number } {
    let totalMessages = 0;
    for (const cached of this.cache.values()) {
      totalMessages += cached.messages.length;
    }

    return {
      conversations: this.cache.size,
      totalMessages,
      averageMessages: this.cache.size > 0 ? Math.round(totalMessages / this.cache.size) : 0
    };
  }
}

// Export singleton instance
export const messageCacheService = new MessageCacheService();

import { TwilioChannel } from '@/services/api/twilioService';

export interface CachedExternalMessage {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  created_at: string; // ISO string
  status?: string;
  channel: TwilioChannel;
}

interface ConversationCache {
  messages: CachedExternalMessage[];
  lastUpdated: number;
}

class ExternalMessageCacheService {
  private cache = new Map<string, ConversationCache>();
  private readonly CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes
  private readonly STORAGE_KEY = 'external_message_cache_v1';

  constructor() {
    this.loadFromStorage();
  }

  private makeKey(conversationId: string, channel: TwilioChannel) {
    return `${conversationId}:${channel}`;
  }

  get(conversationId: string, channel: TwilioChannel): CachedExternalMessage[] | null {
    const key = this.makeKey(conversationId, channel);
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.lastUpdated > this.CACHE_EXPIRY) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return cached.messages;
  }

  set(conversationId: string, channel: TwilioChannel, messages: CachedExternalMessage[]) {
    const key = this.makeKey(conversationId, channel);
    this.cache.set(key, { messages: [...messages], lastUpdated: Date.now() });
    this.saveToStorage();
  }

  add(conversationId: string, channel: TwilioChannel, message: CachedExternalMessage) {
    const key = this.makeKey(conversationId, channel);
    const cached = this.cache.get(key) || { messages: [], lastUpdated: 0 };
    // Remove duplicate by id then push and sort
    cached.messages = cached.messages.filter(m => m.id !== message.id).concat(message);
    cached.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    cached.lastUpdated = Date.now();
    this.cache.set(key, cached);
    this.saveToStorage();
  }

  clear(conversationId?: string, channel?: TwilioChannel) {
    if (!conversationId) {
      this.cache.clear();
      this.saveToStorage();
      return;
    }
    const key = this.makeKey(conversationId, channel || 'sms');
    this.cache.delete(key);
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      const obj: Record<string, ConversationCache> = {};
      for (const [k, v] of this.cache.entries()) obj[k] = v;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to persist external message cache', e);
    }
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, ConversationCache>;
      this.cache = new Map(Object.entries(obj));
      // invalidate expired
      const now = Date.now();
      let changed = false;
      for (const [k, v] of this.cache.entries()) {
        if (now - v.lastUpdated > this.CACHE_EXPIRY) {
          this.cache.delete(k);
          changed = true;
        }
      }
      if (changed) this.saveToStorage();
    } catch (e) {
      this.cache = new Map();
    }
  }
}

export const externalMessageCacheService = new ExternalMessageCacheService();

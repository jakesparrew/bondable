import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TwilioChannel, twilioService } from '@/services/api/twilioService';
import { externalMessageCacheService } from '@/services/cache/externalMessageCacheService';

export type ExternalMessage = {
  id: string;
  text: string;
  sender: 'therapist' | 'client';
  timestamp: Date;
  status: 'sending' | 'sent';
  type: TwilioChannel;
};

interface UsePaginatedExternalMessagesProps {
  conversationId?: string | null;
  channel: TwilioChannel;
  pageSize?: number;
}

export function usePaginatedExternalMessages({
  conversationId,
  channel,
  pageSize = 30,
}: UsePaginatedExternalMessagesProps) {
  const [messages, setMessages] = useState<ExternalMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldestIdRef = useRef<string | null>(null);
  const channelRef = useRef<string>('');

  const mapRow = useCallback((m: any): ExternalMessage => ({
    id: m.id,
    text: m.content,
    sender: m.direction === 'outbound' ? 'therapist' : 'client',
    timestamp: new Date(m.created_at),
    status: (m.status as 'sent') || 'sent',
    type: m.channel as TwilioChannel,
  }), []);

  const loadAllFromDb = useCallback(async () => {
    if (!conversationId) return [] as ExternalMessage[];
    const { data, error } = await supabase
      .from('external_messages')
      .select('id, content, direction, created_at, status, channel')
      .eq('conversation_id', conversationId)
      .eq('channel', channel)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const mapped = (data || []).map(mapRow);
    // update cache
    externalMessageCacheService.set(conversationId, channel, (data || []).map(d => ({
      id: d.id,
      content: d.content,
      direction: (d.direction as 'inbound' | 'outbound'),
      created_at: d.created_at,
      status: d.status ?? undefined,
      channel: (d.channel as TwilioChannel),
    })));
    return mapped;
  }, [conversationId, channel, mapRow]);

  const loadInitial = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(true);
      oldestIdRef.current = null;
      return;
    }
    setInitialLoading(true);
    try {
      // try cache first
      const cached = externalMessageCacheService.get(conversationId, channel);
      let all: ExternalMessage[] | null = null;
      if (cached) {
        all = cached.map(c => ({
          id: c.id,
          text: c.content,
          sender: c.direction === 'outbound' ? 'therapist' : 'client',
          timestamp: new Date(c.created_at),
          status: (c.status as 'sent') || 'sent',
          type: c.channel,
        }));
      } else {
        all = await loadAllFromDb();
      }

      const latest = all.slice(-pageSize);
      setMessages(latest);
      setHasMore(all.length > pageSize);
      if (latest.length > 0) {
        oldestIdRef.current = latest[0].id;
      } else {
        oldestIdRef.current = null;
      }
    } catch (e) {
      console.error('Failed to load external messages', e);
      toast.error('Failed to load messages');
    } finally {
      setInitialLoading(false);
    }
  }, [conversationId, channel, pageSize, loadAllFromDb]);

  const loadMoreMessages = useCallback(async (preserveScrollCallback?: () => void) => {
    if (!conversationId || loading || !hasMore) return;
    setLoading(true);
    try {
      const all = await loadAllFromDb();
      const oldestId = oldestIdRef.current;
      const oldestIndex = all.findIndex(m => m.id === oldestId);
      if (oldestIndex > 0) {
        const startIndex = Math.max(0, oldestIndex - pageSize);
        const older = all.slice(startIndex, oldestIndex);
        setMessages(prev => {
          const next = [...older, ...prev];
          if (preserveScrollCallback) setTimeout(preserveScrollCallback, 0);
          return next;
        });
        setHasMore(startIndex > 0);
        if (older.length > 0) oldestIdRef.current = older[0].id;
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load older messages', e);
    } finally {
      setLoading(false);
    }
  }, [conversationId, pageSize, hasMore, loading, loadAllFromDb]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    // avoid duplicate subscriptions when channel changes rapidly
    if (channelRef.current) {
      // no-op, kept for future use
    }
    channelRef.current = `${conversationId}-${channel}`;

    const ch = supabase
      .channel(`ext-msgs-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'external_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: any) => {
        const m = payload.new;
        if (!m || m.channel !== channel) return;
        const incoming = mapRow(m);

        // update cache
        externalMessageCacheService.add(conversationId, channel, {
          id: m.id,
          content: m.content,
          direction: m.direction,
          created_at: m.created_at,
          status: m.status,
          channel: m.channel,
        });

        setMessages(prev => {
          if (m.direction === 'outbound') {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              const pm = next[i];
              const isTherapist = pm.sender === 'therapist';
              const sameChannel = pm.type === m.channel;
              const sameText = pm.text === m.content;
              const isOptimistic = pm.id.startsWith('temp-');
              const recentlySent = Math.abs(pm.timestamp.getTime() - new Date(m.created_at).getTime()) < 15000; // 15s window
              if (isTherapist && sameChannel && sameText && (isOptimistic || pm.status === 'sending' || recentlySent)) {
                next[i] = { ...incoming, status: 'sent' };
                return next;
              }
            }
            return [...prev, incoming];
          }
          return [...prev, incoming];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, channel, mapRow]);

  const sendExternalMessage = useCallback(async (to: string, body: string) => {
    if (!conversationId) return;

    // optimistic append
    const optimistic: ExternalMessage = {
      id: `temp-${Date.now()}-${Math.random()}`,
      text: body,
      sender: 'therapist',
      timestamp: new Date(),
      status: 'sending',
      type: channel,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      await twilioService.sendMessage({ to, body, channel, conversationId });
      // mark optimistic as sent; real-time will replace or append later
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, status: 'sent' } : m));
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      console.error('Failed to send message', e);
      toast.error('Failed to send message');
    }
  }, [conversationId, channel]);

  // Load initial when conversation/channel changes
  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, channel]);

  return {
    messages,
    hasMore,
    initialLoading,
    loadingMore: loading,
    loadMoreMessages,
    sendExternalMessage,
    refresh: loadInitial,
  } as const;
}

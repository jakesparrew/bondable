import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthManager } from '@/hooks/api/useAuthManager';
import { avatarCache } from '@/services/cache';
import { withRetry, ErrorContext } from '@/services/utils';

export const useAvatarCache = () => {
  const { user } = useAuthManager();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Update avatar URL and cache it
  const updateAvatarUrl = (newUrl: string) => {
    if (user?.id) {
      setAvatarUrl(newUrl);
      const cacheKey = `avatar:${user.id}`;
      avatarCache.set(cacheKey, newUrl, 15 * 60 * 1000); // 15 minutes
    }
  };

  // Clear cache (useful when user changes)
  const clearCache = () => {
    if (user?.id) {
      const cacheKey = `avatar:${user.id}`;
      avatarCache.delete(cacheKey);
    }
  };

  // Fetch avatar from database with retry logic
  const fetchAvatarFromDatabase = async (userId: string): Promise<string | undefined> => {
    const context: ErrorContext = {
      operation: 'fetchUserAvatar',
      service: 'AvatarCache',
      userId,
      timestamp: Date.now()
    };

    const fetchAvatar = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data?.avatar_url;
    };

    try {
      const url = await withRetry(fetchAvatar, context, {
        maxRetries: 2,
        baseDelay: 500
      });

      const cacheKey = `avatar:${userId}`;
      avatarCache.set(cacheKey, url || '', 15 * 60 * 1000);
      setAvatarUrl(url);
      return url;
    } catch (error) {
      console.error('Failed to fetch avatar:', error);
      setAvatarUrl(undefined);
      return undefined;
    }
  };

  // Initialize avatar
  useEffect(() => {
    if (!user?.id) {
      setAvatarUrl(undefined);
      setIsLoading(false);
      return;
    }

    const initializeAvatar = async () => {
      setIsLoading(true);
      
      const cacheKey = `avatar:${user.id}`;
      
      // Check cache first
      const cached = avatarCache.get<string>(cacheKey);
      if (cached !== null) {
        setAvatarUrl(cached);
        setIsLoading(false);
      } else {
        // Fetch from database if cache miss
        await fetchAvatarFromDatabase(user.id);
        setIsLoading(false);
      }
    };

    initializeAvatar();
  }, [user?.id]);

  return {
    avatarUrl,
    isLoading,
    updateAvatarUrl,
    clearCache,
    refreshAvatar: () => user?.id ? fetchAvatarFromDatabase(user.id) : Promise.resolve(undefined)
  };
};
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { profileCache } from '@/services/cache';
import { withRetry, ErrorContext } from '@/services/utils';

interface ProfileData {
  avatar_url?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export const useProfileAvatar = (userId: string | undefined) => {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Reset state immediately when userId changes
    if (userId !== currentUserId) {
      setAvatarUrl(undefined);
      setIsLoading(true);
      setCurrentUserId(userId);
    }

    if (!userId) {
      setAvatarUrl(undefined);
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const cacheKey = `profile:${userId}`;
      
      try {
        // Try to get from cache first
        const cachedProfile = profileCache.get<ProfileData>(cacheKey);
        if (cachedProfile) {
          // Only update state if this is still the current user we're fetching for
          if (userId === currentUserId) {
            setAvatarUrl(cachedProfile.avatar_url);
            setIsLoading(false);
          }
          return;
        }

        // Fetch from database with retry logic
        const context: ErrorContext = {
          operation: 'fetchProfileAvatar',
          service: 'ProfileAvatar',
          userId,
          timestamp: Date.now()
        };

        const fetchProfileData = async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, first_name, last_name, email')
            .eq('id', userId)
            .maybeSingle();

          if (error) {
            throw error;
          }

          return data;
        };

        const profile = await withRetry(fetchProfileData, context, {
          maxRetries: 2,
          baseDelay: 500
        });

        // Cache the result
        if (profile) {
          profileCache.set(cacheKey, profile, 10 * 60 * 1000); // 10 minutes
        }

        // Only update state if this is still the current user we're fetching for
        if (userId === currentUserId) {
          setAvatarUrl(profile?.avatar_url);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching profile avatar:', error);
        if (userId === currentUserId) {
          setAvatarUrl(undefined);
          setIsLoading(false);
        }
      }
    };

    fetchProfile();
  }, [userId, currentUserId]);

  return { avatarUrl, isLoading };
};
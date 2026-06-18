import { CacheManager } from './CacheManager';
import { Session } from '@/services/api/SessionService';

// Specialized cache managers for session data
export const sessionsCache = new CacheManager({
  defaultTTL: 2 * 60 * 1000, // 2 minutes for real-time session updates
  maxSize: 150,
  enablePersistence: true
});

export const sessionStatsCache = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes for session statistics
  maxSize: 50,
  enablePersistence: true
});

export const filterPersonsCache = new CacheManager({
  defaultTTL: 10 * 60 * 1000, // 10 minutes for client/therapist lists
  maxSize: 100,
  enablePersistence: true
});

// Cache key generators
export const generateSessionsCacheKey = (userId: string, userType: string) => 
  `sessions:${userType}:${userId}`;

export const generateSessionStatsCacheKey = (userId: string, userType: string) => 
  `session_stats:${userType}:${userId}`;

export const generateFilterPersonsCacheKey = (userId: string, userType: string) => 
  `filter_persons:${userType}:${userId}`;

export const generateSessionByIdCacheKey = (sessionId: string) => 
  `session:${sessionId}`;

// Cache invalidation patterns
export const invalidateSessionCaches = (userId?: string, userType?: string, sessionId?: string) => {
  if (sessionId) {
    sessionsCache.invalidatePattern(new RegExp(`session:${sessionId}`));
  }
  
  if (userId && userType) {
    sessionsCache.invalidatePattern(new RegExp(`sessions:${userType}:${userId}`));
    sessionStatsCache.invalidatePattern(new RegExp(`session_stats:${userType}:${userId}`));
    filterPersonsCache.invalidatePattern(new RegExp(`filter_persons:${userType}:${userId}`));
  }
  
  // Also invalidate the opposite user type to ensure consistency
  if (userId) {
    const oppositeUserType = userType === 'therapist' ? 'client' : 'therapist';
    sessionsCache.invalidatePattern(new RegExp(`sessions:${oppositeUserType}:.*`));
    sessionStatsCache.invalidatePattern(new RegExp(`session_stats:${oppositeUserType}:.*`));
  }
  
  // If no specific identifiers provided, invalidate all session-related caches
  if (!userId && !userType && !sessionId) {
    sessionsCache.invalidatePattern(/^sessions:/);
    sessionStatsCache.invalidatePattern(/^session_stats:/);
    filterPersonsCache.invalidatePattern(/^filter_persons:/);
  }
};

export const clearAllSessionCaches = () => {
  sessionsCache.clear();
  sessionStatsCache.clear();
  filterPersonsCache.clear();
};
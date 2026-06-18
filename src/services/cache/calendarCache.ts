import { CacheManager } from './CacheManager';
import { CalendarEvent } from '@/hooks/api/useEvents';

// Specialized cache managers for calendar data
export const calendarEventsCache = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes for calendar events
  maxSize: 200,
  enablePersistence: true
});

export const googleCalendarSyncCache = new CacheManager({
  defaultTTL: 10 * 60 * 1000, // 10 minutes for Google sync status
  maxSize: 50,
  enablePersistence: false // Don't persist sync status
});

export const eventsByDateCache = new CacheManager({
  defaultTTL: 3 * 60 * 1000, // 3 minutes for events by date queries
  maxSize: 300,
  enablePersistence: true
});

// Cache key generators
export const generateCalendarEventsCacheKey = (view: string, dateRange: string) => 
  `calendar_events:${view}:${dateRange}`;

export const generateEventsByDateCacheKey = (date: string) => 
  `events_by_date:${date}`;

export const generateGoogleSyncCacheKey = (userId: string) => 
  `google_sync_status:${userId}`;

export const generateDateRangeCacheKey = (startDate: string, endDate: string) => 
  `${startDate}_to_${endDate}`;

// Cache invalidation patterns for calendar
export const invalidateCalendarCaches = (dateRange?: string, specificDate?: string) => {
  if (specificDate) {
    eventsByDateCache.invalidatePattern(new RegExp(`events_by_date:${specificDate}`));
  }
  
  if (dateRange) {
    calendarEventsCache.invalidatePattern(new RegExp(`calendar_events:.*:${dateRange}`));
  }
  
  // If no specific patterns, invalidate all calendar caches
  if (!dateRange && !specificDate) {
    calendarEventsCache.invalidatePattern(/^calendar_events:/);
    eventsByDateCache.invalidatePattern(/^events_by_date:/);
    googleCalendarSyncCache.invalidatePattern(/^google_sync_status:/);
  }
};

export const clearAllCalendarCaches = () => {
  calendarEventsCache.clear();
  googleCalendarSyncCache.clear();
  eventsByDateCache.clear();
};
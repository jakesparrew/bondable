
interface CachedCalendarData {
  events: any[];
  timestamp: number;
  startDate: string;
  endDate: string;
}

interface CacheEntry {
  data: CachedCalendarData;
  hits: number;
  lastAccessed: number;
}

export class GoogleCalendarCache {
  private static readonly CACHE_PREFIX = 'gcal_cache_';
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private static readonly MAX_CACHE_ENTRIES = 20;

  static generateCacheKey(startDate: string, endDate: string): string {
    return `${this.CACHE_PREFIX}${startDate}_${endDate}`;
  }

  static getCachedEvents(startDate: string, endDate: string): any[] | null {
    try {
      const cacheKey = this.generateCacheKey(startDate, endDate);
      const cachedDataStr = localStorage.getItem(cacheKey);
      
      if (!cachedDataStr) {
        console.log(`Cache miss for range ${startDate} to ${endDate}`);
        return null;
      }

      const cachedEntry: CacheEntry = JSON.parse(cachedDataStr);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - cachedEntry.data.timestamp > this.CACHE_DURATION) {
        console.log(`Cache expired for range ${startDate} to ${endDate}`);
        localStorage.removeItem(cacheKey);
        return null;
      }

      // Update access statistics
      cachedEntry.hits++;
      cachedEntry.lastAccessed = now;
      localStorage.setItem(cacheKey, JSON.stringify(cachedEntry));
      
      console.log(`Cache hit for range ${startDate} to ${endDate} (${cachedEntry.hits} hits)`);
      return cachedEntry.data.events;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  static setCachedEvents(startDate: string, endDate: string, events: any[]): void {
    try {
      // Clean up old cache entries before adding new ones
      this.cleanupCache();

      const cacheKey = this.generateCacheKey(startDate, endDate);
      const cacheEntry: CacheEntry = {
        data: {
          events,
          timestamp: Date.now(),
          startDate,
          endDate
        },
        hits: 1,
        lastAccessed: Date.now()
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      console.log(`Cached ${events.length} events for range ${startDate} to ${endDate}`);
    } catch (error) {
      console.error('Error writing to cache:', error);
      // If localStorage is full, try to clean up and retry once
      this.cleanupCache();
      try {
        const cacheKey = this.generateCacheKey(startDate, endDate);
        const cacheEntry: CacheEntry = {
          data: {
            events,
            timestamp: Date.now(),
            startDate,
            endDate
          },
          hits: 1,
          lastAccessed: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      } catch (retryError) {
        console.error('Failed to cache events after cleanup:', retryError);
      }
    }
  }

  static findOverlappingCache(startDate: string, endDate: string): any[] | null {
    try {
      const requestStart = new Date(startDate);
      const requestEnd = new Date(endDate);
      
      // Get all cache keys
      const allKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      );

      for (const key of allKeys) {
        try {
          const cachedEntry: CacheEntry = JSON.parse(localStorage.getItem(key) || '{}');
          
          if (!cachedEntry.data) continue;

          const cachedStart = new Date(cachedEntry.data.startDate);
          const cachedEnd = new Date(cachedEntry.data.endDate);
          
          // Check if cached range completely contains the requested range
          if (cachedStart <= requestStart && cachedEnd >= requestEnd) {
            // Check if cache is still valid
            const now = Date.now();
            if (now - cachedEntry.data.timestamp <= this.CACHE_DURATION) {
              console.log(`Found overlapping cache that contains requested range ${startDate} to ${endDate}`);
              
              // Update access statistics
              cachedEntry.hits++;
              cachedEntry.lastAccessed = now;
              localStorage.setItem(key, JSON.stringify(cachedEntry));
              
              // Filter events to only return those in the requested range
              const filteredEvents = cachedEntry.data.events.filter(event => {
                const eventDate = new Date(event.startDate);
                return eventDate >= requestStart && eventDate <= requestEnd;
              });
              
              console.log(`Returning ${filteredEvents.length} filtered events from overlapping cache`);
              return filteredEvents;
            } else {
              // Remove expired cache
              localStorage.removeItem(key);
            }
          }
        } catch (parseError) {
          console.error('Error parsing cached entry:', parseError);
          localStorage.removeItem(key);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding overlapping cache:', error);
      return null;
    }
  }

  static cleanupCache(): void {
    try {
      const now = Date.now();
      const allCacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      );

      // Remove expired entries
      const validEntries: Array<{ key: string; entry: CacheEntry }> = [];
      
      for (const key of allCacheKeys) {
        try {
          const cachedEntry: CacheEntry = JSON.parse(localStorage.getItem(key) || '{}');
          
          if (cachedEntry.data && (now - cachedEntry.data.timestamp <= this.CACHE_DURATION)) {
            validEntries.push({ key, entry: cachedEntry });
          } else {
            localStorage.removeItem(key);
            console.log(`Removed expired cache entry: ${key}`);
          }
        } catch (parseError) {
          localStorage.removeItem(key);
          console.log(`Removed corrupted cache entry: ${key}`);
        }
      }

      // If we still have too many entries, remove the least recently used ones
      if (validEntries.length > this.MAX_CACHE_ENTRIES) {
        validEntries.sort((a, b) => {
          // Sort by least recently used (considering both access time and hit count)
          const scoreA = a.entry.lastAccessed + (a.entry.hits * 60000); // Bonus for frequently accessed
          const scoreB = b.entry.lastAccessed + (b.entry.hits * 60000);
          return scoreA - scoreB;
        });

        const toRemove = validEntries.slice(0, validEntries.length - this.MAX_CACHE_ENTRIES);
        for (const { key } of toRemove) {
          localStorage.removeItem(key);
          console.log(`Removed LRU cache entry: ${key}`);
        }
      }

      console.log(`Cache cleanup completed. ${validEntries.length} entries remain.`);
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  static clearAllCache(): void {
    try {
      const allCacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      );
      
      for (const key of allCacheKeys) {
        localStorage.removeItem(key);
      }
      
      console.log(`Cleared ${allCacheKeys.length} cache entries`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  static getCacheStats(): { totalEntries: number; totalSize: number; oldestEntry: number | null } {
    try {
      const allCacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      );
      
      let totalSize = 0;
      let oldestTimestamp: number | null = null;
      
      for (const key of allCacheKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          try {
            const entry: CacheEntry = JSON.parse(value);
            if (entry.data?.timestamp) {
              if (oldestTimestamp === null || entry.data.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.data.timestamp;
              }
            }
          } catch (parseError) {
            // Ignore parsing errors for stats
          }
        }
      }
      
      return {
        totalEntries: allCacheKeys.length,
        totalSize,
        oldestEntry: oldestTimestamp
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalEntries: 0, totalSize: 0, oldestEntry: null };
    }
  }
}

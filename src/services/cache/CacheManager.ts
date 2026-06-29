/**
 * Centralized cache management system
 * Provides consistent caching strategies across the application
 */
import console from "@/lib/production-console";

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  enablePersistence: boolean; // Whether to persist to localStorage
  /**
   * Unique localStorage namespace for this cache instance. REQUIRED for any
   * cache that uses non-unique key strings (e.g. a bare user id), so two
   * services can't collide. If omitted, a per-instance anonymous namespace is
   * generated (still never shared across instances).
   */
  namespace?: string;
}

export class CacheManager {
  // Monotonic counter for instances that don't pass an explicit namespace, so
  // every CacheManager gets its OWN localStorage key.
  private static anonCount = 0;

  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private readonly storageKey: string;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000,
      enablePersistence: true,
      ...config
    };

    // Per-instance storage key. Previously EVERY instance shared 'app_cache',
    // so persistent caches clobbered each other's blob and a cold load could
    // rehydrate one cache's entries into another (e.g. a messages "unread
    // counts" object returned where a tasks "clients" array was expected →
    // `clients.map is not a function`). Namespacing per instance prevents that.
    this.storageKey = `app_cache:${this.config.namespace ?? `anon-${CacheManager.anonCount++}`}`;

    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }
  }

  /**
   * Store data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = ttl ? Date.now() + ttl : Date.now() + this.config.defaultTTL;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt
    };

    // If cache is at max size, remove oldest entry
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, entry);
    
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }

    console.log(`💾 Cache: Stored "${key}" (expires in ${ttl || this.config.defaultTTL}ms)`);
  }

  /**
   * Get data from cache, returns null if expired or not found
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`📋 Cache: Miss for "${key}"`);
      return null;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      console.log(`⏰ Cache: Expired "${key}"`);
      this.cache.delete(key);
      if (this.config.enablePersistence) {
        this.saveToStorage();
      }
      return null;
    }

    console.log(`✅ Cache: Hit for "${key}"`);
    return entry.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.config.enablePersistence) {
        this.saveToStorage();
      }
      return false;
    }

    return true;
  }

  /**
   * Remove specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted && this.config.enablePersistence) {
      this.saveToStorage();
      console.log(`🗑️ Cache: Deleted "${key}"`);
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    
    if (this.config.enablePersistence) {
      localStorage.removeItem(this.storageKey);
    }
    
    console.log('🧹 Cache: Cleared all entries');
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0 && this.config.enablePersistence) {
      this.saveToStorage();
      console.log(`🧹 Cache: Removed ${removed} expired entries`);
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: string;
  } {
    // Calculate approximate memory usage
    const memoryUsage = JSON.stringify([...this.cache.entries()]).length;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need tracking for accurate hit rate
      memoryUsage: `${(memoryUsage / 1024).toFixed(2)} KB`
    };
  }

  /**
   * Get or set pattern - fetch data if not cached
   */
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch data and cache it
    try {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`❌ Cache: Failed to fetch data for "${key}":`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let removed = 0;

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0 && this.config.enablePersistence) {
      this.saveToStorage();
      console.log(`🗑️ Cache: Invalidated ${removed} entries matching pattern`);
    }

    return removed;
  }

  /**
   * Find the oldest cache entry
   */
  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const cacheData: Record<string, CacheEntry<any>> = {};
      for (const [key, value] of this.cache.entries()) {
        cacheData[key] = value;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const cacheData = JSON.parse(stored) as Record<string, CacheEntry<any>>;
        this.cache = new Map(Object.entries(cacheData));
        
        // Clean up expired entries on load
        this.clearExpired();
        
        console.log(`📋 Cache: Loaded ${this.cache.size} entries from storage`);
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
      this.cache = new Map();
    }
  }
}

// Create default cache instance
export const cacheManager = new CacheManager();

// Create specialized cache instances for different use cases
export const avatarCache = new CacheManager({
  defaultTTL: 15 * 60 * 1000, // 15 minutes for avatars
  maxSize: 500,
  enablePersistence: true
});

export const profileCache = new CacheManager({
  defaultTTL: 10 * 60 * 1000, // 10 minutes for profiles
  maxSize: 200,
  enablePersistence: true
});

export const dashboardStatsCache = new CacheManager({
  defaultTTL: 2 * 60 * 1000, // 2 minutes for dashboard stats
  maxSize: 100,
  enablePersistence: false // Stats change frequently
});
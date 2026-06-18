/**
 * Realtime Optimizer Service
 * 
 * Reduces the frequency of realtime.list_changes calls by:
 * 1. Batching multiple subscription requests
 * 2. Implementing smart caching and deduplication
 * 3. Using connection pooling
 * 4. Throttling rapid updates
 */

interface RealtimeSubscriptionRequest {
  id: string;
  table: string;
  filter?: string;
  callback: (payload: any) => void;
  lastActivity: number;
}

interface RealtimeBatch {
  table: string;
  filters: Set<string>;
  subscribers: Map<string, RealtimeSubscriptionRequest>;
  channel?: any;
  lastBatchTime: number;
}

export class RealtimeOptimizer {
  private static instance: RealtimeOptimizer;
  private batches = new Map<string, RealtimeBatch>();
  private batchTimeout = 500; // Wait 500ms before batching
  private maxBatchSize = 10; // Maximum subscribers per batch
  private cleanupInterval = 30000; // Cleanup inactive subscriptions every 30s
  private throttleTimeout = 100; // Throttle rapid updates

  static getInstance(): RealtimeOptimizer {
    if (!RealtimeOptimizer.instance) {
      RealtimeOptimizer.instance = new RealtimeOptimizer();
      RealtimeOptimizer.instance.startCleanupTimer();
    }
    return RealtimeOptimizer.instance;
  }

  /**
   * Subscribe to table changes with optimization
   */
  subscribe(
    table: string,
    callback: (payload: any) => void,
    filter?: string
  ): string {
    const subscriptionId = `${table}-${filter || 'all'}-${Date.now()}-${Math.random()}`;
    
    const request: RealtimeSubscriptionRequest = {
      id: subscriptionId,
      table,
      filter,
      callback,
      lastActivity: Date.now()
    };

    this.addToBatch(request);
    return subscriptionId;
  }

  /**
   * Unsubscribe from table changes
   */
  unsubscribe(subscriptionId: string): void {
    for (const [batchKey, batch] of this.batches) {
      if (batch.subscribers.has(subscriptionId)) {
        batch.subscribers.delete(subscriptionId);
        
        // If batch is empty, clean it up
        if (batch.subscribers.size === 0) {
          this.cleanupBatch(batchKey);
        }
        break;
      }
    }
  }

  /**
   * Add subscription request to appropriate batch
   */
  private addToBatch(request: RealtimeSubscriptionRequest): void {
    const batchKey = `${request.table}-${request.filter || 'all'}`;
    
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, {
        table: request.table,
        filters: new Set(request.filter ? [request.filter] : []),
        subscribers: new Map(),
        lastBatchTime: Date.now()
      });
    }

    const batch = this.batches.get(batchKey)!;
    batch.subscribers.set(request.id, request);
    
    if (request.filter) {
      batch.filters.add(request.filter);
    }

    // Check if we should create/update the batch subscription
    this.processBatch(batchKey);
  }

  /**
   * Process batch and create optimized subscription
   */
  private processBatch(batchKey: string): void {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    // If we already have a channel for this batch, we're good
    if (batch.channel) {
      batch.lastBatchTime = Date.now();
      return;
    }

    // Create a new optimized channel for this batch
    this.createBatchChannel(batchKey, batch);
  }

  /**
   * Create a single channel for multiple subscribers
   */
  private createBatchChannel(batchKey: string, batch: RealtimeBatch): void {
    // Import supabase dynamically to avoid circular dependencies
    import('@/integrations/supabase/client').then(({ supabase }) => {
      // Create channel with a stable name
      const channelName = `optimized-batch-${batchKey}`;
      
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: 'batch_id' }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: batch.table,
            // Use the most specific filter if available
            ...(batch.filters.size === 1 && !batch.filters.has('') && {
              filter: Array.from(batch.filters)[0]
            })
          },
          (payload) => {
            this.handleBatchUpdate(batchKey, payload);
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error(`Batch subscription error for ${batchKey}:`, err);
            // Retry logic could be added here
          } else if (status === 'SUBSCRIBED') {
            console.log(`✅ Batch subscription active for ${batchKey} with ${batch.subscribers.size} subscribers`);
          }
        });

      batch.channel = channel;
      batch.lastBatchTime = Date.now();
    });
  }

  /**
   * Handle updates from batch subscription and distribute to individual subscribers
   */
  private handleBatchUpdate(batchKey: string, payload: any): void {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    // Throttle rapid updates to prevent overwhelming subscribers
    setTimeout(() => {
      batch.subscribers.forEach((subscriber) => {
        try {
          // Check if the update matches the subscriber's filter
          if (this.matchesFilter(payload, subscriber.filter)) {
            subscriber.callback(payload);
            subscriber.lastActivity = Date.now();
          }
        } catch (error) {
          console.error('Error in batch subscriber callback:', error);
        }
      });
    }, this.throttleTimeout);
  }

  /**
   * Check if payload matches subscriber's filter
   */
  private matchesFilter(payload: any, filter?: string): boolean {
    if (!filter) return true;
    
    // Parse filter (e.g., "conversation_id=eq.123")
    const [field, operator, value] = filter.split(/[=.]/);
    
    if (!field || !operator || !value) return true;
    
    const recordValue = payload.new?.[field] || payload.old?.[field];
    
    switch (operator) {
      case 'eq':
        return String(recordValue) === value;
      case 'neq':
        return String(recordValue) !== value;
      case 'in':
        return value.split(',').includes(String(recordValue));
      default:
        return true;
    }
  }

  /**
   * Clean up inactive batches and subscribers
   */
  private cleanup(): void {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [batchKey, batch] of this.batches) {
      // Remove inactive subscribers
      for (const [subId, subscriber] of batch.subscribers) {
        if (now - subscriber.lastActivity > inactiveThreshold) {
          batch.subscribers.delete(subId);
        }
      }

      // Remove empty batches
      if (batch.subscribers.size === 0) {
        this.cleanupBatch(batchKey);
      }
    }
  }

  /**
   * Clean up a specific batch
   */
  private cleanupBatch(batchKey: string): void {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    if (batch.channel) {
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase.removeChannel(batch.channel);
      });
    }

    this.batches.delete(batchKey);
    console.log(`🧹 Cleaned up batch: ${batchKey}`);
  }

  /**
   * Start periodic cleanup of inactive subscriptions
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Get optimization statistics
   */
  getStats(): {
    totalBatches: number;
    totalSubscribers: number;
    averageSubscribersPerBatch: number;
    oldestBatch: number;
  } {
    const totalBatches = this.batches.size;
    let totalSubscribers = 0;
    let oldestBatch = Date.now();

    for (const batch of this.batches.values()) {
      totalSubscribers += batch.subscribers.size;
      oldestBatch = Math.min(oldestBatch, batch.lastBatchTime);
    }

    return {
      totalBatches,
      totalSubscribers,
      averageSubscribersPerBatch: totalBatches > 0 ? totalSubscribers / totalBatches : 0,
      oldestBatch: Date.now() - oldestBatch
    };
  }

  /**
   * Force cleanup all batches (useful for testing or manual cleanup)
   */
  cleanupAll(): void {
    for (const batchKey of this.batches.keys()) {
      this.cleanupBatch(batchKey);
    }
  }
}

// Export singleton instance
export const realtimeOptimizer = RealtimeOptimizer.getInstance();
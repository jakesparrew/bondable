
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { RealtimeConnectionManager } from "./realtimeConnectionManager";

interface SubscriptionConfig {
  channelName: string;
  table: string;
  filter?: string;
  onMessage?: (payload: any) => void;
  onStatus?: (status: string) => void;
}

export class SubscriptionManager {
  private subscriptions = new Map<string, RealtimeChannel>();
  private connectionManager: RealtimeConnectionManager;
  private subscriptionConfigs = new Map<string, SubscriptionConfig>();
  private isDestroyed = false;

  constructor() {
    this.connectionManager = new RealtimeConnectionManager({
      maxRetries: 5,
      retryDelay: 3000,
      heartbeatInterval: 60000,
    });
    
    this.setupConnectionRecovery();
  }

  private setupConnectionRecovery() {
    // Check for stale connections every 5 minutes (less aggressive)
    const recoveryInterval = setInterval(async () => {
      if (this.isDestroyed) {
        clearInterval(recoveryInterval);
        return;
      }

      if (this.connectionManager.isStale()) {
        console.log('🔄 Detected stale connection, attempting recovery');
        await this.recoverStaleConnections();
      }
    }, 300000); // 5 minutes
  }

  private async recoverStaleConnections() {
    const canReconnect = await this.connectionManager.ensureConnection();
    
    if (canReconnect) {
      console.log('🔄 Resubscribing to all channels after connection recovery');
      
      // Resubscribe to all active subscriptions
      for (const [key, config] of this.subscriptionConfigs.entries()) {
        await this.resubscribe(key, config);
      }
    }
  }

  async subscribe(config: SubscriptionConfig): Promise<() => void> {
    if (this.isDestroyed) {
      console.warn('⚠️ Cannot subscribe - manager is destroyed');
      return () => {};
    }

    // Check if we already have an active subscription for this channel
    const existingChannel = this.subscriptions.get(config.channelName);
    if (existingChannel) {
      console.log(`♻️ Reusing existing subscription for ${config.channelName}`);
      this.subscriptionConfigs.set(config.channelName, config);
      return () => this.unsubscribe(config.channelName);
    }

    // Ensure connection is healthy before subscribing
    const isHealthy = await this.connectionManager.ensureConnection();
    if (!isHealthy) {
      console.warn('⚠️ Connection unhealthy, delaying subscription');
      // Store config for later retry
      this.subscriptionConfigs.set(config.channelName, config);
      return () => this.unsubscribe(config.channelName);
    }

    return this.createSubscription(config);
  }

  private createSubscription(config: SubscriptionConfig): () => void {
    const { channelName, table, filter, onMessage, onStatus } = config;
    
    console.log(`🚀 Creating subscription for channel: ${channelName}`);
    
    // Clean up existing subscription if it exists
    this.cleanupSubscription(channelName);
    
    const channel = supabase.channel(channelName);
    
    // Configure postgres changes listener
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter && { filter }),
      },
      (payload) => {
        console.log(`🔥 Realtime update received on ${channelName}:`, {
          event: payload.eventType,
          table: payload.table,
          timestamp: new Date().toISOString()
        });
        
        if (onMessage) {
          onMessage(payload);
        }
      }
    );

    // Subscribe with enhanced status handling
    channel.subscribe((status, err) => {
      console.log(`📊 Subscription status for ${channelName}:`, status);
      
      if (err) {
        console.error(`❌ Subscription error for ${channelName}:`, err);
      }
      
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Successfully subscribed to ${channelName}`);
        this.subscriptionConfigs.set(channelName, config);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`⚠️ Subscription issue for ${channelName}: ${status}`);
        // Attempt to resubscribe after a longer delay to prevent thrashing
        setTimeout(() => {
          if (!this.isDestroyed && !this.subscriptions.has(channelName)) {
            console.log(`🔄 Resubscribing to ${channelName} after error`);
            this.resubscribe(channelName, config);
          }
        }, 10000); // Increased delay to 10 seconds
      }
      
      if (onStatus) {
        onStatus(status);
      }
    });

    this.subscriptions.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  private async resubscribe(channelName: string, config: SubscriptionConfig) {
    console.log(`🔄 Resubscribing to ${channelName}`);
    
    // Clean up old subscription
    this.cleanupSubscription(channelName);
    
    // Wait a moment before resubscribing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create new subscription
    this.createSubscription(config);
  }

  private cleanupSubscription(channelName: string) {
    const existingChannel = this.subscriptions.get(channelName);
    if (existingChannel) {
      try {
        supabase.removeChannel(existingChannel);
        console.log(`🧹 Cleaned up subscription: ${channelName}`);
      } catch (error) {
        console.error(`❌ Error cleaning up subscription ${channelName}:`, error);
      }
      this.subscriptions.delete(channelName);
    }
  }

  unsubscribe(channelName: string) {
    console.log(`🛑 Unsubscribing from ${channelName}`);
    this.cleanupSubscription(channelName);
    this.subscriptionConfigs.delete(channelName);
  }

  unsubscribeAll() {
    console.log('🛑 Unsubscribing from all channels');
    
    for (const channelName of this.subscriptions.keys()) {
      this.cleanupSubscription(channelName);
    }
    
    this.subscriptionConfigs.clear();
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  destroy() {
    this.isDestroyed = true;
    this.unsubscribeAll();
    this.connectionManager.destroy();
    console.log('🧹 Subscription manager destroyed');
  }
}

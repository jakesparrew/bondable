
import { supabase } from "@/integrations/supabase/client";

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface ConnectionManagerOptions {
  maxRetries?: number;
  retryDelay?: number;
  heartbeatInterval?: number;
}

export class RealtimeConnectionManager {
  private options: Required<ConnectionManagerOptions>;
  private retryCount = 0;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private isDestroyed = false;
  private lastActivity = Date.now();
  
  constructor(options: ConnectionManagerOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 5,
      retryDelay: options.retryDelay ?? 2000,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
    };
    
    this.setupVisibilityHandling();
    this.setupHeartbeat();
  }

  private setupVisibilityHandling() {
    let debounceTimer: ReturnType<typeof setTimeout>;

    const handleVisibilityChange = () => {
      // Debounce rapid visibility changes
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (document.hidden) {
          console.log('📱 App went to background, pausing heartbeat');
          this.pauseHeartbeat();
        } else {
          console.log('📱 App returned to foreground, resuming connection checks');
          this.resumeHeartbeat();
          this.checkConnectionHealth();
        }
      }, 100);
    };

    const handleFocus = () => {
      // Debounce focus events to prevent spam
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!document.hidden) {
          console.log('🔍 Window focused, checking connection');
          this.checkConnectionHealth();
        }
      }, 200);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
  }

  private setupHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (!document.hidden) {
        this.checkConnectionHealth();
      }
    }, this.options.heartbeatInterval);
  }

  private pauseHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private resumeHeartbeat() {
    if (!this.heartbeatTimer && !this.isDestroyed) {
      this.setupHeartbeat();
    }
  }

  private async checkConnectionHealth(): Promise<boolean> {
    try {
      // Simple health check by querying a lightweight table
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      if (error) {
        console.warn('🔴 Connection health check failed:', error);
        return false;
      }
      
      this.lastActivity = Date.now();
      this.retryCount = 0; // Reset retry count on successful connection
      return true;
    } catch (error) {
      console.warn('🔴 Connection health check error:', error);
      return false;
    }
  }

  async ensureConnection(): Promise<boolean> {
    if (this.isDestroyed) return false;

    const isHealthy = await this.checkConnectionHealth();
    
    if (!isHealthy && this.retryCount < this.options.maxRetries) {
      console.log(`🔄 Connection unhealthy, attempting reconnect ${this.retryCount + 1}/${this.options.maxRetries}`);
      return this.attemptReconnect();
    }
    
    return isHealthy;
  }

  private async attemptReconnect(): Promise<boolean> {
    this.retryCount++;
    
    return new Promise((resolve) => {
      this.reconnectTimer = setTimeout(async () => {
        if (this.isDestroyed) {
          resolve(false);
          return;
        }

        try {
          // Force refresh the session
          const { data: { session }, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('🔴 Session refresh failed:', error);
            resolve(false);
            return;
          }

          if (session) {
            console.log('✅ Session refreshed successfully');
            const isHealthy = await this.checkConnectionHealth();
            resolve(isHealthy);
          } else {
            console.warn('⚠️ No session after refresh');
            resolve(false);
          }
        } catch (error) {
          console.error('🔴 Reconnection attempt failed:', error);
          resolve(false);
        }
      }, this.options.retryDelay * Math.pow(2, this.retryCount - 1)); // Exponential backoff
    });
  }

  getConnectionAge(): number {
    return Date.now() - this.lastActivity;
  }

  isStale(): boolean {
    return this.getConnectionAge() > 15 * 60 * 1000; // 15 minutes - less aggressive stale detection
  }

  destroy() {
    this.isDestroyed = true;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    console.log('🧹 Connection manager destroyed');
  }
}

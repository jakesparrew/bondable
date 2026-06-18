import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '@/services/cache/CacheManager';
import { withRetry } from '@/services/utils';
import console from '@/lib/production-console';

// Cache managers for settings data
const settingsCache = new CacheManager({
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  maxSize: 100,
  enablePersistence: true
});

const adminSettingsCache = new CacheManager({
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  maxSize: 50,
  enablePersistence: true
});

// Cache key generators
const USER_SETTINGS_KEY = (userId: string) => `user_settings:${userId}`;
const THERAPIST_INVITE_CODE_KEY = (userId: string) => `therapist_invite_code:${userId}`;
const ADMIN_NOTIFICATION_SETTINGS_KEY = 'admin_notification_settings';
const AI_SETTINGS_KEY = 'ai_settings';

// Types
export interface UserSettings {
  id: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  appointmentReminders: boolean;
  newClientMessages: boolean;
  theme: 'dark' | 'light' | 'system';
  language: string;
}

export interface AdminNotificationSetting {
  id: string;
  notification_type: string;
  is_enabled: boolean;
  email_addresses: string[];
  created_at: string;
  updated_at: string;
}

export interface AISettings {
  ai_api_enabled: { enabled: boolean };
  ai_model_config: { model: string };
}

export interface OptimizedSettingsService {
  getUserSettings(userId: string, useCache?: boolean): Promise<UserSettings | null>;
  updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<boolean>;
  getTherapistInviteCode(userId: string, useCache?: boolean): Promise<string | null>;
  getAdminNotificationSettings(useCache?: boolean): Promise<AdminNotificationSetting[]>;
  updateAdminNotificationSetting(id: string, updates: any): Promise<boolean>;
  getAISettings(useCache?: boolean): Promise<AISettings>;
  updateAISetting(settingName: string, settingValue: any): Promise<boolean>;
  invalidateSettingsCache(userId?: string): void;
  clearAllCaches(): void;
}

class OptimizedSettingsServiceImpl implements OptimizedSettingsService {
  async getUserSettings(userId: string, useCache = true): Promise<UserSettings | null> {
    const cacheKey = USER_SETTINGS_KEY(userId);
    
    if (useCache) {
      const cached = settingsCache.get<UserSettings>(cacheKey);
      if (cached) {
        console.log(`✅ Cache: Hit for "${cacheKey}"`);
        return cached;
      }
    }

    console.log(`🔍 Fetching user settings for: ${userId}`);

    try {
      const result = await withRetry(async () => {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          throw new Error("Failed to fetch user settings");
        }

        if (!profileData) {
          throw new Error("User profile not found");
        }

        // Return default settings with any saved preferences
        const settings: UserSettings = {
          id: userId,
          emailNotifications: true, // Default values
          pushNotifications: true,
          appointmentReminders: true,
          newClientMessages: true,
          theme: 'dark',
          language: 'en',
        };

        return settings;
      }, { service: 'settings', operation: 'fetchUser', timestamp: Date.now() });

      // Cache the result
      if (result) {
        settingsCache.set(cacheKey, result);
        console.log(`💾 Cache: Stored "${cacheKey}"`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error fetching user settings:`, error);
      return null;
    }
  }

  async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<boolean> {
    console.log(`🔄 Updating user settings: ${userId}`, settings);

    try {
      const result = await withRetry(async () => {
        // For now, we'll just cache the settings locally
        // In a real implementation, you might store preferences in a user_settings table
        
        const currentSettings = await this.getUserSettings(userId, false);
        if (!currentSettings) {
          throw new Error("Current settings not found");
        }

        const updatedSettings = { ...currentSettings, ...settings };
        
        // Cache the updated settings
        const cacheKey = USER_SETTINGS_KEY(userId);
        settingsCache.set(cacheKey, updatedSettings);

        return true;
      }, { service: 'settings', operation: 'updateUser', timestamp: Date.now() });

      console.log(`✅ User settings updated successfully: ${userId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error updating user settings:`, error);
      return false;
    }
  }

  async getTherapistInviteCode(userId: string, useCache = true): Promise<string | null> {
    const cacheKey = THERAPIST_INVITE_CODE_KEY(userId);
    
    if (useCache) {
      const cached = settingsCache.get<string>(cacheKey);
      if (cached) {
        console.log(`✅ Cache: Hit for "${cacheKey}"`);
        return cached;
      }
    }

    console.log(`🔍 Fetching therapist invite code for: ${userId}`);

    try {
      const result = await withRetry(async () => {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("invite_code")
          .eq("id", userId)
          .eq("role", "therapist")
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching therapist profile:", profileError);
          throw new Error("Failed to fetch invite code");
        }

        return profileData?.invite_code || null;
      }, { service: 'settings', operation: 'inviteCode', timestamp: Date.now() });

      // Cache the result
      if (result) {
        settingsCache.set(cacheKey, result);
        console.log(`💾 Cache: Stored "${cacheKey}"`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error fetching therapist invite code:`, error);
      return null;
    }
  }

  async getAdminNotificationSettings(useCache = true): Promise<AdminNotificationSetting[]> {
    const cacheKey = ADMIN_NOTIFICATION_SETTINGS_KEY;
    
    if (useCache) {
      const cached = adminSettingsCache.get<AdminNotificationSetting[]>(cacheKey);
      if (cached) {
        console.log(`✅ Cache: Hit for "${cacheKey}"`);
        return cached;
      }
    }

    console.log(`🔍 Fetching admin notification settings`);

    try {
      const result = await withRetry(async () => {
        const { data: settingsData, error: settingsError } = await supabase
          .from("admin_notification_settings")
          .select("*")
          .order("notification_type");

        if (settingsError) {
          console.error("Error fetching admin notification settings:", settingsError);
          throw new Error("Failed to fetch admin notification settings");
        }

        return (settingsData || []).map(setting => ({
          id: setting.id,
          notification_type: setting.notification_type,
          is_enabled: setting.is_enabled,
          email_addresses: Array.isArray(setting.email_addresses) 
            ? (setting.email_addresses as string[])
            : [],
          created_at: setting.created_at,
          updated_at: setting.updated_at,
        }));
      }, { service: 'settings', operation: 'adminNotifications', timestamp: Date.now() });

      // Cache the result
      adminSettingsCache.set(cacheKey, result);
      console.log(`💾 Cache: Stored "${cacheKey}"`);

      return result;
    } catch (error) {
      console.error(`❌ Error fetching admin notification settings:`, error);
      return [];
    }
  }

  async updateAdminNotificationSetting(id: string, updates: any): Promise<boolean> {
    console.log(`🔄 Updating admin notification setting: ${id}`, updates);

    try {
      const result = await withRetry(async () => {
        const { error } = await supabase
          .from("admin_notification_settings")
          .update(updates)
          .eq("id", id);

        if (error) {
          console.error("Error updating admin notification setting:", error);
          throw new Error("Failed to update admin notification setting");
        }

        return true;
      }, { service: 'settings', operation: 'updateAdminNotification', timestamp: Date.now() });

      // Invalidate cache
      adminSettingsCache.delete(ADMIN_NOTIFICATION_SETTINGS_KEY);

      console.log(`✅ Admin notification setting updated successfully: ${id}`);
      return result;
    } catch (error) {
      console.error(`❌ Error updating admin notification setting:`, error);
      return false;
    }
  }

  async getAISettings(useCache = true): Promise<AISettings> {
    const cacheKey = AI_SETTINGS_KEY;
    
    if (useCache) {
      const cached = adminSettingsCache.get<AISettings>(cacheKey);
      if (cached) {
        console.log(`✅ Cache: Hit for "${cacheKey}"`);
        return cached;
      }
    }

    console.log(`🔍 Fetching AI settings`);

    try {
      const result = await withRetry(async () => {
        const { data: settings, error } = await supabase
          .from("ai_settings")
          .select("setting_name, setting_value")
          .in("setting_name", ["ai_api_enabled", "ai_model_config"]);

        if (error) {
          console.error("Error fetching AI settings:", error);
          throw new Error("Failed to fetch AI settings");
        }

        const aiSettings: AISettings = {
          ai_api_enabled: { enabled: false },
          ai_model_config: { model: "gpt-3.5-turbo" },
        };

        settings?.forEach((setting) => {
          if (setting.setting_name === "ai_api_enabled") {
            aiSettings.ai_api_enabled = setting.setting_value as { enabled: boolean };
          } else if (setting.setting_name === "ai_model_config") {
            aiSettings.ai_model_config = setting.setting_value as { model: string };
          }
        });

        return aiSettings;
      }, { service: 'settings', operation: 'aiSettings', timestamp: Date.now() });

      // Cache the result
      adminSettingsCache.set(cacheKey, result);
      console.log(`💾 Cache: Stored "${cacheKey}"`);

      return result;
    } catch (error) {
      console.error(`❌ Error fetching AI settings:`, error);
      return {
        ai_api_enabled: { enabled: false },
        ai_model_config: { model: "gpt-3.5-turbo" },
      };
    }
  }

  async updateAISetting(settingName: string, settingValue: any): Promise<boolean> {
    console.log(`🔄 Updating AI setting: ${settingName}`, settingValue);

    try {
      const result = await withRetry(async () => {
        const { error } = await supabase.from("ai_settings").upsert(
          {
            setting_name: settingName,
            setting_value: settingValue,
          },
          {
            onConflict: "setting_name",
          }
        );

        if (error) {
          console.error(`Error updating AI setting ${settingName}:`, error);
          throw new Error(`Failed to update AI setting: ${settingName}`);
        }

        return true;
      }, { service: 'settings', operation: 'updateAI', timestamp: Date.now() });

      // Invalidate cache
      adminSettingsCache.delete(AI_SETTINGS_KEY);

      console.log(`✅ AI setting updated successfully: ${settingName}`);
      return result;
    } catch (error) {
      console.error(`❌ Error updating AI setting:`, error);
      return false;
    }
  }

  invalidateSettingsCache(userId?: string): void {
    if (userId) {
      const userSettingsKey = USER_SETTINGS_KEY(userId);
      const inviteCodeKey = THERAPIST_INVITE_CODE_KEY(userId);
      
      settingsCache.delete(userSettingsKey);
      settingsCache.delete(inviteCodeKey);
      
      console.log(`🗑️ Cache invalidated for user: ${userId}`);
    } else {
      settingsCache.clear();
      adminSettingsCache.clear();
      console.log('🗑️ All settings caches cleared');
    }
  }

  clearAllCaches(): void {
    settingsCache.clear();
    adminSettingsCache.clear();
    console.log('🗑️ All settings caches cleared');
  }
}

// Export singleton instance
export const optimizedSettingsService = new OptimizedSettingsServiceImpl();
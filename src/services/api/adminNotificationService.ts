
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AdminNotificationSettings {
  id: string;
  notification_type: string;
  is_enabled: boolean;
  email_addresses: string[];
  created_at: string;
  updated_at: string;
}

export const adminNotificationService = {
  async getNotificationSettings(): Promise<AdminNotificationSettings[]> {
    try {
      const { data, error } = await supabase
        .from("admin_notification_settings")
        .select("*")
        .order("notification_type");

      if (error) {
        console.error("Error fetching notification settings:", error);
        return [];
      }

      return data?.map(setting => ({
        ...setting,
        email_addresses: Array.isArray(setting.email_addresses) 
          ? (setting.email_addresses as Json[]).filter((email): email is string => typeof email === 'string')
          : []
      })) || [];
    } catch (error) {
      console.error("Error in getNotificationSettings:", error);
      return [];
    }
  },

  async updateNotificationSetting(
    id: string, 
    updates: Partial<Pick<AdminNotificationSettings, 'is_enabled' | 'email_addresses'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("admin_notification_settings")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating notification setting:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in updateNotificationSetting:", error);
      return false;
    }
  },

  async addEmailAddress(id: string, email: string): Promise<boolean> {
    try {
      // First get current settings
      const { data: currentSetting, error: fetchError } = await supabase
        .from("admin_notification_settings")
        .select("email_addresses")
        .eq("id", id)
        .single();

      if (fetchError) {
        console.error("Error fetching current setting:", fetchError);
        return false;
      }

      const currentEmails = Array.isArray(currentSetting.email_addresses) 
        ? (currentSetting.email_addresses as Json[]).filter((email): email is string => typeof email === 'string')
        : [];

      if (currentEmails.includes(email)) {
        return true; // Email already exists
      }

      const updatedEmails = [...currentEmails, email];

      const { error } = await supabase
        .from("admin_notification_settings")
        .update({
          email_addresses: updatedEmails,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) {
        console.error("Error adding email address:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in addEmailAddress:", error);
      return false;
    }
  },

  async removeEmailAddress(id: string, email: string): Promise<boolean> {
    try {
      // First get current settings
      const { data: currentSetting, error: fetchError } = await supabase
        .from("admin_notification_settings")
        .select("email_addresses")
        .eq("id", id)
        .single();

      if (fetchError) {
        console.error("Error fetching current setting:", fetchError);
        return false;
      }

      const currentEmails = Array.isArray(currentSetting.email_addresses) 
        ? (currentSetting.email_addresses as Json[]).filter((email): email is string => typeof email === 'string')
        : [];

      const updatedEmails = currentEmails.filter(e => e !== email);

      const { error } = await supabase
        .from("admin_notification_settings")
        .update({
          email_addresses: updatedEmails,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) {
        console.error("Error removing email address:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in removeEmailAddress:", error);
      return false;
    }
  }
};

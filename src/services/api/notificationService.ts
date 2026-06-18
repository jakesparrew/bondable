
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getUserNotifications:", error);
      return [];
    }
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in markAsRead:", error);
      return false;
    }
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in markAllAsRead:", error);
      return false;
    }
  },

  async createNotification(notification: Omit<Notification, "id" | "created_at" | "updated_at">): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert([notification])
        .select()
        .single();

      if (error) {
        console.error("Error creating notification:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in createNotification:", error);
      return null;
    }
  },

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  }
};

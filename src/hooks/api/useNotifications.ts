
import { useState, useEffect, useRef } from "react";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { notificationService, Notification } from "@/services/api";

import { supabase } from "@/integrations/supabase/client";
import { initLocalNotifications, presentLocalNotification, isNativePlatform } from "@/services/native/localNotifications";

export const useNotifications = () => {
  const { user } = useAuthManager();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
const channelRef = useRef<any>(null);
const isSubscribedRef = useRef(false);
const localInitRef = useRef(false);
  
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const userNotifications = await notificationService.getUserNotifications(user.id);
      setNotifications(userNotifications);
    } catch (error) {
      console.warn('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    const success = await notificationService.markAsRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    }
    return success;
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id) return false;
    
    const success = await notificationService.markAllAsRead(user.id);
    if (success) {
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
    }
    return success;
  };

  // Create a new notification
  const createNotification = async (notification: Omit<Notification, "id" | "created_at" | "updated_at">) => {
    const newNotification = await notificationService.createNotification(notification);
    if (newNotification) {
      setNotifications(prev => [newNotification, ...prev]);
    }
    return newNotification;
  };

  // Cleanup function
  const cleanupChannel = () => {
    if (channelRef.current && isSubscribedRef.current) {
      try {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('Error cleaning up channel:', error);
      } finally {
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  // Initialize local notifications on native platforms
  useEffect(() => {
    if (!user?.id) return;
    if (!isNativePlatform() || localInitRef.current) return;

    initLocalNotifications()
      .catch(() => {})
      .finally(() => {
        localInitRef.current = true;
      });
  }, [user?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    // Always cleanup first
    cleanupChannel();

    // Create a unique channel name for this user to prevent conflicts
    const channelName = `user-notifications-${user.id}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const channel = supabase.channel(channelName);
      
      // Store the channel reference immediately
      channelRef.current = channel;
      
      // Set up the channel listeners
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          try {
            if (payload.eventType === 'INSERT') {
              const newNotif = payload.new as Notification;
              setNotifications(prev => [newNotif, ...prev]);
              if (isNativePlatform()) {
                presentLocalNotification({
                  title: newNotif.title || 'New notification',
                  body: newNotif.message || '',
                }).catch(() => {});
              }
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev => 
                prev.map(notif => 
                  notif.id === payload.new.id ? payload.new as Notification : notif
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev => 
                prev.filter(notif => notif.id !== payload.old.id)
              );
            }
          } catch (error) {
            console.warn('Error handling notification update:', error);
          }
        }
      );

      // Subscribe to the channel only if we haven't already
      if (!isSubscribedRef.current) {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true;
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('Channel subscription error');
            isSubscribedRef.current = false;
          } else if (status === 'CLOSED') {
            isSubscribedRef.current = false;
          }
        });
      }

    } catch (error) {
      console.warn('Error setting up notifications subscription:', error);
    }

    return cleanupChannel;
  }, [user?.id]);

  return {
    notifications,
    isLoading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
  };
};


import { Bell } from "lucide-react";
import console from "@/lib/production-console";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications } from "@/hooks/api/useNotifications";
import { notificationService } from "@/services/api";
import { useTranslation } from 'react-i18next';
import SendTestPushButton from "@/components/SendTestPushButton";
import { useProfileAvatar } from "@/hooks/ui/useProfileAvatar";
import type { Notification as AppNotification } from "@/services/api/notificationService";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { notificationSenderCache, getNotificationSenderCacheKey } from "@/services/cache/notificationsCache";

function Dot({ className }: { className?: string }) {
  return (
    <svg
      width="6"
      height="6"
      fill="currentColor"
      viewBox="0 0 6 6"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="3" />
    </svg>
  );
}

const NotificationCenter = () => {
  const { t } = useTranslation();
  const { 
    notifications, 
    isLoading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(notificationId);
    }
  };

  const getAvatarInitials = (name: string) => {
    return name.split(" ")
      .map(part => part.charAt(0).toUpperCase())
      .join("").slice(0, 2);
  };

  const getNotificationIcon = (type: string) => {
    return getAvatarInitials(type.toUpperCase());
  };

  const extractSenderName = (n: AppNotification): string | null => {
    const source = `${n.title || ''} ${n.message || ''}`.trim();
    const match = source.match(/from\s+(.+)$/i);
    return match ? match[1].trim() : null;
  };
  const NotificationAvatar = ({ notification }: { notification: AppNotification }) => {
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const { user } = useAuthManager();

    useEffect(() => {
      let cancelled = false;
      const rt = (notification.related_type || '').toLowerCase();
      const cacheKey = getNotificationSenderCacheKey(notification.id);

      // 0) Try cache first
      const cached = notificationSenderCache.get<string>(cacheKey);
      if (cached) {
        setUserId(cached);
        return () => { cancelled = true; };
      }

      // 1) Direct user/profile relation
      if ((rt === 'user' || rt === 'profile' || rt === 'profiles') && notification.related_id) {
        setUserId(notification.related_id);
        notificationSenderCache.set(cacheKey, notification.related_id);
        return () => { cancelled = true; };
      }

      // 2) Resolve by related entity (message / conversation)
      async function resolveFromRelated() {
        try {
          if ((rt === 'message' || rt === 'messages') && notification.related_id) {
            const { data, error } = await supabase
              .from('messages')
              .select('sender_id')
              .eq('id', notification.related_id)
              .single();
            if (!cancelled && data?.sender_id) {
              setUserId(data.sender_id);
              notificationSenderCache.set(cacheKey, data.sender_id);
              return;
            }
            if (error) console.warn('NotificationAvatar: message lookup error', error);
          }

          if ((rt === 'conversation' || rt === 'conversations') && notification.related_id) {
            const { data, error } = await supabase
              .from('messages')
              .select('sender_id, created_at')
              .eq('conversation_id', notification.related_id)
              .neq('sender_id', user?.id || '')
              .order('created_at', { ascending: false })
              .limit(1);
            const row = Array.isArray(data) ? data[0] : undefined;
            if (!cancelled && row?.sender_id) {
              setUserId(row.sender_id);
              notificationSenderCache.set(cacheKey, row.sender_id);
              return;
            }
            if (error) console.warn('NotificationAvatar: conversation lookup error', error);
          }
        } catch (e) {
          console.warn('NotificationAvatar: resolveFromRelated exception', e);
        }

        // Fallback: no user resolved
        if (!cancelled) setUserId(undefined);
      }

      setUserId(undefined);
      resolveFromRelated();

      return () => { cancelled = true; };
    }, [notification.related_type, notification.related_id, notification.id, user?.id]);

    const { avatarUrl } = useProfileAvatar(userId);

    return (
      <Avatar className="size-9">
        <AvatarImage src={avatarUrl || ''} alt={notification.title || notification.type} className="non-invertable"/>
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          {getNotificationIcon(notification.type)}
        </AvatarFallback>
      </Avatar>
    );
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative text-[#71717a] hover:text-foreground hover:bg-muted h-9 w-9 p-0"
          aria-label="Open notifications"
        >
          <Bell size={16} aria-hidden="true" className={`${unreadCount > 0 ? "text-red-500" : ""}`}/>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-1 bg-card border-border mr-6">
        <div className="flex items-baseline justify-between gap-4 px-3 py-2">
          <div className="text-sm font-semibold text-foreground">{t("notifications")}</div>
          {unreadCount > 0 && (
            <button
              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
              onClick={markAllAsRead}
            >
              {t("mark_all_as_read")}
            </button>
          )}
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          className="bg-border -mx-1 my-1 h-px"
        ></div>
        <div className="max-h-80 overflow-y-auto scrollbar-hide">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">{t("loading_notifications")}</p>
            </div>
          ) : unreadCount === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">{t("no_notifications")}</p>
            </div>
          ) : (
            notifications.filter((n) => !n.is_read).map((notification) => (
              <div
                key={notification.id}
                className="hover:bg-muted rounded-md px-3 py-2 text-sm transition-colors"
              >
                <div className="relative flex items-start gap-3 pe-3">
                  <NotificationAvatar notification={notification} />
                  <div className="flex-1 space-y-1">
                    <button
                      className="text-muted-foreground text-left after:absolute after:inset-0"
                      onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                    >
                      <span className="text-foreground font-medium hover:underline">
                        {notification.title}
                      </span>
                      <p className="text-muted-foreground text-xs mt-1">
                        {notification.message}
                      </p>
                    </button>
                    <div className="text-muted-foreground text-xs">
                      {notificationService.formatTimeAgo(notification.created_at)}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="absolute end-0 self-center">
                      <Dot className="text-blue-400" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {/* 
        <div className="border-t border-[#1f1f23] mt-1 pt-2 px-3 pb-2">
          <SendTestPushButton />
        </div>
        */}
       </PopoverContent>
     </Popover>
  );
};

export default NotificationCenter;

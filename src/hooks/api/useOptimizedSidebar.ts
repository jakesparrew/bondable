import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { CacheManager } from "@/services/cache/CacheManager";
import {
  LayoutDashboard,
  UsersRound,
  CalendarDays,
  Settings2,
  CheckSquare,
  MessageSquare,
  CreditCard,
  NotebookPen,
  LifeBuoy,
  Send,
  ClipboardList,
  MessageCircleHeart,
  Search,
  MessagesSquare,
  Stethoscope,
} from "lucide-react";

interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  isActive?: boolean;
  items?: { title: string; url: string }[];
  disabled?: boolean;
  hasOptions?: boolean;
  /** Mint "AI" treatment — reserved for Bond, the standout nav entry. */
  ai?: boolean;
}

interface ProjectItem {
  name: string;
  url: string;
  icon: any;
  hasOptions?: boolean;
  disabled?: boolean;
  badge?: string;
}

interface SidebarData {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  navMain: NavigationItem[];
  navSecondary: NavigationItem[];
  projects: ProjectItem[];
}

export class OptimizedSidebarService {
  private static cacheManager = new CacheManager({ defaultTTL: 10 * 60 * 1000 }); // 10 minutes
  private static userDataCache = new CacheManager({ defaultTTL: 5 * 60 * 1000 }); // 5 minutes

  static async getUserProfile(userId: string): Promise<any> {
    const cacheKey = `user-profile-${userId}`;
    
    const cached = this.userDataCache.get(cacheKey) as any;
    if (cached) {
      console.log("👤 Returning cached user profile");
      return cached;
    }

    console.log("👤 Fetching fresh user profile");

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url, role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("❌ Error fetching user profile:", error);
        throw error;
      }

      const profile = data || {};
      this.userDataCache.set(cacheKey, profile);

      console.log("✅ User profile fetched:", profile);
      return profile;
    } catch (error) {
      console.error("❌ Error in getUserProfile:", error);
      throw error;
    }
  }

  static async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const cacheKey = `unread-counts-${userId}`;
    
    const cached = this.cacheManager.get(cacheKey) as Record<string, number>;
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase.rpc('get_unread_message_counts', {
        p_user_id: userId
      });

      if (error) {
        console.error("❌ Error fetching unread counts:", error);
        // If conversations table doesn't exist, silently return empty counts
        if (error.code === '42P01') {
          console.log("📋 Conversations table doesn't exist yet, returning empty counts");
          return {};
        }
        return {};
      }

      const unreadCounts = (data || []).reduce((acc: Record<string, number>, item: any) => {
        acc[item.conversation_id] = item.unread_count;
        return acc;
      }, {});

      this.cacheManager.set(cacheKey, unreadCounts);
      return unreadCounts;
    } catch (error) {
      console.error("❌ Error in getUnreadCounts:", error);
      return {};
    }
  }

  static async getTaskCounts(userId: string, userRole: 'client' | 'therapist'): Promise<{
    total: number;
    pending: number;
    overdue: number;
  }> {
    const cacheKey = `task-counts-${userId}-${userRole}`;
    
    const cached = this.cacheManager.get(cacheKey) as any;
    if (cached) {
      return cached;
    }

    try {
      let query = supabase.from('tasks').select('status, due_date');
      
      if (userRole === 'therapist') {
        query = query.eq('therapist_id', userId);
      } else {
        query = query.eq('client_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error fetching task counts:", error);
        return { total: 0, pending: 0, overdue: 0 };
      }

      const tasks = data || [];
      const now = new Date();

      const counts = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'assigned' || t.status === 'in-progress').length,
        overdue: tasks.filter(t => 
          t.status !== 'completed' && 
          t.status !== 'denied' && 
          t.due_date && 
          new Date(t.due_date) < now
        ).length,
      };

      this.cacheManager.set(cacheKey, counts);
      return counts;
    } catch (error) {
      console.error("❌ Error in getTaskCounts:", error);
      return { total: 0, pending: 0, overdue: 0 };
    }
  }

  static invalidateCache(userId?: string): void {
    if (userId) {
      // Clear specific user caches
      const keys = Array.from((this.cacheManager as any).cache.keys());
      keys.forEach(key => {
        if (typeof key === 'string' && key.includes(userId)) {
          this.cacheManager.delete(key);
        }
      });
      
      const userKeys = Array.from((this.userDataCache as any).cache.keys());
      userKeys.forEach(key => {
        if (typeof key === 'string' && key.includes(userId)) {
          this.userDataCache.delete(key);
        }
      });
    } else {
      // Clear all caches
      this.cacheManager.clear();
      this.userDataCache.clear();
    }
  }
}

export function useOptimizedSidebar(
  userId: string,
  userType: "therapist" | "client" | "admin"
) {
  const { t } = useTranslation();
  const location = useLocation();

  // Helper function to check if a route or its children are active
  const isRouteActive = useCallback((url: string, items?: { url: string }[]) => {
    // Check if current path matches the main URL
    if (location.pathname === url) {
      return true;
    }

    // Check if current path matches any of the sub-items
    if (items && items.length > 0) {
      return items.some((item) => location.pathname === item.url);
    }

    return false;
  }, [location.pathname]);

  // User profile query
  const { data: userProfile } = useQuery({
    queryKey: ["sidebar-user-profile", userId],
    queryFn: () => OptimizedSidebarService.getUserProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Unread counts query (only for non-admin users)
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["sidebar-unread-counts", userId],
    queryFn: () => OptimizedSidebarService.getUnreadCounts(userId),
    enabled: !!userId && userType !== "admin",
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds
  });

  // Task counts query (only for non-admin users)
  const { data: taskCounts = { total: 0, pending: 0, overdue: 0 } } = useQuery({
    queryKey: ["sidebar-task-counts", userId, userType],
    queryFn: () => OptimizedSidebarService.getTaskCounts(userId, userType as 'client' | 'therapist'),
    enabled: !!userId && userType !== "admin",
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // 1 minute
  });

  // Calculate total unread messages
  const totalUnreadMessages = useMemo(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  }, [unreadCounts]);

  // Memoized sidebar data
  const sidebarData = useMemo((): SidebarData => {
    const userData = {
      name: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'User' : 'User',
      email: userProfile?.email || 'user@example.com',
      avatar: userProfile?.avatar_url || '',
    };

    if (userType === "admin") {
      return {
        user: { ...userData, name: "Admin User", email: "admin@example.com" },
        navMain: [
          {
            title: t("dashboard"),
            url: "/dashboard/admin",
            icon: LayoutDashboard,
            isActive: isRouteActive("/dashboard/admin"),
            items: [],
          },
          {
            title: t("admin_nav_chats", "Gesprekken"),
            url: "/dashboard/admin/chats",
            icon: MessagesSquare,
            isActive: isRouteActive("/dashboard/admin/chats"),
            items: [],
          },
          {
            title: t("admin_nav_clients", "Cliënten"),
            url: "/dashboard/admin/clients",
            icon: UsersRound,
            isActive: isRouteActive("/dashboard/admin/clients"),
            items: [],
          },
          {
            title: t("admin_nav_providers", "Hulpverleners"),
            url: "/dashboard/admin/providers",
            icon: Stethoscope,
            isActive: isRouteActive("/dashboard/admin/providers"),
            items: [],
          },
          {
            title: t("settings"),
            url: "#",
            icon: Settings2,
            isActive: isRouteActive("#", [
              { url: "/dashboard/admin/settings" },
              { url: "/dashboard/admin/profile" },
              { url: "/dashboard/admin/notification-settings" },
              { url: "/dashboard/admin/api-settings" },
            ]),
            items: [
              {
                title: t("application_settings"),
                url: "/dashboard/admin/settings",
              },
              {
                title: t("user_settings"),
                url: "/dashboard/admin/profile",
              },
              {
                title: t("notification_settings"),
                url: "/dashboard/admin/notification-settings",
              },
              {
                title: t("api_settings"),
                url: "/dashboard/admin/api-settings",
              },
            ],
          },
        ],
        navSecondary: [
          {
            title: t("support"),
            url: "#",
            icon: LifeBuoy,
          },
          {
            title: t("feedback"),
            url: "#",
            icon: Send,
          },
        ],
        projects: [],
      };
    }

    const commonProjects: ProjectItem[] = [
      {
        name: t("tasks"),
        url: `/dashboard/${userType}/tasks`,
        icon: CheckSquare,
        hasOptions: false,
        badge: taskCounts.pending > 0 ? taskCounts.pending.toString() : undefined,
      },
      {
        name: t("messages"),
        url: `/dashboard/${userType}/messages`,
        icon: MessageSquare,
        hasOptions: false,
        badge: totalUnreadMessages > 0 ? totalUnreadMessages.toString() : undefined,
      },
      {
        name: t("payments"),
        url: `/dashboard/${userType}/payments`,
        icon: CreditCard,
        hasOptions: false,
        disabled: true,
      },
    ];

    if (userType === "therapist") {
      return {
        user: userData,
        navMain: [
          {
            title: t("dashboard"),
            url: `/dashboard/${userType}`,
            icon: LayoutDashboard,
            isActive: isRouteActive(`/dashboard/${userType}`),
            items: [],
          },
          {
            title: t("clients"),
            url: `/dashboard/${userType}/clients`,
            icon: UsersRound,
            isActive: isRouteActive(`/dashboard/${userType}/clients`),
            items: [],
          },
          {
            title: t("sessions"),
            url: "#",
            icon: CalendarDays,
            isActive: isRouteActive("#", [
              { url: `/dashboard/${userType}/sessions` },
              { url: `/dashboard/${userType}/calendar` },
            ]),
            items: [
              {
                title: t("all_sessions"),
                url: `/dashboard/${userType}/sessions`,
              },
              {
                title: t("calendar"),
                url: `/dashboard/${userType}/calendar`,
              },
            ],
          },
          {
            title: t("settings"),
            url: "#",
            icon: Settings2,
            isActive: isRouteActive("#", [
              { url: `/dashboard/${userType}/settings` },
              { url: `/dashboard/${userType}/profile` },
              { url: `/dashboard/${userType}/intake-forms` },
            ]),
            items: [
              {
                title: t("application_settings"),
                url: `/dashboard/${userType}/settings`,
              },
              {
                title: t("intake:title"),
                url: `/dashboard/${userType}/intake-forms`,
              },
              {
                title: t("user_settings"),
                url: `/dashboard/${userType}/profile`,
              },
            ],
          },
        ],
        navSecondary: [
          {
            title: t("support"),
            url: "#",
            icon: LifeBuoy,
          },
          {
            title: t("feedback"),
            url: "#",
            icon: Send,
          },
        ],
        projects: commonProjects,
      };
    }

    // Client data
    return {
      user: userData,
      navMain: [
        {
          title: t("dashboard"),
          url: `/dashboard/${userType}`,
          icon: LayoutDashboard,
          isActive: isRouteActive(`/dashboard/${userType}`),
          items: [],
        },
        {
          title: t("bond_nav", "Bond"),
          url: `/dashboard/${userType}/bond`,
          icon: MessageCircleHeart,
          isActive: isRouteActive(`/dashboard/${userType}/bond`),
          items: [],
          ai: true,
        },
        {
          title: t("therapists"),
          url: `/dashboard/${userType}/therapists`,
          icon: UsersRound,
          isActive: isRouteActive(`/dashboard/${userType}/therapists`),
          items: [],
        },
        {
          title: t("finder_nav_find", "Vind een hulpverlener"),
          // Public Finder marketplace (lives outside /dashboard).
          url: "/find",
          icon: Search,
          isActive: isRouteActive("/find"),
          items: [],
        },
        {
          title: t("journal"),
          url: `/dashboard/${userType}/journal`,
          icon: NotebookPen,
          isActive: isRouteActive(`/dashboard/${userType}/journal`),
          items: [],
        },
        {
          title: t("intake:title"),
          url: `/dashboard/${userType}/intake`,
          icon: ClipboardList,
          isActive: isRouteActive(`/dashboard/${userType}/intake`),
          items: [],
        },
        {
          title: t("sessions"),
          url: "#",
          icon: CalendarDays,
          isActive: isRouteActive("#", [
            { url: `/dashboard/${userType}/sessions` },
            { url: `/dashboard/${userType}/calendar` },
          ]),
          items: [
            {
              title: t("my_sessions"),
              url: `/dashboard/${userType}/sessions`,
            },
            {
              title: t("calendar"),
              url: `/dashboard/${userType}/calendar`,
            },
          ],
        },
        {
          title: t("settings"),
          url: "#",
          icon: Settings2,
          isActive: isRouteActive("#", [
            { url: `/dashboard/${userType}/settings` },
            { url: `/dashboard/${userType}/profile` },
          ]),
          items: [
            {
              title: t("application_settings"),
              url: `/dashboard/${userType}/settings`,
            },
            {
              title: t("user_settings"),
              url: `/dashboard/${userType}/profile`,
            },
          ],
        },
      ],
      navSecondary: [
        {
          title: t("support"),
          url: "#",
          icon: LifeBuoy,
        },
        {
          title: t("feedback"),
          url: "#",
          icon: Send,
        },
      ],
      projects: commonProjects,
    };
  }, [t, userType, userProfile, isRouteActive, taskCounts, totalUnreadMessages]);

  return {
    sidebarData,
    userProfile,
    unreadCounts,
    taskCounts,
    totalUnreadMessages,
    invalidateCache: () => OptimizedSidebarService.invalidateCache(userId),
  };
}
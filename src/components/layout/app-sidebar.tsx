"use client";

import * as React from "react";
import { useOptimizedSidebar } from "@/hooks/api/useOptimizedSidebar";
import { useOptimizedMessages } from "@/hooks/api/useOptimizedMessages";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useTranslation } from "react-i18next";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userType: "therapist" | "client" | "admin";
}

export function AppSidebar({ userType, ...props }: AppSidebarProps) {
  const { user } = useAuthManager();
  const userId = user?.id || "";
  const { t } = useTranslation();

  const {
    sidebarData,
    userProfile,
  } = useOptimizedSidebar(userId, userType);

  // Robust unread total for the Messages badge. We derive it from the
  // conversations' unread_count_* fields (returned by getConversations) so the
  // badge is accurate regardless of whether the unread-count RPC is available.
  const messagesRole: "client" | "therapist" =
    userType === "client" ? "client" : "therapist";
  const { conversations, totalUnreadCount } = useOptimizedMessages(
    userType === "admin" ? "" : userId,
    messagesRole,
    { enableRealtime: false }
  );

  const unreadMessageCount = React.useMemo(() => {
    if (userType === "admin") return 0;
    const key =
      userType === "client"
        ? "unread_count_client"
        : "unread_count_therapist";
    const fromConversations = (conversations || []).reduce(
      (sum: number, conv: any) => sum + (Number(conv?.[key]) || 0),
      0
    );
    // Prefer the conversation-derived count; fall back to the hook's RPC total.
    return fromConversations || totalUnreadCount || 0;
  }, [conversations, totalUnreadCount, userType]);

  // Inject the derived unread count into the Messages quick-access item so the
  // badge stays in sync even when the unread-count RPC is unavailable.
  const projectsWithBadge = React.useMemo(() => {
    return sidebarData.projects.map((project) => {
      const isMessages = project.url.endsWith("/messages");
      if (!isMessages) return project;
      return {
        ...project,
        badge: unreadMessageCount > 0 ? String(unreadMessageCount) : undefined,
      };
    });
  }, [sidebarData.projects, unreadMessageCount]);

  // Show loading state while user profile is being fetched
  if (!userProfile && userId) {
    return (
      <Sidebar
        variant="inset"
        className="bg-sidebar border-sidebar-border animate-fade-in "
        {...props}
      >
        <SidebarHeader className="bg-sidebar">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-3 py-2 bg-sidebar-accent rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-sidebar-border rounded"></div>
                <div className="grid flex-1 text-left">
                  <div className="h-4 bg-sidebar-border rounded mb-1"></div>
                  <div className="h-3 bg-sidebar-border rounded w-2/3"></div>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="bg-sidebar">
          <div className="space-y-2 p-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-sidebar-accent rounded animate-pulse"></div>
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter className="bg-sidebar">
          <div className="h-16 bg-sidebar-accent rounded animate-pulse"></div>
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar
      variant="inset"
      className="bg-sidebar border-sidebar-border animate-fade-in"
      {...props}
    >
      <SidebarHeader className="bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-3 py-2 bg-sidebar-accent rounded-lg transition-all duration-200 hover:bg-sidebar-border">
              <img 
                src="/favicon.ico" 
                alt="Icon" 
                className="w-8 h-8 transition-transform duration-200 hover:scale-110" 
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-sidebar-foreground">
                  Bondable
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {userType === "therapist" && t("therapist_dashboard")}
                  {userType === "client" && t("client_dashboard")}
                  {userType === "admin" && t("admin_dashboard")}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="bg-sidebar">
        <NavMain items={sidebarData.navMain} />
        <NavProjects projects={projectsWithBadge} />
        <NavSecondary items={sidebarData.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter className="bg-sidebar">
        <NavUser user={sidebarData.user} userType={userType} />
      </SidebarFooter>
    </Sidebar>
  );
}

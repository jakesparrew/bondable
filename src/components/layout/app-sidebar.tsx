"use client";

import * as React from "react";
import { useOptimizedSidebar } from "@/hooks/api/useOptimizedSidebar";
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

  // Show loading state while user profile is being fetched
  if (!userProfile && userId) {
    return (
      <Sidebar
        variant="inset"
        className="bg-neutral-900 border-sidebar-border animate-fade-in "
        {...props}
      >
        <SidebarHeader className="bg-neutral-900">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-3 py-2 bg-neutral-800 rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-neutral-700 rounded"></div>
                <div className="grid flex-1 text-left">
                  <div className="h-4 bg-neutral-700 rounded mb-1"></div>
                  <div className="h-3 bg-neutral-700 rounded w-2/3"></div>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="bg-neutral-900">
          <div className="space-y-2 p-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-neutral-800 rounded animate-pulse"></div>
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter className="bg-neutral-900">
          <div className="h-16 bg-neutral-800 rounded animate-pulse"></div>
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar
      variant="inset"
      className="bg-neutral-900 border-sidebar-border animate-fade-in"
      {...props}
    >
      <SidebarHeader className="bg-neutral-900">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-3 py-2 bg-neutral-800 rounded-lg transition-all duration-200 hover:bg-neutral-700">
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
      
      <SidebarContent className="bg-neutral-900">
        <NavMain items={sidebarData.navMain} />
        <NavProjects projects={sidebarData.projects} />
        <NavSecondary items={sidebarData.navSecondary} className="mt-auto" />
      </SidebarContent>
      
      <SidebarFooter className="bg-neutral-900">
        <NavUser user={sidebarData.user} userType={userType} />
      </SidebarFooter>
    </Sidebar>
  );
}

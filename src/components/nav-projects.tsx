"use client";

import { MoreHorizontal, Folder, Share, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavProjects({
  projects,
}: {
  projects: {
    name: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    hasOptions?: boolean;
    disabled?: boolean;
    badge?: string;
  }[];
}) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{t("quick_access")}</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.url;

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={isActive}>
                <button
                  onClick={() => {
                    if (!item.disabled) navigate(item.url);
                  }}
                  disabled={item.disabled}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </button>
              </SidebarMenuButton>
              {item.badge && !item.disabled && (
                <SidebarMenuBadge className="pointer-events-none">
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
                    aria-label={t("unread_messages_count", {
                      count: Number(item.badge),
                      defaultValue: "{{count}} unread",
                    })}
                  >
                    {item.badge}
                  </span>
                </SidebarMenuBadge>
              )}
              {item.hasOptions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">{t("more")}</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem>
                      <Folder className="text-muted-foreground" />
                      <span>{t("view_project")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share className="text-muted-foreground" />
                      <span>{t("share_project")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Trash2 className="text-muted-foreground" />
                      <span>{t("delete_project")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

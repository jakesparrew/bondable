"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CircleUser,
  CreditCard,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useAvatarCache } from "@/hooks/ui/useAvatarCache";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUpload } from "@/components/ui/avatar-upload";

interface NavUserProps {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  userType: "therapist" | "client" | "admin";
}

export function NavUser({ user, userType }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { user: authUser, signOut, refreshProfile } = useAuthManager();
  const { avatarUrl, updateAvatarUrl } = useAvatarCache();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [userProfile, setUserProfile] = useOptimizedState<{
    first_name: string | null;
    last_name: string | null;
    role: string;
  } | null>(null);

  useOptimizedEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser?.id) return;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, role")
          .eq("id", authUser.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user profile:", error);
        } else if (profile) {
          setUserProfile(profile);
        } else {
          await refreshProfile();
        }
      } catch (error) {
        console.error("Error in fetchUserProfile:", error);
      }
    };

    fetchUserProfile();
  }, [authUser?.id, refreshProfile]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    updateAvatarUrl(newAvatarUrl);
  };

  const displayName =
    userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() :
    `${authUser?.user_metadata?.first_name || ''} ${authUser?.user_metadata?.last_name || ''}`.trim() ||
    authUser?.email?.split("@")[0] ||
    user.name;

  const displayEmail = authUser?.email || user.email;
  // Use cached avatar URL, fallback to prop
  const currentAvatarUrl = avatarUrl || user.avatar;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-muted data-[state=open]:text-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={currentAvatarUrl}
                  alt={displayName}
                  className="non-invertable"
                />
                <AvatarFallback className="rounded-lg">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {displayEmail}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border !border-border !bg-card !text-foreground shadow-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0">
              <div className="flex items-center gap-3 px-3 py-2 text-sm">
                <AvatarUpload
                  currentAvatarUrl={currentAvatarUrl}
                  onAvatarUpdate={handleAvatarUpdate}
                  size="mid"
                />
                <div className="flex flex-col truncate">
                  <span className="font-medium truncate">{displayName}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {displayEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-border" />

            {userType !== "admin" && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => navigate(`/dashboard/${userType}/profile`)}
                    className="gap-2 px-3 py-2 hover:!bg-muted hover:!text-muted-foreground group cursor-pointer"
                  >
                    <ArrowUpRight
                      strokeWidth={1}
                      className="h-5 w-5 text-foreground group-hover:text-muted-foreground"
                    />
                    <span>{t("upgrade_to_pro")}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="bg-border" />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => navigate(`/dashboard/${userType}/settings`)}
                    className="gap-2 px-3 py-2 hover:!bg-muted hover:!text-muted-foreground group cursor-pointer"
                  >
                    <CircleUser
                      strokeWidth={1}
                      className="h-5 w-5 text-foreground group-hover:text-muted-foreground"
                    />
                    <span>{t("account")}</span>
                  </DropdownMenuItem>
                  {/* Providers bill through Facturatie. Clients have no billing
                      surface, so the entry is provider-only rather than a link
                      to a page that no longer exists. */}
                  {userType === "therapist" && (
                    <DropdownMenuItem
                      onClick={() => navigate("/dashboard/therapist/invoicing")}
                      className="gap-2 px-3 py-2 hover:!bg-muted hover:!text-muted-foreground group cursor-pointer"
                    >
                      <CreditCard
                        strokeWidth={1}
                        className="h-5 w-5 text-foreground group-hover:text-muted-foreground"
                      />
                      <span>{t("nav_invoicing", "Facturatie")}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="gap-2 px-3 py-2 hover:!bg-muted hover:!text-muted-foreground group cursor-pointer">
                    <Bell
                      strokeWidth={1}
                      className="h-5 w-5 text-foreground group-hover:text-muted-foreground"
                    />
                    <span>{t("notifications")}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}

            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="gap-2 px-3 py-2 hover:!bg-muted hover:!text-red-500 group cursor-pointer rounded-b-lg"
            >
              <LogOut
                strokeWidth={1}
                className="h-5 w-5 text-red-400 group-hover:text-red-500"
              />
              <span>{t("log_out")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

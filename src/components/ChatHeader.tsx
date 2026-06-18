import { useOptimizedState } from "@/hooks/performance/useOptimizedComponents";
import console from "@/lib/production-console";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  ChevronDown,
  Bot,
  MessageCircle,
  ChevronsDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { Client } from "@/types/client";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";

type ChatHeaderType = "conversation" | "ai" | "sms";

interface ChatHeaderProps {
  type: ChatHeaderType;
  onBackClick?: () => void;
  client?: Client | null;
  clientAvatar?: string;
  showModeButtons?: boolean;
  isPayingTherapist?: boolean;
  onModeChange?: (mode: "app" | "ai" | "sms") => void;
  currentMode?: "app" | "ai" | "sms";
  smsTab?: "sms" | "whatsapp";
  onSmsTabChange?: (tab: "sms" | "whatsapp") => void;
  onShowAutomation?: () => void;
}

const ChatHeader = ({
  type,
  onBackClick,
  client,
  clientAvatar,
  showModeButtons = false,
  isPayingTherapist = false,
  onModeChange,
  currentMode,
  smsTab,
  onSmsTabChange,
  onShowAutomation,
}: ChatHeaderProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isDropdownOpen, setIsDropdownOpen] = useOptimizedState(false);
  const [pressed, setPressed] = useState(false);
  const isNative = Capacitor.getPlatform() !== "web";

  const getHeaderContent = () => {
    const getInitials = (name?: string) => {
      if (!name) return "?";
      return (
        name
          .split(" ")
          .map((n) => n[0]?.toUpperCase())
          .filter(Boolean)
          .join("")
          .slice(0, 2) || "?"
      );
    };

    switch (type) {
      case "ai":
        return {
          avatar: <Bot className="h-5 w-5" />,
          title: t("ai_assistant"),
          subtitle: t("ask_me_anything_practice"),
          showDropdown: false,
        };
      case "sms":
        return {
          avatar: getInitials(client?.name),
          title: client?.name || t("sms_chat"),
          subtitle: client?.phone || t("sms_whatsapp"),
          showDropdown: false,
        };
      case "conversation":
      default:
        return {
          avatar: getInitials(client?.name),
          title: client?.name || t("conversation"),
          subtitle: null,
          showDropdown: true,
        };
    }
  };

  const { avatar, title, subtitle, showDropdown } = getHeaderContent();

  return (
    <div>
      <div
        className={`p-0 border-b border-[#1f1f23] flex items-stretch ${
          isMobile ? "sticky top-0 z-50 bg-[#111111]" : "bg-[#111111]"
        }`}
      >
        {/* Back Button */}
        {(isMobile || type !== "conversation") && onBackClick && (
          <div className="p-4 flex items-center space-x-3 py-3 px-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackClick}
              className="text-gray-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* User Info */}
        {showDropdown && client ? (
          <DropdownMenu onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center px-3 flex-1 py-3 cursor-pointer hover:bg-neutral-900 transition-colors group rounded-xl sm:rounded-l-none touch-manipulation active:bg-neutral-800">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage
                    src={clientAvatar || ""}
                    key={`${client?.id}-${clientAvatar}`}
                    className="non-invertable"
                  />
                  <AvatarFallback className="bg-[#27272a] text-white text-sm">
                    {avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 min-w-0 flex-1 overflow-hidden">
                  <h3 className="text-white font-medium truncate">{title}</h3>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 ml-2 flex-shrink-0 transition-all duration-200 ease-out group-hover:text-gray-300 ${
                    isDropdownOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-80 !bg-[#1a1a1a]  z-[9999] animate-scale-in touch-manipulation"
              style={{ zIndex: 9999 }}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage
                      src={clientAvatar || ""}
                      key={`${client?.id}-${clientAvatar}`}
                    />
                    <AvatarFallback className="bg-[#27272a] text-white">
                      {avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-base">
                      {title}
                    </h3>
                    <p className="text-gray-400 text-sm break-all">
                      {client.email}
                    </p>
                  </div>
                </div>
                {client.phone && client.phone !== t("no_phone_provided") && (
                  <div className="mb-2">
                    <span className="text-gray-500 text-xs">
                      {t("phone_label")}
                    </span>
                    <p className="text-white text-sm">{client.phone}</p>
                  </div>
                )}
                {client.status && (
                  <div className="mb-2">
                    <span className="text-gray-500 text-xs">
                      {t("status_label")}
                    </span>
                    <p className="text-white text-sm">{client.status}</p>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center px-3 flex-1 py-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              {type === "ai" ? (
                <AvatarFallback className="bg-neutral-700 text-white">
                  {avatar}
                </AvatarFallback>
              ) : (
                <>
                  <AvatarImage
                    src={clientAvatar || ""}
                    key={`${client?.id}-${clientAvatar}`}
                    className="non-invertable"
                  />
                  <AvatarFallback className="bg-[#27272a] text-white text-sm">
                    {avatar}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            <div className="ml-3 min-w-0">
              <h3 className="text-white font-medium truncate">{title}</h3>
              {subtitle && (
                <p className="text-gray-400 text-xs break-words line-clamp-2">{subtitle}</p>
              )}
            </div>
          </div>
        )}

        {/* Mode Buttons for Conversation Interface */}
        {showModeButtons && isPayingTherapist && (
          <>
            {/* AI Button */}
            <div className={`flex items-center px-2 transition-colors `}>
              <Button
                variant="ghost"
                size="sm"
                className={`transition-colors ${
                  currentMode === "ai"
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                title={t("ask_ai")}
                onClick={() => onModeChange?.("ai")}
              >
                <Bot className="h-4 w-4" />
              </Button>
            </div>

            {/* SMS Button */}
            <div className={`flex items-center px-2 transition-colors`}>
              <Button
                variant="ghost"
                size="sm"
                className={`transition-colors ${
                  currentMode === "ai"
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => onModeChange?.("sms")}
                title={t("send_sms")}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* SMS Interface Controls */}
        {type === "sms" && (
          <div className="flex items-center space-x-2 px-4">
            {/* SMS Tab Switcher would go here if needed */}
            {onShowAutomation && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShowAutomation}
                className="bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#2a2a2a] border-neutral-800 transition-colors"
              >
                {t("automation")}
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Drag-down slider (mobile only) */}
      {type === "conversation" && isMobile && !isNative && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full z-40">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setPressed(true);
            }}
            className={`h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg 
                 hover:bg-background/90 hover:shadow-xl transition-all duration-200 hover:scale-105 
                 flex items-center justify-center ${pressed ? "mt-6" : "mt-6"}`}
          >
            {pressed ? (
              <ChevronsDown className="w-5 h-5 text-neutral-300" />
            ) : (
              <ChevronsDown className="w-5 h-5 text-neutral-300" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;

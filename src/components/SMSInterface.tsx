import { useRef, useCallback, useEffect } from "react";
import { useOptimizedState } from "@/hooks/performance/useOptimizedComponents";
import console from "@/lib/production-console";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useProfileAvatar } from "@/hooks/ui/useProfileAvatar";
import {
  Send,
  Settings,
  Bell,
  Calendar,
  MessageSquare,
  Phone,
  ChevronDownIcon,
  ChevronDown,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useScrollToBottom } from "@/hooks/ui/useScrollToBottom";
import { format, startOfDay, isSameDay, isToday, isYesterday, isThisWeek, isThisMonth, isThisYear } from "date-fns";
import { Client } from "@/types/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AutomationSwitches } from "./AutomationSwitches";
import ChatHeader from "./ChatHeader";
import { Capacitor } from "@capacitor/core";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { usePaginatedExternalMessages } from "@/hooks/api/usePaginatedExternalMessages";
import { toast } from "sonner";

interface SMSInterfaceProps {
  selectedClient: Client;
  onBack: () => void;
}

type SMSMessage = {
  id: string;
  text: string;
  sender: "therapist" | "client";
  timestamp: Date;
  status: "sending" | "sent";
  type: "sms" | "whatsapp";
};

const SMSInterface = ({ selectedClient, onBack }: SMSInterfaceProps) => {
  const [newMessage, setNewMessage] = useOptimizedState("");
  const [showSettings, setShowSettings] = useOptimizedState(false);
  const [autoReminders, setAutoReminders] = useOptimizedState(true);
  const [autoTasks, setAutoTasks] = useOptimizedState(false);
  const [autoMessages, setAutoMessages] = useOptimizedState(true);
  const [activeTab, setActiveTab] = useOptimizedState<"sms" | "whatsapp">(
    "sms"
  );
  const [showAutomationDialog, setShowAutomationDialog] =
    useOptimizedState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const isNative = Capacitor.getPlatform() !== "web";
  const isMobile = useIsMobile();

  // Get the selected client's avatar
  const { avatarUrl: selectedClientAvatar, isLoading: avatarLoading } =
    useProfileAvatar(selectedClient?.id);

  const {
    showScrollButton,
    scrollToBottom: scrollToBottomSmooth,
    triggerCheck,
  } = useScrollToBottom({
    scrollContainerRef,
  });

  const [isLoadingMore, setIsLoadingMore] = useOptimizedState(false);

  // handleScroll is defined after hooks to avoid using variables before declaration

  const formatTime = (timestamp: Date) => format(timestamp, "HH:mm");
  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return t("today");
    if (isYesterday(date)) return t("yesterday");
    if (isThisWeek(date)) return format(date, "EEEE");
    if (isThisMonth(date)) return format(date, "EEEE, MMMM d");
    if (isThisYear(date)) return format(date, "MMMM d");
    return format(date, "MMMM d, yyyy");
  };
  const groupMessagesByDate = (msgs: SMSMessage[]) => {
    const grouped: Array<{ type: 'date' | 'hour' | 'message'; data: any; date?: Date }>= [];
    let lastDate: Date | null = null;
    let lastHour: number | null = null;

    msgs.forEach((m) => {
      const messageDate = new Date(m.timestamp);
      const dateOnly = startOfDay(messageDate);
      const hour = messageDate.getHours();

      if (!lastDate || !isSameDay(lastDate, dateOnly)) {
        grouped.push({ type: 'date', data: formatDateSeparator(dateOnly), date: dateOnly });
        lastDate = dateOnly;
        lastHour = null; // reset hour tracking for new day
      }

      if (lastHour !== null && Math.abs(hour - lastHour) >= 1) {
        grouped.push({ type: 'hour', data: format(messageDate, 'HH:mm'), date: messageDate });
      }

      lastHour = hour;
      grouped.push({ type: 'message', data: m });
    });

    return grouped;
  };

  // Conversation state
  const [conversationId, setConversationId] = useOptimizedState<string | null>(null);
  // Paginated external messages
  const { messages, hasMore, initialLoading, loadingMore, loadMoreMessages, sendExternalMessage } = usePaginatedExternalMessages({
    conversationId,
    channel: activeTab,
    pageSize: 30,
  });

  // Ensure a conversation exists and load messages for the active channel
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const therapistId = auth?.user?.id;
      if (!therapistId || !selectedClient?.id) return;

      // Find existing conversation
      const { data: existing, error: findErr } = await supabase
        .from("conversations")
        .select("id")
        .eq("therapist_id", therapistId)
        .eq("client_id", selectedClient.id)
        .maybeSingle();

      if (findErr && findErr.code !== "PGRST116") {
        console.warn("find conversation error", findErr);
      }

      let convId = existing?.id as string | undefined;

      // Create if not exists
      if (!convId) {
        const { data: created, error: insertErr } = await supabase
          .from("conversations")
          .insert({ therapist_id: therapistId, client_id: selectedClient.id })
          .select("id")
          .single();
        if (insertErr) {
          console.error("create conversation error", insertErr);
          return;
        }
        convId = created?.id as string | undefined;
      }

      if (mounted) setConversationId(convId || null);
    })();
    return () => {
      mounted = false;
    };
  }, [selectedClient?.id]);

  // Define scroll handler after hooks so it can use hasMore/loadMoreMessages
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop <= 0 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      const prevScrollHeight = el.scrollHeight;
      loadMoreMessages(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - prevScrollHeight;
      });
      setTimeout(() => setIsLoadingMore(false), 300);
    }
  }, [hasMore, isLoadingMore, loadMoreMessages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const phone = selectedClient?.phone;
    const isValidPhone =
      phone && /^\+?\d[\d\s\-()]{7,}$/.test(phone) && !/No phone/i.test(phone);
    if (!isValidPhone) {
      toast.error(t("no_valid_phone_number"));
      return;
    }

    const content = newMessage;
    setNewMessage("");

    await sendExternalMessage(phone!, content);

    // Ensure we scroll to bottom and update the button state
    scrollToBottomSmooth();
    triggerCheck();
  };

  // Auto-scroll to bottom when messages update (match ConversationInterface behavior)
  useEffect(() => {
    scrollToBottomSmooth();
    triggerCheck();
  }, [messages, scrollToBottomSmooth, triggerCheck]);

  const getStatusDisplay = (message: SMSMessage, isCurrentUser: boolean) => {
    if (!isCurrentUser) return null;

    const statusMap = {
      sending: { text: t("message_status_sending"), color: "text-muted-foreground" },
      sent: { text: t("message_status_sent"), color: "text-muted-foreground" },
    };

    const status = statusMap[message.status] || statusMap.sent;
    return <span className={`text-xs ${status.color}`}>, {status.text}</span>;
  };

  const getCurrentHistory = () => {
    return messages;
  };

  const getCharacterLimit = () => {
    return activeTab === "sms" ? 480 : 480;
  };

  return (
    <div
      className={ 
        isMobile
          ? `flex flex-col h-screen overflow-hidden bg-card ${
              isNative ? "pt-14" : ""
            }`
          : "flex-1 flex flex-col bg-card h-full relative rounded-br-lg"
      }
    >
      {/* Header */}
        <ChatHeader
          type="sms"
          client={selectedClient}
          clientAvatar={selectedClientAvatar}
          onBackClick={onBack}
        />

        {/* SMS Controls */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2 justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-card text-muted-foreground hover:text-foreground hover:bg-muted border-border transition-colors"
              >
                {t("channels")}
                <span className="text-muted-foreground -ml-1">
                  | {activeTab === "sms" ? t("sms") : t("whatsapp")}
                </span>
                <ChevronDownIcon
                  className="-me-1 ms-1 opacity-60 transition-transform duration-200"
                  size={16}
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border-border text-sm min-w-[--radix-dropdown-menu-trigger-width] animate-scale-in">
              <DropdownMenuItem
                onClick={() => setActiveTab("sms")}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                  activeTab === "sms"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Phone className="h-3 w-3" />
                {t("sms")}
              </DropdownMenuItem>
              <div className="my-1"></div>
              <DropdownMenuItem
                onClick={() => setActiveTab("whatsapp")}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                  activeTab === "whatsapp"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                {t("whatsapp")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog
            open={showAutomationDialog}
            onOpenChange={setShowAutomationDialog}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-card text-muted-foreground hover:text-foreground hover:bg-muted border-border transition-colors"
              >
                {t("automation")}
                <SquareArrowOutUpRight
                  className="-me-1 ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background border border-border text-foreground max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground mb-2">
                  {activeTab === "sms"
                    ? t("sms_settings")
                    : t("whatsapp_settings")}
                </DialogTitle>
                <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent" />
              </DialogHeader>

              <AutomationSwitches
                activeTab={activeTab}
                autoReminders={autoReminders}
                setAutoReminders={setAutoReminders}
                autoTasks={autoTasks}
                setAutoTasks={setAutoTasks}
                autoMessages={autoMessages}
                setAutoMessages={setAutoMessages}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Messages History */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto p-4 space-y-4 pb-0 relative ${
            isMobile ? "pb-8" : "pb-8"
          }`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Loading indicator for older messages */}
          {loadingMore && (
            <div className="flex justify-center py-2">
              <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                Loading older messages...
              </div>
            </div>
          )}
          {groupMessagesByDate(getCurrentHistory()).map((item, index) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${index}`} className="flex justify-center my-6">
                  <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                    {item.data}
                  </div>
                </div>
              );
            }

            if (item.type === 'hour') {
              return (
                <div key={`hour-${index}`} className="flex justify-center my-3">
                  <div className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
                    {item.data}
                  </div>
                </div>
              );
            }

            const message = item.data as SMSMessage;
            return (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "therapist" ? "justify-end" : "justify-start"
                }`}
              >
                <div className="max-w-xs lg:max-w-md">
                  <div
                    className={` w-fit block px-4 py-2 rounded-lg ${
                      message.sender === "therapist"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm [overflow-wrap:anywhere]">{message.text}</p>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      message.sender === "therapist" ? "text-right" : "text-left"
                    }`}
                  >
                    <span className="text-muted-foreground">
                      {formatTime(message.timestamp)}
                      {getStatusDisplay(message, message.sender === "therapist")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll to Bottom Button */}
        <ScrollToBottomButton
            scrollContainerRef={scrollContainerRef}
            className={`left-1/2 transform -translate-x-1/2 ${
              isMobile
                ? isNative
                  ? "bottom-[7.7rem]"
                  : "bottom-[6.5rem]"
                : "bottom-[7rem]"
            }`}
          />

        {/* Input */}
        <div
          className={`p-4 border-t border-border ${
            isMobile && isNative ? "pb-7" : ""
          }`}
        >
          <div className="flex items-center space-x-2">
            <Input
              placeholder={
                activeTab === "sms"
                  ? t("type_sms_message")
                  : t("type_whatsapp_message")
              }
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
              maxLength={getCharacterLimit()}
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground h-10 w-10 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {newMessage.length}/{getCharacterLimit()} {t("characters")}
          </div>
        </div>
    </div>
  );
};

export default SMSInterface;

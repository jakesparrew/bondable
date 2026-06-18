import { useRef, useCallback } from "react";
import {
  useOptimizedState,
  useOptimizedEffect,
} from "@/hooks/performance/useOptimizedComponents";
import console from "@/lib/production-console";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, User, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatHeader from "./ChatHeader";
import { Capacitor } from "@capacitor/core";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { useScrollToBottom } from "@/hooks/ui/useScrollToBottom";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useProfileAvatar } from "@/hooks/ui/useProfileAvatar";
import { format, startOfDay, isSameDay, isToday, isYesterday, isThisWeek, isThisMonth, isThisYear } from "date-fns";

type AIMessage = {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
};

interface AIChatInterfaceProps {
  onBack?: () => void;
}

const AIChatInterface = ({ onBack }: AIChatInterfaceProps) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useOptimizedState<AIMessage[]>([]);
  const [newMessage, setNewMessage] = useOptimizedState("");
  const [isLoading, setIsLoading] = useOptimizedState(false);
const messagesEndRef = useRef<HTMLDivElement>(null);
const scrollContainerRef = useRef<HTMLDivElement>(null);
const { scrollToBottom: scrollToBottomSmooth, triggerCheck } = useScrollToBottom({ scrollContainerRef });
const isNative = Capacitor.getPlatform() !== "web";
const isMobile = useIsMobile();

  const { user } = useAuthManager();
  const { avatarUrl: userAvatar } = useProfileAvatar(user?.id);
  const [isLoadingMore, setIsLoadingMore] = useOptimizedState(false);
  const [hasMore] = useOptimizedState(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop <= 0 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      setTimeout(() => setIsLoadingMore(false), 500);
    }
  }, [hasMore, isLoadingMore]);

  const formatTime = (d: Date) => format(d, "HH:mm");
  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return t("today");
    if (isYesterday(date)) return t("yesterday");
    if (isThisWeek(date)) return format(date, "EEEE");
    if (isThisMonth(date)) return format(date, "EEEE, MMMM d");
    if (isThisYear(date)) return format(date, "MMMM d");
    return format(date, "MMMM d, yyyy");
  };
  const groupMessagesByDate = (msgs: AIMessage[]) => {
    const grouped: Array<{ type: 'date'|'message'; data: any; }> = [];
    let lastDate: Date | null = null;
    msgs.forEach((m) => {
      const dateOnly = startOfDay(m.timestamp);
      if (!lastDate || !isSameDay(lastDate, dateOnly)) {
        grouped.push({ type: 'date', data: formatDateSeparator(dateOnly) });
        lastDate = dateOnly;
      }
      grouped.push({ type: 'message', data: m });
    });
    return grouped;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

useOptimizedEffect(() => {
  scrollToBottomSmooth();
  triggerCheck();
}, [messages, scrollToBottomSmooth, triggerCheck]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = newMessage;
    setNewMessage("");
    setIsLoading(true);

    try {
      // REMOVED: Debug logging for production

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { message: messageToSend },
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      if (data?.error) {
        console.error("AI function error:", data.error);
        throw new Error(data.error);
      }

      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        text: data?.response || t("im_sorry_couldnt_process"),
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
      // REMOVED: Debug logging for production
    } catch (error) {
      console.error("Error getting AI response:", error);

      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        text: t("im_sorry_having_trouble"),
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);

      toast.error("Failed to get AI response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={
      isMobile
        ? `flex flex-col h-screen overflow-hidden bg-[#111111] ${
            isNative ? "pt-14" : ""
          }`
        : "flex-1 flex flex-col bg-[#111111] h-full relative"
    }>
      {/* Header */}
      <ChatHeader type="ai" onBackClick={onBack} />

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto p-4 space-y-4 pb-0 relative ${
          isMobile ? "pb-8" : "pb-8"
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className="flex items-start space-x-2 max-w-xs lg:max-w-md">
              {message.sender === "ai" && (
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="bg-neutral-700 text-white text-xs">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.sender === "user"
                    ? "bg-white text-black"
                    : "bg-[#27272a] text-white"
                }`}
              >
                <p className="text-sm [overflow-wrap:anywhere]">{message.text}</p>
              </div>
              {message.sender === "user" && (
                <Avatar className="w-8 h-8 mt-1">
                  {userAvatar && (
                    <AvatarImage src={userAvatar} alt="Your profile picture" />
                  )}
                  <AvatarFallback className="bg-[#27272a] text-white text-xs">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarFallback className="bg-neutral-700 text-white text-xs">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-[#27272a] text-white px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      <ScrollToBottomButton
        scrollContainerRef={scrollContainerRef}
        className={`left-1/2 transform -translate-x-1/2 ${
          isMobile
            ? isNative
              ? "bottom-[6.2rem]"
              : "bottom-[5rem]"
            : "bottom-[5.5rem]"
        }`}
      />

      {/* Input */}
      <div
        className={`p-3 border-t border-[#1f1f23] ${
          isMobile && isNative ? "pb-7" : ""
        }`}
      >
        <div className="flex items-center space-x-2">
          <Input
            placeholder={t("ask_ai_anything")}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="bg-[#1a1a1a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isLoading}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-950 hover:text-neutral-800 h-10 w-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;

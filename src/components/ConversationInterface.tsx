import { useRef, useEffect, useCallback } from "react";
import {
  useOptimizedState,
  useOptimizedEffect,
  useOptimizedCallback,
  useOptimizedMemo,
} from "@/hooks/performance/useOptimizedComponents";

import console from "@/lib/production-console";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  ArrowUp,
  Bot,
  MessageCircle,
  Paperclip,
  Mic,
  X,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Client } from "@/types/client";
import AIChatInterface from "./AIChatInterface";
import SMSInterface from "./SMSInterface";
import ChatHeader from "./ChatHeader";
import FileUploadModal from "./dialogs/FileUploadModal";
import AudioRecorder from "./AudioRecorder";
import AttachmentRenderer from "./AttachmentRenderer";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { usePaginatedMessages } from "@/hooks/api/usePaginatedMessages";
import { useProfileAvatar } from "@/hooks/ui/useProfileAvatar";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useScrollToBottom } from "@/hooks/ui/useScrollToBottom";
import { useNavigate } from "react-router-dom";
import { simpleMessageService } from "@/services/utils";
import { messageAttachmentService } from "@/services/api";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  startOfDay,
  isSameDay,
  isThisWeek,
  isThisMonth,
  isThisYear,
  differenceInHours,
} from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";
import { TooltipProvider } from "./ui/tooltip";
import { useTranslation } from "react-i18next";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { Capacitor } from "@capacitor/core";

type ChatMode = "app" | "sms" | "ai";

interface ConversationInterfaceProps {
  selectedClient: Client | null;
  isPayingTherapist?: boolean;
  onBackClick?: () => void;
}

interface ProfileData {
  id: string;
  avatar_url?: string;
  first_name: string | null;
  last_name: string | null;
}

const ConversationInterface = ({
  selectedClient,
  isPayingTherapist = false,
  onBackClick,
}: ConversationInterfaceProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthManager();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isInputVisible, setIsInputVisible] = useOptimizedState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [lastScrollY, setLastScrollY] = useOptimizedState(0);
  const previousScrollHeightRef = useRef<number>(0);
  const isNative = Capacitor.getPlatform() !== "web";

  

  // Simple conversation management without the complex old hook
  const getOrCreateConversation = async (
    therapistId: string,
    clientId: string
  ) => {
    try {
      // Check if conversation exists
      const { data: existing, error: existingError } = await supabase
        .from("conversations")
        .select("*")
        .eq("therapist_id", therapistId)
        .eq("client_id", clientId)
        .maybeSingle();

      if (existingError) {
        console.error("Error checking existing conversation:", existingError);
        throw existingError;
      }

      if (existing) {
        console.log("Found existing conversation:", existing.id);
        return existing;
      }

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from("conversations")
        .insert({
          therapist_id: therapistId,
          client_id: clientId,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating conversation:", createError);
        throw createError;
      }

      console.log("Created new conversation:", newConv.id);
      return newConv;
    } catch (error) {
      console.error("Error in getOrCreateConversation:", error);
      throw error;
    }
  };
  const [newMessage, setNewMessage] = useOptimizedState("");
  const [chatMode, setChatMode] = useOptimizedState<ChatMode>("app");
  const [showFileUpload, setShowFileUpload] = useOptimizedState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useOptimizedState(false);
  const [conversationId, setConversationId] = useOptimizedState<string | null>(
    null
  );
  const [clientProfileId, setClientProfileId] = useOptimizedState<
    string | null
  >(null);
  const [isInitializing, setIsInitializing] = useOptimizedState(false);
  const [profiles, setProfiles] = useOptimizedState<
    Record<string, ProfileData>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSelectedClientId = useRef<string | null>(null);

  const {
    showScrollButton,
    scrollToBottom: scrollToBottomSmooth,
    triggerCheck,
  } = useScrollToBottom({
    scrollContainerRef,
  });

  const {
    messages,
    loading,
    initialLoading,
    hasMore,
    loadMoreMessages,
    sendMessage,
    sendFileMessages,
    sendVoiceMessage,
  } = usePaginatedMessages({ conversationId: conversationId || undefined });

  // Get the selected client's avatar - ensure it resets when client changes
  const { avatarUrl: selectedClientAvatar, isLoading: avatarLoading } =
    useProfileAvatar(selectedClient?.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ─── universal infinite‐scroll‐up handler ─────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || loading || !hasMore) return;

    // when we hit the very top, load more and preserve position
    if (el.scrollTop <= 0) {
      const prevHeight = el.scrollHeight;
      loadMoreMessages(() => {
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      });
    }
  }, [loading, hasMore, loadMoreMessages]);

  // Attach scroll listener once
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useOptimizedEffect(() => {
    scrollToBottom();
    // Also trigger scroll button check when messages change
    triggerCheck();
  }, [messages, triggerCheck]);

const fetchProfileData = async (userIds: string[]) => {
  try {
    const { profileCache } = await import("@/services/cache");

    const profilesMap: Record<string, ProfileData> = {};
    const toFetch: string[] = [];

    userIds.forEach((id) => {
      const cached = profileCache.get<ProfileData>(`profile:${id}`);
      if (cached) {
        profilesMap[id] = cached;
      } else {
        toFetch.push(id);
      }
    });

    if (toFetch.length > 0) {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("id, avatar_url, first_name, last_name")
        .in("id", toFetch);

      if (error) {
        console.error("Error fetching profiles:", error);
      } else {
        profilesData?.forEach((profile) => {
          profilesMap[profile.id] = profile;
          profileCache.set(`profile:${profile.id}`, profile, 10 * 60 * 1000);
        });
      }
    }

    setProfiles((prev) => ({ ...prev, ...profilesMap }));
  } catch (error) {
    console.error("Error in fetchProfileData:", error);
  }
};

  useOptimizedEffect(() => {
    if (messages.length > 0) {
      const userIds = [...new Set(messages.map((msg) => msg.sender_id))];
      fetchProfileData(userIds);
    }
  }, [messages]);

  useEffect(() => {
    // Prevent re-initialization if it's the same client or if we're already initializing
    if (
      !selectedClient ||
      !user ||
      isInitializing ||
      selectedClient.id === lastSelectedClientId.current
    ) {
      return;
    }

    console.log(
      "Initializing conversation with selectedClient:",
      selectedClient
    );
    lastSelectedClientId.current = selectedClient.id;
    setIsInitializing(true);

    const initConversation = async () => {
      try {
        // Get user profile to determine role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          toast.error("Failed to load user profile");
          return;
        }

        let therapistId: string;
        let foundClientProfileId: string;

        if (profile?.role === "therapist") {
          // Therapist view - selectedClient is actually a client
          therapistId = user.id;

          // First try to find the profile ID using the client ID directly if it exists
          if (selectedClient.id) {
            console.log(
              "Trying to find client profile by ID:",
              selectedClient.id
            );
            const { data: clientProfileById, error: clientByIdError } =
              await supabase
                .from("profiles")
                .select("id, email")
                .eq("id", selectedClient.id)
                .eq("role", "client")
                .maybeSingle();

            if (clientProfileById && !clientByIdError) {
              foundClientProfileId = clientProfileById.id;
              console.log("Found client profile by ID:", foundClientProfileId);
            } else {
              console.log(
                "Client not found by ID, trying email lookup:",
                selectedClient.email
              );
              // Fallback to email lookup
              const { data: clientProfile, error: clientProfileError } =
                await supabase
                  .from("profiles")
                  .select("id, email")
                  .eq("email", selectedClient.email)
                  .eq("role", "client")
                  .maybeSingle();

              if (clientProfileError || !clientProfile) {
                console.error(
                  "Client profile not found by email:",
                  selectedClient.email,
                  clientProfileError
                );
                toast.error(
                  "Client profile not found. Please ensure the client has been properly added to the system."
                );
                return;
              }

              foundClientProfileId = clientProfile.id;
              console.log(
                "Found client profile by email:",
                foundClientProfileId
              );
            }
          } else {
            // No ID provided, use email lookup
            console.log(
              "No client ID provided, using email lookup:",
              selectedClient.email
            );
            const { data: clientProfile, error: clientProfileError } =
              await supabase
                .from("profiles")
                .select("id, email")
                .eq("email", selectedClient.email)
                .eq("role", "client")
                .maybeSingle();

            if (clientProfileError || !clientProfile) {
              console.error(
                "Client profile not found by email:",
                selectedClient.email,
                clientProfileError
              );
              toast.error(
                "Client profile not found. Please ensure the client has been properly added to the system."
              );
              return;
            }

            foundClientProfileId = clientProfile.id;
            console.log("Found client profile by email:", foundClientProfileId);
          }

          setClientProfileId(foundClientProfileId);
          console.log("Therapist creating conversation with client:", {
            therapistId,
            clientProfileId: foundClientProfileId,
          });
        } else {
          // Client view - selectedClient is actually a therapist
          foundClientProfileId = user.id;
          therapistId = selectedClient.id;
          setClientProfileId(foundClientProfileId);
          console.log("Client creating conversation with therapist:", {
            therapistId,
            clientProfileId: foundClientProfileId,
          });
        }

        const conversation = await getOrCreateConversation(
          therapistId,
          foundClientProfileId
        );
        if (conversation) {
          setConversationId(conversation.id);
          console.log("Conversation initialized:", conversation.id);
        } else {
          toast.error("Failed to create conversation");
        }
      } catch (error) {
        console.error("Error initializing conversation:", error);
        toast.error("Failed to initialize conversation");
      } finally {
        setIsInitializing(false);
      }
    };

    initConversation();
  }, [selectedClient, user, getOrCreateConversation, isInitializing]);

  useEffect(() => {
    if (!selectedClient) {
      setConversationId(null);
      setClientProfileId(null);
      lastSelectedClientId.current = null;
    }
  }, [selectedClient]);

  const handleSendMessage = async () => {
    if (
      !newMessage.trim() ||
      !selectedClient ||
      !user ||
      !conversationId ||
      !clientProfileId
    ) {
      console.error("Missing required data for sending message:", {
        newMessage: !!newMessage.trim(),
        selectedClient: !!selectedClient,
        user: !!user,
        conversationId: !!conversationId,
        clientProfileId: !!clientProfileId,
      });
      return;
    }

    try {
      // Get user profile to determine recipient
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        toast.error("Failed to send message");
        return;
      }

      let recipientId: string;
      if (profile?.role === "therapist") {
        // Therapist sending to client - use the stored clientProfileId
        recipientId = clientProfileId;
      } else {
        // Client sending to therapist
        recipientId = selectedClient.id;
      }

      console.log("Sending message to:", recipientId);
      await sendMessage(recipientId, newMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleFilesSelect = async (files: File[]) => {
    if (!user || !conversationId || !selectedClient || !clientProfileId) {
      toast.error("Cannot send files: missing required data");
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        toast.error("Failed to send files");
        return;
      }

      let recipientId: string;
      if (profile?.role === "therapist") {
        recipientId = clientProfileId;
      } else {
        recipientId = selectedClient.id;
      }

      // Use the new realtime service
      await sendFileMessages(recipientId, files);
    } catch (error) {
      console.error("❌ Error in handleFilesSelect:", error);
      toast.error("Failed to process files");
    }
  };

  const handleVoiceRecording = async (audioBlob: Blob, duration: number) => {
    if (!user || !conversationId || !selectedClient || !clientProfileId) {
      toast.error("Cannot send voice message: missing required data");
      return;
    }

    try {
      // Get recipient ID
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        toast.error("Failed to send voice message");
        return;
      }

      let recipientId: string;
      if (profile?.role === "therapist") {
        recipientId = clientProfileId;
      } else {
        recipientId = selectedClient.id;
      }

      // Use the new realtime service
      await sendVoiceMessage(recipientId, audioBlob, duration);
      setShowAudioRecorder(false);
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast.error("Failed to send voice message");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Optimize input handling for mobile
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Use requestAnimationFrame to optimize input performance on mobile
    requestAnimationFrame(() => {
      setNewMessage(value);
    });
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), "HH:mm");
  };

  const formatDateSeparator = (date: Date) => {
    const locale = i18n.language === "fr" ? fr : enUS;

    if (isToday(date)) {
      return t("today");
    } else if (isYesterday(date)) {
      return t("yesterday");
    } else if (isThisWeek(date)) {
      return format(date, "EEEE", { locale }); // Day of week (e.g., "Monday")
    } else if (isThisMonth(date)) {
      return format(date, "EEEE, MMMM d", { locale }); // Day and date (e.g., "Monday, January 15")
    } else if (isThisYear(date)) {
      return format(date, "MMMM d", { locale }); // Month and date (e.g., "January 15")
    } else {
      // Different year - show full date
      return format(date, "MMMM d, yyyy", { locale }); // Full date (e.g., "January 15, 2023")
    }
  };

  const groupMessagesByDate = (messages: any[]) => {
    const grouped: Array<{
      type: "date" | "message" | "hour";
      data: any;
      date?: Date;
    }> = [];
    let lastDate: Date | null = null;
    let lastHour: number | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at);
      const messageDateOnly = startOfDay(messageDate);
      const messageHour = messageDate.getHours();

      // Add date separator if it's a different day
      if (!lastDate || !isSameDay(lastDate, messageDateOnly)) {
        grouped.push({
          type: "date",
          data: formatDateSeparator(messageDateOnly),
          date: messageDateOnly,
        });
        lastDate = messageDateOnly;
        lastHour = null; // Reset hour tracking for new day
      }

      // Add hour separator if it's been more than 1 hour since last message (same day)
      if (lastHour !== null && Math.abs(messageHour - lastHour) >= 1) {
        grouped.push({
          type: "hour",
          data: format(messageDate, "HH:mm"),
          date: messageDate,
        });
      }

      lastHour = messageHour;
      grouped.push({ type: "message", data: message });
    });

    return grouped;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProfileData = (userId: string) => {
    return profiles[userId];
  };

  const getStatusDisplay = (message: any, isCurrentUser: boolean) => {
    if (!isCurrentUser) return null;

    const statusMap = {
      sending: { text: t("message_status_sending"), color: "text-muted-foreground" },
      sent: { text: t("message_status_sent"), color: "text-muted-foreground" },
      delivered: {
        text: t("message_status_delivered"),
        color: "text-blue-400",
      },
      read: { text: t("message_status_read"), color: "text-foreground" },
    };

    const status =
      statusMap[message.status as keyof typeof statusMap] || statusMap.sent;

      return (
        <>
          , <span className={`text-xs ${status.color}`}>{status.text}</span>
        </>
      );
  };

  // Simplified logic to determine what to show for each message
  const shouldShowTextContent = (message: any) => {
    // If message has attachments, don't show the text content (it's just placeholder text like "📎 filename")
    if (message.attachments && message.attachments.length > 0) {
      return false;
    }

    // If message content looks like a file/voice message, don't show it
    if (
      message.content.includes("📎") ||
      message.content.includes("🎤") ||
      message.content.includes("Voice message") ||
      message.content.includes("WhatsApp Image")
    ) {
      return false;
    }

    // If no attachments, show the actual text content
    return message.content.trim().length > 0;
  };

  if (!selectedClient) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card h-full rounded-br-lg">
        <div className="text-center">
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
            <Send className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("no_conversation_selected")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("select_client_to_start_messaging")}
          </p>
        </div>
      </div>
    );
  }

  const placeholders = Array.from({ length: 6 });

  // Render different interfaces based on chat mode
  if (chatMode === "ai") {
    return <AIChatInterface onBack={() => setChatMode("app")} />;
  }

  if (chatMode === "sms") {
    return (
      <SMSInterface
        selectedClient={selectedClient}
        onBack={() => setChatMode("app")}
      />
    );
  }

  return (
    <TooltipProvider>
      <div
        className={
          isMobile
            ? `flex flex-col h-screen min-h-0 overflow-hidden bg-card ${isNative ? "pt-14" : ""}`
            : "flex-1 flex flex-col bg-card h-full relative rounded-br-lg"
        }
      >
        {/* File Upload Modal */}
        <FileUploadModal
          isOpen={showFileUpload}
          onClose={() => setShowFileUpload(false)}
          onFilesSelect={handleFilesSelect}
        />

        {/* Header */}
        <div className="shrink-0 sticky top-0 z-20 bg-card">
        <ChatHeader
          type="conversation"
          client={selectedClient}
          clientAvatar={selectedClientAvatar}
          onBackClick={onBackClick || (() => navigate(-1))}
          showModeButtons={true}
          isPayingTherapist={isPayingTherapist}
          onModeChange={setChatMode}
          currentMode={chatMode}
        />
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto p-4 space-y-4 pb-0 relative ${
            isMobile && isNative ? "pb-[6.5rem]" : isMobile ? "pb-20" : "pb-4"
          }`}
          style={{ WebkitOverflowScrolling: "touch" }}
          data-messages-container
          onScroll={handleScroll}
        >
          {/* Loading indicator for older messages */}
          {loading && (
            <div className="flex justify-center py-2">
              <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                Loading older messages...
              </div>
            </div>
          )}

          {initialLoading && messages.length === 0 ? (
            <div className="space-y-4">
              {placeholders.map((_, index) => (
                <div
                  key={index}
                  className={`flex ${
                    index % 2 === 0 ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="flex items-start space-x-2 max-w-xs">
                    {index % 2 !== 0 && (
                      <Skeleton className="w-8 h-8 rounded-full" />
                    )}
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            groupMessagesByDate(messages).map((item, index) => {
              if (item.type === "date") {
                return (
                  <div
                    key={`date-${index}`}
                    className="flex justify-center my-6"
                  >
                    <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                      {item.data}
                    </div>
                  </div>
                );
              }

              if (item.type === "hour") {
                return (
                  <div
                    key={`hour-${index}`}
                    className="flex justify-center my-3"
                  >
                    <div className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
                      {item.data}
                    </div>
                  </div>
                );
              }

              const message = item.data;
              const isCurrentUser = message.sender_id === user?.id;
              const profile = getProfileData(message.sender_id);
              const isText = shouldShowTextContent(message);
              const isPdf =
                !isText &&
                message.attachments?.length > 0 &&
                message.attachments.every((att) =>
                  att.file_name.toLowerCase().endsWith(".pdf")
                );

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="flex items-start space-x-2 max-w-xs min-w-0">
                    {!isCurrentUser && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        {profile?.avatar_url ? (
                          <AvatarImage src={profile.avatar_url} />
                        ) : (
                          <AvatarFallback className="bg-muted text-foreground text-xs">
                            {profile?.first_name || profile?.last_name
                              ? `${profile.first_name || ""} ${
                                  profile.last_name || ""
                                }`
                                  .trim()
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                              : "U"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                    <div
                      className={`flex-1 min-w-0 ${
                        isCurrentUser ? "flex flex-col items-end" : ""
                      }`}
                    >
                      <div
                        className={`rounded-lg w-fit ${
                          isText ? "px-3 py-2" : ""
                        } ${
                          isPdf
                            ? "bg-transparent leading-none"
                            : isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {/* Show text content if no attachments or if it's not a placeholder */}
                        {shouldShowTextContent(message) && (
                          <p className="text-sm [overflow-wrap:anywhere]">
                          {message.content}
                        </p>
                        )}

                        {/* Show attachments */}
                        {message.attachments &&
                          message.attachments.map((attachment: any) => (
                            <AttachmentRenderer
                              key={attachment.id}
                              attachment={attachment}
                              isCurrentUser={isCurrentUser}
                            />
                          ))}
                      </div>
                      <div
                        className={`flex items-center mt-1 ${
                          isCurrentUser
                            ? "justify-end ml-auto"
                            : "justify-start"
                        }`}
                      >
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.created_at)}
                          {getStatusDisplay(message, isCurrentUser)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
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

        {/* Audio Recorder */}
        {showAudioRecorder && (
          <div
            className={`p-3 border-t border-border ${
              isMobile
                ? `fixed bottom-0 left-0 right-0 bg-card z-50 ${isNative ? "pb-7" : ""}`
                : ""
            }`}
          >
            <AudioRecorder
              onRecordingComplete={handleVoiceRecording}
              onCancel={() => setShowAudioRecorder(false)}
            />
          </div>
        )}

        {/* Message Input */}
        {!showAudioRecorder && (isMobile ? isInputVisible : true) && (
          <div
            className={`${
              isMobile
                ? `fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 ${
                    isNative ? "pb-7" : ""
                  }`
                : "p-3 border-t border-border"
            }`}
          >
            <div
              className={`flex items-center space-x-2 ${
                isMobile ? "p-3" : ""
              }`}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAudioRecorder(true)}
                className="bg-card text-muted-foreground hover:text-foreground hover:bg-muted h-10 w-10 p-0 touch-manipulation active:bg-muted"
                title="Record voice message"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileUpload(true)}
                className="bg-card text-muted-foreground hover:text-foreground hover:bg-muted h-10 w-10 p-0 touch-manipulation active:bg-muted"
                title="Upload files"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder={t("type_your_message")}
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className={`bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring ${
                  isMobile ? "touch-manipulation text-base" : ""
                }`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
                style={{ fontSize: isMobile ? "16px" : undefined }} // Prevent zoom on iOS
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground h-10 w-10 p-0 touch-manipulation active:bg-primary/80"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ConversationInterface;

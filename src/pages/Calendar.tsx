import DashboardLayout from "@/components/layout/DashboardLayout";
import console from "@/lib/production-console";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, RefreshCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import CalendarGrid from "@/components/CalendarGrid";
import CalendarViewSelector from "@/components/CalendarViewSelector";
import WeekView from "@/components/WeekView";
import DayView from "@/components/DayView";
import EventDialog from "@/components/dialogs/EventDialog";
import { useEvents } from "@/hooks/api/useEvents";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { GoogleCalendarCache } from "@/services/cache";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TimeSlotData } from "@/types/timeSlot";
// Removed skeleton import - using instant loading

const Calendar = () => {
  const { t } = useTranslation();
  const { userType } = useParams();
  const isMobile = useIsMobile();
  const { session } = useAuthManager();
  const [currentDate, setCurrentDate] = useOptimizedState(new Date());
  const [currentView, setCurrentView] = useOptimizedState<"month" | "week" | "day">(
    "month"
  );
  const [isEventDialogOpen, setIsEventDialogOpen] = useOptimizedState(false);
  const [selectedEvent, setSelectedEvent] = useOptimizedState(null);
  const [selectedDate, setSelectedDate] = useOptimizedState(null);
  const [timeSlotData, setTimeSlotData] = useOptimizedState<TimeSlotData | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useOptimizedState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useOptimizedState(false);

  const {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    syncWithGoogleCalendar,
    disconnectGoogleCalendar,
    isGoogleSyncing,
    isGoogleConnected,
  } = useEvents();

  // Auto-sync when view or date changes if Google is connected
  useOptimizedEffect(() => {
    if (isGoogleConnected && !isGoogleSyncing) {
      console.log(`View or date changed: ${currentView} view for`, currentDate);
      // Use a small delay to debounce rapid navigation
      const timeoutId = setTimeout(() => {
        syncWithGoogleCalendar(currentView, currentDate);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [currentView, currentDate, isGoogleConnected]);

  // Debug cache stats
  useOptimizedEffect(() => {
    const stats = GoogleCalendarCache.getCacheStats();
    if (stats.totalEntries > 0) {
      console.log("Cache stats:", {
        entries: stats.totalEntries,
        size: `${Math.round(stats.totalSize / 1024)}KB`,
        oldestEntry: stats.oldestEntry
          ? new Date(stats.oldestEntry).toLocaleString()
          : "None",
      });
    }
  }, [currentView, currentDate]);

  useOptimizedEffect(() => {
  const loadInitialEvents = async () => {
    setIsLoadingEvents(true);

    try {
      if (!isGoogleConnected) {
        // Load local/supabase events for non-Google users
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      // If Google is connected, sync is triggered by the view/date effect to avoid duplicate calls.
    } catch (err) {
      console.warn("Error loading events:", err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  loadInitialEvents();
}, [isGoogleConnected]);


  const monthNames = [
    t("january"),
    t("february"),
    t("march"),
    t("april"),
    t("may"),
    t("june"),
    t("july"),
    t("august"),
    t("september"),
    t("october"),
    t("november"),
    t("december"),
  ];

  const handlePrevPeriod = () => {
    if (currentView === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
    } else if (currentView === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else if (currentView === "day") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  const handleNextPeriod = () => {
    if (currentView === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
    } else if (currentView === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else if (currentView === "day") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setSelectedDate(null);
    setTimeSlotData(null);
    setIsEventDialogOpen(true);
  };

  const handleTimeSlotClick = (date, time) => {
    console.log(
      `Calendar: Time slot clicked - Date: ${date.toDateString()}, Time: ${time}`
    );

    // Calculate end time (1 hour later)
    const [hours, minutes] = time.split(":").map(Number);
    const endHours = hours + 1;
    const endTime = `${String(endHours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`;

    // Format date as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    console.log(`Setting event times: ${time} - ${endTime} on ${dateString}`);

    // Create TimeSlotData object
    const slotData: TimeSlotData = {
      date: date,
      startTime: time,
      endTime: endTime,
      dateString: dateString,
    };

    setTimeSlotData(slotData);
    setSelectedDate(null);
    setSelectedEvent(null);
    setIsEventDialogOpen(true);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setTimeSlotData(null);
    setIsEventDialogOpen(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setSelectedDate(new Date());
    setTimeSlotData(null);
    setIsEventDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
    setSelectedDate(null);
    setTimeSlotData(null);
  };

  const handleSyncGoogleCalendar = async () => {
    if (isGoogleConnected) {
      // If already connected, disconnect
      await disconnectGoogleCalendar();
      return;
    }

    // Check if user has manually disconnected before
    const hasDisconnected =
      localStorage.getItem("googleCalendarDisconnected") === "true";

    if (hasDisconnected) {
      // User needs to reconnect with fresh OAuth
      await redirectToGoogleOAuth();
      return;
    }

    // Check if user is already authenticated with Google and has calendar permissions
    const isGoogleUser =
      session?.user?.app_metadata?.providers?.includes("google");

    if (isGoogleUser) {
      // Try to sync with current view - if it fails due to missing calendar scope, redirect to OAuth
      const result = await syncWithGoogleCalendar(currentView, currentDate);
      if (!result) {
        // Redirect to Google OAuth with calendar permissions
        await redirectToGoogleOAuth();
      }
    } else {
      // Not a Google user, redirect to Google OAuth
      await redirectToGoogleOAuth();
    }
  };

  const redirectToGoogleOAuth = async () => {
    try {
      console.log("Redirecting to Google OAuth with calendar scope...");

      // Clear the disconnect flag since user is choosing to reconnect
      localStorage.removeItem("googleCalendarDisconnected");

      // Clear cache when reconnecting to ensure fresh data
      GoogleCalendarCache.clearAllCache();

      // Use the current calendar URL as redirect target
      const currentUrl = `${window.location.origin}/dashboard/${userType}/calendar`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: currentUrl,
          scopes:
            "openid profile email https://www.googleapis.com/auth/calendar",
          queryParams: { access_type: 'offline', prompt: 'consent' }
        },
      });

      if (error) {
        console.error("Google OAuth error:", error);
        toast.error(`Failed to connect to Google: ${error.message}`);
        return;
      }

      console.log("Google OAuth initiated successfully");
      toast.success("Redirecting to Google for calendar permissions...");
    } catch (error) {
      console.error("Google OAuth error:", error);
      toast.error("Failed to initiate Google connection");
    }
  };

  const handleManualRefresh = async () => {
    try {
      setIsManualRefreshing(true);
      await syncWithGoogleCalendar(currentView, currentDate);
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 300);
    }
  };

  const getDateRangeText = () => {
    if (currentView === "month") {
      return `${
        monthNames[currentDate.getMonth()]
      } ${currentDate.getFullYear()}`;
    } else if (currentView === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${
          monthNames[startOfWeek.getMonth()]
        } ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
      } else {
        return `${
          monthNames[startOfWeek.getMonth()]
        } ${startOfWeek.getDate()} - ${
          monthNames[endOfWeek.getMonth()]
        } ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
      }
    } else {
      return `${
        monthNames[currentDate.getMonth()]
      } ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }
  };

  const renderCalendarView = () => {
    switch (currentView) {
      case "week":
        return (
          <WeekView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
          />
        );
      case "day":
        return (
          <DayView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
          />
        );
      default:
        return (
          <CalendarGrid
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            view={currentView}
            events={events}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
          />
        );
    }
  };

  const getSyncButtonConfig = () => {
    if (isGoogleSyncing) {
      return {
        text: t("syncing"),
        variant: "outline" as const,
        disabled: true,
      };
    }

    if (isGoogleConnected) {
      return {
        text: t("disconnect_google_calendar"),
        variant: "outline" as const,
        disabled: false,
      };
    }

    return {
      text: t("sync_google_calendar"),
      variant: "outline" as const,
      disabled: false,
    };
  };

  const syncButtonConfig = getSyncButtonConfig();

  // Instant loading - no skeleton needed

  return (
    <DashboardLayout userType={userType as "therapist" | "client"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">{t("calendar")}</h2>
            <p className="text-gray-400 text-sm">
              {t("manage_appointments")}
            </p>
          </div>
          <div className="flex gap-3">
            {!isMobile && (
              <>
                <Button
                  variant={syncButtonConfig.variant}
                  onClick={handleSyncGoogleCalendar}
                  disabled={syncButtonConfig.disabled}
                  className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-neutral-400 px-4 py-2 rounded-lg font-medium"
                >
                  {syncButtonConfig.text}
                </Button>
                {isGoogleConnected && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleManualRefresh}
                    disabled={isGoogleSyncing || isManualRefreshing}
                    aria-label={t("refresh") || "Refresh"}
                    title={t("refresh") || "Refresh"}
                    className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-neutral-400 rounded-lg"
                  >
                    <RefreshCcw className={`h-4 w-4 ${isGoogleSyncing || isManualRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                )}
                <Button
                  onClick={handleCreateEvent}
                  className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("new_event")}
                </Button>
              </>
            )}
          </div>
        </div>
        {isMobile && (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant={syncButtonConfig.variant}
                onClick={handleSyncGoogleCalendar}
                disabled={syncButtonConfig.disabled}
                className="flex-1 border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-neutral-400 px-4 py-2 rounded-lg font-medium"
              >
                {syncButtonConfig.text}
              </Button>
              {isGoogleConnected && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleManualRefresh}
                  disabled={isGoogleSyncing || isManualRefreshing}
                  aria-label={t("refresh") || "Refresh"}
                  title={t("refresh") || "Refresh"}
                  className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-neutral-400 rounded-lg"
                >
                  <RefreshCcw className={`h-4 w-4 ${isGoogleSyncing || isManualRefreshing ? "animate-spin" : ""}`} />
                </Button>
              )}
            </div>
            <Button
              onClick={handleCreateEvent}
              className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("new_event")}
            </Button>
          </div>
        )}

        {/* Calendar View Controls */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardContent className="p-4">
            <div
              className={`flex items-center ${
                !isMobile ? "justify-between" : "justify-center"
              }`}
            >
              <div className="flex items-center gap-4">
                {!isMobile && (
                  <Button
                    variant="ghost"
                    onClick={handleToday}
                    className="bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white border border-[#333] rounded-lg px-3 py-1.5 font-medium"
                  >
                    {t("today")}
                  </Button>
                )}
                <div className="flex items-center gap-2 ">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevPeriod}
                    className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] h-8 w-8 p-0 rounded-lg"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-lg font-medium text-white min-w-[140px] text-center">
                    {getDateRangeText()}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextPeriod}
                    className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] h-8 w-8 p-0 rounded-lg"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!isMobile && (
                <CalendarViewSelector
                  currentView={currentView}
                  onViewChange={setCurrentView}
                  isMobile={isMobile}
                />
              )}
            </div>
            {isMobile && (
              <CalendarViewSelector
                currentView={currentView}
                onViewChange={setCurrentView}
                isMobile={isMobile}
              />
            )}
          </CardContent>
        </Card>
        {isMobile && (
          <Button
            variant="ghost"
            onClick={handleToday}
            className="w-full bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white border border-[#333] rounded-lg px-3 py-1.5 font-medium"
            >
              {t("today")}
            </Button>
        )}

        {/* Calendar View */}
        {renderCalendarView()}

        {/* Event Dialog */}
        <EventDialog
          isOpen={isEventDialogOpen}
          onClose={handleCloseDialog}
          onSave={addEvent}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
          event={selectedEvent}
          selectedDate={selectedDate}
          timeSlotData={timeSlotData}
        />
      </div>
    </DashboardLayout>
  );
};

export default Calendar;

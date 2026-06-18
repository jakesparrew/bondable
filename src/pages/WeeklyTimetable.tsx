import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Clock, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useEditMode } from "@/contexts/EditModeContext";
import { useTranslation } from "react-i18next";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface WeeklyAvailabilityData {
  [key: string]: TimeSlot[];
}

// Default time slots template
const defaultTimeSlots = [
  { time: "09:00", available: false },
  { time: "09:30", available: false },
  { time: "10:00", available: true },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: true },
  { time: "12:00", available: false },
  { time: "12:30", available: true },
  { time: "13:00", available: true },
  { time: "13:30", available: true },
  { time: "14:00", available: true },
  { time: "14:30", available: false },
  { time: "15:00", available: false },
  { time: "15:30", available: true },
  { time: "16:00", available: true },
  { time: "16:30", available: true },
  { time: "17:00", available: true },
  { time: "17:30", available: true },
];

const WeeklyTimetable = () => {
  const { t, i18n } = useTranslation();
  const { userType } = useParams<{ userType: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isEditMode } = useEditMode();
  
  // Get current locale for date formatting
  const dateLocale = i18n.language === 'fr' ? fr : undefined;
  
  // Custom formatting function to capitalize and remove periods
  const formatDate = (date: Date, formatStr: string) => {
    const formatted = format(date, formatStr, { locale: dateLocale });
    // Capitalize first letter and remove periods
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace(/\./g, '');
  };
  
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Load saved availability from localStorage or use defaults
  const loadSavedAvailability = (): WeeklyAvailabilityData => {
    try {
      const saved = localStorage.getItem('weeklyAvailability');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading saved availability:', error);
    }
    
    return {
      monday: [...defaultTimeSlots],
      tuesday: [...defaultTimeSlots],
      wednesday: [...defaultTimeSlots],
      thursday: [...defaultTimeSlots],
      friday: [...defaultTimeSlots],
      saturday: defaultTimeSlots.map(slot => ({ ...slot, available: false })),
      sunday: defaultTimeSlots.map(slot => ({ ...slot, available: false })),
    };
  };

  // State for availability data
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailabilityData>(loadSavedAvailability);

  // State for mobile day navigation
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // Save to localStorage whenever availability changes
  useEffect(() => {
    try {
      localStorage.setItem('weeklyAvailability', JSON.stringify(weeklyAvailability));
      console.log("Saved availability to localStorage");
    } catch (error) {
      console.error("Error saving availability:", error);
    }
  }, [weeklyAvailability]);

  const handleTimeSlotToggle = (dayKey: string, timeSlot: string) => {
    if (!isEditMode) return;
    
    console.log(`Toggling ${timeSlot} for ${dayKey}`);
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].map(slot =>
        slot.time === timeSlot
          ? { ...slot, available: !slot.available }
          : slot
      )
    }));
  };

  const getAvailableCount = (dayKey: string) => {
    const timeSlots = weeklyAvailability[dayKey] || [];
    return timeSlots.filter(slot => slot.available).length;
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    } else if (direction === 'next' && currentDayIndex < 6) {
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  // Mobile single day view
  const renderMobileDayView = () => {
    const currentDay = weekDays[currentDayIndex];
    const dayKey = format(currentDay, 'EEEE').toLowerCase();
    const timeSlots = weeklyAvailability[dayKey] || [];
    const availableCount = getAvailableCount(dayKey);
    const isToday = format(currentDay, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDay('prev')}
              disabled={currentDayIndex === 0}
              className="text-muted-foreground hover:text-foreground hover:bg-muted h-9 w-9 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <CardTitle className={`text-lg ${isToday ? 'text-foreground' : 'text-muted-foreground'}`}>
                {formatDate(currentDay, "EEEE")}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(currentDay, "MMMM d, yyyy")}
              </p>
              <div className="flex items-center justify-center space-x-1 mt-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {availableCount} available slot{availableCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDay('next')}
              disabled={currentDayIndex === 6}
              className="text-muted-foreground hover:text-foreground hover:bg-muted h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="grid grid-cols-2 gap-2">
              {/* Time column */}
              <div className="text-center font-medium text-muted-foreground py-3">
                {t("time")}
              </div>
              <div className="text-center font-medium text-muted-foreground py-3">
                {formatDate(currentDay, "EEE, MMM d")}
              </div>

              {/* Time slots */}
              {defaultTimeSlots.map(({ time }) => {
                const slot = timeSlots.find(s => s.time === time);
                const isAvailable = slot?.available || false;
                
                return (
                  <React.Fragment key={time}>
                    {/* Time label */}
                    <div className="flex items-center justify-center py-2 text-sm text-muted-foreground border-r border-border">
                      {time}
                    </div>
                    
                    {/* Time slot button */}
                    <div className="p-1">
                      <Button
                        variant={isAvailable ? "default" : "outline"}
                        size="sm"
                        className={`w-full h-8 text-xs ${
                          isAvailable
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                            : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        onClick={() => handleTimeSlotToggle(dayKey, time)}
                      >
                        {isAvailable ? "✓" : "—"}
                      </Button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  // Desktop full grid view
  const renderDesktopGridView = () => (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-foreground text-lg">
            {t("availability_schedule")}
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          {isEditMode ? t("click_time_slots_toggle") : t("full_week_view_slots")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-8 gap-2">
          {/* Time column header */}
          <div className="text-center font-medium text-muted-foreground py-3">
            {t("time")}
          </div>
          
          {/* Day headers */}
          {weekDays.map((day) => {
            const dayKey = format(day, 'EEEE').toLowerCase();
            const availableCount = getAvailableCount(dayKey);
            const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            
            return (
              <div key={dayKey} className="text-center py-3">
                <div className={`font-medium ${isToday ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {formatDate(day, "EEE")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDate(day, "MMM d")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t("slots_count", { count: availableCount })}
                </div>
              </div>
            );
          })}

          {/* Time slots grid */}
          {defaultTimeSlots.map(({ time }) => (
            <div key={time} className="contents">
              {/* Time label */}
              <div className="flex items-center justify-center py-2 text-sm text-muted-foreground border-r border-border">
                {time}
              </div>
              
              {/* Day slots */}
              {weekDays.map((day) => {
                const dayKey = format(day, 'EEEE').toLowerCase();
                const timeSlots = weeklyAvailability[dayKey] || [];
                const slot = timeSlots.find(s => s.time === time);
                const isAvailable = slot?.available || false;
                
                return (
                  <div key={`${dayKey}-${time}`} className="p-1">
                    <Button
                      variant={isAvailable ? "default" : "outline"}
                      size="sm"
                      className={`w-full h-8 text-xs ${
                        isAvailable
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      } ${!isEditMode ? "cursor-default" : ""}`}
                      onClick={() => handleTimeSlotToggle(dayKey, time)}
                      disabled={!isEditMode}
                    >
                      {isAvailable ? "✓" : "—"}
                    </Button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout userType={userType as "therapist" | "client"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/dashboard/${userType}/profile`)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-3"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back_to_profile")}
            </Button>
          </div>
        </div>

        {/* Week Navigation - Desktop Only */}
        {!isMobile && (
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-foreground text-lg">
                    {t("week_of", { date: formatDate(weekStart, "MMMM d, yyyy") })}
                  </CardTitle>
                </div>
                <div className="text-sm text-muted-foreground">
                  {isEditMode ? t("click_time_slots_toggle") : t("view_only_mode_enable_edit")}
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Timetable - Mobile or Desktop */}
        {isMobile ? renderMobileDayView() : renderDesktopGridView()}
      </div>
    </DashboardLayout>
  );
};

export default WeeklyTimetable;

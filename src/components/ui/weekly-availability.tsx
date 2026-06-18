"use client";

import { useState, useRef, useEffect } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, ChevronDown, ExternalLink } from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface WeeklyAvailabilityData {
  [key: string]: TimeSlot[];
}

interface WeeklyAvailabilityProps {
  value: WeeklyAvailabilityData;
  onChange: (data: WeeklyAvailabilityData) => void;
  readOnly?: boolean;
}

export const WeeklyAvailability: React.FC<WeeklyAvailabilityProps> = ({
  value,
  onChange,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { userType } = useParams<{ userType: string }>();
  const { isEditMode } = useEditMode();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Start week on Monday

  // Generate the 7 days of the current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // State to manage which dropdown is open
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleTimeSlotToggle = (dayKey: string, timeSlot: string) => {
    if (readOnly || !isEditMode) return;

    const timeSlots = value[dayKey] || [];
    const updatedTimeSlots = timeSlots.map((slot) =>
      slot.time === timeSlot ? { ...slot, available: !slot.available } : slot
    );

    const updatedData = {
      ...value,
      [dayKey]: updatedTimeSlots,
    };

    onChange(updatedData);

    // Reset inactivity timer
    resetInactivityTimer(dayKey);
  };

  const resetInactivityTimer = (dayKey: string) => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set new timer for 4 seconds
    inactivityTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 4000);
  };

  const handleDropdownToggle = (dayKey: string) => {
    if (readOnly || !isEditMode) return;

    if (openDropdown === dayKey) {
      setOpenDropdown(null);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    } else {
      setOpenDropdown(dayKey);
      resetInactivityTimer(dayKey);
    }
  };

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const dropdownElement = dropdownRefs.current[openDropdown];
        if (
          dropdownElement &&
          !dropdownElement.contains(event.target as Node)
        ) {
          setOpenDropdown(null);
          if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
          }
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  // Clear timer on component unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  const getAvailableCount = (dayKey: string) => {
    const timeSlots = value[dayKey] || [];
    return timeSlots.filter((slot) => slot.available).length;
  };

  const TimeSlotDropdown = ({ dayKey, day }: { dayKey: string; day: Date }) => {
    const timeSlots = value[dayKey] || [];
    const availableCount = getAvailableCount(dayKey);
    const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
    const isOpen = openDropdown === dayKey;

    return (
      <div
        className="relative"
        ref={(el) => {
          dropdownRefs.current[dayKey] = el;
        }}
      >
        <Button
          variant="outline"
          className={`w-full justify-between h-auto p-3 ${
            readOnly || !isEditMode ? "cursor-default" : "cursor-pointer"
          } bg-card border-border hover:bg-muted ${
            isToday ? "border-blue-500/50" : ""
          }`}
          disabled={readOnly || !isEditMode}
          onClick={() => handleDropdownToggle(dayKey)}
        >
          <div className="flex flex-col items-start space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-foreground text-sm font-medium">
                {format(day, isMobile ? "EEE" : "EEEE")}
              </span>
              {isToday && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {availableCount} slot{availableCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {!readOnly && isEditMode && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </Button>

        {!readOnly && isEditMode && isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg">
            <div className="p-3 border-b border-border">
              <h4 className="text-sm font-medium text-foreground">
                {format(day, "EEEE, MMM d")}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Click time slots to toggle availability
              </p>
            </div>
            <ScrollArea className="h-64">
              <div
                className="p-2 grid grid-cols-3 gap-1"
                onMouseMove={() => resetInactivityTimer(dayKey)}
                onMouseEnter={() => resetInactivityTimer(dayKey)}
              >
                {timeSlots.map(({ time: timeSlot, available }) => (
                  <Button
                    key={timeSlot}
                    variant={available ? "default" : "outline"}
                    size="sm"
                    className={`text-xs h-8 ${
                      available
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                    onClick={() => handleTimeSlotToggle(dayKey, timeSlot)}
                    onMouseMove={() => resetInactivityTimer(dayKey)}
                  >
                    {timeSlot}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    );
  };

  // Mobile layout - 2 columns
  if (isMobile) {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center space-y-2 ">
          {!readOnly && (
            <p className="text-muted-foreground text-center text-xs">
              Tap days to manage time slots
            </p>
          )}
      
            <Button
              onClick={() =>
                navigate(`/dashboard/${userType}/weekly-timetable`)
              }
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <span>{t("view_full_timetable")}</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
     
        </div>
      </div>
    );
  }

  // Desktop layout - single row
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card w-full">
          <div>
            <h4 className="text-foreground font-medium mb-1">{t("weekly_timetable")}</h4>
            <p className="text-muted-foreground text-sm">
              {t("manage_weekly_schedule")}
            </p>
          </div>
          <Button
            onClick={() => navigate(`/dashboard/${userType}/weekly-timetable`)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <span>{t("view_full_timetable")}</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

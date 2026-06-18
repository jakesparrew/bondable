
import React from "react";
import console from "@/lib/production-console";
import { CalendarEvent } from "@/hooks/api/useEvents";
import { useOptimizedMemo } from '@/hooks/performance/useOptimizedComponents';

import { useTranslation } from "react-i18next";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
}

const WeekView = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
}: WeekViewProps) => {
  const { t, i18n } = useTranslation();
  const weekDays = useOptimizedMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  }, [currentDate]);

  const hours = useOptimizedMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const getEventsForDateTime = useOptimizedMemo(() => {
    const eventsByDateTime = new Map<string, CalendarEvent[]>();

    events.filter(event => !!event.startDate && !!event.startTime).forEach((event) => {
      if (!event.startDate || !event.startTime) return;

      // Normalize the event date string
      let eventDateString = event.startDate;
      if (eventDateString.includes('T')) {
        eventDateString = eventDateString.split('T')[0];
      }

      const eventHour = parseInt(event.startTime.split(":")[0] || "0");
      const key = `${eventDateString}-${eventHour}`;
      
      if (!eventsByDateTime.has(key)) {
        eventsByDateTime.set(key, []);
      }
      eventsByDateTime.get(key)!.push(event);
    });
    
    return (date: Date, hour: number) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      const key = `${dateString}-${hour}`;
      
      return eventsByDateTime.get(key) || [];
    };
  }, [events]);

  const handleTimeSlotClick = (date: Date, hour: number) => {
    // Format the time as HH:MM
    const timeString = `${String(hour).padStart(2, '0')}:00`;
    console.log(`WeekView: Time slot clicked - Date: ${date.toDateString()}, Time: ${timeString}`);
    onTimeSlotClick(date, timeString);
  };

  return (
    <div className="bg-[#111111] border border-[#1f1f23] rounded-lg overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b border-[#1f1f23]">
        <div className="p-3 text-center text-sm font-medium text-gray-400"></div>
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="p-3 text-center border-r border-[#1f1f23] last:border-r-0"
          >
            <div className="text-sm font-medium text-white">
              {t(day.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase())}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {day.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { month: "short", day: "numeric" })}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots */}
      <div className="grid grid-cols-8">
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            {/* Time label */}
            <div className="p-3 text-center text-sm text-gray-400 border-b border-[#1f1f23] border-r border-[#1f1f23]">
              {`${String(hour).padStart(2, "0")}:00`}
            </div>
            
            {/* Day columns */}
            {weekDays.map((day, dayIndex) => {
              const dayEvents = getEventsForDateTime(day, hour);
              
              return (
                <div
                  key={`${dayIndex}-${hour}`}
                  className="min-h-[60px] border-b border-[#1f1f23] border-r border-[#1f1f23] last:border-r-0 p-2 cursor-pointer hover:bg-[#1a1a1a]"
                  onClick={() => handleTimeSlotClick(day, hour)}
                >
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className={`${event.color} text-white text-xs px-2 py-1 rounded mb-1 cursor-pointer hover:opacity-80`}
                    >
                      <div className="font-medium">{event.startTime}</div>
                      <div className="truncate">{event.title}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WeekView;

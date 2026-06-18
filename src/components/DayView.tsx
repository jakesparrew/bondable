
import React from "react";
import console from "@/lib/production-console";
import { CalendarEvent } from "@/hooks/api/useEvents";
import { useOptimizedMemo } from '@/hooks/performance/useOptimizedComponents';

import { useTranslation } from "react-i18next";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
}

const DayView = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
}: DayViewProps) => {
  const { t, i18n } = useTranslation();
  const hours = useOptimizedMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const getEventsForHour = useOptimizedMemo(() => {
    // Format date consistently as YYYY-MM-DD in local timezone
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const eventsByHour = new Map<number, CalendarEvent[]>();
    
    events.filter(event => !!event.startDate && !!event.startTime).forEach((event) => {
      if (!event.startDate || !event.startTime) return;

      // Normalize the event date string
      let eventDateString = event.startDate;
      if (eventDateString.includes('T')) {
        eventDateString = eventDateString.split('T')[0];
      }

      if (eventDateString !== dateString) return;

      const eventHour = parseInt(event.startTime.split(":")[0] || "0");
      if (!eventsByHour.has(eventHour)) {
        eventsByHour.set(eventHour, []);
      }
      eventsByHour.get(eventHour)!.push(event);
    });
    
    return (hour: number) => eventsByHour.get(hour) || [];
  }, [currentDate, events]);

  const handleTimeSlotClick = (hour: number) => {
    // Format the time as HH:MM
    const timeString = `${String(hour).padStart(2, '0')}:00`;
    console.log(`DayView: Time slot clicked - Date: ${currentDate.toDateString()}, Time: ${timeString}`);
    onTimeSlotClick(currentDate, timeString);
  };

  return (
    <div className="bg-[#111111] border border-[#1f1f23] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#1f1f23] p-4">
        <h3 className="text-lg font-medium text-white">
          {currentDate.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </h3>
      </div>

      {/* Time slots */}
      <div className="divide-y divide-[#1f1f23]">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          
          return (
            <div
              key={hour}
              className="flex min-h-[80px] cursor-pointer hover:bg-[#1a1a1a]"
              onClick={() => handleTimeSlotClick(hour)}
            >
              {/* Time label */}
              <div className="w-20 p-4 text-sm text-gray-400 border-r border-[#1f1f23]">
                {`${String(hour).padStart(2, "0")}:00`}
              </div>
              
              {/* Events area */}
              <div className="flex-1 p-4">
                {hourEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={`${event.color} text-white px-3 py-2 rounded mb-2 cursor-pointer hover:opacity-80`}
                  >
                    <div className="font-medium text-sm">
                      {event.startTime && event.endTime 
                        ? `${event.startTime} - ${event.endTime}` 
                        : event.startTime || t('all_day')
                      }
                    </div>
                    <div className="text-sm">{event.title}</div>
                    {event.location && (
                      <div className="text-xs opacity-80 mt-1">{event.location}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayView;


import React from 'react';
import console from "@/lib/production-console";
import { CalendarEvent } from '@/hooks/api/useEvents';
import { useOptimizedMemo } from '@/hooks/performance/useOptimizedComponents';

import { useTranslation } from "react-i18next";

interface CalendarGridProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  view: 'month' | 'week' | 'day';
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

const CalendarGrid = ({ currentDate, onDateChange, view, events, onEventClick, onDateClick }: CalendarGridProps) => {
  const { t } = useTranslation();
  const today = useOptimizedMemo(() => new Date(), []);
  
  const calendarDays = useOptimizedMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days = [];

    // Current month's days (starting from day 1)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      days.push({
        day,
        date,
        isCurrentMonth: true,
        isToday
      });
    }

    // Fill remaining slots with next month's days to reach exactly 42 days
    const remainingDays = 42 - daysInMonth;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    return days;
  }, [currentDate, today]);

  const getEventsForDate = useOptimizedMemo(() => {
    const eventsByDate = new Map<string, CalendarEvent[]>();
    
    events.filter(event => !!event.startDate).forEach(event => {
      // Normalize the event date string to YYYY-MM-DD format
      let eventDateString = event.startDate;
      if (eventDateString.includes('T')) {
        eventDateString = eventDateString.split('T')[0];
      }
      
      if (!eventsByDate.has(eventDateString)) {
        eventsByDate.set(eventDateString, []);
      }
      eventsByDate.get(eventDateString)!.push(event);
    });
    
    return (date: Date) => {
      // Format date consistently as YYYY-MM-DD in local timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      return eventsByDate.get(dateString) || [];
    };
  }, [events]);

  const hasMoreEvents = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    return dayEvents.length > 2;
  };

  const getVisibleEvents = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    return dayEvents.slice(0, 2);
  };

  const getMoreEventsCount = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    return Math.max(0, dayEvents.length - 2);
  };

  const handleDateClick = (date: Date) => {
    // Create a new date object to avoid timezone issues
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    console.log('CalendarGrid: Date clicked:', date, 'Local date passed:', localDate);
    onDateClick(localDate);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/20">
        {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map((day) => (
          <div key={day} className="p-4 text-center text-sm font-semibold text-muted-foreground border-r border-border last:border-r-0 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((calendarDay, index) => {
          const dayEvents = getVisibleEvents(calendarDay.date);
          const moreEventsCount = getMoreEventsCount(calendarDay.date);

          return (
            <div
              key={index}
              className={`min-h-[140px] border-r border-b border-border last:border-r-0 p-3 cursor-pointer hover:bg-muted/30 transition-colors duration-200 ${
                !calendarDay.isCurrentMonth ? 'bg-muted/10 text-muted-foreground' : 'bg-background'
              }`}
              onClick={() => handleDateClick(calendarDay.date)}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-sm font-semibold transition-all duration-200 ${
                    calendarDay.isToday
                      ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center shadow-md'
                      : calendarDay.isCurrentMonth
                      ? 'text-foreground hover:text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {calendarDay.day}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-1.5">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={`${event.color} text-white text-xs px-2.5 py-1.5 rounded-md text-left truncate cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 font-medium`}
                  >
                    {event.startTime && <span className="font-semibold">{event.startTime} </span>}
                    <span>{event.title}</span>
                  </div>
                ))}
                
                {moreEventsCount > 0 && (
                  <div className="text-xs text-muted-foreground px-2.5 py-1 bg-muted/50 rounded-md font-medium">
                    + {moreEventsCount} {t('more')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;

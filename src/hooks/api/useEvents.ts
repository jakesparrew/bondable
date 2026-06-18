import { useOptimizedState, useOptimizedEffect, useOptimizedCallback } from '@/hooks/performance/useOptimizedComponents';

import console from "@/lib/production-console";
import { googleCalendarService } from '@/services/api';
import { GoogleCalendarCache } from '@/services/cache';
import { toast } from 'sonner';
import { useAuthManager } from '@/hooks/api/useAuthManager';
import { supabase } from '@/integrations/supabase/client';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  color: string;
  googleEventId?: string;
}

export const useEvents = () => {
  const { session } = useAuthManager();
  const [events, setEvents] = useOptimizedState<CalendarEvent[]>([
    {
      id: '1',
      title: 'Team Meeting',
      description: 'Weekly team sync',
      startDate: '2025-06-05',
      endDate: '2025-06-05',
      startTime: '10:00',
      endTime: '11:00',
      color: 'bg-blue-600',
      location: 'Conference Room A'
    },
    {
      id: '2',
      title: 'Lunch with Client',
      description: 'Business lunch discussion',
      startDate: '2025-06-06',
      endDate: '2025-06-06',
      startTime: '12:00',
      endTime: '13:30',
      color: 'bg-green-600'
    },
    {
      id: '3',
      title: 'Product Launch',
      description: 'All day event for product launch',
      startDate: '2025-06-08',
      endDate: '2025-06-08',
      color: 'bg-purple-600'
    }
  ]);

  const [isGoogleSyncing, setIsGoogleSyncing] = useOptimizedState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useOptimizedState(false);
  const [lastSyncedRange, setLastSyncedRange] = useOptimizedState<{startDate: string, endDate: string} | null>(null);

  // Check if Google is connected on mount and when session changes
  useOptimizedEffect(() => {
    const checkGoogleConnection = () => {
      const isGoogleUser = session?.user?.app_metadata?.providers?.includes('google');
      const hasAccessToken = !!session?.provider_token;
      const hasGoogleCalendarDisconnected = localStorage.getItem('googleCalendarDisconnected') === 'true';
      
      // If user manually disconnected, don't auto-connect even if they have Google auth
      if (hasGoogleCalendarDisconnected) {
        setIsGoogleConnected(false);
        return;
      }
      
      setIsGoogleConnected(isGoogleUser && hasAccessToken);
    };

    checkGoogleConnection();
  }, [session]);

  // Persist cache across refreshes (removed automatic clear)
  useOptimizedEffect(() => {
    // No-op: keep GoogleCalendarCache between reloads for better UX
  }, []);


  // Check persisted connection status in Supabase (cross-device)
  useOptimizedEffect(() => {
    const checkConnection = async () => {
      try {
        const userId = session?.user?.id;
        if (!userId) return;
        const { data } = await supabase
          .from('google_calendar_connections')
          .select('connected')
          .eq('user_id', userId)
          .maybeSingle();
        if (data?.connected) {
          setIsGoogleConnected(true);
        }
      } catch (e) {
        console.warn('Failed to check Google connection status', e);
      }
    };
    checkConnection();
  }, [session]);

  // Helper function to get exact visible dates for calendar views
  const getDateRangeForView = useOptimizedCallback((view: 'month' | 'week' | 'day', currentDate: Date) => {
    let startDate: Date;
    let endDate: Date;

    switch (view) {
      case 'month': {
        // Start from the 1st of the current month
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        startDate = new Date(year, month, 1);
        
        // Calculate how many days we need to show (42 days total for 6 weeks)
        // End date is 41 days after start date
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 41);
        
        console.log(`Month view calculation for ${currentDate.toLocaleDateString()}:`);
        console.log(`Starting from: ${startDate.toLocaleDateString()} (1st of month)`);
        console.log(`Ending on: ${endDate.toLocaleDateString()} (42 days total)`);
        break;
      }
      case 'week':
        // Get start of week (Sunday)
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - currentDate.getDay());
        
        // Get end of week (Saturday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
        
      case 'day':
        // Just the current day
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
        break;
        
      default:
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
    }

    // Format dates to YYYY-MM-DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const range = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    };
    
    console.log(`Final date range for ${view} view: ${range.startDate} to ${range.endDate}`);
    return range;
  }, []);

  const syncWithGoogleCalendar = async (view: 'month' | 'week' | 'day', currentDate: Date) => {
    setIsGoogleSyncing(true);
    try {
      console.log('Starting Google Calendar sync...');
      
      // Always calculate the visible date range when syncing
      const dateRange = getDateRangeForView(view, currentDate);
      const startDate = dateRange.startDate;
      const endDate = dateRange.endDate;
      console.log(`Syncing for ${view} view: ${startDate} to ${endDate}`);

      // Check if we already have the exact data in cache
      const cachedEvents = GoogleCalendarCache.getCachedEvents(startDate, endDate);
      if (cachedEvents) {
        console.log(`Using cached events for range ${startDate} to ${endDate}`);
        
        // Update events with cached data
        setEvents(prevEvents => {
          const localEvents = prevEvents.filter(e => !e.googleEventId);
          const allEvents = [...localEvents, ...cachedEvents];
          console.log(`Merged cached events: ${allEvents.length} total (${localEvents.length} local + ${cachedEvents.length} cached Google)`);
          return [...allEvents];
        });
        
        setIsGoogleConnected(true);
        setLastSyncedRange({ startDate, endDate });
        localStorage.removeItem('googleCalendarDisconnected');
        toast.success(`Loaded ${cachedEvents.length} events from cache`);
        return true;
      }

      // Check for overlapping cache that might contain our requested range
      const overlappingEvents = GoogleCalendarCache.findOverlappingCache(startDate, endDate);
      if (overlappingEvents) {
        console.log(`Using overlapping cached events for range ${startDate} to ${endDate}`);
        
        setEvents(prevEvents => {
          const localEvents = prevEvents.filter(e => !e.googleEventId);
          const allEvents = [...localEvents, ...overlappingEvents];
          console.log(`Merged overlapping cached events: ${allEvents.length} total (${localEvents.length} local + ${overlappingEvents.length} filtered Google)`);
          return [...allEvents];
        });
        
        setIsGoogleConnected(true);
        setLastSyncedRange({ startDate, endDate });
        localStorage.removeItem('googleCalendarDisconnected');
        toast.success(`Loaded ${overlappingEvents.length} events from cache`);
        return true;
      }

      // If no cache hit, fetch from Google Calendar API
      console.log('No suitable cache found, fetching from Google Calendar API...');
      const result = await googleCalendarService.syncFromGoogle(startDate, endDate);
      
      if (result.success && result.events) {
        console.log(`Received ${result.events.length} events from Google Calendar API:`, result.events);
        
        // ALWAYS cache the new data when we fetch from API
        console.log(`Caching ${result.events.length} events for range ${startDate} to ${endDate}`);
        GoogleCalendarCache.setCachedEvents(startDate, endDate, result.events);
        
        // Replace all Google events and merge with local events
        setEvents(prevEvents => {
          // Keep only non-Google events (events without googleEventId)
          const localEvents = prevEvents.filter(e => !e.googleEventId);
          
          // Add all Google events
          const allEvents = [...localEvents, ...result.events];
          
          console.log(`Final merged events: ${allEvents.length} total (${localEvents.length} local + ${result.events.length} Google)`);
          console.log('All events after merge:', allEvents);
          
          // Force a re-render by creating a completely new array
          return [...allEvents];
        });
        
        setIsGoogleConnected(true);
        setLastSyncedRange({ startDate, endDate });
        // Clear the disconnect flag since we're now connected
        localStorage.removeItem('googleCalendarDisconnected');
        
        // Persist connection + last synced range in Supabase for cross-device auto-sync
        try {
          const userId = session?.user?.id;
          if (userId) {
            await supabase
              .from('google_calendar_connections')
              .upsert({
                user_id: userId,
                connected: true,
                last_synced_start: startDate,
                last_synced_end: endDate,
              });
          }
        } catch (e) {
          console.warn('Failed to persist google calendar sync metadata', e);
        }
        toast.success(result.message);
        console.log('Google Calendar sync completed successfully');
        return true;
      } else {
        if (result.needsCalendarScope) {
          console.log('Calendar scope required');
          return false; // Indicate that connection dialog should be shown
        }
        toast.error(result.message);
        console.error('Google Calendar sync failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      toast.error('Failed to sync with Google Calendar');
      return false;
    } finally {
      setIsGoogleSyncing(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      console.log('Disconnecting Google Calendar...');
      const userId = session?.user?.id;
      
      // Clear cache when disconnecting
      GoogleCalendarCache.clearAllCache();
      
      // Remove all Google events from the local state
      setEvents(prevEvents => {
        const nonGoogleEvents = prevEvents.filter(e => !e.googleEventId);
        console.log(`Removed Google events. Keeping ${nonGoogleEvents.length} local events`);
        return nonGoogleEvents;
      });
      
      // Set disconnect flag to prevent auto-reconnection
      localStorage.setItem('googleCalendarDisconnected', 'true');
      
      // Update connection status
      setIsGoogleConnected(false);
      setLastSyncedRange(null);

      // Persist disconnection in Supabase
      if (userId) {
        const { error } = await supabase
          .from('google_calendar_connections')
          .upsert({ user_id: userId, connected: false, refresh_token: null });
        if (error) console.warn('Failed to persist disconnect state', error);
      }
      
      toast.success('Disconnected from Google Calendar');
      console.log('Google Calendar disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      toast.error('Failed to disconnect from Google Calendar');
    }
  };

  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    const newEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    setEvents(prev => [...prev, newEvent]);
    
    // Sync to Google Calendar
    try {
      const result = await googleCalendarService.createEvent(event);
      if (result.success && result.googleEventId) {
        // Update the event with Google Calendar ID
        setEvents(prev => prev.map(e => 
          e.id === newEvent.id 
            ? { ...e, googleEventId: result.googleEventId }
            : e
        ));
        
        // Invalidate cache since we have new data
        GoogleCalendarCache.clearAllCache();
        
        toast.success('Event created and synced to Google Calendar');
      } else {
        toast.warning('Event created locally but failed to sync to Google Calendar');
      }
    } catch (error) {
      console.error('Failed to sync new event to Google Calendar:', error);
      toast.warning('Event created locally but failed to sync to Google Calendar');
    }
  };

  const updateEvent = async (id: string, updatedEvent: Partial<CalendarEvent>) => {
    const existingEvent = events.find(e => e.id === id);
    if (!existingEvent) return;

    const mergedEvent = { ...existingEvent, ...updatedEvent };
    
    setEvents(prev => prev.map(event => 
      event.id === id ? mergedEvent : event
    ));

    // Sync to Google Calendar if it has a Google event ID
    if (existingEvent.googleEventId) {
      try {
        const result = await googleCalendarService.updateEvent({
          ...mergedEvent,
          googleEventId: existingEvent.googleEventId
        });
        
        if (result.success) {
          // Invalidate cache since we have updated data
          GoogleCalendarCache.clearAllCache();
          toast.success('Event updated and synced to Google Calendar');
        } else {
          toast.warning('Event updated locally but failed to sync to Google Calendar');
        }
      } catch (error) {
        console.error('Failed to sync event update to Google Calendar:', error);
        toast.warning('Event updated locally but failed to sync to Google Calendar');
      }
    }
  };

  const deleteEvent = async (id: string) => {
    const eventToDelete = events.find(e => e.id === id);
    
    setEvents(prev => prev.filter(event => event.id !== id));

    // Sync deletion to Google Calendar if it has a Google event ID
    if (eventToDelete?.googleEventId) {
      try {
        const result = await googleCalendarService.deleteEvent(eventToDelete.googleEventId);
        
        if (result.success) {
          // Invalidate cache since we have deleted data
          GoogleCalendarCache.clearAllCache();
          toast.success('Event deleted and synced to Google Calendar');
        } else {
          toast.warning('Event deleted locally but failed to sync to Google Calendar');
        }
      } catch (error) {
        console.error('Failed to sync event deletion to Google Calendar:', error);
        toast.warning('Event deleted locally but failed to sync to Google Calendar');
      }
    }
  };

  const getEventsForDate = (date: Date) => {
    // Format date consistently as YYYY-MM-DD in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const eventsForDate = events.filter(event => {
      // Ensure we have a valid startDate and it matches
      if (!event.startDate) return false;
      
      // Handle both YYYY-MM-DD format and other potential formats
      const eventDateString = event.startDate.includes('T') 
        ? event.startDate.split('T')[0] 
        : event.startDate;
      
      return eventDateString === dateString;
    });
    
    console.log(`Getting events for ${dateString}:`, eventsForDate);
    console.log(`Total events available:`, events.length);
    return eventsForDate;
  };

  return {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    syncWithGoogleCalendar,
    disconnectGoogleCalendar,
    isGoogleSyncing,
    isGoogleConnected
  };
};

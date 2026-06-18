import { supabase } from "@/integrations/supabase/client";
import { CalendarEvent } from "@/hooks/api/useEvents";

export interface GoogleCalendarSyncResult {
  success: boolean;
  events?: CalendarEvent[];
  message: string;
  error?: string;
  googleEventId?: string;
  requiresOAuth?: boolean;
  needsCalendarScope?: boolean;
}

export const googleCalendarService = {
  async syncFromGoogle(startDate?: string, endDate?: string): Promise<GoogleCalendarSyncResult> {
    try {
      console.log('Initiating Google Calendar sync...', { startDate, endDate });
      
      // Get the current session to ensure we have authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No active session for Google Calendar sync:', sessionError);
        return {
          success: false,
          message: 'Please sign in to sync with Google Calendar',
          error: 'No active session'
        };
      }

      // Check if user is authenticated with Google
      const isGoogleUser = session.user.app_metadata?.providers?.includes('google');
      
      if (!isGoogleUser) {
        return {
          success: false,
          message: 'Please sign in with Google to sync with Google Calendar',
          error: 'Not authenticated with Google',
          requiresOAuth: true
        };
      }

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { 
          action: 'sync',
          accessToken: session.provider_token,
          refreshToken: session.provider_refresh_token,
          startDate,
          endDate, 
          userTimezone 
        }
      });

      if (error) {
        console.error('Error syncing from Google Calendar:', error);
        return {
          success: false,
          message: 'Failed to sync from Google Calendar. Please try again.',
          error: error.message
        };
      }

      if (!data || !data.success) {
        console.error('Google Calendar sync returned unsuccessful result:', data);
        
        // Check if OAuth is required
        if (data?.requiresOAuth || data?.needsCalendarScope) {
          return {
            success: false,
            message: 'To sync with Google Calendar, you need to reconnect your Google account with calendar permissions.',
            error: 'Calendar scope required',
            needsCalendarScope: true
          };
        }
        
        return {
          success: false,
          message: data?.message || 'Failed to sync from Google Calendar',
          error: data?.error || 'Unknown error'
        };
      }

      console.log('Google Calendar sync successful:', data.message);
      return data;
    } catch (error) {
      console.error('Error in syncFromGoogle:', error);
      return {
        success: false,
        message: 'Failed to sync from Google Calendar',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<GoogleCalendarSyncResult> {
    try {
      // Check session before making the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No active session for Google Calendar create:', sessionError);
        return {
          success: false,
          message: 'Please sign in to sync with Google Calendar',
          error: 'No active session'
        };
      }

      const isGoogleUser = session.user.app_metadata?.providers?.includes('google');
      
      if (!isGoogleUser) {
        return {
          success: false,
          message: 'Please sign in with Google to sync with Google Calendar',
          error: 'Not authenticated with Google'
        };
      }

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { 
          action: 'create',
          event,
          accessToken: session.provider_token,
          refreshToken: session.provider_refresh_token,
          userTimezone
        }
      });

      if (error) {
        console.error('Error creating Google Calendar event:', error);
        return {
          success: false,
          message: 'Failed to create event in Google Calendar',
          error: error.message
        };
      }

      return data;
    } catch (error) {
      console.error('Error in createEvent:', error);
      return {
        success: false,
        message: 'Failed to create event in Google Calendar',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async updateEvent(event: CalendarEvent & { googleEventId?: string }): Promise<GoogleCalendarSyncResult> {
    try {
      // Check session before making the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No active session for Google Calendar update:', sessionError);
        return {
          success: false,
          message: 'Please sign in to sync with Google Calendar',
          error: 'No active session'
        };
      }

      const isGoogleUser = session.user.app_metadata?.providers?.includes('google');
      
      if (!isGoogleUser) {
        return {
          success: false,
          message: 'Please sign in with Google to sync with Google Calendar',
          error: 'Not authenticated with Google'
        };
      }

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { 
          action: 'update',
          event,
          accessToken: session.provider_token,
          refreshToken: session.provider_refresh_token,
          userTimezone
        }
      });

      if (error) {
        console.error('Error updating Google Calendar event:', error);
        return {
          success: false,
          message: 'Failed to update event in Google Calendar',
          error: error.message
        };
      }

      return data;
    } catch (error) {
      console.error('Error in updateEvent:', error);
      return {
        success: false,
        message: 'Failed to update event in Google Calendar',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async deleteEvent(googleEventId: string): Promise<GoogleCalendarSyncResult> {
    try {
      // Check session before making the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No active session for Google Calendar delete:', sessionError);
        return {
          success: false,
          message: 'Please sign in to sync with Google Calendar',
          error: 'No active session'
        };
      }

      const isGoogleUser = session.user.app_metadata?.providers?.includes('google');
      
      if (!isGoogleUser) {
        return {
          success: false,
          message: 'Please sign in with Google to sync with Google Calendar',
          error: 'Not authenticated with Google'
        };
      }

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { 
          action: 'delete',
          event: { googleEventId },
          accessToken: session.provider_token,
          refreshToken: session.provider_refresh_token,
          userTimezone
        }
      });

      if (error) {
        console.error('Error deleting Google Calendar event:', error);
        return {
          success: false,
          message: 'Failed to delete event from Google Calendar',
          error: error.message
        };
      }

      return data;
    } catch (error) {
      console.error('Error in deleteEvent:', error);
      return {
        success: false,
        message: 'Failed to delete event from Google Calendar',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

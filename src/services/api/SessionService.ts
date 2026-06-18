import { supabase } from '@/integrations/supabase/client';
import { sessionNotificationService } from './sessionNotificationService';

import console from "@/lib/production-console";
import { withRetry } from '@/services/utils';
import type { NewSession, SessionStatus } from '@/types/NewSession';

// Status mapping between DB values and UI-friendly values
const dbToUiStatus = (status: string): Session['status'] => {
  switch (status) {
    case 'client_requested':
    case 'therapist_requested_update':
    case 'client_requested_update':
      return 'Pending';
    case 'therapist_confirmed':
    case 'client_confirmed_update':
      return 'Confirmed';
    case 'denied':
      return 'Denied';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'no_show':
      return 'No Show';
    default:
      return (status as any) as Session['status'];
  }
};

const uiToDbStatus = (status: string): SessionStatus | string => {
  switch (status) {
    case 'Pending':
      return 'client_requested';
    case 'Confirmed':
      return 'therapist_confirmed';
    case 'Denied':
      return 'denied';
    case 'Completed':
      return 'completed';
    case 'Cancelled':
      return 'cancelled';
    case 'No Show':
      return 'no_show';
    default:
      return status;
  }
};

export interface Session {
  id: string;
  client_id: string;
  therapist_id: string;
  session_date: string;
  session_time: string;
  session_type: string;
  session_format?: string;
  therapy_type?: string;
  duration_minutes: number;
  location?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show' | 'Denied';
  notes?: string;
  current_requester_id?: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    full_name: string;
    email: string;
  };
  therapist?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface SessionCreate {
  client_id: string;
  therapist_id: string;
  session_date: string;
  session_time: string; // Required in database schema
  session_type: string;
  session_format?: string;
  therapy_type?: string;
  duration_minutes?: number;
  location?: string;
  notes?: string;
}

export interface SessionUpdate {
  session_date?: string;
  session_time?: string;
  session_type?: string;
  session_format?: string;
  therapy_type?: string;
  duration_minutes?: number;
  location?: string;
  status?: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show' | 'Denied';
  notes?: string;
  current_requester_id?: string;
}

export interface SessionFilters {
  therapistId?: string;
  clientId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sessionType?: string;
}

/**
 * Service class for session and scheduling operations
 * Centralizes all session-related database operations
 */
export class SessionService {
  /**
   * Create a new session
   */
  static async createSession(sessionData: SessionCreate): Promise<Session> {
    // Get the current user first to avoid auth issues during insert
    const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;
    
    if (sessionError || !userId) {
      console.error('Authentication error:', sessionError);
      throw new Error('User must be authenticated to create a session');
    }

      const { data, error } = await supabase
      .from('sessions')
      .insert({
        ...sessionData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }

    const createdSession = {
      ...data,
      status: dbToUiStatus(data.status),
    };

    // Send notification email to client
    try {
      await sessionNotificationService.sendSessionCreationNotification(createdSession);
    } catch (notificationError) {
      console.error('Failed to send session notification:', notificationError);
      // Don't fail the session creation if notification fails
    }

    return createdSession;
  }

  /**
   * Get session by ID
   */
  static async getSession(sessionId: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching session:', error);
      throw new Error(`Failed to fetch session: ${error.message}`);
    }

    return {
      ...data,
      status: dbToUiStatus(data.status),
    };
  }

  /**
   * Get sessions with filters (with populated relationships)
   */
  static async getSessions(filters: SessionFilters = {}): Promise<Session[]> {
    console.log('🔍 Fetching sessions with filters:', filters);
    
    // Try a simpler approach first - get sessions without joins
    let query = supabase
      .from('sessions')
      .select(`
        *,
        client:profiles!client_id(id, first_name, last_name, email),
        therapist:profiles!therapist_id(id, first_name, last_name, email)
      `);

    // Apply filters
    if (filters.therapistId) {
      query = query.eq('therapist_id', filters.therapistId);
    }

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    if (filters.status) {
      query = query.eq('status', uiToDbStatus(filters.status));
    }

    if (filters.startDate) {
      query = query.gte('session_date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('session_date', filters.endDate);
    }

    if (filters.sessionType) {
      query = query.eq('session_type', filters.sessionType);
    }

    // Order by date and time
    query = query.order('session_date', { ascending: true })
      .order('session_time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    return data ? data.map((session: any) => ({
      ...session,
      session_time: session.session_time || '',
      duration_minutes: session.duration_minutes || 60,
      status: dbToUiStatus(session.status),
      client: session.client ? {
        id: session.client.id,
        full_name: `${session.client.first_name || ''} ${session.client.last_name || ''}`.trim(),
        email: session.client.email || '',
      } : undefined,
      therapist: session.therapist ? {
        id: session.therapist.id,
        full_name: `${session.therapist.first_name || ''} ${session.therapist.last_name || ''}`.trim(),
        email: session.therapist.email || '',
      } : undefined,
    })) : [];
  }

  /**
   * Get therapist sessions
   */
  static async getTherapistSessions(therapistId: string): Promise<Session[]> {
    return this.getSessions({ therapistId });
  }

  /**
   * Get client sessions
   */
  static async getClientSessions(clientId: string): Promise<Session[]> {
    return this.getSessions({ clientId });
  }

  /**
   * Get sessions by therapist (legacy compatibility)
   */
  static async getSessionsByTherapist(therapistId: string): Promise<Session[]> {
    return this.getTherapistSessions(therapistId);
  }

  /**
   * Get sessions by client (legacy compatibility)
   */
  static async getSessionsByClient(clientId: string): Promise<Session[]> {
    return this.getClientSessions(clientId);
  }

  /**
   * Get upcoming sessions
   */
  static async getUpcomingSessions(userId: string, userRole: 'client' | 'therapist'): Promise<Session[]> {
    const today = new Date().toISOString().split('T')[0];
    const filters: SessionFilters = {
      startDate: today,
      status: 'Confirmed',
    };

    if (userRole === 'therapist') {
      filters.therapistId = userId;
    } else {
      filters.clientId = userId;
    }

    return this.getSessions(filters);
  }

  /**
   * Get past sessions
   */
  static async getPastSessions(userId: string, userRole: 'client' | 'therapist'): Promise<Session[]> {
    const today = new Date().toISOString().split('T')[0];
    const filters: SessionFilters = {
      endDate: today,
    };

    if (userRole === 'therapist') {
      filters.therapistId = userId;
    } else {
      filters.clientId = userId;
    }

    return this.getSessions(filters);
  }

  /**
   * Update session
   */
  static async updateSession(sessionId: string, updates: SessionUpdate): Promise<Session> {
    const payload: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.status) {
      payload.status = uiToDbStatus(updates.status);
    }

    const { data, error } = await supabase
      .from('sessions')
      .update(payload)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return {
      ...data,
      status: dbToUiStatus(data.status),
    };
  }

  /**
   * Cancel session
   */
  static async cancelSession(sessionId: string, reason?: string): Promise<Session> {
    const updates: SessionUpdate = {
      status: 'Cancelled',
    };

    if (reason) {
      updates.notes = reason;
    }

    return this.updateSession(sessionId, updates);
  }

  /**
   * Confirm session
   */
  static async confirmSession(sessionId: string): Promise<Session> {
    return this.updateSession(sessionId, { status: 'Confirmed' });
  }

  /**
   * Mark session as completed
   */
  static async completeSession(sessionId: string, notes?: string): Promise<Session> {
    const updates: SessionUpdate = {
      status: 'Completed',
    };

    if (notes) {
      updates.notes = notes;
    }

    return this.updateSession(sessionId, updates);
  }

  /**
   * Mark session as no show
   */
  static async markNoShow(sessionId: string): Promise<Session> {
    return this.updateSession(sessionId, { status: 'No Show' });
  }

  /**
   * Deny session
   */
  static async denySession(sessionId: string, reason?: string): Promise<Session> {
    const updates: SessionUpdate = {
      status: 'Denied',
    };

    if (reason) {
      updates.notes = reason;
    }

    return this.updateSession(sessionId, updates);
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(userId: string, userRole: 'client' | 'therapist') {
    const filters: SessionFilters = {};
    
    if (userRole === 'therapist') {
      filters.therapistId = userId;
    } else {
      filters.clientId = userId;
    }

    const allSessions = await this.getSessions(filters);
    
    const stats = {
      total: allSessions.length,
      pending: allSessions.filter(s => s.status === 'Pending').length,
      confirmed: allSessions.filter(s => s.status === 'Confirmed').length,
      completed: allSessions.filter(s => s.status === 'Completed').length,
      cancelled: allSessions.filter(s => s.status === 'Cancelled').length,
      noShow: allSessions.filter(s => s.status === 'No Show').length,
      denied: allSessions.filter(s => s.status === 'Denied').length,
    };

    return stats;
  }

  /**
   * Get sessions for date range
   */
  static async getSessionsForDateRange(
    userId: string,
    userRole: 'client' | 'therapist',
    startDate: string,
    endDate: string
  ): Promise<Session[]> {
    const filters: SessionFilters = {
      startDate,
      endDate,
    };

    if (userRole === 'therapist') {
      filters.therapistId = userId;
    } else {
      filters.clientId = userId;
    }

    return this.getSessions(filters);
  }

  /**
   * Check for scheduling conflicts
   */
  static async checkSchedulingConflict(
    therapistId: string,
    sessionDate: string,
    sessionTime?: string,
    excludeSessionId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('sessions')
      .select('id')
      .eq('therapist_id', therapistId)
      .eq('session_date', sessionDate)
      .neq('status', uiToDbStatus('Cancelled') as any);

    if (sessionTime) {
      query = query.eq('session_time', sessionTime);
    }

    if (excludeSessionId) {
      query = query.neq('id', excludeSessionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking scheduling conflict:', error);
      throw new Error(`Failed to check scheduling conflict: ${error.message}`);
    }

    return (data?.length || 0) > 0;
  }

  // Merged from Extended: get sessions for a user with related profiles
  static async getSessionsForUser(userId: string): Promise<NewSession[]> {
    return withRetry(async () => {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .or(`client_id.eq.${userId},therapist_id.eq.${userId}`)
        .order('session_date', { ascending: true });

      if (sessionsError) throw sessionsError;
      if (!sessionsData || sessionsData.length === 0) return [] as NewSession[];

      const clientIds = [...new Set(sessionsData.map(s => s.client_id))];
      const therapistIds = [...new Set(sessionsData.map(s => s.therapist_id))];
      const allUserIds = [...new Set([...clientIds, ...therapistIds])];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, email')
        .in('id', allUserIds);

      const profilesMap = new Map();
      profilesData?.forEach((profile: any) => {
        profilesMap.set(profile.id, {
          id: profile.id,
          email: profile.email || '',
          full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          avatar_url: profile.avatar_url
        });
      });

      const sessions: NewSession[] = sessionsData.map((session: any) => ({
        ...session,
        status: session.status as SessionStatus,
        client: profilesMap.get(session.client_id),
        therapist: profilesMap.get(session.therapist_id)
      }));

      return sessions;
    }, { operation: 'getSessionsForUser', service: 'SessionService', timestamp: Date.now() });
  }

  // Merged from Extended: confirm session with enhanced status transitions
  static async confirmSessionEnhanced(sessionId: string): Promise<NewSession> {
    return withRetry(async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: currentSession, error: getErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (getErr || !currentSession) throw getErr || new Error('Session not found');

      let newStatus: SessionStatus;
      if (currentSession.status === 'client_requested') newStatus = 'therapist_confirmed';
      else if (currentSession.status === 'therapist_requested_update') newStatus = 'client_confirmed_update';
      else if (currentSession.status === 'client_requested_update') newStatus = 'therapist_confirmed';
      else newStatus = currentSession.status as SessionStatus;

      const { data, error } = await supabase
        .from('sessions')
        .update({ status: newStatus, waiting_for_response_from: null })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      return data as NewSession;
    }, { operation: 'confirmSessionEnhanced', service: 'SessionService', timestamp: Date.now() });
  }

  // Merged from Extended: request update flow
  static async requestUpdate(sessionId: string): Promise<NewSession> {
    return withRetry(async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: currentSession, error: getErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (getErr || !currentSession) throw getErr || new Error('Session not found');

      const isTherapist = currentSession.therapist_id === user.user.id;
      const newStatus: SessionStatus = isTherapist ? 'therapist_requested_update' : 'client_requested_update';
      const waitingForResponseFrom = isTherapist ? currentSession.client_id : currentSession.therapist_id;

      const { data, error } = await supabase
        .from('sessions')
        .update({ status: newStatus, waiting_for_response_from: waitingForResponseFrom })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      return data as NewSession;
    }, { operation: 'requestUpdate', service: 'SessionService', timestamp: Date.now() });
  }
}

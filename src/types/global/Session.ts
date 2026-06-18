/**
 * Session-related type definitions
 * Centralized session types for scheduling and session management
 */

export type SessionStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show' | 'Denied';
export type SessionType = 'Individual' | 'Group' | 'Family' | 'Couples';
export type SessionFormat = 'Video' | 'In-Person' | 'Phone';
export type TherapyType = 'CBT' | 'DBT' | 'EMDR' | 'Psychodynamic' | 'Humanistic' | 'Other';

export interface BaseSession {
  id: string;
  client_id: string;
  therapist_id: string;
  session_date: string;
  session_time: string;
  duration_minutes: number;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface Session extends BaseSession {
  session_type: SessionType;
  session_format?: SessionFormat;
  therapy_type?: TherapyType;
  location?: string;
  notes?: string;
  current_requester_id?: string;
  
  // Populated relationship data
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

export interface CreateSessionRequest {
  client_id: string;
  therapist_id: string;
  session_date: string;
  session_time: string;
  session_type: SessionType;
  session_format?: SessionFormat;
  therapy_type?: TherapyType;
  duration_minutes?: number;
  location?: string;
  notes?: string;
}

export interface UpdateSessionRequest {
  session_date?: string;
  session_time?: string;
  session_type?: SessionType;
  session_format?: SessionFormat;
  therapy_type?: TherapyType;
  duration_minutes?: number;
  location?: string;
  status?: SessionStatus;
  notes?: string;
}

export interface SessionFilters {
  therapist_id?: string;
  client_id?: string;
  status?: SessionStatus;
  session_type?: SessionType;
  start_date?: string;
  end_date?: string;
  format?: SessionFormat;
}

export interface SessionSearchResult {
  sessions: Session[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Calendar and scheduling types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  session?: Session;
  type: 'session' | 'appointment' | 'reminder';
  color?: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  session_id?: string;
}

export interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

export interface WeeklyAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

// Session statistics and analytics
export interface SessionStats {
  total_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
  no_show_sessions: number;
  completion_rate: number;
  average_duration: number;
  this_month: {
    total: number;
    completed: number;
    scheduled: number;
  };
}

export interface SessionTrend {
  period: string;
  completed: number;
  cancelled: number;
  no_show: number;
  total: number;
}

// Session notes and documentation
export interface SessionNote {
  id: string;
  session_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  private: boolean;
}

export interface SessionAttachment {
  id: string;
  session_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

// Recurring session types
export interface RecurringSessionRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  days_of_week?: number[]; // 0 = Sunday, 1 = Monday, etc.
  end_date?: string;
  max_occurrences?: number;
}

export interface RecurringSession extends CreateSessionRequest {
  recurrence_rule: RecurringSessionRule;
  exceptions?: string[]; // Dates to skip
}

// Session reminders and notifications
export interface SessionReminder {
  id: string;
  session_id: string;
  recipient_id: string;
  reminder_type: 'email' | 'sms' | 'push';
  send_at: string;
  sent: boolean;
  content?: string;
}
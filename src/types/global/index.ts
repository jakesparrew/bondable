// Global Types - Shared across the entire application
export * from './User';
export * from './Session';
export * from './Message';
export * from './SharedInterfaces';
export * from './TypeGuards';

// Task and Journal types (extending existing ones)
export type TaskStatus = 'assigned' | 'in_progress' | 'completed' | 'denied' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  client_id: string;
  therapist_id: string;
  due_date?: string;
  assigned_date: string;
  notes?: string;
  denied_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientTask extends Task {
  therapist_name?: string;
}

// Journal types
export type JournalSharingType = 'private' | 'specific' | 'all';
export type MoodType = 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad' | 'angry' | 'anxious' | 'excited';

export interface JournalEntry {
  id: string;
  client_id: string;
  title: string;
  content: string;
  mood?: MoodType;
  entry_date: string;
  sharing_type: JournalSharingType;
  shared_with_therapists?: string[];
  attachments?: JournalAttachment[];
  created_at: string;
  updated_at: string;
}

export interface JournalAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

// Common utility types
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: any;
}

export interface SearchParams extends PaginationParams {
  search?: string;
  filters?: FilterParams;
  sort?: SortParams;
}
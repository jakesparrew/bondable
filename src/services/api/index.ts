// API Services - Database and external API interactions
export * from './adminNotificationService';
export * from './clientService';
export * from './clientInvitationService';
export * from './clientTherapistService';
export * from './dashboardService';
export * from './googleCalendarService';
export * from './inviteCodeService';
export * from './notificationService';
export * from './sessionNotificationService';
export * from './sharedJournalService';
export * from './therapistService';
export * from './therapistClientService';

// New Service Classes
export { SessionService } from './SessionService';
export { TaskService } from './TaskService';

// Types from new services

export type { Session, SessionCreate, SessionUpdate, SessionFilters } from './SessionService';
export type { TaskCreate, TaskUpdate, TaskFilters, TaskWithProfiles } from './TaskService';
export type { Task } from '@/types/global';

// Add missing types for backward compatibility
export type TaskInsert = {
  title: string;
  description?: string;
  status?: 'assigned' | 'in_progress' | 'completed' | 'denied';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  notes?: string;
  client_id: string;
  therapist_id: string;
};

// Message attachments (avoiding type conflicts)
export { messageAttachmentService } from './messageAttachmentService';
export type { MessageAttachment } from './messageAttachmentService';
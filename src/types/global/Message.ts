/**
 * Message-related type definitions
 * Centralized messaging types for conversations and communication
 */

export type MessageType = 'app' | 'sms' | 'ai';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type AttachmentType = 'image' | 'video' | 'audio' | 'document' | 'voice';

export interface BaseMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: MessageType;
  status: MessageStatus;
  sequence_number: number;
  created_at: string;
  updated_at: string;
  read_at?: string;
}

export interface Message extends BaseMessage {
  attachments?: MessageAttachment[];
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  recipient?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: AttachmentType;
  mime_type: string;
  file_size: number;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMessageRequest {
  conversation_id: string;
  recipient_id: string;
  content: string;
  message_type?: MessageType;
  attachments?: CreateAttachmentRequest[];
}

export interface CreateAttachmentRequest {
  file_name: string;
  file_url: string;
  file_type: AttachmentType;
  mime_type: string;
  file_size: number;
  duration_seconds?: number;
}

export interface UpdateMessageRequest {
  content?: string;
  status?: MessageStatus;
}

// Conversation types
export interface Conversation {
  id: string;
  therapist_id: string;
  client_id: string;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count_therapist: number;
  unread_count_client: number;
  created_at: string;
  updated_at: string;
  
  // Populated data
  therapist?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  client?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  last_message?: Message;
}

export interface CreateConversationRequest {
  therapist_id: string;
  client_id: string;
}

// Message filtering and search
export interface MessageFilters {
  conversation_id?: string;
  sender_id?: string;
  recipient_id?: string;
  message_type?: MessageType;
  status?: MessageStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
  has_attachments?: boolean;
}

export interface MessageSearchResult {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ConversationFilters {
  user_id?: string;
  has_unread?: boolean;
  last_message_after?: string;
  search?: string;
}

export interface ConversationSearchResult {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Real-time messaging types
export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  timestamp: string;
}

export interface MessageDeliveryReceipt {
  message_id: string;
  recipient_id: string;
  status: MessageStatus;
  timestamp: string;
}

export interface OnlineStatus {
  user_id: string;
  is_online: boolean;
  last_seen?: string;
}

// Message statistics and analytics
export interface MessageStats {
  total_messages: number;
  messages_sent: number;
  messages_received: number;
  unread_count: number;
  active_conversations: number;
  this_week: {
    sent: number;
    received: number;
    conversations: number;
  };
  response_time: {
    average_minutes: number;
    median_minutes: number;
  };
}

export interface ConversationStats {
  total_conversations: number;
  active_conversations: number;
  messages_today: number;
  unread_messages: number;
  average_response_time: number;
}

// AI messaging types
export interface AIMessageRequest {
  conversation_id: string;
  user_message: string;
  context?: {
    user_role: 'client' | 'therapist';
    session_history?: string[];
    client_profile?: any;
  };
}

export interface AIMessageResponse {
  response: string;
  confidence: number;
  suggestions?: string[];
  requires_human_review: boolean;
}

// Message templates and automation
export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: 'greeting' | 'reminder' | 'follow_up' | 'general';
  created_by: string;
  created_at: string;
  variables?: string[]; // Placeholder variables like {{client_name}}
}

export interface AutoMessage {
  id: string;
  template_id: string;
  trigger_type: 'session_reminder' | 'task_due' | 'appointment_confirmation';
  recipient_id: string;
  scheduled_at: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
}

// Voice message types
export interface VoiceMessage extends MessageAttachment {
  file_type: 'audio';
  transcript?: string;
  transcription_confidence?: number;
  language?: string;
}

export interface VoiceMessageRequest {
  audio_blob: Blob;
  duration_seconds: number;
  format: 'm4a' | 'mp4' | 'mp3' | 'wav' | 'webm';
}
/**
 * User-related type definitions
 * Centralized user types for consistency across the application
 */

export type UserRole = 'client' | 'therapist' | 'admin';

export interface BaseUser {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends BaseUser {
  first_name?: string;
  last_name?: string;
  phone?: string;
  age?: string;
  date_of_birth?: string;
  address?: string;
  role: UserRole;
  avatar_url?: string;
  invite_code?: string;
  weekly_availability?: Record<string, any>;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  created_at?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  language: string;
  timezone: string;
}

export interface UserStats {
  totalSessions: number;
  completedTasks: number;
  unreadMessages: number;
  lastActivity: string;
}

// Client-specific types
export interface ClientProfile extends UserProfile {
  role: 'client';
  therapist_connections?: TherapistConnection[];
}

export interface TherapistConnection {
  id: string;
  therapist_id: string;
  therapist_name: string;
  connected_at: string;
  status: 'active' | 'inactive' | 'pending';
}

// Therapist-specific types
export interface TherapistProfile extends UserProfile {
  role: 'therapist';
  specializations?: string[];
  license_number?: string;
  years_experience?: number;
  bio?: string;
  client_connections?: ClientConnection[];
}

export interface ClientConnection {
  id: string;
  client_id: string;
  client_name: string;
  connected_at: string;
  status: 'active' | 'inactive' | 'pending';
  last_session?: string;
}

// Admin-specific types
export interface AdminProfile extends UserProfile {
  role: 'admin';
  admin_level: 'super' | 'standard';
  granted_by?: string;
  granted_at?: string;
}

// User creation and update types
export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  age?: string;
  date_of_birth?: string;
  address?: string;
  avatar_url?: string;
  weekly_availability?: Record<string, any>;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData extends LoginCredentials {
  first_name: string;
  last_name: string;
  role: UserRole;
  invite_code?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  current_password: string;
  new_password: string;
}

// User search and filtering
export interface UserFilters {
  role?: UserRole;
  search?: string;
  status?: 'active' | 'inactive';
  created_after?: string;
  created_before?: string;
}

export interface UserSearchResult {
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// User relationship types
export interface UserRelationship {
  id: string;
  user_id: string;
  related_user_id: string;
  relationship_type: 'client_therapist' | 'admin_user';
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}
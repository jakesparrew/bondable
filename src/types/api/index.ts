// API-related types

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Service response types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Re-export relevant types for API use
export type { Client } from '../client';
export type { Session } from '../session';
export type { ClientProfileData } from '../clientProfile';
export type { ClientTask, TaskStatus, TaskPriority } from '../global';
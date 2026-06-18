/**
 * API Response type definitions
 * Standardized response formats for all API calls
 */

// Base response structure
export interface BaseResponse {
  success: boolean;
  timestamp: string;
  request_id?: string;
}

export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
  };
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Response metadata
export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  has_more?: boolean;
  cache_info?: {
    cached: boolean;
    cache_key?: string;
    expires_at?: string;
  };
  performance?: {
    query_time_ms: number;
    total_time_ms: number;
  };
}

// Paginated response
export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  data: T[];
  meta: ResponseMeta & {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
    pages: number;
  };
}

// Authentication responses
export interface AuthResponse extends SuccessResponse {
  data: {
    user: {
      id: string;
      email: string;
      role: string;
      profile?: any;
    };
    session: {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };
  };
}

export interface RefreshTokenResponse extends SuccessResponse {
  data: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// User-related responses
export interface UserProfileResponse extends SuccessResponse {
  data: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
    [key: string]: any;
  };
}

export interface UserListResponse extends PaginatedResponse<UserProfileResponse['data']> {}

// Session-related responses
export interface SessionResponse extends SuccessResponse {
  data: {
    id: string;
    client_id: string;
    therapist_id: string;
    session_date: string;
    session_time: string;
    status: string;
    client?: any;
    therapist?: any;
    [key: string]: any;
  };
}

export interface SessionListResponse extends PaginatedResponse<SessionResponse['data']> {}

export interface SessionStatsResponse extends SuccessResponse {
  data: {
    total_sessions: number;
    completed_sessions: number;
    upcoming_sessions: number;
    completion_rate: number;
    trends: Array<{
      period: string;
      count: number;
    }>;
  };
}

// Message-related responses
export interface MessageResponse extends SuccessResponse {
  data: {
    id: string;
    conversation_id: string;
    sender_id: string;
    recipient_id: string;
    content: string;
    status: string;
    created_at: string;
    attachments?: any[];
    [key: string]: any;
  };
}

export interface MessageListResponse extends PaginatedResponse<MessageResponse['data']> {}

export interface ConversationResponse extends SuccessResponse {
  data: {
    id: string;
    therapist_id: string;
    client_id: string;
    unread_count: number;
    last_message?: any;
    participants?: any[];
    [key: string]: any;
  };
}

export interface ConversationListResponse extends PaginatedResponse<ConversationResponse['data']> {}

// Task-related responses
export interface TaskResponse extends SuccessResponse {
  data: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority?: string;
    client_id: string;
    therapist_id: string;
    due_date?: string;
    created_at: string;
    [key: string]: any;
  };
}

export interface TaskListResponse extends PaginatedResponse<TaskResponse['data']> {}

// File upload responses
export interface FileUploadResponse extends SuccessResponse {
  data: {
    file_id: string;
    file_name: string;
    file_url: string;
    file_size: number;
    mime_type: string;
    upload_url?: string; // For presigned URL uploads
    expires_at?: string;
  };
}

export interface FileListResponse extends PaginatedResponse<FileUploadResponse['data']> {}

// Analytics and dashboard responses
export interface DashboardStatsResponse extends SuccessResponse {
  data: {
    total_clients?: number;
    total_sessions: number;
    total_tasks: number;
    unread_messages: number;
    upcoming_sessions: number;
    completion_rates: {
      sessions: number;
      tasks: number;
    };
    recent_activity: any[];
  };
}

export interface AnalyticsResponse extends SuccessResponse {
  data: {
    period: string;
    metrics: Record<string, number>;
    trends: Array<{
      date: string;
      values: Record<string, number>;
    }>;
    comparisons?: {
      previous_period: Record<string, number>;
      change_percentages: Record<string, number>;
    };
  };
}

// Health check and system responses
export interface HealthCheckResponse extends SuccessResponse {
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'up' | 'down' | 'degraded'>;
    uptime: number;
    version: string;
    environment: string;
  };
}

export interface SystemStatsResponse extends SuccessResponse {
  data: {
    cache: {
      hit_rate: number;
      size: number;
      max_size: number;
    };
    database: {
      connections: number;
      query_time_avg: number;
    };
    api: {
      requests_per_minute: number;
      error_rate: number;
      response_time_avg: number;
    };
  };
}

// Validation and error types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationErrorResponse extends ErrorResponse {
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: ValidationError[];
  };
}

// Rate limiting response
export interface RateLimitResponse extends ErrorResponse {
  error: {
    code: 'RATE_LIMIT_EXCEEDED';
    message: string;
    details: {
      limit: number;
      remaining: number;
      reset_at: string;
    };
  };
}

// Generic list response helper
export type ListResponse<T> = PaginatedResponse<T>;
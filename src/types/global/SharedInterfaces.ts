/**
 * Shared Interface Definitions
 * Common interfaces used across multiple domains and services
 */

// Base entity interface that all database entities should extend
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Timestamped entity for entities that track creation and modification
export interface TimestampedEntity extends BaseEntity {
  created_by?: string;
  updated_by?: string;
}

// Soft-deletable entity for entities that support soft deletion
export interface SoftDeletableEntity extends TimestampedEntity {
  deleted_at?: string;
  deleted_by?: string;
}

// Auditable entity for entities that need full audit trails
export interface AuditableEntity extends SoftDeletableEntity {
  version: number;
  audit_log?: AuditEntry[];
}

export interface AuditEntry {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  user_id: string;
  timestamp: string;
  changes?: Record<string, { from: any; to: any }>;
  metadata?: Record<string, any>;
}

// Status-based entity for entities with workflow states
export interface StatusEntity extends BaseEntity {
  status: string;
  status_changed_at?: string;
  status_changed_by?: string;
  status_history?: StatusChange[];
}

export interface StatusChange {
  from_status: string;
  to_status: string;
  changed_by: string;
  changed_at: string;
  reason?: string;
}

// User-owned entity for entities that belong to specific users
export interface UserOwnedEntity extends BaseEntity {
  user_id: string;
  owner_type: 'client' | 'therapist' | 'admin';
}

// Shared-access entity for entities that can be shared between users
export interface SharedAccessEntity extends UserOwnedEntity {
  shared_with?: SharedAccess[];
  sharing_settings?: SharingSettings;
}

export interface SharedAccess {
  user_id: string;
  permission_level: 'view' | 'edit' | 'admin';
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  revoked_at?: string;
}

export interface SharingSettings {
  default_permission: 'private' | 'view' | 'edit';
  require_approval: boolean;
  allow_resharing: boolean;
  auto_expire_days?: number;
}

// Categorizable entity for entities that can be organized into categories
export interface CategorizableEntity extends BaseEntity {
  category?: string;
  subcategory?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Prioritizable entity for entities that have priority levels
export interface PrioritizableEntity extends BaseEntity {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  priority_score?: number;
  due_date?: string;
  escalation_rules?: EscalationRule[];
}

export interface EscalationRule {
  condition: 'overdue' | 'high_priority' | 'no_response';
  threshold_hours: number;
  action: 'notify' | 'reassign' | 'escalate';
  target_user_id?: string;
  notification_method?: 'email' | 'sms' | 'push';
}

// Attachable entity for entities that can have file attachments
export interface AttachableEntity extends BaseEntity {
  attachments?: FileAttachment[];
  attachment_settings?: AttachmentSettings;
}

export interface FileAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
  is_public: boolean;
}

export interface AttachmentSettings {
  max_file_size: number;
  allowed_types: string[];
  max_files: number;
  require_approval: boolean;
}

// Commentable entity for entities that support comments/notes
export interface CommentableEntity extends BaseEntity {
  comments?: Comment[];
  comment_settings?: CommentSettings;
}

export interface Comment extends TimestampedEntity {
  content: string;
  author_id: string;
  author_name?: string;
  parent_comment_id?: string;
  is_private: boolean;
  mentions?: string[];
  reactions?: CommentReaction[];
}

export interface CommentReaction {
  user_id: string;
  reaction_type: 'like' | 'love' | 'laugh' | 'sad' | 'angry';
  created_at: string;
}

export interface CommentSettings {
  allow_public_comments: boolean;
  require_approval: boolean;
  allow_reactions: boolean;
  allow_mentions: boolean;
}

// Rateable entity for entities that can be rated/reviewed
export interface RateableEntity extends BaseEntity {
  ratings?: Rating[];
  average_rating?: number;
  rating_count?: number;
}

export interface Rating extends BaseEntity {
  entity_id: string;
  entity_type: string;
  rated_by: string;
  rating: number;
  review?: string;
  aspects?: Record<string, number>; // e.g., { "quality": 5, "timeliness": 4 }
}

// Trackable entity for entities that need activity tracking
export interface TrackableEntity extends BaseEntity {
  activity_log?: ActivityEntry[];
  metrics?: Record<string, number>;
  last_activity_at?: string;
}

export interface ActivityEntry {
  action: string;
  user_id: string;
  timestamp: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// Notifiable entity for entities that can trigger notifications
export interface NotifiableEntity extends BaseEntity {
  notification_rules?: NotificationRule[];
  last_notified_at?: string;
}

export interface NotificationRule {
  event_type: string;
  recipient_type: 'owner' | 'participants' | 'custom';
  recipient_ids?: string[];
  delivery_method: 'email' | 'sms' | 'push' | 'in_app';
  template_id?: string;
  conditions?: Record<string, any>;
  is_active: boolean;
}

// Searchable entity for entities that support full-text search
export interface SearchableEntity extends BaseEntity {
  search_vector?: string;
  search_keywords?: string[];
  search_boost?: number;
}

// Localizable entity for entities that support multiple languages
export interface LocalizableEntity extends BaseEntity {
  language: string;
  translations?: Record<string, any>;
  is_translatable: boolean;
}

// Cacheable entity for entities that can be cached
export interface CacheableEntity extends BaseEntity {
  cache_key?: string;
  cache_ttl?: number;
  last_cached_at?: string;
  cache_tags?: string[];
}

// Versioned entity for entities that maintain version history
export interface VersionedEntity extends BaseEntity {
  version: number;
  previous_versions?: VersionHistory[];
  is_draft: boolean;
  published_at?: string;
}

export interface VersionHistory {
  version: number;
  created_by: string;
  created_at: string;
  changes_summary: string;
  data_snapshot: Record<string, any>;
}

// Common utility interfaces
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  formatted?: string;
  coordinates?: Coordinates;
}

export interface PhoneNumber {
  country_code: string;
  national_number: string;
  formatted: string;
  is_verified: boolean;
}

export interface EmailAddress {
  email: string;
  is_verified: boolean;
  is_primary: boolean;
  verification_sent_at?: string;
}

export interface WebLink {
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
  is_active: boolean;
}

// Permission and security interfaces
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  name: string;
  description?: string;
  permissions: Permission[];
  is_system_role: boolean;
}

export interface SecurityContext {
  user_id: string;
  roles: string[];
  permissions: Permission[];
  session_id: string;
  expires_at: string;
}

// Integration and external service interfaces
export interface ExternalServiceConfig {
  service_name: string;
  endpoint_url: string;
  api_key?: string;
  api_version?: string;
  timeout_ms: number;
  retry_config: {
    max_retries: number;
    backoff_factor: number;
  };
  rate_limit?: {
    requests_per_minute: number;
    burst_limit: number;
  };
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  is_active: boolean;
  retry_policy: {
    max_retries: number;
    backoff_type: 'linear' | 'exponential';
    initial_delay_ms: number;
  };
}

// Metrics and analytics interfaces
export interface MetricDefinition {
  name: string;
  description: string;
  unit: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  tags?: Record<string, string>;
}

export interface MetricValue {
  metric_name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface AnalyticsEvent {
  event_name: string;
  user_id?: string;
  session_id?: string;
  properties: Record<string, any>;
  timestamp: string;
  context?: {
    page?: string;
    referrer?: string;
    user_agent?: string;
    ip_address?: string;
  };
}
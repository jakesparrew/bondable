/**
 * Bondable — Drizzle ORM schema (Neon / PostgreSQL)
 *
 * ADDITIVE re-homing of the production Supabase schema onto Neon + Drizzle.
 * This file does NOT replace or touch the existing Supabase code under
 * src/integrations/supabase/*. It declares the same physical Postgres shape
 * so the new serverless (Vercel) + Drizzle + @neondatabase/serverless stack
 * can be built alongside the legacy stack.
 *
 * SOURCE OF TRUTH:
 *  - Column types / nullability / defaults mirror the chronological Supabase
 *    migration history (the logic that actually ran in production) reconciled
 *    with the 20260424 bootstrap reconstruction (the intended final shape).
 *  - Where the two diverge, the reconciled choice is noted inline. CHECK
 *    constraints, RLS policies, SECURITY DEFINER functions and triggers are
 *    NOT expressed here — Drizzle pushes table/column/FK/index DDL only.
 *    Those are re-homed at the API layer / Postgres-function layer / Neon-RLS
 *    layer (see docs/superpowers/specs/2026-06-15-neon-migration-notes.md).
 *
 * NOTE ON profiles.id: in Supabase this FKs auth.users(id). In Neon there is
 * no auth.users table — profiles.id maps to the external Stack Auth / Neon Auth
 * user id. It is therefore a plain (PK) uuid here with no DB-level FK target.
 */

import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  index,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

export const userRole = pgEnum('user_role', ['therapist', 'client', 'admin']);

// Provider generalization (docs/plan/02). `is_regulated` is DERIVED from
// (provider_type, verification_status) via recomputeRegulated() — never set by
// hand. See src/lib/providerTypes.ts for the canonical taxonomy/metadata.
export const providerType = pgEnum('provider_type', [
  'clinical_psychologist',
  'clinical_orthopedagogue',
  'psychotherapist',
  'coach',
  'counselor',
  'other',
]);
export const verificationStatus = pgEnum('verification_status', [
  'unverified',
  'pending',
  'verified',
  'rejected',
]);
export const practiceRole = pgEnum('practice_role', ['owner', 'manager', 'staff']);
export const credentialKind = pgEnum('credential_kind', [
  'visum',
  'erkenningsnummer',
  'base_profession',
  'psychotherapy_training',
  'diploma',
  'certificate',
]);

/* -------------------------------------------------------------------------- */
/* Shared column helpers                                                       */
/* -------------------------------------------------------------------------- */

const tz = { withTimezone: true } as const;

/* -------------------------------------------------------------------------- */
/* profiles                                                                    */
/* -------------------------------------------------------------------------- */

export const profiles = pgTable('profiles', {
  // Maps to the external (Stack Auth / Neon Auth) user id. No DB FK in Neon.
  id: uuid('id').primaryKey(),
  address: text('address'),
  age: text('age'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', tz).defaultNow(),
  dateOfBirth: date('date_of_birth'),
  email: text('email'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  emergencyContactRelationship: text('emergency_contact_relationship'),
  firstName: text('first_name'),
  inviteCode: text('invite_code'),
  lastName: text('last_name'),
  phone: text('phone'),
  role: userRole('role').notNull().default('client'),
  isRegulated: boolean('is_regulated').notNull().default(false),
  updatedAt: timestamp('updated_at', tz).defaultNow(),
  weeklyAvailability: jsonb('weekly_availability'),
}, (t) => ({
  // Partial (non-unique) index on invite_code WHERE invite_code IS NOT NULL
  // (idx_profiles_invite_code). The authoritative migration source defines a
  // plain CREATE INDEX (not UNIQUE); invite-code uniqueness is enforced at the
  // source by the set_therapist_invite_code trigger loop, not by this index.
  inviteCodeIdx: index('idx_profiles_invite_code')
    .on(t.inviteCode)
    .where(sql`${t.inviteCode} IS NOT NULL`),
}));

/* -------------------------------------------------------------------------- */
/* client_therapist_relationships                                              */
/* -------------------------------------------------------------------------- */

export const clientTherapistRelationships = pgTable('client_therapist_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  therapistId: uuid('therapist_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('active'),
  connectedAt: timestamp('connected_at', tz).notNull().defaultNow(),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
}, (t) => ({
  clientTherapistUniq: uniqueIndex('client_therapist_relationships_client_id_therapist_id_key')
    .on(t.clientId, t.therapistId),
}));

/* -------------------------------------------------------------------------- */
/* clients (legacy temp-client table; therapist_id has no FK in source)        */
/* -------------------------------------------------------------------------- */

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', tz).defaultNow(),
  email: text('email').notNull(),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  emergencyContactRelationship: text('emergency_contact_relationship'),
  firstName: text('first_name').notNull(),
  joinDate: date('join_date'),
  lastName: text('last_name').notNull(),
  lastSession: date('last_session'),
  nextSession: date('next_session'),
  notes: text('notes'),
  phone: text('phone'),
  // Legacy CHECK IN ('Active','Inactive','Pending') DEFAULT 'Pending' — enforce
  // at the API layer; not declared here.
  status: text('status'),
  therapistId: uuid('therapist_id').notNull(),
  updatedAt: timestamp('updated_at', tz).defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* conversations                                                               */
/* -------------------------------------------------------------------------- */

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  therapistId: uuid('therapist_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  lastMessageAt: timestamp('last_message_at', tz),
  lastMessagePreview: text('last_message_preview'),
  unreadCountClient: integer('unread_count_client').default(0),
  unreadCountTherapist: integer('unread_count_therapist').default(0),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
}, (t) => ({
  clientTherapistUniq: uniqueIndex('conversations_client_id_therapist_id_key')
    .on(t.clientId, t.therapistId),
}));

/* -------------------------------------------------------------------------- */
/* messages                                                                    */
/* -------------------------------------------------------------------------- */

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  // Reconstruction DEFAULT 'text' (history used CHECK IN ('app','sms','ai')
  // DEFAULT 'app'). No CHECK enforced here.
  messageType: text('message_type').notNull().default('text'),
  // BIGSERIAL auto-increment. In production this was driven by
  // message_sequence_seq via the update_conversation_on_message trigger; a
  // plain bigserial here gives equivalent monotonic numbering for the Neon stack.
  sequenceNumber: bigserial('sequence_number', { mode: 'number' }).notNull(),
  status: text('status').notNull().default('sent'),
  readAt: timestamp('read_at', tz),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* message_attachments                                                         */
/* -------------------------------------------------------------------------- */

export const messageAttachments = pgTable('message_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  fileType: text('file_type').notNull(),
  fileUrl: text('file_url').notNull(),
  mimeType: text('mime_type').notNull(),
  durationSeconds: numeric('duration_seconds'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* external_messages (SMS / WhatsApp bridge)                                   */
/* -------------------------------------------------------------------------- */

export const externalMessages = pgTable('external_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  // CHECK IN ('sms','whatsapp') — enforce at API layer.
  channel: text('channel').notNull(),
  content: text('content').notNull(),
  // CHECK IN ('outbound','inbound') DEFAULT 'outbound'.
  direction: text('direction').notNull(),
  fromNumber: text('from_number'),
  toNumber: text('to_number'),
  providerSid: text('provider_sid'),
  // Reconstruction DEFAULT 'queued' (history DEFAULT 'sent').
  status: text('status').notNull().default('queued'),
  error: jsonb('error'),
  sentAt: timestamp('sent_at', tz),
  deliveredAt: timestamp('delivered_at', tz),
  readAt: timestamp('read_at', tz),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* google_calendar_connections (one-to-one with profiles via PK = user_id)     */
/* -------------------------------------------------------------------------- */

export const googleCalendarConnections = pgTable('google_calendar_connections', {
  userId: uuid('user_id').primaryKey().references(() => profiles.id, { onDelete: 'cascade' }),
  connected: boolean('connected').notNull().default(false),
  refreshToken: text('refresh_token'),
  scope: text('scope'),
  lastSyncedAt: timestamp('last_synced_at', tz),
  lastSyncedStart: timestamp('last_synced_start', tz),
  lastSyncedEnd: timestamp('last_synced_end', tz),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* journal_entries                                                             */
/* -------------------------------------------------------------------------- */

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  mood: text('mood'),
  entryDate: date('entry_date'),
  isSharedWithTherapist: boolean('is_shared_with_therapist').default(false),
  sharedWithTherapists: jsonb('shared_with_therapists').default(sql`'[]'::jsonb`),
  // 'all' | 'specific' — drives storage SELECT policy in source. No CHECK here.
  sharingType: text('sharing_type'),
  attachments: jsonb('attachments'),
  createdAt: timestamp('created_at', tz).defaultNow(),
  updatedAt: timestamp('updated_at', tz).defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* local_documents                                                             */
/* -------------------------------------------------------------------------- */

export const localDocuments = pgTable('local_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  fileType: text('file_type').notNull(),
  fileUrl: text('file_url').notNull(),
  mimeType: text('mime_type').notNull(),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* notifications                                                                */
/* -------------------------------------------------------------------------- */

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('info'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  relatedId: uuid('related_id'),
  relatedType: text('related_type'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
}, (t) => ({
  // Partial index: notifications(user_id) WHERE is_read = false. Non-unique
  // lookup index that backs the unread-notifications query path.
  unreadByUser: index('idx_notifications_user_unread')
    .on(t.userId)
    .where(sql`${t.isRead} = false`),
}));

/* -------------------------------------------------------------------------- */
/* sessions (6-state approval state machine; CHECK enforced at API layer)       */
/* -------------------------------------------------------------------------- */

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  therapistId: uuid('therapist_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  sessionDate: date('session_date').notNull(),
  sessionTime: time('session_time').notNull(),
  sessionType: text('session_type').notNull(),
  sessionFormat: text('session_format'),
  therapyType: text('therapy_type'),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  location: text('location'),
  notes: text('notes'),
  // Therapist-authored post-session summary, visible to both client and
  // therapist (the "recap" / shared session note). Nullable until written.
  recap: text('recap'),
  // History: CHECK IN ('client_requested','therapist_confirmed',
  // 'therapist_requested_update','client_confirmed_update','denied','completed').
  // Reconstruction collapsed to DEFAULT 'scheduled'. The app's request/approve
  // UX depends on the state machine — enforce the CHECK + states at the API
  // layer. DEFAULT kept as 'scheduled' to match the reconstructed final shape.
  status: text('status').notNull().default('scheduled'),
  waitingForResponseFrom: uuid('waiting_for_response_from'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* tasks                                                                        */
/* -------------------------------------------------------------------------- */

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  therapistId: uuid('therapist_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  notes: text('notes'),
  // History CHECK IN ('low','medium','high') DEFAULT 'medium' — API-enforced.
  priority: text('priority'),
  // History CHECK IN ('assigned','in-progress','completed','overdue','denied')
  // DEFAULT 'assigned'. Reconstruction DEFAULT 'pending', no CHECK. Dashboard
  // RPCs filter inconsistently — reconcile the vocabulary at the API layer.
  status: text('status').notNull().default('pending'),
  assignedDate: timestamp('assigned_date', tz).notNull().defaultNow(),
  dueDate: timestamp('due_date', tz),
  deniedReason: text('denied_reason'),
  createdAt: timestamp('created_at', tz).defaultNow(),
  updatedAt: timestamp('updated_at', tz).defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* session_feedback (post-session alliance micro-check)                        */
/* -------------------------------------------------------------------------- */

export const sessionFeedback = pgTable('session_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  // 1–5 working-alliance rating. CHECK (alliance_rating BETWEEN 1 AND 5) is
  // enforced at the API layer, mirroring the file's "no CHECK here" convention.
  allianceRating: integer('alliance_rating'),
  note: text('note'),
  createdAt: timestamp('created_at', tz).defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* client_checkins (between-session "I'm not okay this week" flag)             */
/* -------------------------------------------------------------------------- */

export const clientCheckins = pgTable('client_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  therapistId: uuid('therapist_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  // e.g. 'distress' | 'checkin'. CHECK enforced at the API layer.
  kind: text('kind').notNull(),
  note: text('note'),
  // Set when the therapist acknowledges the flag; null = still needs attention.
  acknowledgedAt: timestamp('acknowledged_at', tz),
  createdAt: timestamp('created_at', tz).defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* messaging_sessions (deny-all / service-role only in source)                 */
/* -------------------------------------------------------------------------- */

export const messagingSessions = pgTable('messaging_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  // CHECK IN ('client','therapist') — API-enforced.
  actorRole: text('actor_role').notNull(),
  // CHECK IN ('sms','whatsapp') — API-enforced.
  channel: text('channel').notNull(),
  phoneDigits: text('phone_digits').notNull(),
  // History DEFAULT 'selecting'; reconstruction DEFAULT 'idle'.
  state: text('state').notNull().default('idle'),
  selectedId: text('selected_id'),
  options: jsonb('options'),
  expireAt: timestamp('expire_at', tz),
  lastMessageAt: timestamp('last_message_at', tz).notNull().defaultNow(),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
}, (t) => ({
  channelPhoneUniq: uniqueIndex('messaging_sessions_channel_phone_digits_key')
    .on(t.channel, t.phoneDigits),
}));

/* -------------------------------------------------------------------------- */
/* user_devices (push tokens)                                                   */
/* -------------------------------------------------------------------------- */

export const userDevices = pgTable('user_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  token: text('token').notNull(),
  platform: text('platform').notNull(),
  pushProvider: text('push_provider').notNull().default('fcm'),
  deviceInfo: jsonb('device_info'),
  isActive: boolean('is_active').notNull().default(true),
  lastSeenAt: timestamp('last_seen_at', tz),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
}, (t) => ({
  tokenUniq: uniqueIndex('user_devices_token_key').on(t.token),
}));

/* -------------------------------------------------------------------------- */
/* Intake — questionnaire_templates                                            */
/* -------------------------------------------------------------------------- */

export const questionnaireTemplates = pgTable('questionnaire_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  therapistId: uuid('therapist_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Intake — questionnaire_questions                                            */
/* -------------------------------------------------------------------------- */

export const questionnaireQuestions = pgTable('questionnaire_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => questionnaireTemplates.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  helpText: text('help_text'),
  // CHECK IN ('number','radio','checkbox','text','date') — API-enforced.
  questionType: text('question_type').notNull(),
  options: jsonb('options'),
  isRequired: boolean('is_required').notNull().default(false),
  position: integer('position').notNull().default(0),
  config: jsonb('config'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Intake — client_questionnaires (point-in-time snapshot of a template)        */
/* -------------------------------------------------------------------------- */

export const clientQuestionnaires = pgTable('client_questionnaires', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  therapistId: uuid('therapist_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => questionnaireTemplates.id, { onDelete: 'set null' }),
  titleSnapshot: text('title_snapshot').notNull(),
  descriptionSnapshot: text('description_snapshot'),
  questionsSnapshot: jsonb('questions_snapshot').notNull(),
  // CHECK IN ('not_started','in_progress','completed') DEFAULT 'not_started'.
  status: text('status').notNull().default('not_started'),
  assignedAt: timestamp('assigned_at', tz).notNull().defaultNow(),
  startedAt: timestamp('started_at', tz),
  completedAt: timestamp('completed_at', tz),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Intake — questionnaire_responses                                            */
/* -------------------------------------------------------------------------- */

export const questionnaireResponses = pgTable('questionnaire_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientQuestionnaireId: uuid('client_questionnaire_id').notNull().references(() => clientQuestionnaires.id, { onDelete: 'cascade' }),
  // question_id is text: it references a question id inside questions_snapshot,
  // not a FK to questionnaire_questions.id.
  questionId: text('question_id').notNull(),
  answer: jsonb('answer').notNull(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
}, (t) => ({
  assignmentQuestionUniq: uniqueIndex('questionnaire_responses_client_questionnaire_id_question_id_key')
    .on(t.clientQuestionnaireId, t.questionId),
}));

/* -------------------------------------------------------------------------- */
/* Admin / settings / audit                                                    */
/* -------------------------------------------------------------------------- */

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  grantedAt: timestamp('granted_at', tz).notNull().defaultNow(),
  grantedBy: uuid('granted_by'),
  userEmail: text('user_email').notNull(),
}, (t) => ({
  userEmailUniq: uniqueIndex('admin_users_user_email_key').on(t.userEmail),
}));

export const adminNotificationSettings = pgTable('admin_notification_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  emailAddresses: jsonb('email_addresses').notNull().default(sql`'[]'::jsonb`),
  isEnabled: boolean('is_enabled').notNull().default(true),
  notificationType: text('notification_type').notNull(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

export const aiSettings = pgTable('ai_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  settingName: text('setting_name').notNull(),
  settingValue: jsonb('setting_value').notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
}, (t) => ({
  settingNameUniq: uniqueIndex('ai_settings_setting_name_key').on(t.settingName),
}));

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  createdAt: timestamp('created_at', tz).defaultNow(),
  newValues: jsonb('new_values'),
  oldValues: jsonb('old_values'),
  recordId: uuid('record_id'),
  tableName: text('table_name'),
  userId: uuid('user_id'),
});

/* -------------------------------------------------------------------------- */
/* provider_profiles (Finder marketplace — public-facing provider directory)   */
/* ----------------------------------------------------------------------------*/
/* One row per provider (therapist/psychologist/coach) that opts into the      */
/* public Finder. provider_id is BOTH the PK and the FK to profiles.id, so a   */
/* profile has at most one provider profile. Whether a provider is a regulated */
/* clinician vs a coach is read from profiles.is_regulated (NOT duplicated     */
/* here) to keep the dichotomieverbod / EU P2B "rank on FIT, never on payment" */
/* invariant in one place. NB: hourly_rate is stored for transparency on the   */
/* public profile, but it is NEVER an input to ranking/matching.               */
export const providerProfiles = pgTable('provider_profiles', {
  // provider_id is the PK and FKs profiles.id (cascade): 1:1 with a profile.
  providerId: uuid('provider_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  // Typed profession + credential-review state. is_regulated (on profiles) is
  // derived from these; the finder never ranks on either (dichotomieverbod).
  providerType: providerType('provider_type').notNull().default('coach'),
  verificationStatus: verificationStatus('verification_status')
    .notNull()
    .default('unverified'),
  // Optional membership of a group practice (organizational layer only).
  practiceId: uuid('practice_id').references(() => practices.id, {
    onDelete: 'set null',
  }),
  headline: text('headline'),
  bio: text('bio'),
  // string[] — e.g. ['anxiety','burnout','trauma']
  specializations: jsonb('specializations'),
  // string[] — BCP-ish language codes e.g. ['nl','fr','en']
  languages: jsonb('languages'),
  // string[] — e.g. ['in_person','online']
  modalities: jsonb('modalities'),
  approach: text('approach'),
  // Displayed for transparency only — never a ranking/match input.
  hourlyRate: integer('hourly_rate'),
  city: text('city'),
  country: text('country').default('BE'),
  acceptingNewClients: boolean('accepting_new_clients').notNull().default(true),
  credentials: text('credentials'),
  yearsExperience: integer('years_experience'),
  photoUrl: text('photo_url'),
  rating: numeric('rating'),
  reviewCount: integer('review_count'),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* provider_requests (Finder leads — client → provider contact requests)       */
/* ----------------------------------------------------------------------------*/
/* A lead created from the public Finder. client_id is nullable: a brand-new   */
/* visitor (not yet a Bondable user) leaves name/email and client_id stays     */
/* null until/if they register. status drives the provider's lead inbox.       */
export const providerRequests = pgTable('provider_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  // null = brand-new lead (visitor has no Bondable account yet).
  clientId: uuid('client_id').references(() => profiles.id, { onDelete: 'set null' }),
  clientName: text('client_name'),
  clientEmail: text('client_email'),
  topic: text('topic'),
  message: text('message'),
  preferredModality: text('preferred_modality'),
  // Leads routed to a practice can be claimed/assigned to a member.
  practiceId: uuid('practice_id').references(() => practices.id, {
    onDelete: 'set null',
  }),
  assignedTo: uuid('assigned_to').references(() => profiles.id, {
    onDelete: 'set null',
  }),
  // CHECK IN ('pending','accepted','declined') — API-enforced.
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  respondedAt: timestamp('responded_at', tz),
});

/* -------------------------------------------------------------------------- */
/* Group practices (organizational layer) + credentials                        */
/* ----------------------------------------------------------------------------*/
/* Practices are organizational ONLY — care relationships stay person-to-person */
/* so Bond supervision, note ownership and GDPR responsibility attach to a      */
/* named human. Managers/owners see operations (load, leads, counts), never     */
/* clinical content. Practice features are Practice-tier gated (workflow only,  */
/* never finder visibility — P2B-safe).                                         */
export const practices = pgTable('practices', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  city: text('city'),
  country: text('country').default('BE'),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  seatLimit: integer('seat_limit').notNull().default(3),
  isPublished: boolean('is_published').notNull().default(false),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

export const practiceMembers = pgTable(
  'practice_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    practiceId: uuid('practice_id')
      .notNull()
      .references(() => practices.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: practiceRole('role').notNull().default('staff'),
    status: text('status').notNull().default('active'), // active | suspended
    joinedAt: timestamp('joined_at', tz).notNull().defaultNow(),
  },
  (t) => ({
    uniqMember: uniqueIndex('practice_members_practice_profile_uidx').on(
      t.practiceId,
      t.profileId,
    ),
  }),
);

export const practiceInvites = pgTable('practice_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  practiceId: uuid('practice_id')
    .notNull()
    .references(() => practices.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: practiceRole('role').notNull().default('staff'),
  token: text('token').notNull(),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', tz),
  acceptedAt: timestamp('accepted_at', tz),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
});

export const providerCredentials = pgTable('provider_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  kind: credentialKind('kind').notNull(),
  reference: text('reference'), // visum nr / erkenningsnummer / cert id
  issuer: text('issuer'), // FOD Volksgezondheid, VVKP, ICF, ...
  fileUrl: text('file_url'),
  status: verificationStatus('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => profiles.id, {
    onDelete: 'set null',
  }),
  reviewedAt: timestamp('reviewed_at', tz),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Onboarding + announcements (Phase 2 / R13)                                  */
/* ----------------------------------------------------------------------------*/
export const onboardingProgress = pgTable('onboarding_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // provider | client
  steps: jsonb('steps'), // Record<string, boolean>
  activatedAt: timestamp('activated_at', tz),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
});

// Canonical announcements schema (master-plan R13): authored in the owner
// cockpit, rendered in the in-app changelog panel.
export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  bodyMd: text('body_md'),
  audience: jsonb('audience'), // { roles: string[], tiers: string[] }
  style: text('style'), // info | feature | maintenance
  startsAt: timestamp('starts_at', tz),
  endsAt: timestamp('ends_at', tz),
  publishedAt: timestamp('published_at', tz),
  createdBy: uuid('created_by').references(() => profiles.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
});

export const announcementReads = pgTable('announcement_reads', {
  id: uuid('id').primaryKey().defaultRandom(),
  announcementId: uuid('announcement_id')
    .notNull()
    .references(() => announcements.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  readAt: timestamp('read_at', tz).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Relations                                                                    */
/* -------------------------------------------------------------------------- */

export const profilesRelations = relations(profiles, ({ many, one }) => ({
  // Relationships where this profile is the client / the therapist.
  relationshipsAsClient: many(clientTherapistRelationships, { relationName: 'ctr_client' }),
  relationshipsAsTherapist: many(clientTherapistRelationships, { relationName: 'ctr_therapist' }),
  conversationsAsClient: many(conversations, { relationName: 'conv_client' }),
  conversationsAsTherapist: many(conversations, { relationName: 'conv_therapist' }),
  sessionsAsClient: many(sessions, { relationName: 'sess_client' }),
  sessionsAsTherapist: many(sessions, { relationName: 'sess_therapist' }),
  sessionFeedback: many(sessionFeedback, { relationName: 'sf_client' }),
  checkinsAsClient: many(clientCheckins, { relationName: 'cc_client' }),
  checkinsAsTherapist: many(clientCheckins, { relationName: 'cc_therapist' }),
  tasksAsClient: many(tasks, { relationName: 'task_client' }),
  tasksAsTherapist: many(tasks, { relationName: 'task_therapist' }),
  messagesSent: many(messages, { relationName: 'msg_sender' }),
  messagesReceived: many(messages, { relationName: 'msg_recipient' }),
  journalEntries: many(journalEntries),
  notifications: many(notifications),
  localDocuments: many(localDocuments),
  googleCalendarConnection: one(googleCalendarConnections),
  questionnaireTemplates: many(questionnaireTemplates),
  clientQuestionnairesAsClient: many(clientQuestionnaires, { relationName: 'cq_client' }),
  clientQuestionnairesAsTherapist: many(clientQuestionnaires, { relationName: 'cq_therapist' }),
  // Finder marketplace: at most one public provider profile; leads received.
  providerProfile: one(providerProfiles),
  providerRequestsReceived: many(providerRequests, { relationName: 'preq_provider' }),
  providerRequestsAsClient: many(providerRequests, { relationName: 'preq_client' }),
}));

export const clientTherapistRelationshipsRelations = relations(clientTherapistRelationships, ({ one }) => ({
  client: one(profiles, {
    fields: [clientTherapistRelationships.clientId],
    references: [profiles.id],
    relationName: 'ctr_client',
  }),
  therapist: one(profiles, {
    fields: [clientTherapistRelationships.therapistId],
    references: [profiles.id],
    relationName: 'ctr_therapist',
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  client: one(profiles, {
    fields: [conversations.clientId],
    references: [profiles.id],
    relationName: 'conv_client',
  }),
  therapist: one(profiles, {
    fields: [conversations.therapistId],
    references: [profiles.id],
    relationName: 'conv_therapist',
  }),
  messages: many(messages),
  externalMessages: many(externalMessages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(profiles, {
    fields: [messages.senderId],
    references: [profiles.id],
    relationName: 'msg_sender',
  }),
  recipient: one(profiles, {
    fields: [messages.recipientId],
    references: [profiles.id],
    relationName: 'msg_recipient',
  }),
  attachments: many(messageAttachments),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
  }),
}));

export const externalMessagesRelations = relations(externalMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [externalMessages.conversationId],
    references: [conversations.id],
  }),
}));

export const googleCalendarConnectionsRelations = relations(googleCalendarConnections, ({ one }) => ({
  user: one(profiles, {
    fields: [googleCalendarConnections.userId],
    references: [profiles.id],
  }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  client: one(profiles, {
    fields: [journalEntries.clientId],
    references: [profiles.id],
  }),
}));

export const localDocumentsRelations = relations(localDocuments, ({ one }) => ({
  user: one(profiles, {
    fields: [localDocuments.userId],
    references: [profiles.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  client: one(profiles, {
    fields: [sessions.clientId],
    references: [profiles.id],
    relationName: 'sess_client',
  }),
  therapist: one(profiles, {
    fields: [sessions.therapistId],
    references: [profiles.id],
    relationName: 'sess_therapist',
  }),
  feedback: many(sessionFeedback),
}));

export const sessionFeedbackRelations = relations(sessionFeedback, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionFeedback.sessionId],
    references: [sessions.id],
  }),
  client: one(profiles, {
    fields: [sessionFeedback.clientId],
    references: [profiles.id],
    relationName: 'sf_client',
  }),
}));

export const clientCheckinsRelations = relations(clientCheckins, ({ one }) => ({
  client: one(profiles, {
    fields: [clientCheckins.clientId],
    references: [profiles.id],
    relationName: 'cc_client',
  }),
  therapist: one(profiles, {
    fields: [clientCheckins.therapistId],
    references: [profiles.id],
    relationName: 'cc_therapist',
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  client: one(profiles, {
    fields: [tasks.clientId],
    references: [profiles.id],
    relationName: 'task_client',
  }),
  therapist: one(profiles, {
    fields: [tasks.therapistId],
    references: [profiles.id],
    relationName: 'task_therapist',
  }),
}));

export const questionnaireTemplatesRelations = relations(questionnaireTemplates, ({ one, many }) => ({
  therapist: one(profiles, {
    fields: [questionnaireTemplates.therapistId],
    references: [profiles.id],
  }),
  questions: many(questionnaireQuestions),
  clientQuestionnaires: many(clientQuestionnaires),
}));

export const questionnaireQuestionsRelations = relations(questionnaireQuestions, ({ one }) => ({
  template: one(questionnaireTemplates, {
    fields: [questionnaireQuestions.templateId],
    references: [questionnaireTemplates.id],
  }),
}));

export const clientQuestionnairesRelations = relations(clientQuestionnaires, ({ one, many }) => ({
  client: one(profiles, {
    fields: [clientQuestionnaires.clientId],
    references: [profiles.id],
    relationName: 'cq_client',
  }),
  therapist: one(profiles, {
    fields: [clientQuestionnaires.therapistId],
    references: [profiles.id],
    relationName: 'cq_therapist',
  }),
  template: one(questionnaireTemplates, {
    fields: [clientQuestionnaires.templateId],
    references: [questionnaireTemplates.id],
  }),
  responses: many(questionnaireResponses),
}));

export const questionnaireResponsesRelations = relations(questionnaireResponses, ({ one }) => ({
  clientQuestionnaire: one(clientQuestionnaires, {
    fields: [questionnaireResponses.clientQuestionnaireId],
    references: [clientQuestionnaires.id],
  }),
}));

export const providerProfilesRelations = relations(providerProfiles, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [providerProfiles.providerId],
    references: [profiles.id],
  }),
  requests: many(providerRequests, { relationName: 'preq_provider' }),
}));

export const providerRequestsRelations = relations(providerRequests, ({ one }) => ({
  provider: one(profiles, {
    fields: [providerRequests.providerId],
    references: [profiles.id],
    relationName: 'preq_provider',
  }),
  client: one(profiles, {
    fields: [providerRequests.clientId],
    references: [profiles.id],
    relationName: 'preq_client',
  }),
}));

/* -------------------------------------------------------------------------- */
/* Inferred types (handy for the API/data layer)                               */
/* -------------------------------------------------------------------------- */

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type ClientTherapistRelationship = typeof clientTherapistRelationships.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type ExternalMessage = typeof externalMessages.$inferSelect;
export type GoogleCalendarConnection = typeof googleCalendarConnections.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type LocalDocument = typeof localDocuments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SessionFeedback = typeof sessionFeedback.$inferSelect;
export type NewSessionFeedback = typeof sessionFeedback.$inferInsert;
export type ClientCheckin = typeof clientCheckins.$inferSelect;
export type NewClientCheckin = typeof clientCheckins.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type MessagingSession = typeof messagingSessions.$inferSelect;
export type UserDevice = typeof userDevices.$inferSelect;
export type QuestionnaireTemplate = typeof questionnaireTemplates.$inferSelect;
export type QuestionnaireQuestion = typeof questionnaireQuestions.$inferSelect;
export type ClientQuestionnaire = typeof clientQuestionnaires.$inferSelect;
export type QuestionnaireResponse = typeof questionnaireResponses.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminNotificationSetting = typeof adminNotificationSettings.$inferSelect;
export type AiSetting = typeof aiSettings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type NewProviderProfile = typeof providerProfiles.$inferInsert;
export type ProviderRequest = typeof providerRequests.$inferSelect;
export type NewProviderRequest = typeof providerRequests.$inferInsert;

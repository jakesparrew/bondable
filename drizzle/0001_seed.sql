-- ============================================================================
-- Bondable — seed / demo data (0001_seed.sql)
-- ----------------------------------------------------------------------------
-- Run this AFTER drizzle/0000_init.sql (which creates the 23 tables, the
-- user_role enum, and all foreign keys). Paste into the Neon web SQL editor.
--
-- This mirrors the in-memory demo rows from
--   src/integrations/supabase/mockClient.ts
-- onto the real Neon schema in src/server/db/schema.ts. Only columns that
-- actually exist in the schema are inserted; the mock's convenience aliases
-- (completed, read, title/type/duration on sessions, participant_ids,
-- last_message, shared_with_therapist, status on profiles) are NOT real
-- columns and are intentionally dropped / mapped to the real columns.
--
-- Fixed UUIDs match the mock so rows are stable. Every insert is idempotent
-- (ON CONFLICT ... DO NOTHING), so this file is SAFE TO RE-RUN.
--
-- Demo world: one therapist (Dev Therapist, Leuven) + five Belgian clients
-- (Lotte Vermeulen, Thomas De Smet, Amélie Dubois, Joris Peeters, Sofie
-- Janssens). Fixed "today" = 2026-06-16.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles  (parent of nearly everything — insert FIRST)
-- ----------------------------------------------------------------------------
INSERT INTO "profiles" (
  "id", "first_name", "last_name", "email", "role", "avatar_url", "phone",
  "address", "age", "date_of_birth", "emergency_contact_name",
  "emergency_contact_phone", "emergency_contact_relationship", "invite_code",
  "weekly_availability", "created_at", "updated_at"
) VALUES
  (
    '00000000-0000-0000-0000-000000000001'::uuid, 'Dev', 'Therapist',
    'dev-therapist@bondable.local', 'therapist'::user_role, NULL,
    '+32 470 00 00 01', 'Naamsestraat 12, 3000 Leuven', '41', '1985-03-14',
    NULL, NULL, NULL, 'DEVTHER', NULL,
    '2025-12-18T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid, 'Lotte', 'Vermeulen',
    'lotte.vermeulen@bondable.local', 'client'::user_role, NULL,
    '+32 471 11 22 33', 'Kerkstraat 4, 2000 Antwerpen', '29', '1997-07-02',
    'Maarten Vermeulen', '+32 471 99 88 77', 'Brother', NULL, NULL,
    '2026-02-16T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  ),
  (
    '00000000-0000-0000-0000-000000000003'::uuid, 'Thomas', 'De Smet',
    'thomas.desmet@bondable.local', 'client'::user_role, NULL,
    '+32 472 22 33 44', 'Veldstraat 88, 9000 Gent', '35', '1991-11-20',
    'Eva De Smet', '+32 472 00 11 22', 'Spouse', NULL, NULL,
    '2026-03-18T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  ),
  (
    '00000000-0000-0000-0000-000000000004'::uuid, 'Amélie', 'Dubois',
    'amelie.dubois@bondable.local', 'client'::user_role, NULL,
    '+32 473 33 44 55', 'Rue Neuve 22, 1000 Bruxelles', '24', '2002-01-09',
    'Claire Dubois', '+32 473 55 66 77', 'Mother', NULL, NULL,
    '2026-04-17T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  ),
  (
    '00000000-0000-0000-0000-000000000005'::uuid, 'Joris', 'Peeters',
    'joris.peeters@bondable.local', 'client'::user_role, NULL,
    '+32 474 44 55 66', 'Statiestraat 5, 2800 Mechelen', '47', '1979-05-30',
    'Inge Peeters', '+32 474 77 88 99', 'Spouse', NULL, NULL,
    '2026-05-02T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  ),
  (
    '00000000-0000-0000-0000-000000000006'::uuid, 'Sofie', 'Janssens',
    'sofie.janssens@bondable.local', 'client'::user_role, NULL,
    '+32 475 55 66 77', 'Bondgenotenlaan 30, 3000 Leuven', '32', '1994-09-18',
    'Pieter Janssens', '+32 475 11 22 33', 'Partner', NULL, NULL,
    '2026-05-17T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  )
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. client_therapist_relationships
--    (one row per client → the dev therapist; Joris is inactive)
-- ----------------------------------------------------------------------------
INSERT INTO "client_therapist_relationships" (
  "id", "client_id", "therapist_id", "status", "connected_at",
  "created_at", "updated_at"
) VALUES
  (
    '00000000-0000-4000-8000-0000000003e9'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'active', '2026-02-16T09:00:00.000Z',
    '2026-02-16T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003ea'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'active', '2026-03-03T09:00:00.000Z',
    '2026-03-03T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003eb'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'active', '2026-03-18T09:00:00.000Z',
    '2026-03-18T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003ec'::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'inactive', '2026-04-02T09:00:00.000Z',
    '2026-04-02T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003ed'::uuid,
    '00000000-0000-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'active', '2026-04-17T09:00:00.000Z',
    '2026-04-17T09:00:00.000Z', '2026-06-16T09:00:00.000Z'
  )
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. conversations  (must precede messages: FK conversation_id)
-- ----------------------------------------------------------------------------
INSERT INTO "conversations" (
  "id", "client_id", "therapist_id", "last_message_at",
  "last_message_preview", "unread_count_client", "unread_count_therapist",
  "created_at", "updated_at"
) VALUES
  (
    '00000000-0000-4000-8000-0000000003fa'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-06-16T08:45:00.000Z', 'See you at 11. Thanks!', 0, 1,
    '2026-02-16T09:00:00.000Z', '2026-06-16T08:45:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003fb'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-06-15T19:10:00.000Z', 'We tried the exercise tonight.', 0, 2,
    '2026-03-18T09:00:00.000Z', '2026-06-15T19:10:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003fc'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-06-14T12:00:00.000Z', 'Thank you for today.', 0, 0,
    '2026-04-17T09:00:00.000Z', '2026-06-14T12:00:00.000Z'
  )
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. sessions  (session_date / session_time / session_type / duration_minutes;
--    mock title/type/duration aliases are dropped)
-- ----------------------------------------------------------------------------
INSERT INTO "sessions" (
  "id", "client_id", "therapist_id", "session_date", "session_time",
  "session_type", "session_format", "therapy_type", "duration_minutes",
  "location", "notes", "status", "waiting_for_response_from",
  "created_at", "updated_at"
) VALUES
  (
    '00000000-0000-4000-8000-0000000003ee'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-06-09', '10:00:00', 'individual', 'in_person', 'CBT', 60,
    'Leuven office', 'Reviewed sleep hygiene plan; good progress.',
    'completed', NULL, '2026-06-09T09:00:00.000Z', '2026-06-09T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003ef'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-06-13', '14:30:00', 'couples', 'video', 'EFT', 60,
    NULL, 'Communication exercises assigned.',
    'completed', NULL, '2026-06-13T09:00:00.000Z', '2026-06-13T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003f0'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-06-16', '11:00:00', 'individual', 'in_person', 'CBT', 60,
    'Leuven office', NULL,
    'scheduled', NULL, '2026-06-11T09:00:00.000Z', '2026-06-11T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003f1'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-06-16', '16:00:00', 'individual', 'video', 'ACT', 45,
    NULL, NULL,
    'scheduled', NULL, '2026-06-12T09:00:00.000Z', '2026-06-12T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003f2'::uuid,
    '00000000-0000-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-06-18', '09:30:00', 'individual', 'in_person', 'CBT', 60,
    'Leuven office', NULL,
    'scheduled', NULL, '2026-06-14T09:00:00.000Z', '2026-06-14T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003f3'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-06-21', '13:00:00', 'couples', 'video', 'EFT', 60,
    NULL, NULL,
    'scheduled', NULL, '2026-06-15T09:00:00.000Z', '2026-06-15T09:00:00.000Z'
  )
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. tasks  (status replaces the mock's `completed` alias)
-- ----------------------------------------------------------------------------
INSERT INTO "tasks" (
  "id", "client_id", "therapist_id", "title", "description", "notes",
  "priority", "status", "assigned_date", "due_date", "denied_reason",
  "created_at", "updated_at"
) VALUES
  (
    '00000000-0000-4000-8000-0000000003f4'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Daily mood journal',
    'Log your mood each evening for the coming week.', NULL,
    'medium', 'assigned', '2026-06-10T09:00:00.000Z', '2026-06-19T09:00:00.000Z',
    NULL, '2026-06-10T09:00:00.000Z', '2026-06-10T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003f5'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Breathing exercise',
    'Practise 4-7-8 breathing twice a day.', NULL,
    'low', 'in_progress', '2026-06-11T09:00:00.000Z', '2026-06-17T09:00:00.000Z',
    NULL, '2026-06-11T09:00:00.000Z', '2026-06-14T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003f6'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Communication worksheet',
    'Complete the active-listening worksheet together.', NULL,
    'high', 'completed', '2026-06-06T09:00:00.000Z', '2026-06-12T09:00:00.000Z',
    NULL, '2026-06-06T09:00:00.000Z', '2026-06-12T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003f7'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Values reflection',
    'Write a short reflection on your core values.', NULL,
    'medium', 'assigned', '2026-06-13T09:00:00.000Z', '2026-06-15T09:00:00.000Z',
    NULL, '2026-06-13T09:00:00.000Z', '2026-06-13T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003f8'::uuid,
    '00000000-0000-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Sleep diary',
    'Track bedtime and wake time for 7 nights.', NULL,
    'medium', 'in_progress', '2026-06-12T09:00:00.000Z', '2026-06-20T09:00:00.000Z',
    NULL, '2026-06-12T09:00:00.000Z', '2026-06-15T09:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003f9'::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Homework: thought record',
    'Fill in one thought record after a stressful moment.', NULL,
    'low', 'denied', '2026-06-08T09:00:00.000Z', '2026-06-14T09:00:00.000Z',
    'Not relevant this week.', '2026-06-08T09:00:00.000Z', '2026-06-10T09:00:00.000Z'
  )
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. messages  (status / read_at replace the mock's `read` alias;
--    sequence_number is BIGSERIAL — omitted so it auto-assigns)
-- ----------------------------------------------------------------------------
INSERT INTO "messages" (
  "id", "conversation_id", "sender_id", "recipient_id", "content",
  "message_type", "status", "read_at", "created_at", "updated_at"
) VALUES
  (
    '00000000-0000-4000-8000-0000000003fd'::uuid,
    '00000000-0000-4000-8000-0000000003fa'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Hi Lotte, looking forward to our session tomorrow.',
    'text', 'read', '2026-06-15T20:05:00.000Z',
    '2026-06-15T18:00:00.000Z', '2026-06-15T18:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003fe'::uuid,
    '00000000-0000-4000-8000-0000000003fa'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Thanks! I have done my journal entries.',
    'text', 'read', '2026-06-15T20:30:00.000Z',
    '2026-06-15T20:00:00.000Z', '2026-06-15T20:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-0000000003ff'::uuid,
    '00000000-0000-4000-8000-0000000003fa'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'See you at 11. Thanks!',
    'text', 'sent', NULL,
    '2026-06-16T08:45:00.000Z', '2026-06-16T08:45:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-000000000400'::uuid,
    '00000000-0000-4000-8000-0000000003fb'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    'How did the communication worksheet go?',
    'text', 'read', '2026-06-15T18:00:00.000Z',
    '2026-06-14T10:00:00.000Z', '2026-06-14T10:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-000000000401'::uuid,
    '00000000-0000-4000-8000-0000000003fb'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'We tried the exercise tonight.',
    'text', 'sent', NULL,
    '2026-06-15T19:10:00.000Z', '2026-06-15T19:10:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-000000000402'::uuid,
    '00000000-0000-4000-8000-0000000003fb'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'It felt a bit awkward but useful.',
    'text', 'sent', NULL,
    '2026-06-15T19:11:00.000Z', '2026-06-15T19:11:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-000000000403'::uuid,
    '00000000-0000-4000-8000-0000000003fc'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Thank you for today.',
    'text', 'read', '2026-06-14T12:30:00.000Z',
    '2026-06-14T12:00:00.000Z', '2026-06-14T12:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-000000000404'::uuid,
    '00000000-0000-4000-8000-0000000003fc'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'You did great. Take care this week.',
    'text', 'read', '2026-06-14T13:00:00.000Z',
    '2026-06-14T12:45:00.000Z', '2026-06-14T12:45:00.000Z'
  )
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. journal_entries  (sharing_type / is_shared_with_therapist /
--    shared_with_therapists; mock `shared_with_therapist` alias dropped)
-- ----------------------------------------------------------------------------
INSERT INTO "journal_entries" (
  "id", "client_id", "title", "content", "mood", "entry_date",
  "is_shared_with_therapist", "shared_with_therapists", "sharing_type",
  "attachments", "created_at", "updated_at"
) VALUES
  (
    '00000000-0000-4000-8000-000000000405'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'A calmer morning',
    'I managed to do the breathing exercise before work and felt steadier.',
    'calm', '2026-06-15', true,
    '["00000000-0000-0000-0000-000000000001"]'::jsonb, 'therapist',
    NULL, '2026-06-15T07:30:00.000Z', '2026-06-15T07:30:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-000000000406'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Difficult evening',
    'Felt anxious about a deadline. Used the thought record technique.',
    'anxious', '2026-06-13', true,
    '["00000000-0000-0000-0000-000000000001"]'::jsonb, 'therapist',
    NULL, '2026-06-13T21:00:00.000Z', '2026-06-13T21:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-000000000407'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Private note',
    'Just for me — thinking about the weekend trip.',
    'hopeful', '2026-06-11', false,
    '[]'::jsonb, 'private',
    NULL, '2026-06-11T22:15:00.000Z', '2026-06-11T22:15:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-000000000408'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Reflection after session',
    'Sleep hygiene plan is helping. Sleeping better most nights.',
    'content', '2026-06-09', true,
    '["00000000-0000-0000-0000-000000000001"]'::jsonb, 'therapist',
    NULL, '2026-06-09T20:00:00.000Z', '2026-06-09T20:00:00.000Z'
  )
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. notifications  (is_read replaces the mock's `read` alias)
-- ----------------------------------------------------------------------------
INSERT INTO "notifications" (
  "id", "user_id", "type", "title", "message", "related_id", "related_type",
  "is_read", "created_at", "updated_at"
) VALUES
  (
    '00000000-0000-4000-8000-000000000409'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'message', 'New message', 'Lotte Vermeulen sent you a message.',
    '00000000-0000-4000-8000-0000000003fa'::uuid, 'conversation', false,
    '2026-06-16T08:46:00.000Z', '2026-06-16T08:46:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-00000000040a'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'session', 'Upcoming session',
    'You have a session with Lotte Vermeulen today at 11:00.',
    NULL, 'session', false,
    '2026-06-16T07:00:00.000Z', '2026-06-16T07:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-00000000040b'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'journal', 'Journal shared',
    'Lotte Vermeulen shared a journal entry with you.',
    NULL, 'journal', true,
    '2026-06-15T07:31:00.000Z', '2026-06-15T07:31:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-00000000040c'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'task', 'Task completed',
    'Thomas De Smet completed "Communication worksheet".',
    NULL, 'task', true,
    '2026-06-12T15:00:00.000Z', '2026-06-12T15:00:00.000Z'
  )
ON CONFLICT ("id") DO NOTHING;

-- ============================================================================
-- End of seed. Tables intentionally left empty (mock seeds them as []):
--   clients, message_attachments, external_messages,
--   google_calendar_connections, local_documents, notifications' siblings,
--   messaging_sessions, user_devices, admin_users, admin_notification_settings,
--   ai_settings, audit_logs, questionnaire_templates, questionnaire_questions,
--   client_questionnaires, questionnaire_responses.
-- ============================================================================

/**
 * DEV-ONLY in-memory mock Supabase client — "explore mode".
 *
 * The real Supabase project is gone and Neon is not wired yet, so this file
 * lets the Bondable app boot and be clicked through WITHOUT any backend.
 * It is a self-contained, no-network stand-in for `@supabase/supabase-js`:
 * nothing here talks to a server, nothing throws, every call resolves with
 * `{ data, error: null }`.
 *
 * Wiring (in client.ts) is handled separately — this module only exports
 * `mockSupabase`. Column names in the seed data mirror the authoritative
 * Drizzle schema at `src/server/db/schema.ts` (snake_case as the app reads it).
 *
 * NOT for production. Do not import from real supabase here.
 */

/* -------------------------------------------------------------------------- */
/* Mock identities                                                            */
/* -------------------------------------------------------------------------- */

const THERAPIST_ID = '00000000-0000-0000-0000-000000000001';
const CLIENT_ID = '00000000-0000-0000-0000-000000000002';
const CLIENT_ID_3 = '00000000-0000-0000-0000-000000000003';
const CLIENT_ID_4 = '00000000-0000-0000-0000-000000000004';
const CLIENT_ID_5 = '00000000-0000-0000-0000-000000000005';
const CLIENT_ID_6 = '00000000-0000-0000-0000-000000000006';

const THERAPIST_EMAIL = 'dev-therapist@bondable.local';

// Fixed "today" so seeded sessions/tasks land in a stable past/present/future.
const TODAY_ISO = '2026-06-16';
const NOW_ISO = '2026-06-16T09:00:00.000Z';

/** Build an ISO timestamp offset by `days` from the fixed base date. */
function dayOffsetISO(days: number, time = '09:00:00'): string {
  const base = new Date(`${TODAY_ISO}T${time}.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

/** Build a YYYY-MM-DD date string offset by `days` from the fixed base date. */
function dayOffsetDate(days: number): string {
  const base = new Date(`${TODAY_ISO}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().split('T')[0];
}

let idCounter = 1000;
function genId(): string {
  idCounter += 1;
  const hex = idCounter.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

/* -------------------------------------------------------------------------- */
/* Auth mocks                                                                 */
/* -------------------------------------------------------------------------- */

const MOCK_USER = {
  id: THERAPIST_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: THERAPIST_EMAIL,
  email_confirmed_at: NOW_ISO,
  phone: '',
  confirmed_at: NOW_ISO,
  last_sign_in_at: NOW_ISO,
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {
    role: 'therapist',
    first_name: 'Dev',
    last_name: 'Therapist',
    full_name: 'Dev Therapist',
  },
  identities: [],
  created_at: NOW_ISO,
  updated_at: NOW_ISO,
};

const MOCK_SESSION = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(new Date(NOW_ISO).getTime() / 1000) + 3600,
  token_type: 'bearer',
  user: MOCK_USER,
};

/* -------------------------------------------------------------------------- */
/* Seed data — keyed by table name.                                           */
/* Column names mirror src/server/db/schema.ts (snake_case).                  */
/* -------------------------------------------------------------------------- */

function buildSeed(): Record<string, any[]> {
  const profiles = [
    {
      id: THERAPIST_ID,
      first_name: 'Dev',
      last_name: 'Therapist',
      email: THERAPIST_EMAIL,
      role: 'therapist',
      avatar_url: null,
      phone: '+32 470 00 00 01',
      address: 'Naamsestraat 12, 3000 Leuven',
      age: '41',
      date_of_birth: '1985-03-14',
      emergency_contact_name: null,
      emergency_contact_phone: null,
      emergency_contact_relationship: null,
      invite_code: 'DEVTHER',
      weekly_availability: null,
      // convenience alias some screens may read
      status: 'active',
      created_at: dayOffsetISO(-180),
      updated_at: NOW_ISO,
    },
    {
      id: CLIENT_ID,
      first_name: 'Lotte',
      last_name: 'Vermeulen',
      email: 'lotte.vermeulen@bondable.local',
      role: 'client',
      avatar_url: null,
      phone: '+32 471 11 22 33',
      address: 'Kerkstraat 4, 2000 Antwerpen',
      age: '29',
      date_of_birth: '1997-07-02',
      emergency_contact_name: 'Maarten Vermeulen',
      emergency_contact_phone: '+32 471 99 88 77',
      emergency_contact_relationship: 'Brother',
      invite_code: null,
      weekly_availability: null,
      status: 'active',
      created_at: dayOffsetISO(-120),
      updated_at: NOW_ISO,
    },
    {
      id: CLIENT_ID_3,
      first_name: 'Thomas',
      last_name: 'De Smet',
      email: 'thomas.desmet@bondable.local',
      role: 'client',
      avatar_url: null,
      phone: '+32 472 22 33 44',
      address: 'Veldstraat 88, 9000 Gent',
      age: '35',
      date_of_birth: '1991-11-20',
      emergency_contact_name: 'Eva De Smet',
      emergency_contact_phone: '+32 472 00 11 22',
      emergency_contact_relationship: 'Spouse',
      invite_code: null,
      weekly_availability: null,
      status: 'active',
      created_at: dayOffsetISO(-90),
      updated_at: NOW_ISO,
    },
    {
      id: CLIENT_ID_4,
      first_name: 'Amélie',
      last_name: 'Dubois',
      email: 'amelie.dubois@bondable.local',
      role: 'client',
      avatar_url: null,
      phone: '+32 473 33 44 55',
      address: 'Rue Neuve 22, 1000 Bruxelles',
      age: '24',
      date_of_birth: '2002-01-09',
      emergency_contact_name: 'Claire Dubois',
      emergency_contact_phone: '+32 473 55 66 77',
      emergency_contact_relationship: 'Mother',
      invite_code: null,
      weekly_availability: null,
      status: 'active',
      created_at: dayOffsetISO(-60),
      updated_at: NOW_ISO,
    },
    {
      id: CLIENT_ID_5,
      first_name: 'Joris',
      last_name: 'Peeters',
      email: 'joris.peeters@bondable.local',
      role: 'client',
      avatar_url: null,
      phone: '+32 474 44 55 66',
      address: 'Statiestraat 5, 2800 Mechelen',
      age: '47',
      date_of_birth: '1979-05-30',
      emergency_contact_name: 'Inge Peeters',
      emergency_contact_phone: '+32 474 77 88 99',
      emergency_contact_relationship: 'Spouse',
      invite_code: null,
      weekly_availability: null,
      status: 'inactive',
      created_at: dayOffsetISO(-45),
      updated_at: NOW_ISO,
    },
    {
      id: CLIENT_ID_6,
      first_name: 'Sofie',
      last_name: 'Janssens',
      email: 'sofie.janssens@bondable.local',
      role: 'client',
      avatar_url: null,
      phone: '+32 475 55 66 77',
      address: 'Bondgenotenlaan 30, 3000 Leuven',
      age: '32',
      date_of_birth: '1994-09-18',
      emergency_contact_name: 'Pieter Janssens',
      emergency_contact_phone: '+32 475 11 22 33',
      emergency_contact_relationship: 'Partner',
      invite_code: null,
      weekly_availability: null,
      status: 'active',
      created_at: dayOffsetISO(-30),
      updated_at: NOW_ISO,
    },
  ];

  const clientIds = [CLIENT_ID, CLIENT_ID_3, CLIENT_ID_4, CLIENT_ID_5, CLIENT_ID_6];

  const client_therapist_relationships = clientIds.map((cid, i) => ({
    id: genId(),
    client_id: cid,
    therapist_id: THERAPIST_ID,
    status: cid === CLIENT_ID_5 ? 'inactive' : 'active',
    connected_at: dayOffsetISO(-(120 - i * 15)),
    created_at: dayOffsetISO(-(120 - i * 15)),
    updated_at: NOW_ISO,
  }));

  // Stable ids for the two past (completed) sessions so post-session
  // feedback rows can reference them.
  const sessionLottePastId = genId();
  const sessionThomasPastId = genId();

  const sessions = [
    {
      id: sessionLottePastId,
      client_id: CLIENT_ID,
      therapist_id: THERAPIST_ID,
      session_date: dayOffsetDate(-7),
      session_time: '10:00:00',
      session_type: 'individual',
      session_format: 'in_person',
      therapy_type: 'CBT',
      duration_minutes: 60,
      location: 'Leuven office',
      notes: 'Reviewed sleep hygiene plan; good progress.',
      // Therapist-authored summary, visible to both sides.
      recap:
        'We reviewed your sleep-hygiene plan and the wins from this week. ' +
        'Next step: keep a consistent wind-down routine and we will look at ' +
        'the thought-record technique together next time.',
      status: 'completed',
      waiting_for_response_from: null,
      // convenience aliases
      title: 'Individual session — Lotte',
      type: 'individual',
      duration: 60,
      created_at: dayOffsetISO(-7),
      updated_at: dayOffsetISO(-7),
    },
    {
      id: sessionThomasPastId,
      client_id: CLIENT_ID_3,
      therapist_id: THERAPIST_ID,
      session_date: dayOffsetDate(-3),
      session_time: '14:30:00',
      session_type: 'couples',
      session_format: 'video',
      therapy_type: 'EFT',
      duration_minutes: 60,
      location: null,
      notes: 'Communication exercises assigned.',
      recap: null,
      status: 'completed',
      waiting_for_response_from: null,
      title: 'Couples session — Thomas',
      type: 'couples',
      duration: 60,
      created_at: dayOffsetISO(-3),
      updated_at: dayOffsetISO(-3),
    },
    {
      id: genId(),
      client_id: CLIENT_ID,
      therapist_id: THERAPIST_ID,
      session_date: dayOffsetDate(0),
      session_time: '11:00:00',
      session_type: 'individual',
      session_format: 'in_person',
      therapy_type: 'CBT',
      duration_minutes: 60,
      location: 'Leuven office',
      notes: null,
      status: 'scheduled',
      waiting_for_response_from: null,
      title: 'Individual session — Lotte',
      type: 'individual',
      duration: 60,
      created_at: dayOffsetISO(-5),
      updated_at: dayOffsetISO(-5),
    },
    {
      id: genId(),
      client_id: CLIENT_ID_4,
      therapist_id: THERAPIST_ID,
      session_date: dayOffsetDate(0),
      session_time: '16:00:00',
      session_type: 'individual',
      session_format: 'video',
      therapy_type: 'ACT',
      duration_minutes: 45,
      location: null,
      notes: null,
      status: 'scheduled',
      waiting_for_response_from: null,
      title: 'Individual session — Amélie',
      type: 'individual',
      duration: 45,
      created_at: dayOffsetISO(-4),
      updated_at: dayOffsetISO(-4),
    },
    {
      id: genId(),
      client_id: CLIENT_ID_6,
      therapist_id: THERAPIST_ID,
      session_date: dayOffsetDate(2),
      session_time: '09:30:00',
      session_type: 'individual',
      session_format: 'in_person',
      therapy_type: 'CBT',
      duration_minutes: 60,
      location: 'Leuven office',
      notes: null,
      status: 'scheduled',
      waiting_for_response_from: null,
      title: 'Individual session — Sofie',
      type: 'individual',
      duration: 60,
      created_at: dayOffsetISO(-2),
      updated_at: dayOffsetISO(-2),
    },
    {
      id: genId(),
      client_id: CLIENT_ID_3,
      therapist_id: THERAPIST_ID,
      session_date: dayOffsetDate(5),
      session_time: '13:00:00',
      session_type: 'couples',
      session_format: 'video',
      therapy_type: 'EFT',
      duration_minutes: 60,
      location: null,
      notes: null,
      status: 'scheduled',
      waiting_for_response_from: null,
      title: 'Couples session — Thomas',
      type: 'couples',
      duration: 60,
      created_at: dayOffsetISO(-1),
      updated_at: dayOffsetISO(-1),
    },
  ];

  const tasks = [
    {
      id: genId(),
      client_id: CLIENT_ID,
      therapist_id: THERAPIST_ID,
      title: 'Daily mood journal',
      description: 'Log your mood each evening for the coming week.',
      notes: null,
      priority: 'medium',
      status: 'assigned',
      assigned_date: dayOffsetISO(-6),
      due_date: dayOffsetISO(3),
      denied_reason: null,
      // convenience alias
      completed: false,
      created_at: dayOffsetISO(-6),
      updated_at: dayOffsetISO(-6),
    },
    {
      id: genId(),
      client_id: CLIENT_ID,
      therapist_id: THERAPIST_ID,
      title: 'Breathing exercise',
      description: 'Practise 4-7-8 breathing twice a day.',
      notes: null,
      priority: 'low',
      status: 'in_progress',
      assigned_date: dayOffsetISO(-5),
      due_date: dayOffsetISO(1),
      denied_reason: null,
      completed: false,
      created_at: dayOffsetISO(-5),
      updated_at: dayOffsetISO(-2),
    },
    {
      id: genId(),
      client_id: CLIENT_ID_3,
      therapist_id: THERAPIST_ID,
      title: 'Communication worksheet',
      description: 'Complete the active-listening worksheet together.',
      notes: null,
      priority: 'high',
      status: 'completed',
      assigned_date: dayOffsetISO(-10),
      due_date: dayOffsetISO(-4),
      denied_reason: null,
      completed: true,
      created_at: dayOffsetISO(-10),
      updated_at: dayOffsetISO(-4),
    },
    {
      id: genId(),
      client_id: CLIENT_ID_4,
      therapist_id: THERAPIST_ID,
      title: 'Values reflection',
      description: 'Write a short reflection on your core values.',
      notes: null,
      priority: 'medium',
      status: 'assigned',
      assigned_date: dayOffsetISO(-3),
      due_date: dayOffsetISO(-1),
      denied_reason: null,
      completed: false,
      created_at: dayOffsetISO(-3),
      updated_at: dayOffsetISO(-3),
    },
    {
      id: genId(),
      client_id: CLIENT_ID_6,
      therapist_id: THERAPIST_ID,
      title: 'Sleep diary',
      description: 'Track bedtime and wake time for 7 nights.',
      notes: null,
      priority: 'medium',
      status: 'in_progress',
      assigned_date: dayOffsetISO(-4),
      due_date: dayOffsetISO(4),
      denied_reason: null,
      completed: false,
      created_at: dayOffsetISO(-4),
      updated_at: dayOffsetISO(-1),
    },
    {
      id: genId(),
      client_id: CLIENT_ID_5,
      therapist_id: THERAPIST_ID,
      title: 'Homework: thought record',
      description: 'Fill in one thought record after a stressful moment.',
      notes: null,
      priority: 'low',
      status: 'denied',
      assigned_date: dayOffsetISO(-8),
      due_date: dayOffsetISO(-2),
      denied_reason: 'Not relevant this week.',
      completed: false,
      created_at: dayOffsetISO(-8),
      updated_at: dayOffsetISO(-6),
    },
  ];

  const conversationId1 = genId();
  const conversationId2 = genId();
  const conversationId3 = genId();

  const conversations = [
    {
      id: conversationId1,
      client_id: CLIENT_ID,
      therapist_id: THERAPIST_ID,
      last_message_at: dayOffsetISO(0, '08:45:00'),
      last_message_preview: 'See you at 11. Thanks!',
      unread_count_client: 0,
      unread_count_therapist: 1,
      // convenience aliases
      participant_ids: [CLIENT_ID, THERAPIST_ID],
      last_message: 'See you at 11. Thanks!',
      created_at: dayOffsetISO(-120),
      updated_at: dayOffsetISO(0, '08:45:00'),
    },
    {
      id: conversationId2,
      client_id: CLIENT_ID_3,
      therapist_id: THERAPIST_ID,
      last_message_at: dayOffsetISO(-1, '19:10:00'),
      last_message_preview: 'We tried the exercise tonight.',
      unread_count_client: 0,
      unread_count_therapist: 2,
      participant_ids: [CLIENT_ID_3, THERAPIST_ID],
      last_message: 'We tried the exercise tonight.',
      created_at: dayOffsetISO(-90),
      updated_at: dayOffsetISO(-1, '19:10:00'),
    },
    {
      id: conversationId3,
      client_id: CLIENT_ID_4,
      therapist_id: THERAPIST_ID,
      last_message_at: dayOffsetISO(-2, '12:00:00'),
      last_message_preview: 'Thank you for today.',
      unread_count_client: 0,
      unread_count_therapist: 0,
      participant_ids: [CLIENT_ID_4, THERAPIST_ID],
      last_message: 'Thank you for today.',
      created_at: dayOffsetISO(-60),
      updated_at: dayOffsetISO(-2, '12:00:00'),
    },
  ];

  const messages = [
    {
      id: genId(),
      conversation_id: conversationId1,
      sender_id: THERAPIST_ID,
      recipient_id: CLIENT_ID,
      content: 'Hi Lotte, looking forward to our session tomorrow.',
      message_type: 'text',
      status: 'read',
      read_at: dayOffsetISO(-1, '20:05:00'),
      read: true,
      created_at: dayOffsetISO(-1, '18:00:00'),
      updated_at: dayOffsetISO(-1, '18:00:00'),
    },
    {
      id: genId(),
      conversation_id: conversationId1,
      sender_id: CLIENT_ID,
      recipient_id: THERAPIST_ID,
      content: 'Thanks! I have done my journal entries.',
      message_type: 'text',
      status: 'read',
      read_at: dayOffsetISO(-1, '20:30:00'),
      read: true,
      created_at: dayOffsetISO(-1, '20:00:00'),
      updated_at: dayOffsetISO(-1, '20:00:00'),
    },
    {
      id: genId(),
      conversation_id: conversationId1,
      sender_id: CLIENT_ID,
      recipient_id: THERAPIST_ID,
      content: 'See you at 11. Thanks!',
      message_type: 'text',
      status: 'sent',
      read_at: null,
      read: false,
      created_at: dayOffsetISO(0, '08:45:00'),
      updated_at: dayOffsetISO(0, '08:45:00'),
    },
    {
      id: genId(),
      conversation_id: conversationId2,
      sender_id: THERAPIST_ID,
      recipient_id: CLIENT_ID_3,
      content: 'How did the communication worksheet go?',
      message_type: 'text',
      status: 'read',
      read_at: dayOffsetISO(-1, '18:00:00'),
      read: true,
      created_at: dayOffsetISO(-2, '10:00:00'),
      updated_at: dayOffsetISO(-2, '10:00:00'),
    },
    {
      id: genId(),
      conversation_id: conversationId2,
      sender_id: CLIENT_ID_3,
      recipient_id: THERAPIST_ID,
      content: 'We tried the exercise tonight.',
      message_type: 'text',
      status: 'sent',
      read_at: null,
      read: false,
      created_at: dayOffsetISO(-1, '19:10:00'),
      updated_at: dayOffsetISO(-1, '19:10:00'),
    },
    {
      id: genId(),
      conversation_id: conversationId2,
      sender_id: CLIENT_ID_3,
      recipient_id: THERAPIST_ID,
      content: 'It felt a bit awkward but useful.',
      message_type: 'text',
      status: 'sent',
      read_at: null,
      read: false,
      created_at: dayOffsetISO(-1, '19:11:00'),
      updated_at: dayOffsetISO(-1, '19:11:00'),
    },
    {
      id: genId(),
      conversation_id: conversationId3,
      sender_id: CLIENT_ID_4,
      recipient_id: THERAPIST_ID,
      content: 'Thank you for today.',
      message_type: 'text',
      status: 'read',
      read_at: dayOffsetISO(-2, '12:30:00'),
      read: true,
      created_at: dayOffsetISO(-2, '12:00:00'),
      updated_at: dayOffsetISO(-2, '12:00:00'),
    },
    {
      id: genId(),
      conversation_id: conversationId3,
      sender_id: THERAPIST_ID,
      recipient_id: CLIENT_ID_4,
      content: 'You did great. Take care this week.',
      message_type: 'text',
      status: 'read',
      read_at: dayOffsetISO(-2, '13:00:00'),
      read: true,
      created_at: dayOffsetISO(-2, '12:45:00'),
      updated_at: dayOffsetISO(-2, '12:45:00'),
    },
  ];

  const journal_entries = [
    {
      id: genId(),
      client_id: CLIENT_ID,
      title: 'A calmer morning',
      content: 'I managed to do the breathing exercise before work and felt steadier.',
      mood: 'calm',
      entry_date: dayOffsetDate(-1),
      is_shared_with_therapist: true,
      shared_with_therapists: [THERAPIST_ID],
      sharing_type: 'therapist',
      attachments: null,
      // convenience alias
      shared_with_therapist: true,
      created_at: dayOffsetISO(-1, '07:30:00'),
      updated_at: dayOffsetISO(-1, '07:30:00'),
    },
    {
      id: genId(),
      client_id: CLIENT_ID,
      title: 'Difficult evening',
      content: 'Felt anxious about a deadline. Used the thought record technique.',
      mood: 'anxious',
      entry_date: dayOffsetDate(-3),
      is_shared_with_therapist: true,
      shared_with_therapists: [THERAPIST_ID],
      sharing_type: 'therapist',
      attachments: null,
      shared_with_therapist: true,
      created_at: dayOffsetISO(-3, '21:00:00'),
      updated_at: dayOffsetISO(-3, '21:00:00'),
    },
    {
      id: genId(),
      client_id: CLIENT_ID,
      title: 'Private note',
      content: 'Just for me — thinking about the weekend trip.',
      mood: 'hopeful',
      entry_date: dayOffsetDate(-5),
      is_shared_with_therapist: false,
      shared_with_therapists: [],
      sharing_type: 'private',
      attachments: null,
      shared_with_therapist: false,
      created_at: dayOffsetISO(-5, '22:15:00'),
      updated_at: dayOffsetISO(-5, '22:15:00'),
    },
    {
      id: genId(),
      client_id: CLIENT_ID,
      title: 'Reflection after session',
      content: 'Sleep hygiene plan is helping. Sleeping better most nights.',
      mood: 'content',
      entry_date: dayOffsetDate(-7),
      is_shared_with_therapist: true,
      shared_with_therapists: [THERAPIST_ID],
      sharing_type: 'therapist',
      attachments: null,
      shared_with_therapist: true,
      created_at: dayOffsetISO(-7, '20:00:00'),
      updated_at: dayOffsetISO(-7, '20:00:00'),
    },
  ];

  const notifications = [
    {
      id: genId(),
      user_id: THERAPIST_ID,
      type: 'message',
      title: 'New message',
      message: 'Lotte Vermeulen sent you a message.',
      related_id: conversationId1,
      related_type: 'conversation',
      is_read: false,
      read: false,
      created_at: dayOffsetISO(0, '08:46:00'),
      updated_at: dayOffsetISO(0, '08:46:00'),
    },
    {
      id: genId(),
      user_id: THERAPIST_ID,
      type: 'session',
      title: 'Upcoming session',
      message: 'You have a session with Lotte Vermeulen today at 11:00.',
      related_id: null,
      related_type: 'session',
      is_read: false,
      read: false,
      created_at: dayOffsetISO(0, '07:00:00'),
      updated_at: dayOffsetISO(0, '07:00:00'),
    },
    {
      id: genId(),
      user_id: THERAPIST_ID,
      type: 'journal',
      title: 'Journal shared',
      message: 'Lotte Vermeulen shared a journal entry with you.',
      related_id: null,
      related_type: 'journal',
      is_read: true,
      read: true,
      created_at: dayOffsetISO(-1, '07:31:00'),
      updated_at: dayOffsetISO(-1, '07:31:00'),
    },
    {
      id: genId(),
      user_id: THERAPIST_ID,
      type: 'task',
      title: 'Task completed',
      message: 'Thomas De Smet completed "Communication worksheet".',
      related_id: null,
      related_type: 'task',
      is_read: true,
      read: true,
      created_at: dayOffsetISO(-4, '15:00:00'),
      updated_at: dayOffsetISO(-4, '15:00:00'),
    },
  ];

  // Post-session working-alliance micro-checks left by clients.
  const session_feedback = [
    {
      id: genId(),
      session_id: sessionLottePastId,
      client_id: CLIENT_ID,
      alliance_rating: 5,
      note: 'Felt really heard today — the sleep plan makes sense.',
      created_at: dayOffsetISO(-7, '11:05:00'),
    },
    {
      id: genId(),
      session_id: sessionThomasPastId,
      client_id: CLIENT_ID_3,
      alliance_rating: 4,
      note: 'Useful, though the exercises felt a little fast.',
      created_at: dayOffsetISO(-3, '15:35:00'),
    },
  ];

  // Between-session "I'm not okay this week" flags from client → therapist.
  // One UNACKNOWLEDGED distress flag for Lotte so the therapist sees an alert.
  const client_checkins = [
    {
      id: genId(),
      client_id: CLIENT_ID,
      therapist_id: THERAPIST_ID,
      kind: 'distress',
      note: "I'm having a really hard week and could use an earlier session.",
      acknowledged_at: null,
      created_at: dayOffsetISO(-1, '22:40:00'),
    },
  ];

  return {
    profiles,
    client_therapist_relationships,
    clients: [],
    sessions,
    session_feedback,
    client_checkins,
    tasks,
    conversations,
    messages,
    journal_entries,
    notifications,
    // Everything else: empty arrays.
    message_attachments: [],
    external_messages: [],
    google_calendar_connections: [],
    user_devices: [],
    local_documents: [],
    messaging_sessions: [],
    admin_users: [],
    admin_notification_settings: [],
    ai_settings: [],
    audit_logs: [],
    questionnaire_templates: [],
    questionnaire_questions: [],
    client_questionnaires: [],
    questionnaire_responses: [],
  };
}

const SEED = buildSeed();

/* -------------------------------------------------------------------------- */
/* Chainable, thenable query builder                                          */
/* -------------------------------------------------------------------------- */

class MockQueryBuilder {
  private table: string;
  private rows: any[];
  private eqFilters: Array<{ column: string; value: any }> = [];
  private inFilters: Array<{ column: string; values: any[] }> = [];
  private isSingle = false;
  private isMaybeSingle = false;
  private limitCount: number | null = null;
  private rangeBounds: { from: number; to: number } | null = null;
  private orderSpecs: Array<{ column: string; ascending: boolean }> = [];
  // For insert/update/upsert: data to echo back instead of the seed table.
  private mutationData: any[] | null = null;
  // Raw `select(...)` columns string, used to disambiguate embedded-join aliases
  // (e.g. which fkey a `profiles!...` join targets on relationship rows).
  private selectStr = '';

  constructor(table: string) {
    this.table = table;
    this.rows = Array.isArray(SEED[table]) ? [...SEED[table]] : [];
  }

  /* --- mutation methods --- */

  insert(rows: any) {
    const arr = Array.isArray(rows) ? rows : [rows];
    this.mutationData = arr.map((r) => ({
      id: r?.id ?? genId(),
      created_at: r?.created_at ?? NOW_ISO,
      ...r,
    }));
    return this;
  }

  update(vals: any) {
    // Echo the patched values; in explore mode we don't persist.
    this.mutationData = [{ id: vals?.id ?? genId(), ...vals }];
    return this;
  }

  upsert(rows: any) {
    const arr = Array.isArray(rows) ? rows : [rows];
    this.mutationData = arr.map((r) => ({
      id: r?.id ?? genId(),
      created_at: r?.created_at ?? NOW_ISO,
      ...r,
    }));
    return this;
  }

  delete() {
    this.mutationData = [];
    return this;
  }

  /* --- selection / projection --- */

  select(columns?: string) {
    this.selectStr = columns ?? '';
    return this;
  }

  /* --- filters (all chainable, return this) --- */

  eq(column: string, value: any) {
    this.eqFilters.push({ column, value });
    return this;
  }

  neq(_column: string, _value: any) {
    return this;
  }

  in(column: string, values: any[]) {
    if (Array.isArray(values)) {
      this.inFilters.push({ column, values });
    }
    return this;
  }

  or(_filter: string) {
    return this;
  }

  and(_filter: string) {
    return this;
  }

  gte(_column: string, _value: any) {
    return this;
  }

  lte(_column: string, _value: any) {
    return this;
  }

  gt(_column: string, _value: any) {
    return this;
  }

  lt(_column: string, _value: any) {
    return this;
  }

  like(_column: string, _pattern: string) {
    return this;
  }

  ilike(_column: string, _pattern: string) {
    return this;
  }

  is(_column: string, _value: any) {
    return this;
  }

  contains(_column: string, _value: any) {
    return this;
  }

  match(criteria: Record<string, any>) {
    if (criteria && typeof criteria === 'object') {
      for (const [column, value] of Object.entries(criteria)) {
        this.eqFilters.push({ column, value });
      }
    }
    return this;
  }

  filter(_column: string, _operator: string, _value: any) {
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderSpecs.push({ column, ascending: opts?.ascending !== false });
    return this;
  }

  range(from: number, to: number) {
    this.rangeBounds = { from, to };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  throwOnError() {
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  /* --- resolution --- */

  private applyFilters(rows: any[]): any[] {
    let result = rows;
    for (const f of this.eqFilters) {
      result = result.filter((row) => row?.[f.column] === f.value);
    }
    for (const f of this.inFilters) {
      result = result.filter((row) => f.values.includes(row?.[f.column]));
    }
    return result;
  }

  private applyOrder(rows: any[]): any[] {
    if (this.orderSpecs.length === 0) return rows;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      for (const spec of this.orderSpecs) {
        const av = a?.[spec.column];
        const bv = b?.[spec.column];
        if (av === bv) continue;
        if (av == null) return spec.ascending ? -1 : 1;
        if (bv == null) return spec.ascending ? 1 : -1;
        const cmp = av < bv ? -1 : 1;
        return spec.ascending ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }

  /**
   * Emulate Supabase embedded-resource selects by attaching related profile(s)
   * under the common alias keys the app's queries/components read. The mock
   * ignores the actual `select(...)` string, so we attach under MULTIPLE
   * plausible aliases — whichever key a given query/component expects will be
   * present. Lookups resolve against the in-memory `profiles` seed by id.
   *
   * Rules:
   *  - operate on a shallow COPY of the row (never mutate the seed);
   *  - only attach when the source id field exists on the row; if no matching
   *    profile is found, attach `null` (never throw, never drop the row).
   */
  private attachRelations(row: any): any {
    if (!row || typeof row !== 'object') return row;

    const profilesSeed: any[] = Array.isArray(SEED.profiles) ? SEED.profiles : [];
    const profileById = (id: any) =>
      id == null ? null : profilesSeed.find((p) => p?.id === id) ?? null;

    const enriched = { ...row };

    switch (this.table) {
      case 'client_therapist_relationships': {
        const client = 'client_id' in row ? profileById(row.client_id) : null;
        const therapist = 'therapist_id' in row ? profileById(row.therapist_id) : null;
        enriched.client = client;
        enriched.client_profile = client;
        enriched.therapist = therapist;
        enriched.therapist_profile = therapist;
        // Both the client side (getConnectedTherapists, joins via therapist_id_fkey)
        // and the therapist side (getClientsForTherapist, joins via client_id_fkey)
        // read `relationship.profiles`. The mock ignores the real join, so pick
        // the target from the select string's fkey hint; default to the client
        // (the therapist-side shape, which most relationship reads expect).
        const sel = this.selectStr;
        if (/therapist_id_fkey/.test(sel)) {
          enriched.profiles = therapist;
        } else {
          enriched.profiles = client;
        }
        break;
      }
      case 'sessions': {
        if ('client_id' in row) {
          const client = profileById(row.client_id);
          enriched.client = client;
          enriched.profiles = client;
          enriched.client_profile = client;
        }
        if ('therapist_id' in row) {
          enriched.therapist = profileById(row.therapist_id);
        }
        break;
      }
      case 'tasks': {
        if ('client_id' in row) {
          const client = profileById(row.client_id);
          enriched.client = client;
          enriched.profiles = client;
          enriched.client_profile = client;
        }
        if ('therapist_id' in row) {
          enriched.therapist = profileById(row.therapist_id);
        }
        break;
      }
      case 'messages': {
        if ('sender_id' in row) {
          const sender = profileById(row.sender_id);
          enriched.sender = sender;
          enriched.sender_profile = sender;
          enriched.profiles = sender;
        }
        if ('recipient_id' in row) {
          enriched.recipient = profileById(row.recipient_id);
        }
        break;
      }
      case 'conversations': {
        if ('client_id' in row) {
          enriched.client = profileById(row.client_id);
        }
        if ('therapist_id' in row) {
          enriched.therapist = profileById(row.therapist_id);
        }
        break;
      }
      case 'journal_entries': {
        if ('client_id' in row) {
          const client = profileById(row.client_id);
          enriched.client = client;
          enriched.profiles = client;
          enriched.client_profile = client;
        }
        break;
      }
      default:
        return row;
    }

    return enriched;
  }

  private resolve(): { data: any; error: null } {
    // Mutations echo their input rows.
    if (this.mutationData !== null) {
      let data: any = this.mutationData;
      if (this.isSingle || this.isMaybeSingle) {
        data = data.length > 0 ? data[0] : null;
      }
      return { data, error: null };
    }

    let result = this.applyFilters(this.rows);
    result = this.applyOrder(result);

    if (this.rangeBounds) {
      result = result.slice(this.rangeBounds.from, this.rangeBounds.to + 1);
    }
    if (this.limitCount != null) {
      result = result.slice(0, this.limitCount);
    }

    // Attach related profiles under the alias keys the app reads.
    result = result.map((row) => this.attachRelations(row));

    if (this.isSingle || this.isMaybeSingle) {
      return { data: result.length > 0 ? result[0] : null, error: null };
    }

    return { data: result, error: null };
  }

  // Thenable: makes `await builder...` resolve to { data, error: null }.
  then(onFulfilled?: (value: { data: any; error: null }) => any, _onRejected?: any) {
    const value = this.resolve();
    return Promise.resolve(value).then(onFulfilled);
  }

  catch(_onRejected?: any) {
    return Promise.resolve(this.resolve());
  }

  finally(onFinally?: () => void) {
    return Promise.resolve(this.resolve()).finally(onFinally);
  }
}

/* -------------------------------------------------------------------------- */
/* RPC                                                                        */
/* -------------------------------------------------------------------------- */

function rpc(name: string, _args?: any) {
  let value: { data: any; error: null };
  switch (name) {
    case 'get_unread_message_counts':
      value = { data: [], error: null };
      break;
    case 'mark_conversation_messages_read':
    case 'mark_messages_as_read':
      value = { data: null, error: null };
      break;
    default:
      value = { data: null, error: null };
      break;
  }
  // Return a thenable so both `await supabase.rpc(...)` and `.then()` work.
  return {
    then(onFulfilled?: (v: typeof value) => any) {
      return Promise.resolve(value).then(onFulfilled);
    },
    catch() {
      return Promise.resolve(value);
    },
    finally(onFinally?: () => void) {
      return Promise.resolve(value).finally(onFinally);
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Realtime channels (no-op)                                                  */
/* -------------------------------------------------------------------------- */

function channel(_name: string) {
  const ch: any = {
    on() {
      return ch;
    },
    subscribe(cb?: (status: string) => void) {
      if (cb) cb('SUBSCRIBED');
      return ch;
    },
    unsubscribe() {
      return Promise.resolve('ok');
    },
    send() {
      return Promise.resolve('ok');
    },
    track() {
      return Promise.resolve('ok');
    },
    untrack() {
      return Promise.resolve('ok');
    },
  };
  return ch;
}

/* -------------------------------------------------------------------------- */
/* Storage (no-op)                                                            */
/* -------------------------------------------------------------------------- */

function storageFrom(_bucket: string) {
  return {
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
    upload: async () => ({ data: null, error: null }),
    download: async () => ({ data: null, error: null }),
    remove: async () => ({ data: null, error: null }),
    createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
    list: async () => ({ data: [], error: null }),
  };
}

/* -------------------------------------------------------------------------- */
/* Auth (no-op, always "signed in" as the dev therapist)                      */
/* -------------------------------------------------------------------------- */

const auth = {
  getSession: async () => ({ data: { session: MOCK_SESSION }, error: null }),
  getUser: async () => ({ data: { user: MOCK_USER }, error: null }),
  onAuthStateChange: (_cb?: any) => ({
    data: { subscription: { unsubscribe() {} } },
  }),
  signOut: async () => ({ data: {}, error: null }),
  setSession: async () => ({ data: { session: MOCK_SESSION, user: MOCK_USER }, error: null }),
  refreshSession: async () => ({ data: { session: MOCK_SESSION, user: MOCK_USER }, error: null }),
  signInWithPassword: async () => ({ data: { session: MOCK_SESSION, user: MOCK_USER }, error: null }),
  signUp: async () => ({ data: { session: MOCK_SESSION, user: MOCK_USER }, error: null }),
  signInWithOAuth: async () => ({ data: { provider: 'mock', url: '' }, error: null }),
  updateUser: async () => ({ data: { user: MOCK_USER }, error: null }),
  resetPasswordForEmail: async () => ({ data: {}, error: null }),
};

/* -------------------------------------------------------------------------- */
/* Client factory                                                             */
/* -------------------------------------------------------------------------- */

function createMockSupabaseClient() {
  return {
    from: (table: string) => new MockQueryBuilder(table),
    rpc,
    channel,
    removeChannel: () => Promise.resolve('ok'),
    removeAllChannels: () => Promise.resolve('ok'),
    getChannels: () => [],
    functions: {
      invoke: async () => ({ data: null, error: null }),
    },
    storage: {
      from: storageFrom,
    },
    auth,
  };
}

export const mockSupabase: any = createMockSupabaseClient();

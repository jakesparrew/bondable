# Neon / Drizzle Data-Foundation — Migration Notes

Date: 2026-06-15
Scope: Task #12 — stand up the new Neon + Drizzle + `@neondatabase/serverless`
data layer **alongside** the existing Supabase stack (purely additive).

> IMPORTANT: This foundation was generated **without a live Neon connection**.
> The Drizzle schema was verified against the documented table model and the
> Supabase migration source files — it has **NOT** yet been pushed to or
> verified against a real Neon database. Run `drizzle-kit generate` and review
> the emitted SQL, then `push` against a throwaway Neon branch before trusting
> it. See "Verification status" at the bottom.

---

## 0. Files added by this task (all additive)

| File | Purpose |
|------|---------|
| `src/server/db/schema.ts` | Drizzle schema: enum + 23 tables + relations + inferred types |
| `src/server/db/index.ts` | Neon HTTP client (`db`) wired to Drizzle; pooled-variant guidance |
| `drizzle.config.ts` | drizzle-kit config (dialect `postgresql`, schema/out/dbCredentials) |
| `docs/.../2026-06-15-neon-migration-notes.md` | This note |

None of the existing Supabase code (`src/integrations/supabase/*`, `supabase/migrations`, `supabase/functions`) is modified or removed. The two stacks coexist until the later migration tasks (#13–#16) cut traffic over.

---

## 1. Install the new dependencies

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

- `drizzle-orm` — runtime ORM (imported by `schema.ts` and `index.ts`).
- `@neondatabase/serverless` — Neon driver (HTTP `neon()` + `Pool`).
- `drizzle-kit` (dev) — migration generator / pusher, used only at build/dev time.

No existing dependency is changed; `@supabase/supabase-js` stays.

---

## 2. Apply / generate

1. **Provide the connection string.** Add to `.env.local` (gitignored — never commit):

   ```
   DATABASE_URL=postgresql://<user>:<password>@<host>.neon.tech/<db>?sslmode=require
   ```

   `drizzle.config.ts` and `src/server/db/index.ts` both read `process.env.DATABASE_URL`. Locally, ensure it is loaded (e.g. run drizzle-kit through a tool that loads `.env.local`, or export it in the shell, or use `dotenv -e .env.local --`). On Vercel, set it as a project env var.

2. **Generate SQL migrations from the schema** (writes to `./drizzle`):

   ```bash
   npx drizzle-kit generate
   ```

3. **Push to Neon** (dev / first bring-up — applies the schema directly):

   ```bash
   npx drizzle-kit push
   ```

   Prefer `generate` + reviewed migration files for anything heading toward production; `push` is convenient for a dev branch.

> Recommended: do the first `push` against a **Neon branch** (Neon's instant
> DB branching) so the main branch is never touched by an unverified schema.

---

## 3. Schema reconciliation decisions baked into `schema.ts`

The Supabase source has two layers: the chronological 2025 history (what ran in
prod = behavior truth) and the 20260424 bootstrap reconstruction (intended final
shape). Where they diverged, the schema picked the reconstructed **shape** and
left **behavior/CHECK** enforcement to the API layer:

- **`user_role` enum** = `('therapist','client','admin')` (reconstruction).
- **`messages.message_type`** DEFAULT `'text'`, no CHECK. `sequence_number` is a
  `bigserial` (equivalent monotonic numbering to the prod `message_sequence_seq`).
- **`sessions.status`** DEFAULT `'scheduled'`, no DB CHECK — but the 6-state
  approval state machine (`client_requested → therapist_confirmed → …`) must be
  enforced at the API layer; the request/approve UX depends on it.
- **`tasks.status`** DEFAULT `'pending'`; reconcile the `assigned`/`pending`
  vocabulary used inconsistently by the dashboard RPCs at the API layer.
- **`external_messages.status`** DEFAULT `'queued'`; **`messaging_sessions.state`**
  DEFAULT `'idle'` (reconstruction values).
- **Partial indexes carried over**: `idx_profiles_invite_code`,
  `notifications(user_id) WHERE is_read=false`. Add the message-read partial
  index (`messages(conversation_id,recipient_id) WHERE read_at IS NULL`) when
  the messaging read-path is re-homed (see §4 inventory).
- **CHECK constraints not expressed in Drizzle** (`questionnaire_questions.question_type`,
  `client_questionnaires.status`, `external_messages.channel/direction`,
  `messaging_sessions.channel/actor_role`, legacy `clients.status`) — enforce in
  API validation (zod) and/or add via raw SQL in a follow-up migration.
- **`profiles.id`** is a plain PK uuid (no FK) — in Neon it maps to the external
  Stack Auth / Neon Auth user id, not `auth.users`.

---

## 4. FULL security inventory and recommended re-home

Drizzle pushes table/column/FK/index DDL only. **Every** RLS policy, SECURITY
DEFINER function, trigger, and storage rule below must be re-homed deliberately.
There is no `auth.uid()` / `auth.role()` / `auth.users` in Neon — replace each
with the JWT/identity equivalent (Neon RLS reads the verified JWT, or the API
layer derives the user id from the Stack Auth session).

### 4a. Row-Level Security policies → re-home target

Canonical pattern: **API-layer authorization** is the primary recommendation
(every read/write goes through a Vercel function that derives the caller id from
the Stack Auth session and scopes queries with Drizzle `where` clauses). Neon RLS
+ JWT can additionally be layered as defense-in-depth where noted.

| Table | Policy intent | Recommended re-home |
|-------|---------------|---------------------|
| `profiles` | self read/update/insert; read related (via active relationship); admin read | API-layer scope by `sub`; optional Neon RLS mirroring `id = jwt.sub` + relationship EXISTS + admin check |
| `client_therapist_relationships` | participant (client or therapist) full access | API-layer: caller must be `client_id` or `therapist_id` |
| `conversations` | participant read/insert/update | API-layer participant check |
| `messages` | participant read; sender-only insert; participant update | API-layer; sender id forced from session, never client input |
| `message_attachments` | via parent message participant (insert: sender only) | API-layer join check on parent message |
| `journal_entries` | client full; therapist read when shared + active relationship | API-layer: client owns; therapist gated by `is_shared_with_therapist` + active relationship / `shared_with_therapists` |
| `notifications` | self read/update/delete | API-layer `user_id = sub` |
| `sessions` | participant read/insert/update/delete | API-layer participant check + state-machine guard |
| `tasks` | participant read; therapist-only insert/delete; participant update | API-layer role check (therapist for insert/delete) |
| `google_calendar_connections` | self (ALL) | API-layer `user_id = sub`; refresh_token never returned to client |
| `local_documents` | self (ALL) | API-layer `user_id = sub` |
| `user_devices` | self (ALL) | API-layer `user_id = sub` |
| `clients` (legacy) | therapist-only (ALL) | API-layer `therapist_id = sub` |
| `admin_users` / `admin_notification_settings` / `ai_settings` / `audit_logs` | admin-only (ALL) | API-layer admin guard (single canonical `isAdmin(sub)` helper) |
| `external_messages` | participant SELECT (history also allowed therapist INSERT) | API-layer SELECT for participants; **inbound** rows written server-side by the Twilio webhook with elevated DB creds, bypassing per-user checks |
| `messaging_sessions` | **deny-all (service-role only)** — keep this | NO client access. Only server-side messaging functions touch it. Do **not** adopt the leakier reconstruction own-row policy |
| `questionnaire_templates` | owner read/ALL (+ admin read) | API-layer `therapist_id = sub` (admin read via admin guard) |
| `questionnaire_questions` | via parent template owner | API-layer join check on parent template |
| `client_questionnaires` | participant read; therapist insert/update/delete | API-layer role check |
| `questionnaire_responses` | participant read; client-only write | API-layer: read for participants, write only when caller = `client_id` |

### 4b. SECURITY DEFINER functions / RPCs → re-home target

These bypass RLS in Supabase. Drizzle does **not** run them. Re-home as **trusted
server-side endpoints / service functions** (TypeScript in Vercel functions) or,
where the all-or-nothing transactional guarantee matters, as Postgres functions
invoked by the trusted server.

| Function(s) | Re-home target |
|-------------|----------------|
| `is_admin_user`, `get_user_role`, `get_current_user_email`, `get_current_user_role` | Single canonical TS helper (`isAdmin`, `getRole`) reading the verified JWT + `admin_users`/`profiles.role`. **Pick ONE admin signal** (history = `admin_users` only; reconstruction also accepts `profiles.role='admin'`) and document it |
| `handle_new_user` (+ `on_auth_user_created` trigger) | Stack Auth post-signup hook / Vercel route: create `profiles` row, derive role from signup metadata, run temp-`clients` cleanup (`status='Pending'`) |
| `generate_invite_code`, `set_therapist_invite_code` | API-layer code generation on therapist creation. (Trigger was never wired in prod; invite codes are app-set) |
| `assign_questionnaire`, `upsert_questionnaire_response`, `submit_questionnaire` | Server endpoints with the full validation logic (template published, caller = client/therapist, active relationship, snapshot integrity, required-answer check). Keep as a Postgres function called by the server **only if** the multi-step UPSERT needs to be atomic |
| `create_admin_user`, `remove_admin_user`, `grant_admin_access`, `revoke_admin_access` | **One guarded admin endpoint.** History had unguarded `grant/revoke` + a `revoke` self-referential WHERE bug — do not port. Guard via canonical `isAdmin`; decide whether to flip both `admin_users` AND `profiles.role` |
| `create_notification` | Server helper (insert notification; truncate title/message) |
| `audit_trigger` | DB trigger (keep in Postgres for tamper-resistance) OR server-side audit write on each mutation. If kept as trigger, replace `auth.uid()` with a session GUC set by the server |
| `update_*_updated_at` (all updated_at triggers) | Keep as Postgres `BEFORE UPDATE` triggers (add via raw SQL migration after `push`); simplest + race-free. Alternatively set `updatedAt` in Drizzle on every update |
| `update_conversation_on_message` (+ triggers) | Server-side message-send service: set sequence number, bump conversation `last_message_at`/preview/unread counts. Could remain a Postgres trigger |
| message read/status RPCs (`mark_messages_as_read*`, `mark_message_delivered`, `update_message_status`, `mark_conversation_messages_read`) | Server endpoints with the state-machine guards (`sending→sent→delivered→read`) |
| `get_unread_message_counts` (final = SECURITY INVOKER), `get_conversation_messages_optimized`, `get_dashboard_stats_optimized` | Server-side Drizzle queries. Align tasks filter (`assigned` vs `pending`) and sessions filter (`Confirmed` vs date-only) with the chosen status vocabulary |
| `cleanup_old_data`, `cleanup_old_notifications`, `cleanup_stale_connections` | Vercel Cron job(s) |
| `set_session_created_by` | N/A — `created_by` dropped in reconstruction; session-creator captured server-side if needed |
| `update_typing_status` | Replaced by the realtime layer (§4d) — no DB function |
| diagnostics (`analyze_realtime_performance`, `log_slow_queries`, `test_trigger_function`) | Drop — non-load-bearing |

### 4c. Storage buckets → re-home target

Supabase Storage + its `storage.objects` RLS policies must move to a blob store
(e.g. **Vercel Blob** or S3-compatible) fronted by Vercel functions that enforce
the equivalent authorization. Keep the file-path/URL columns
(`avatar_url`, `journal_entries.attachments`, `message_attachments.file_url`,
`local_documents.file_url`) — only the backing store + access control move.

| Bucket | Source posture | Re-home |
|--------|----------------|---------|
| `avatars` (public) | Fully open ALL policy | Public-read blob; uploads via authenticated server route |
| `journal-attachments` (private) | Owner by path segment; therapists read shared entries | Private blob; signed URLs via server route enforcing owner OR shared-therapist (sharing_type `all`/`specific`) |
| `message-attachments` (private, 50MB, image/video/audio/pdf) | Any authenticated user | Private blob; server route restricts to conversation participants; enforce size + MIME |
| `local-documents` (private) | Owner by path segment | Private blob; server route enforces `user_id = sub` |

### 4d. Realtime → re-home target

Supabase Realtime (Postgres logical replication; publication tables =
`messages`, `conversations`, `message_attachments`, `tasks`, `notifications`,
`external_messages`, all `REPLICA IDENTITY FULL`) does not exist on Neon.
Re-home as a **WebSocket / SSE layer** (e.g. a dedicated WS service, Pusher/Ably,
or SSE from Vercel) or short-interval polling for: live chat, typing indicators,
unread counts, task/notification updates.

### 4e. Edge functions (`supabase/functions/*`) → Vercel routes

All run as `service_role` and bypass RLS; they encode business rules absent from
the schema. Move to Vercel serverless/edge functions with server-side auth.

| Function | Re-home note |
|----------|--------------|
| `get-secret` | **DANGEROUS** — returns any env secret to the caller, no auth. Do **NOT** port as-is. Read secrets server-side only |
| `cleanup-pending-client`, `get-client-data` | Server routes using elevated DB creds; keep `status='Pending'` matching by id+email |
| `send-client-invitation` | Server route → Resend email (`app.bondable.co/setup-password?clientId=`) |
| `twilio-webhook` | Server route; **fix** the signature check that allows when unconfigured — require valid `x-twilio-signature`. Routes via `messaging_sessions`, writes `external_messages` + `messages` server-side |
| `ai-chat`, `google-calendar-sync`, `send-admin-notification`, `send-push`, `send-session-notification`, `send-twilio-message` | Server routes holding env secrets (Resend, Twilio, OpenAI, FCM/push); never expose secrets to the client |

---

## 5. Remaining migration layers (later tasks #13–#16)

1. **Auth → Neon Auth (Stack Auth)** (#13): replace Supabase Auth; `profiles.id`
   becomes the Stack Auth user id; port `handle_new_user` to a signup hook.
2. **API / data layer** (#14): replace `supabase.from(...)` calls throughout
   `src/` with calls to Vercel functions backed by Drizzle (`src/server/db`).
   This is where the §4a/§4b authorization is actually enforced.
3. **Realtime, storage, edge functions → Vercel** (#15): §4c/§4d/§4e above.
4. **Stripe** (#16): server-side payments (new — not in the Supabase schema).

---

## 6. Verification status

- [x] Schema modeled against the documented table model + Supabase migration source.
- [x] Drizzle column names/types/nullability/defaults reviewed against source.
- [ ] `drizzle-kit generate` run and emitted SQL reviewed.
- [ ] `drizzle-kit push` applied to a Neon branch and the live shape diffed.
- [ ] CHECK constraints + Postgres triggers (updated_at, audit, conversation
      bump) added via follow-up raw SQL migration.
- [ ] RLS / authorization re-homed (tasks #13–#15).

**This was generated WITHOUT a live DB connection.** Treat the schema as
correct-by-construction but unverified against Neon until the boxes above are checked.

# 08 — Architecture & Backend: Mock → Production

**Thesis.** Bondable ships today as a Vite SPA running entirely against an in-memory mock Supabase client (`src/integrations/supabase/mockClient.ts`, 88 `supabase.*` call sites across 38 files). The path to production is NOT a rewrite: we keep the Vite SPA, insert a **backend adapter seam** under the existing ~24 `src/services/api/*` modules in Phase 1, build the production stack (Vercel `/api` + Neon Postgres/Drizzle + Better Auth + Resend + FCM + Stripe + PostHog EU + Sentry) behind that seam through Phases 2–3, and flip the switch per-domain in Phase 4 — while **mock mode survives forever as the sales-demo environment**. Everything user-money-touching (billing, Bond LLM, health data) is server-side only; the SPA never holds a privileged key.

---

## Decisions

1. **Stay on Vite SPA + React Router; do NOT migrate to Next.js.** Rationale: ~40 routes already wired in `src/App.tsx` on react-router v6, Capacitor mobile shell requires a static SPA bundle anyway, and a Next migration burns 3–4 weeks with zero user-visible value. Tradeoff accepted: no SSR for the public finder → weaker SEO. Mitigation: Phase 5 ticket to pre-render `/find` and `/find/:providerId` as static HTML at build/cron time (Vercel prerender or a tiny `/api/og` + sitemap job). If finder SEO becomes the growth engine, revisit Next for the *public* pages only (separate app, same Neon DB) — never for the dashboards.
2. **Vercel serverless `/api` with Hono + Zod, one deployable.** A single Vercel project hosts the SPA build and `/api/*` functions (Hono router in `api/[[...route]].ts`). Zod schemas shared between server and client give end-to-end types without codegen. Tradeoff: serverless cold starts (~200–400ms on Node runtime with Neon HTTP driver — acceptable; use `@neondatabase/serverless` + Drizzle `neon-http` to avoid TCP pool pain).
3. **Backend adapter interface (`mock | neon`), not a big-bang swap.** Services stop importing `supabase` and import a typed `backend` facade. Mock implementation wraps the existing mockClient data; neon implementation calls `/api`. Selected by `VITE_BACKEND` env + runtime override for demo. Tradeoff: a few weeks where both paths exist and must be kept green — worth it because demo mode is a permanent product requirement (sales, homepage demo-entry panel per `bondable-demo-entry`).
4. **Better Auth on Neon (NOT Stack Auth, NOT Supabase Auth).** Email+password, magic-link, and the official `organization` plugin for group practices (owner/manager/staff roles map directly to the provider-generalization ask). Sessions = httpOnly cookies; the SPA reads a `/api/me` bootstrap. Tradeoff: we own account-security surface (rate limits, email verification) instead of renting it — mitigated by Better Auth's built-ins + Vercel WAF.
5. **Realtime v1 = smart polling. No Pusher/Ably yet.** react-query `refetchInterval` tuned per surface (messages open thread: 5s; notification bell: 30s; leads inbox: 60s), backed by cheap `?updated_since=` endpoints returning 304-style empty diffs. Decide now: **SSE via a single Vercel Edge function is v2 (Phase 5)**; third-party websockets only if SSE proves insufficient. Rationale: pre-launch user counts make polling free; every realtime vendor is another DPA (GDPR Art. 9 data in messages).
6. **One unified notification system: `notifications` table + `notification_events` outbox + a dispatcher cron.** Every domain event (session confirmed, task assigned, check-in flagged, lead received, Bond escalation) writes ONE event row; the dispatcher fans out to in-app / email (Resend) / push (FCM) per `notification_preferences`. Replaces today's three ad-hoc paths (`notificationService`, `sessionNotificationService`, `adminNotificationService`) — **REBUILD**. Tradeoff: outbox adds one table and a cron, but buys idempotency, digest batching, and an audit trail for free.
7. **Bond = server-side Claude API only, with a supervision pipeline.** `claude-fable-5` default for quality; per-message router can downshift to `claude-haiku-4-5` for chit-chat turns; the existing client-side scripted engine (`src/components/bond/bondEngine` swap point, line ~32) becomes the **offline/demo fallback**, never removed. Crisis regexes stay client-side as a zero-latency pre-filter AND run server-side as authoritative. Every turn is audit-logged; providers get a review console feed. Tradeoff: latency + cost per message vs. trust — non-negotiable given supervised-AI framing.
8. **Stripe Billing with 3 products (Free/Pro/Practice), Practice priced per seat.** Checkout + Customer Portal hosted by Stripe (no card forms in our UI = lighter PCI + faster). Webhooks are the single source of truth into a `subscriptions` table; entitlements resolved server-side. Tradeoff: Stripe-hosted pages break visual continuity for one screen — acceptable.
9. **PostHog EU Cloud for analytics + feature flags; Sentry for errors; both wired early (Phase 2) but consent-gated.** Analytics events NEVER include health-data payloads (event names + ids only). Feature flags: PostHog flags for experiments, plus a DB `feature_flags` table for entitlement-style gates (so billing tiers don't depend on a third party being up).
10. **GDPR P0s land BEFORE any real user exists (gate on Phase 4 cutover):** authorization policy layer (RLS-equivalent) on every `/api` route, app-layer AES-256-GCM encryption for clinical free-text (journal bodies, recaps, check-in notes, Bond transcripts), append-only `audit_logs` writes on all Art. 9 reads/writes, consent records, export + erasure endpoints. Tradeoff: encrypted columns can't be SQL-searched — accepted; search happens post-decrypt in the API layer for the small per-user datasets involved.
11. **Old `supabase/functions/*` are retired, not ported.** `send-client-invitation`/`send-admin-notification`/`send-session-notification` → the unified notification dispatcher + Resend. `ai-chat` → `/api/bond`. `google-calendar-sync` → `/api/integrations/google` (Phase 5). `send-twilio-message`/`twilio-webhook` → **dropped** (SMS is a cost + compliance surface with no current product need; revisit if no-show rates demand it). `get-secret`, `cleanup-pending-client`, `get-client-data`, `send-push` → superseded by env vars, cron, export endpoint, dispatcher.

---

## 1. Target architecture

```
┌────────────────────────────  Vercel (EU region fra1)  ───────────────────────────┐
│                                                                                   │
│  Vite SPA (static)                    /api/* — Hono on Vercel Functions (Node)    │
│  React 18 · react-router · RQ  ──────▶  auth (Better Auth handler)                │
│  Capacitor wraps same bundle          routes/{sessions,tasks,journal,messages,    │
│                                        clients,providers,finder,intake,notifs,    │
│                                        bond,billing,admin,gdpr}                   │
│                                        middleware: session → policy → zod → rate  │
│                                        crons: /api/jobs/* (vercel.json)           │
│                                        webhooks: /api/webhooks/{stripe,resend}    │
└──────────┬──────────────┬──────────────┬──────────────┬───────────────┬──────────┘
           │              │              │              │               │
     Neon Postgres   Vercel Blob     Anthropic API   Stripe        Resend / FCM
     (Drizzle,       (attachments,   (Bond, server-  (billing,     (email / push
      EU region)      signed URLs)    side only)      portal)       fanout)
           │
     PostHog EU (events+flags) · Sentry (SPA+API) · Upstash Redis (rate limit, job locks)
```

- Repo layout: keep the SPA in `src/`; add `api/` (Vercel functions root), `src/server/` grows: `db/schema.ts` (exists, 27 tables), `db/policies.ts`, `services/*` (server-side domain logic shared by routes and crons), `email/*` (react-email templates), `bond/*` (pipeline). Shared Zod contracts in `src/shared/contracts/*` imported by both SPA and `api/`.
- All third parties EU-pinned where offered: Neon EU (Frankfurt), Vercel fra1, PostHog EU Cloud, Resend EU sending domain. DPA register lives in this repo: `docs/compliance/dpa-register.md` (Neon, Vercel, Anthropic, Stripe, Resend, Google/FCM, PostHog, Sentry, Upstash).

## 2. Service-layer strategy: the adapter seam

New module `src/services/backend/`:

```ts
// src/services/backend/types.ts
export interface BackendAdapter {
  kind: 'mock' | 'neon';
  auth: { me(): Promise<Me | null>; signIn(...): ...; signOut(): ... };
  request<T>(op: ApiOp, params: unknown): Promise<T>;   // typed by shared Zod contracts
  poll: { since(resource: PollResource, cursor: string): Promise<Diff> };
  upload(file: File, scope: UploadScope): Promise<StoredFile>;
}
// src/services/backend/index.ts — resolves from VITE_BACKEND ('mock'|'neon'),
// with localStorage 'bondable_demo_role' forcing mock (demo-entry stays intact).
```

Migration mechanics (this is the whole trick — no flag day):
1. **Phase 1:** create the facade; `mockAdapter` delegates to the existing `mockSupabase` (`mockClient.ts:1563`) unchanged. Zero behavior change.
2. **Phase 1–3:** as each `src/services/api/*` module gets touched by feature work, its `supabase.from(...)` chains are replaced by `backend.request()` calls against a named op (`'sessions.list'`, `'tasks.update'`, …) whose Zod contract lives in `src/shared/contracts/`. The mock adapter implements ops against mock data; there are ~24 modules + stray direct calls in hooks/pages (`useAuthManager.tsx` ×7, `useJournalEntries.ts` ×6, `Login.tsx`/`SetupPassword.tsx` ×4 — these pages get their calls hoisted into services; **REBUILD** of `src/services/api/optimized/*` which duplicates four services and must be merged into the canonical ones, not migrated twice).
3. **Phase 4:** `neonAdapter` implements the same ops as `fetch('/api/...')` with cookie auth. Cutover is per-domain: flip sessions first, watch, then tasks, journal, messages, finder, admin.
4. `src/services/utils/realtimeConnectionManager.ts` + `subscriptionManager.ts` are replaced by the polling module (`backend.poll`) — **REBUILD**, they target Supabase channels that will never exist.

Environment matrix:

| Env | `VITE_BACKEND` | Data | Auth | Emails | Use |
|---|---|---|---|---|---|
| Demo/sales (default `/` demo panel) | mock | in-memory seeds | role switch (localStorage) | rendered to in-app "Email preview" drawer | forever |
| Preview (Vercel PR) | neon | Neon branch DB (per-PR branch!) | Better Auth, test users | Resend test mode | QA |
| Production | neon | Neon main | Better Auth | Resend live | real users |

Neon DB **branching** gives every PR an isolated copy-on-write database — this is the killer reason Neon beats plain RDS for a solo founder; wire it into CI from day one.

## 3. Realtime

- v1 (Phase 2–3): polling endpoints `GET /api/poll?topics=messages:{threadId},notifications&cursor=<ts>` returning only deltas; single multiplexed call per app instead of N queries. Pause on `document.hidden`; exponential slow-down after 5 idle minutes.
- v2 (Phase 5): `GET /api/stream` SSE on Vercel Edge, same topic model, polling kept as automatic fallback. No vendor.

## 4. Unified notification system

Schema additions (`src/server/db/schema.ts`):
- `notification_events` (outbox): `id, type, actor_id, subject_type, subject_id, org_id, payload jsonb, created_at, dispatched_at, dedupe_key unique`.
- `notifications` (exists — extend): add `event_id fk, category enum('session','task','message','safety','billing','system','bond'), seen_at, cta_route`.
- `notification_preferences`: `user_id, category, channel enum('inapp','email','push'), enabled bool, digest enum('instant','daily','off')` — safety category is not disableable.

Flow: domain service writes event → dispatcher (`/api/jobs/dispatch-notifications`, cron every minute + fired inline post-write when cheap) resolves audience → writes `notifications` rows → sends email (Resend, react-email templates in `src/server/email/`) and push (FCM v1 API, tokens from existing `user_devices` table via `userDeviceService`) per prefs → digest-marked ones roll into the daily digest cron.

User-facing copy (email footer, every notification email):
- NL: *"Je ontvangt deze mail omdat je begeleider iets voor je klaarzette in Bondable. Voorkeuren aanpassen kan in Instellingen › Meldingen."*
- EN: *"You're receiving this because your provider set something up for you in Bondable. Manage preferences in Settings › Notifications."*

## 5. Bond LLM integration (the supervision pipeline)

`POST /api/bond/message` (auth: client role, active provider relationship required):

1. **Pre-filters (deterministic, before any LLM call):** server-side crisis classifier — port the 26 EN/NL regex patterns from the scripted engine + a cheap `claude-haiku-4-5` yes/no classification for ambiguous turns. On trigger: return the fixed crisis response (1813 BE / 113 NL, 112 emergency), write a `bond_audit_events` row with `severity='crisis'`, emit a `safety` notification to the supervising provider AND the admin flagged-chats queue (`AdminAllChats` already exists as the surface). **The model is never asked to counsel through a crisis.**
2. **System prompt builder** (`src/server/bond/systemPrompt.ts`): assembled from (a) fixed safety charter (supervised framing, no diagnosis, no medication advice, warm Flemish-professional tone, reply language = client's i18n locale), (b) provider-set goals/instructions per client (new table `bond_client_settings`: `client_id, provider_id, goals text, tone_hints, topics_offlimits, updated_at`) — this is the concrete "supervised by your provider" mechanism, (c) light context: first name, open task count, next session date (never journal bodies unless client toggled sharing).
3. **Model call:** `claude-fable-5`, `max_tokens: 700`, streaming to the client via fetch streams; prompt caching on the system block (90% input-cost cut on multi-turn). Model options documented in code: `claude-fable-5` (default, quality), `claude-haiku-4-5` (router target for logistics/small-talk turns, ~4× cheaper), upgrade path noted for future models.
4. **Post-filter:** output scanned for crisis-adjacent content, medical/diagnostic claims, and provider-impersonation; violations replaced with a safe fallback + audited.
5. **Audit logging:** `bond_messages` (encrypted body) + `bond_audit_events` (`turn_id, filters_fired, model, in_tokens, out_tokens, cost_cents, latency_ms`). Provider review console (plan file 05/06 owns the UI) reads `GET /api/bond/review?client_id=` — transcripts visible to the supervising provider per the consent captured at Bond activation (explicit Art. 9 consent screen, plan file on compliance owns copy).
6. **Cost controls:** per-client daily budget (default €0.15/day ≈ 40 fable turns with caching), org-level monthly cap, both in `bond_client_settings`/org settings; when hit, Bond says — NL: *"We hebben vandaag al veel besproken. Morgen praat ik graag verder — of stuur je begeleider een berichtje."* EN: *"We've covered a lot today. I'd love to continue tomorrow — or you can message your provider."* Budget events feed the owner cockpit.
7. Demo mode: mock adapter answers from the scripted engine — Bond demos never call the API.

## 6. Stripe subscriptions

- Products: `bondable_pro` (per-provider, monthly/yearly EUR), `bondable_practice` (per-seat, `quantity` = active staff, monthly/yearly). Free = absence of subscription. Prices in Stripe, mirrored read-only in `feature_flags`-adjacent `plans` config (code constant, not DB).
- Tables: `subscriptions` (`org_id/user_id, stripe_customer_id, stripe_subscription_id, plan, seats, status, current_period_end, cancel_at`), `webhook_events` (`stripe_event_id unique, type, processed_at, payload`) for idempotency.
- Flows: `POST /api/billing/checkout` → Stripe Checkout session (locale `nl-BE` capable); `POST /api/billing/portal` → Customer Portal; `POST /api/webhooks/stripe` handles `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed` (→ dunning notification event, `billing` category).
- Entitlements: `resolveEntitlements(userId)` server util → `{tier, features: Set<FeatureKey>, seats}`; every gated route checks it server-side; SPA gets it in `/api/me` for nudge UI (plan file on monetization owns nudges). **Payment never touches finder ranking — enforced structurally: the finder query module (`finderService` successor) has no join path to `subscriptions`; add a CI grep-test asserting the finder route files never import billing modules (dichotomieverbod-by-design).**
- Seats: Practice managers invite staff (Better Auth org invites); accepting an invite past seat count triggers `subscription_items` quantity update via API.
- `src/pages/Payments.tsx` placeholder → **REBUILD** as Billing settings page reading `/api/billing/summary`.

## 7. Background jobs (Vercel cron, `vercel.json`)

| Cron | Schedule | Job |
|---|---|---|
| `/api/jobs/dispatch-notifications` | `* * * * *` | outbox fanout |
| `/api/jobs/session-reminders` | `*/15 * * * *` | 24h + 2h reminders (writes events; PreSessionNudge alignment) |
| `/api/jobs/daily-digest` | `0 6 * * *` | provider morning digest (unacked check-ins, pending leads, today's sessions) |
| `/api/jobs/lifecycle-emails` | `0 8 * * *` | onboarding drip D0/D2/D7, trial-ending, win-back (plan 04 owns copy) |
| `/api/jobs/sla-nudges` | `0 * * * *` | unacknowledged client check-ins >24h → escalate to org manager |
| `/api/jobs/retention` | `0 3 * * 0` | GDPR retention sweeps, expired invite tokens, stale exports |
| `/api/jobs/finder-prerender` | `0 4 * * *` | regenerate finder sitemap/static profiles (Phase 5) |

All jobs take an Upstash Redis lock (`jobs:{name}`) and are idempotent via `dedupe_key`s.

## 8. Feature flags + event tracking

- `feature_flags` table (`key, description, enabled, rollout jsonb`) for kill-switches and entitlement-ish gates; PostHog EU flags for experiments; one client hook `useFlag(key)` resolves DB-first, PostHog-second.
- Event taxonomy (PostHog EU, consent-gated, no health payloads): `auth.signup`, `onboarding.step_completed`, `session.booked`, `task.completed`, `bond.turn` (count only), `finder.search`, `finder.request_sent`, `billing.checkout_started/completed`, `nudge.shown/clicked/dismissed`. Server-side capture for money events (webhooks), client-side for UX events. Owner cockpit (plan 09) reads PostHog + Neon aggregates.

## 9. Security & GDPR work items (deferred P0s from `bondable-known-issues`)

1. **AuthZ policy layer** (`src/server/db/policies.ts`): every route runs `assertCan(actor, action, resource)`; policies mirror what Supabase RLS would have been — client sees own rows; provider sees linked clients via `client_therapist_relationships` (renamed `client_provider_relationships`); org managers see org staff's clients only with explicit scope; admin routes require `admin_users` row + recent re-auth. Unit-tested as a pure function table.
2. **Encryption at rest for sensitive free text:** AES-256-GCM app-layer via a `encryptedText()` Drizzle custom type; key in Vercel env (versioned `key_id` column for rotation). Columns: `journal_entries.content`, session recaps, `client_checkins.note`, `bond_messages.body`, intake free-text answers.
3. **Audit logs:** `audit_logs` table exists (schema line 525) — wire an append-only write on every Art. 9 read/write with actor, purpose, resource; admin viewing client chats ALWAYS audited and surfaced to the owner cockpit.
4. **Consent records:** `consents` table (`user_id, kind enum('terms','privacy','bond_ai','journal_sharing','analytics'), version, granted_at, revoked_at`); Bond refuses to start without `bond_ai` consent.
5. **GDPR endpoints:** `GET /api/gdpr/export` (zip of profile, sessions, journal, messages, Bond transcripts — this doubles as the layer-4 "client-owned portable profile" primitive), `POST /api/gdpr/erase` (soft-delete + 30-day hard purge via retention cron).
6. **Transport/infra:** rate limiting (Upstash) on auth + Bond + finder-request routes; secrets only in Vercel env; the dormant edge functions deleted so no unauthenticated Deno endpoints ever get deployed by accident (the known CRITICAL).
7. **DPA register + records of processing** at `docs/compliance/` (compliance plan file owns prose; this plan owns the list existing).

## 10. Migration sequence (what gates what)

```
T-AB-1 adapter seam ─┬─▶ T-AB-2 rename/generalize ─▶ (all front-end plans build on this)
                     └─▶ T-AB-4 /api scaffold ─▶ T-AB-5 Neon+migrations ─▶ T-AB-6 Better Auth
T-AB-10 notif outbox (mock-capable) ─▶ T-AB-11 Resend ─▶ T-AB-12 FCM ─▶ lifecycle emails (plan 04)
T-AB-6 ─▶ T-AB-7 policy layer ─▶ T-AB-8/9 service cutover waves ─▶ T-AB-13 Stripe ─▶ T-AB-14 entitlements
T-AB-7 + T-AB-16 encryption ─▶ T-AB-18 Bond live   (Bond NEVER ships before authz+encryption+audit)
T-AB-13 + T-AB-14 ─▶ billing/nudges live (plan 04)
everything above ─▶ Phase 5 cockpit, SSE, prerender
```

Hard gates: **billing live** requires T-AB-6, 7, 13, 14, 22 (webhook idempotency). **Bond live** requires T-AB-6, 7, 16, 17, 18, 19 and the consent screen. **Any real user** requires T-AB-7, 16, 20 (GDPR endpoints), 21 (audit writes).

---

## Tickets

- T-AB-1 | Backend adapter seam | Create `src/services/backend/{types,index,mockAdapter}.ts`; facade over `mockSupabase` (mockClient.ts:1563); resolve from `VITE_BACKEND` + `bondable_demo_role`; no service rewrites yet | App runs identically in demo mode; adapter kind visible in a dev badge; zero direct `supabase` imports added going forward (lint rule) | M | n.a. | 1
- T-AB-2 | Provider generalization in schema + types | Rename in `src/server/db/schema.ts`: `userRole` gains `provider` (alias therapist), `client_therapist_relationships`→`client_provider_relationships`, add `provider_type enum('psychologist','therapist','coach','other')` + keep `is_regulated`; codemod service/type names; UI strings via i18n (plan 02 owns copy) | Drizzle migration generated; `grep -ri therapist src/server` returns only compat aliases; app boots in demo | L | n.a. | 1
- T-AB-3 | Organizations & staff schema | Add `organizations`, `organization_members(role enum('owner','manager','staff'))`, `org_id` FKs on provider-owned tables; mock seeds get one group practice ("Praktijk De Brug", 3 staff) | Schema migration + seed; policies drafted for org scoping | M | Practice | 1
- T-AB-4 | Vercel /api scaffold (Hono+Zod) | `api/[[...route]].ts` Hono app; shared contracts in `src/shared/contracts/`; health route; Sentry wrapping; deploy SPA+API as one Vercel project (fra1) | `GET /api/health` live on preview deploys; contract types imported by SPA compile | M | n.a. | 2
- T-AB-5 | Neon provisioning + Drizzle migrations + seed | Neon EU project; `drizzle-kit` migration pipeline; seed script reusing extracted mock seed module; Neon branch-per-PR in CI | Preview PR gets its own DB branch; `pnpm db:migrate && db:seed` green | M | n.a. | 2
- T-AB-6 | Better Auth on Neon | Better Auth handler mounted in Hono; email+password, magic link, email verification, `organization` plugin; `/api/me` bootstrap; replace demo-only `useAuthManager` internals behind the adapter (demo role switch preserved in mock mode) | Real signup/login on preview; sessions httpOnly; org invite accept flow works | L | n.a. | 4
- T-AB-7 | AuthZ policy layer (RLS-equivalent) | `src/server/db/policies.ts` pure-function policies + Hono middleware `assertCan`; matrix: client/provider/manager/owner/admin × resources | Policy unit-test table ≥40 cases green; every route registers a policy or fails CI | L | n.a. | 4
- T-AB-8 | Service cutover wave 1 (core clinical) | Sessions, tasks, journal, messages: implement neon ops in `/api`, port `SessionService/TaskService/sharedJournalService/simpleMessageService` to `backend.request`; hoist direct calls out of `useJournalEntries.ts`, pages | Demo mode unchanged; preview env full CRUD on the four domains; RQ caches keyed identically | L | n.a. | 4
- T-AB-9 | Service cutover wave 2 + optimized/* merge | Finder, intake, clients/providers, admin, invitations; **REBUILD**: merge `src/services/api/optimized/*` duplicates into canonical services before porting | No `supabase.from` remains outside mockAdapter; `optimized/` folder deleted | L | n.a. | 4
- T-AB-10 | Unified notification outbox + in-app center API | `notification_events` + extend `notifications` + `notification_preferences` tables; dispatcher job; mock adapter simulates fanout so the notification-center UI (plan 03) works in demo | Emitting `session.confirmed` produces an in-app notification in both modes; dedupe_key prevents doubles | L | n.a. | 2
- T-AB-11 | Resend email infra + demo email preview | Resend domain (EU), react-email templates (`src/server/email/`), NL+EN localized; in demo mode emails render to an in-app "Email preview" drawer instead of sending | Invite + session-reminder emails delivered on preview env; preview drawer shows same template in demo | M | n.a. | 2
- T-AB-12 | FCM push pipeline | FCM v1 server creds; device registration on app load via existing `userDeviceService`; dispatcher push channel; Capacitor push plugin wiring | Test push received on Android build; tokens pruned on 410 | M | Pro | 4
- T-AB-13 | Stripe products, checkout, webhooks, portal | `subscriptions` + `webhook_events` tables; `/api/billing/{checkout,portal,summary}`; webhook handler w/ idempotency; Practice per-seat quantity sync on org invites; **REBUILD** `src/pages/Payments.tsx` → Billing page data hooks | Test-mode upgrade Free→Pro reflected in `/api/me` ≤5s after webhook; failed payment emits dunning notification | L | Pro/Practice | 4
- T-AB-14 | Entitlements resolver + tier gates | `resolveEntitlements()`; server-enforced gates on Pro/Practice routes; `features` in `/api/me`; CI grep-test: finder route modules must not import billing (dichotomieverbod guard) | Gated route returns 403 for Free; nudge UI (plan 04) reads flags; CI guard fails on violation | M | Free/Pro/Practice | 4
- T-AB-15 | Smart polling realtime v1 | `GET /api/poll` multiplexed deltas; RQ intervals per surface; visibility-aware backoff; **REBUILD**: delete `realtimeConnectionManager.ts`/`subscriptionManager.ts` | Open thread shows partner message ≤5s; idle tab makes 0 requests after 5 min hidden | M | n.a. | 3
- T-AB-16 | Encryption at rest for clinical text | `encryptedText()` Drizzle custom type (AES-256-GCM, key_id versioning); apply to journal content, recaps, check-in notes, bond bodies, intake free-text; migration path documented | Raw SQL select shows ciphertext; app round-trips; key rotation runbook in docs/compliance | M | n.a. | 4
- T-AB-17 | Audit log write path + consents | Append-only `audit_logs` writes on Art. 9 access; `consents` table + `/api/consents`; Bond requires `bond_ai` consent; admin chat views audited | Reading a journal via API creates an audit row; Bond 403s without consent | M | n.a. | 4
- T-AB-18 | Bond backend: /api/bond/message pipeline | Server crisis pre-filter (ported 26 EN/NL patterns + haiku classifier), system-prompt builder from `bond_client_settings`, `claude-fable-5` streaming w/ prompt caching, post-filter, `bond_messages`+`bond_audit_events`; scripted engine kept as demo/fallback at bondEngine swap point | Crisis input returns fixed 1813/113 response + provider `safety` notification, zero LLM call; normal turn streams <2s first token on preview | L | n.a. | 3
- T-AB-19 | Bond cost controls + model routing | Per-client daily budget, org monthly cap in settings; haiku downshift router; budget-exhausted copy (NL/EN in §5); cost columns feed cockpit | Cap hit → graceful message, no API call; cost/turn logged | M | Pro | 3
- T-AB-20 | GDPR export + erasure endpoints | `GET /api/gdpr/export` (zip: profile, sessions, journal, messages, Bond transcripts — portable-profile primitive), `POST /api/gdpr/erase` (soft-delete + purge via retention cron) | Export downloads complete machine-readable zip; erase purges after retention window in test clock | M | Free | 4
- T-AB-21 | Rate limiting + abuse protection | Upstash Redis limiter middleware on auth, Bond, finder-request, invite routes; job locks util shared with crons | Burst >N/min returns 429 with Retry-After; crons never double-run | S | n.a. | 4
- T-AB-22 | Cron job suite | `vercel.json` crons per §7 table: reminders, daily digest, lifecycle emails, SLA nudges, retention; all idempotent + locked | Reminder job on preview creates events exactly once per session per window | M | n.a. | 4
- T-AB-23 | Attachments on Vercel Blob | `backend.upload` + `/api/files` signed-URL issuance; migrate `localDocumentService`/`messageAttachmentService`; size/type validation server-side | Journal upload persists on preview; URLs expire; mock mode keeps in-memory files | M | n.a. | 4
- T-AB-24 | Sentry + PostHog EU + flags | Sentry SPA+API; PostHog EU with consent gate; `feature_flags` table + `useFlag`; event taxonomy from §8 implemented in a typed `track()` util | Errors visible in Sentry from preview; events NEVER contain free-text payloads (lint rule on track calls) | M | n.a. | 2
- T-AB-25 | Retire supabase/functions + secrets hygiene | Delete `supabase/functions/*` (11 fns) after confirming replacements; sweep for hardcoded keys; document env vars in `.env.example` | Folder gone; CI secret-scan green; deploy has no Supabase env vars | S | n.a. | 4
- T-AB-26 | Finder prerender + sitemap (SEO recovery for SPA decision) | Cron-generated static HTML snapshots or Vercel prerender for `/find` + provider profiles; sitemap.xml; og-image endpoint | Provider profile fetches render full content with JS disabled; sitemap serves | M | n.a. | 5
- T-AB-27 | Owner cockpit data APIs | Aggregate endpoints: MRR (Stripe), activation funnel (PostHog + Neon), Bond cost/usage, safety-event log, moderation queue counts — consumed by plan 09's cockpit UI | `/api/admin/metrics` returns all cockpit KPIs <1s; admin-policy protected + audited | M | n.a. | 5

---

## Dependencies & risks

**Cross-domain dependencies (other plan files):**
- `01-design-language.md` / `02-provider-generalization.md`: T-AB-2/3 must land in Phase 1 so renamed types/tables don't churn every later front-end PR; plan 02 owns the i18n copy for "provider/begeleider".
- `03-onboarding-activation.md`: onboarding emails and the in-app notification center consume T-AB-10/11 (buildable in Phase 2 against mock adapter — do not wait for Neon).
- `04-monetization.md`: nudges/tier gates consume T-AB-13/14; nothing billing-facing can go live before Phase 4 gates in §10.
- `05-client-features.md` / `06-provider-features.md`: Bond upgrades consume T-AB-18/19; provider review console UI reads the `/api/bond/review` hooks; check-in SLA nudges consume T-AB-22.
- `07-finder-marketplace.md`: finder ranking neutrality is structurally enforced by T-AB-14's CI guard; SEO depends on T-AB-26.
- `09-owner-cockpit.md`: entirely downstream of T-AB-24/27.
- `10-compliance.md` (if present): owns consent/DPA prose; this plan owns the machinery (T-AB-16/17/20).

**Top risks:**
1. **Dual-mode drift** — mock and neon adapters answering differently. Mitigation: shared Zod contracts are the single source of truth; contract tests run against BOTH adapters in CI.
2. **Big-bang temptation in Phase 4** — cutting all 24 services at once. The per-domain wave plan (T-AB-8 then 9) exists precisely to avoid this; hold the line.
3. **Bond cost/latency surprise** — fable-5 streaming per turn. Mitigations in T-AB-19 (budgets, haiku routing, prompt caching); worst case: Bond stays scripted-first with LLM behind a flag.
4. **Solo-founder ops load** — Better Auth + encryption + webhooks are all "we own it now." Mitigation: boring choices (cookies, Stripe-hosted pages, Vercel cron), runbooks in docs/compliance, Sentry from Phase 2.
5. **Vercel serverless limits** (10s default fn timeout) vs Bond streaming and export zips — set `maxDuration: 60` on `/api/bond` and `/api/gdpr/export`; if exports outgrow it, move to a queued job + email link.
6. **Anthropic as Art. 9 processor** — requires zero-retention config and DPA before Bond live; if blocked, Bond launch (T-AB-18) slips independently of everything else — the architecture isolates it.

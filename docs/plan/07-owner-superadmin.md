# 07 — Owner Cockpit: the Superadmin Rethink

Today's admin area (`/dashboard/admin/{chats,clients,providers,settings,profile,notification-settings,api-settings}`) is a read-mostly oversight browser: lists of chats, clients and providers with search boxes and stub settings pages. That is the wrong shape for a founder running a two-sided regulated marketplace alone. This plan rebuilds superadmin into an **owner cockpit**: one command dashboard that answers "is the business healthy?" in 60 seconds, plus seven operational work-queues (verification, trust & safety, revenue, comms, support/GDPR, platform health, team) where every item has a status, an assignee, an SLA and an audit trail. The architectural bet is a single **event spine** (`platform_events` table, schema co-owned with plan 05) feeding every metric widget, and a single **work-queue primitive** (case + case_events) reused by verification, safety and GDPR ops — so the cockpit is three reusable patterns, not nine bespoke screens.

---

## Decisions

1. **Rebuild admin as a cockpit shell with work-queues, not more list pages.** Rationale: the owner's job is triage (verify this provider, resolve this flag, refund this payment), and triage needs statuses/assignment/SLA, which the current list pages structurally cannot express. Tradeoff: we throw away the (decent) existing AdminClients/AdminProviders table code as primary surfaces; they survive as secondary "directory" tabs, but we accept rework of working code.

2. **One event spine, no analytics vendor at launch.** All command-dashboard widgets read from a `platform_events` table (append-only, `event_name` + `actor_id` + `role` + `props jsonb`), with nightly rollups into `metric_daily`. Event names are a shared contract defined jointly with plan 05 (growth/monetization) and plan 06 (onboarding/activation owns activation definitions). Rationale: pre-production, one Postgres table is auditable, GDPR-controllable and free; Mixpanel/PostHog can be layered later off the same emit call. Tradeoff: we build rollup jobs ourselves and forgo vendor funnels/cohort UI for the first year.

3. **REBUILD `AdminAllChats` into a Trust & Safety work-queue; keep a read-only chat browser as a secondary tab.** Rationale: the current page treats a flagged Bond crisis conversation the same as browsing any chat — no assign/resolve/escalate, no record of who looked at what. For Art. 9 health data, every admin read of a client conversation must itself be audited. Tradeoff: full rebuild of a working page; the polished MessageBubble/ScrollArea internals get reused, the page shell does not.

4. **Verification is a queue that *gates* `is_regulated` and the Finder badge — never self-serve.** `profiles.is_regulated` becomes writable only via a `provider_verifications` decision (visum/RIZIV-INAMI check for clinicians; certificate review for coaches). Rationale: the badge is the compliance moat; a self-ticked checkbox is legal exposure under Belgian title-protection law (WUG). Tradeoff: human review time per provider (~10 min) and a slower provider go-live; acceptable at Benelux launch volumes.

5. **Consented, read-only-by-default impersonation with dual audit.** Support "view as user" requires an explicit consent grant from the user (in-app prompt or support-ticket checkbox), expires after 30 min, is watermarked on-screen, and writes both a grant record and per-page-view audit events. Rationale: GDPR Art. 9 + basic trust; an unlogged god-mode is how health platforms end up in the news. Tradeoff: slower support resolution when the user is offline (fallback: user-lookup shows metadata, never message/journal content).

6. **Replace binary `admin_users` with `admin_roles` (owner / support / trust_safety / finance / readonly).** Rationale: the owner will hire; retrofitting permissions later means re-auditing every admin screen. Building the role check into the cockpit shell from day one costs almost nothing. Tradeoff: slight overengineering while the team is one person.

7. **Comms center ships in-app first (announcements + feature flags), email blasts in Phase 4.** Rationale: announcements/flags need only the mock client and a `feature_flags` table; email needs the Resend edge function revived post-Neon cutover (plan 05/backend). Tradeoff: no lifecycle email control from the cockpit until Phase 4 — onboarding emails (plan 06) run on their own rail until then.

8. **Bond LLM cost meter is a first-class command widget from the day Bond goes live-LLM.** Every `/api/bond` call logs `llm_usage` (tokens in/out, model, cost, client hash). Rationale: an AI companion's marginal cost is the #1 threat to Free-tier economics; the owner must see €/DAU weekly. Tradeoff: a little latency/complexity on the hot path (async insert, fire-and-forget).

9. **Ops routines are rendered checklists inside the cockpit, not a doc.** A `DailyOpsStrip` shows the 10-minute daily loop as live checks (red/green) linking into each queue. Rationale: a checklist that reads its own state gets done; a Notion page does not. Tradeoff: each check needs a queryable definition — enforced discipline on every queue's schema.

10. **Terminology: cockpit copy says "provider" everywhere, aligned with the platform-wide generalization (plan on provider generalization).** Admin routes stay under `/dashboard/admin/*` (no rename churn), but nav label becomes "Owner" and page copy drops "therapist".

---

## 1) Command dashboard — `/dashboard/admin` (REBUILD of the admin landing)

**Files:** new `src/pages/admin/OwnerCommand.tsx` (replaces current admin dashboard landing), widgets in `src/components/admin/command/*`; data via new `src/services/api/ownerMetricsService.ts` (mock-first, same pattern as `adminService`). Route registered in `src/App.tsx` where `/dashboard/admin` currently mounts.

Layout: typography-led, no card-grid-of-twelve-identical-shadows. Top row = 4 north-star numbers as large numerals with 30-day sparklines (no boxes, hairline `border-border` dividers). Below: two editorial columns — "Money & growth" and "Marketplace & care". Mint appears **only** on the Bond engagement widget (AI surface rule). A persistent `DailyOpsStrip` sits above the fold.

| Widget | Metric | Source (event / table) | Coordinate with |
|---|---|---|---|
| MRR / ARR | sum of active subscription amounts | `subscriptions` table (05 owns schema) | 05 |
| Trials & conversion | trials started, trial→paid %, Free→Pro upgrades this week | `billing.trial_started`, `billing.subscription_started`, `billing.upgraded` | 05 |
| WAU/MAU per role | distinct actors on any event, split client/provider | `platform_events` rollup `metric_daily` | 05 |
| Activation | % new clients hitting "activated" (definition owned by plan 06); same for providers | `activation.client_activated`, `activation.provider_activated` | 06 |
| Finder liquidity funnel | searches → profile views → requests → accepted, weekly, with step conversion % | `finder.search_performed`, `finder.profile_viewed`, `finder.request_sent`, `lead.accepted` (emit points: `finderService`, `RequestProviderDialog`, `ProviderLeads`) | 05 |
| Provider supply | published profiles, % accepting new clients, median lead response time | `provider_profiles`, `provider_requests.respondedAt` | — |
| Bond engagement (mint) | Bond DAU, messages/user, 7-day retention of Bond users | `bond.message_sent`, `bond.session_started` (emit in `src/components/bond/BondChat.tsx` engine boundary) | — |
| Crisis escalations | count this week + unreviewed count, red if >0 unreviewed, links to Safety queue | `bond.crisis_triggered` + `safety_cases where type='crisis' and status='new'` | — |
| Bond LLM cost | € this month, €/DAU, top-decile user cost | `llm_usage` rollup | — |
| Verification queue depth | pending count + oldest-item age | `provider_verifications where status in ('submitted','in_review')` | — |
| GDPR deadlines | open export/erasure requests, days to statutory deadline, red <7d | `gdpr_requests` | — |
| Failed payments | count + € at risk | `billing.payment_failed` / Stripe webhook mirror | 05 |

**Event schema contract (shared with 05):** `platform_events(id, event_name text, actor_id uuid null, actor_role text, props jsonb, created_at)`. Naming: `domain.verb_past` (`finder.request_sent`). Client emit helper `src/lib/track.ts` → mock: in-memory ring buffer + console table in dev; real: POST `/api/events`. **No message/journal content ever goes into `props`** (data-minimization rule, enforced by lint on the helper).

---

## 2) Provider verification queue — `/dashboard/admin/verification`

**Files:** `src/pages/admin/VerificationQueue.tsx`, `src/components/admin/verification/{VerificationCaseCard,CredentialViewer,DecisionPanel}.tsx`, `src/services/api/verificationService.ts`. Provider-side submission UI belongs to the provider plan; this is the review side.

**Schema (add to `src/server/db/schema.ts`):**
```
provider_verifications: id, provider_id fk profiles, kind ('regulated_clinician'|'coach'),
  status ('draft','submitted','in_review','needs_info','approved','rejected'),
  claimed_registry_id text (visum / RIZIV-INAMI nr), documents jsonb (uploaded certs),
  reviewer_id, decision_note text, decided_at, created_at, updated_at
```

**Workflow:** submitted → owner opens case → for `regulated_clinician`: check claimed number against the public Belgian registries (link out to the federal health-professional register; manual for now, API scrape later) → approve sets `profiles.is_regulated=true` and issues the **"Erkend zorgverlener / Registered clinician"** badge on the Finder profile; for `coach`: certificate review → approve issues **"Geverifieerde coach / Verified coach"** (never `is_regulated`). `needs_info` sends a templated request; `rejected` sends a rejection with reason. Every transition writes `audit_logs` (table exists, schema.ts:525) and a `case_events` row. Approval also emits `verification.approved` for the command widget.

**Badge rule restated in code comment + UI:** badges are transparency only; the Finder ranking function must not read verification status as a weight (dichotomieverbod discipline — fit only).

**Rejection email copy** (NL first, EN below — used by comms rail):
> **NL:** "Dag {voornaam}, we konden je registratie als erkend zorgverlener nog niet bevestigen. Het opgegeven visumnummer ({nr}) vonden we niet terug in het federale register. Kijk je het even na? Je profiel blijft intussen zichtbaar als coach, zonder het label 'erkend zorgverlener'. — Het Bondable-team"
> **EN:** "Hi {first_name}, we couldn't yet confirm your registration as a licensed clinician. The licence number you provided ({nr}) doesn't appear in the federal register. Could you double-check it? Meanwhile your profile stays visible as a coach, without the 'registered clinician' label. — The Bondable team"

---

## 3) Trust & Safety — `/dashboard/admin/safety` (REBUILD of `src/pages/AdminAllChats.tsx`)

**Explicit REBUILD.** The current AdminAllChats becomes two tabs under one page: **Queue** (new, default) and **Browse** (the existing conversation browser, demoted, now audit-logged per view). Reuse `MessageBubble`, filters and the mobile dialog pattern from the current file; discard the page shell.

**Files:** `src/pages/admin/SafetyQueue.tsx`, `src/components/admin/safety/{CaseList,CaseDetail,CaseTimeline,ResolvePanel}.tsx`, `src/services/api/safetyService.ts`. Old route `/dashboard/admin/chats` 301-redirects (route alias in `App.tsx`) to `/dashboard/admin/safety?tab=browse`.

**Schema:**
```
safety_cases: id, type ('crisis','user_report','content_flag','checkin_unacknowledged'),
  source ('bond_guardrail','user_report','provider_report','system'),
  subject_user_id, conversation_id null, severity ('info','elevated','critical'),
  status ('new','assigned','in_progress','resolved','escalated'),
  assignee_id null, resolution ('no_action','user_contacted','provider_notified',
  'authority_referred','content_removed') null, resolved_at, created_at
case_events: id, case_id fk, actor_id, action text, note text, created_at   -- shared with verification & GDPR queues
```

**Flow:** Bond's client-side crisis guardrail (26 patterns in the bond engine) currently only renders resources inline — it now ALSO emits `bond.crisis_triggered` and creates a `safety_cases` row (type `crisis`, severity `critical`). Unacknowledged `client_checkins` older than 48h auto-create cases (type `checkin_unacknowledged`) so the owner backstops inattentive providers. Case detail shows: transcript excerpt around the trigger (±10 messages, view itself audit-logged), client's provider + last session date, action buttons: **Assign to me / Message provider / Mark resolved / Escalate**. Escalate = pins case, notifies owner by email/push, requires a note. Resolution requires selecting a `resolution` value — no silent closes.

**SLA defaults:** critical = same-day review; elevated = 48h; queue header shows breach count. `safety_case_resolved` event feeds the command widget.

**Microcopy (queue empty state):** NL: "Geen open meldingen. Zo hoort het." / EN: "No open cases. As it should be."

---

## 4) Revenue ops — `/dashboard/admin/revenue`

**Files:** `src/pages/admin/RevenueOps.tsx`, `src/services/api/revenueOpsService.ts`. Depends on plan 05's `subscriptions` schema and Stripe webhook mirror (`billing_events`); this page is the *read/ops* surface, 05 owns billing logic.

Tabs: **Subscriptions** (table: provider/practice, tier Free/Pro/Practice, MRR, started, status active/trialing/past_due/canceled; row actions: open in Stripe, add comp, cancel), **Failed payments** (past_due list with dunning stage, retry, "send payment-update email"), **Refunds** (issue via Stripe API, reason required, logged to `audit_logs`), **Comp accounts** (`account_comps: id, profile_id, tier, reason, granted_by, expires_at` — pilot practices and friendly clinicians get Pro without polluting MRR; comps are excluded from MRR widget and labeled in the subscriptions table).

Guardrail restated on-page: paid tier changes workflow features only — a banner in this screen reminds "Tier NEVER affects Finder ranking" so future staff internalize it.

---

## 5) Comms center — `/dashboard/admin/comms`

**Files:** `src/pages/admin/CommsCenter.tsx`, `src/components/admin/comms/{AnnouncementComposer,FlagTable,BlastComposer}.tsx`, `src/services/api/commsService.ts`; client-side consumption: `src/components/announcements/AnnouncementBanner.tsx` mounted in `DashboardLayout`, flags via `src/hooks/useFeatureFlag.ts`.

**Schema:**
```
announcements: id, title, body_md, audience jsonb ({roles:['provider'], tiers:['free'], locales:['nl']}),
  style ('banner','modal','changelog'), starts_at, ends_at, created_by, created_at
announcement_receipts: id, announcement_id, user_id, seen_at, dismissed_at
feature_flags: id, key text unique, description, enabled boolean, rollout jsonb
  ({roles:[],tiers:[],percent:100,allow_ids:[],deny_ids:[]}), kill_switch boolean, updated_by, updated_at
```

- **Announcements:** composer with live preview in both NL and EN side-by-side (forces the owner to write both), audience targeting by role/tier/locale, banner or modal. Anti-slop rule enforced in the composer helper text: "Schrijf zoals je tegen één hulpverlener praat, niet tegen 'users'."
- **Feature flags:** every risky feature from other plans (Bond live-LLM, Stripe checkout, finder matcher v2, group practices) ships behind a flag with a **kill switch** column — one click disables for everyone, bypassing rollout logic. Flags are readable by the mock client now (seeded in `mockClient.ts`) so gating code lands before the backend does.
- **Email blasts (Phase 4):** target audience → template → test-send to owner → send via revived Resend edge function (`supabase/functions/` mailer, rewired post-Neon). Blast log with open counts. Until Phase 4 the tab renders a labeled "not wired" state (same honest-badge pattern recommended for Payments).

---

## 6) Support tooling — `/dashboard/admin/support`

**Files:** `src/pages/admin/SupportDesk.tsx`, `src/components/admin/support/{UserLookup,ImpersonationPanel,GdprQueue}.tsx`, `src/services/api/supportService.ts`.

- **User lookup:** search by name/email/id across profiles; result shows role, tier, provider links, last activity, device count, open cases — **metadata only, never content** (no messages, no journal). Deep links: open in safety queue, open subscriptions row.
- **Consented impersonation:** flow = support clicks "Request view access" → user gets in-app prompt (NL: "Mag {support_name} van Bondable jouw account 30 minuten bekijken om je probleem op te lossen? Berichten en dagboek blijven verborgen tenzij je dat apart toestaat." / EN: "May {support_name} from Bondable view your account for 30 minutes to fix your issue? Messages and journal stay hidden unless you allow that separately.") → grant creates `impersonation_grants(id, admin_id, user_id, scope ('app','app_plus_content'), expires_at, consented_at)` → admin session renders the user's app with a persistent amber top bar "Viewing as Jef V. — read-only — 22:14 left" → every route visit logs to `audit_logs`. Read-only enforced at the service layer (mock: `mockClient` write guard when impersonation flag set).
- **GDPR ops queue:** `gdpr_requests(id, user_id, kind ('export','erasure','rectification'), status ('received','in_progress','delivered','denied'), deadline_at, handled_by, notes, created_at)`. Deadline auto-set at +30 days (Art. 12(3)); command widget goes red at <7 days. Export action bundles the user's rows (profiles, sessions, tasks, journal, messages metadata + content where lawful) into a JSON/ZIP — implementation shared with the client-facing "download my data" feature (client plan / portable-profile layer); this queue is the manual backstop and the erasure executor (cascade plan documented per table, with `safety_cases` retained pseudonymized for legal defense).

---

## 7) Platform health — `/dashboard/admin/health`

**Files:** `src/pages/admin/PlatformHealth.tsx`, `src/services/api/healthService.ts`. REBUILD-absorbs the stub `AdminAPISettings.tsx` and `AdminNotificationSettings.tsx` (both currently UI-only dead ends — fold their real needs here and into Comms; delete the routes).

Panels: **Errors** (client error rate from a lightweight `window.onerror`→`platform_events('client.error')` hook now; Sentry link-out later), **Jobs** (rollup job, email queue, dunning — `job_runs(id, job_name, status, started_at, finished_at, error)` table, red on 2 consecutive failures), **API usage** (requests/day per service post-Neon), **LLM cost meter** (`llm_usage(id, user_hash, model, tokens_in, tokens_out, cost_cents, latency_ms, guardrail_triggered bool, created_at)` — chart €/day, €/DAU, p95 latency, guardrail trigger rate; per-user top-decile view uses hashed ids, not names), **Env & flags snapshot** (build sha, active kill switches).

---

## 8) Team & permissions

**Schema:** replace `admin_users` (schema.ts:497) usage with:
```
admin_roles: id, user_email text unique, role ('owner','support','trust_safety','finance','readonly'),
  granted_by, granted_at, revoked_at null
```
**Capability map** (enforced in a single `src/lib/adminAbility.ts` consumed by cockpit shell + services):
- owner: everything.
- support: SupportDesk, GdprQueue, read Command; **no** revenue actions, no verification decisions.
- trust_safety: SafetyQueue full, VerificationQueue full, read Command; no revenue/comms.
- finance: RevenueOps full, read Command; nothing content-adjacent.
- readonly: Command + queue read for advisors/accountant.
UI: `/dashboard/admin/team` — invite by email, role select, revoke; every grant/revoke to `audit_logs`. The cockpit sidebar renders only permitted sections (single source: adminAbility).

---

## 9) Ops routines (rendered in `DailyOpsStrip` + `/dashboard/admin` weekly panel)

**Daily 10 minutes (each item is a live red/green check linking to its queue):**
1. Crisis & safety: unreviewed critical cases = 0? (Safety)
2. GDPR: any request <7 days to deadline? (Support)
3. Failed payments: new past_due? (Revenue)
4. Verification: oldest pending >72h? (Verification)
5. Health: job failures or error-rate spike overnight? (Health)
6. Leads: median provider lead-response >48h this week? (nudge providers — Comms)

**Weekly 30 minutes (Monday panel):**
1. Funnel review: finder liquidity step conversions vs last week; pick ONE step to improve.
2. Money: MRR delta, trial conversions, churn list read-through; comp expiries.
3. Bond: engagement + €/DAU + guardrail trigger rate; sample 3 flagged transcripts (audited).
4. Supply: new published providers, % accepting clients, verification throughput.
5. Comms: schedule/adjust one announcement or flag rollout; kill-switch review (anything stuck at 50%?).
6. Write one line in a `owner_log` note field on the dashboard ("what I believe this week") — kept, greppable, honest.

---

## Cockpit shell & design

New `src/components/admin/AdminShell.tsx` wrapping all admin pages inside the existing `DashboardLayout`: left rail sections **Command / Verification / Safety / Revenue / Comms / Support / Health / Team / Directory** (Directory = old AdminClients + AdminProviders tables, kept as-is initially). Visual language per plan 01: deep-teal ink on `#f4f8f7`, hairline dividers over card-shadow grids, tabular numerals for metrics (`font-variant-numeric: tabular-nums`), status as small squares + text (not rainbow badges), mint strictly on Bond widgets, destructive red strictly on crisis/critical. No emoji, no exclamation marks in cockpit copy.

---

## Tickets

- T-OC-1 | Event spine: platform_events + track() helper | Add `platform_events` + `metric_daily` to `src/server/db/schema.ts`; create `src/lib/track.ts` (mock ring-buffer impl in `mockClient.ts`, dev console table); document event-name contract in `docs/plan/events.md` with 05/06 | track('finder.search_performed',{...}) visible in dev buffer; no PII/content in props enforced by helper type; contract doc lists ≥20 named events | M | n.a. | 2
- T-OC-2 | Instrument finder + Bond + billing emit points | Call track() from `finderService` (search/view), `RequestProviderDialog` (request_sent), `ProviderLeads` (lead.accepted), `src/components/bond/BondChat.tsx` (message_sent, crisis_triggered), billing stubs | Each funnel step emits exactly once per user action; crisis pattern match emits with severity prop | M | n.a. | 2
- T-OC-3 | AdminShell + admin_roles + adminAbility | New `src/components/admin/AdminShell.tsx`, `admin_roles` table replacing `admin_users` reads, `src/lib/adminAbility.ts`; wire routes in `src/App.tsx`; Directory section hosts existing AdminClients/AdminProviders unchanged | Sidebar renders per role; support role cannot open Revenue (route + service both deny); grants logged to audit_logs | M | n.a. | 5
- T-OC-4 | Command dashboard v1 (REBUILD admin landing) | `src/pages/admin/OwnerCommand.tsx` + `src/components/admin/command/*` + `ownerMetricsService.ts` reading mock rollups; widgets: WAU/MAU, finder funnel, Bond engagement, crisis count, verification depth, GDPR deadlines | All 12 spec'd widgets render from seeded mock events; mint only on Bond widget; loads <1s on mock | L | n.a. | 5
- T-OC-5 | Crisis events create safety cases | Bond guardrail (bond engine crisis branch) writes `safety_cases` row + `bond.crisis_triggered` event via safetyService; stale `client_checkins` (>48h unacknowledged) auto-create cases | Triggering a crisis phrase in demo creates a visible case; checkin case auto-appears in seeded data | S | n.a. | 2
- T-OC-6 | REBUILD AdminAllChats → SafetyQueue | New `src/pages/admin/SafetyQueue.tsx` with Queue + Browse tabs; `safety_cases`/`case_events` schema; reuse MessageBubble; redirect `/dashboard/admin/chats` | Case: assign→resolve(with resolution enum)→timeline shows every action; Browse view logs an audit event per conversation opened; SLA breach count in header | L | n.a. | 5
- T-OC-7 | Verification queue + is_regulated gating | `provider_verifications` schema; `src/pages/admin/VerificationQueue.tsx`; approve flips `profiles.is_regulated` (clinician kind only) and Finder badge; decision → audit_logs + case_events; NL/EN rejection templates | is_regulated has no other write path; approve/needs_info/reject each send the right template (mock outbox); badge text matches spec | L | n.a. | 4
- T-OC-8 | Revenue ops page | `src/pages/admin/RevenueOps.tsx` over 05's `subscriptions` + `billing_events`; tabs subscriptions/failed/refunds/comps; `account_comps` table; comps excluded from MRR | past_due row offers retry + email action; refund requires reason and writes audit_logs; comp'd account shows label and is excluded from MRR widget | M | n.a. | 4
- T-OC-9 | Feature flags with kill switches | `feature_flags` schema; `useFeatureFlag` hook reading mock client; FlagTable in CommsCenter; seed flags: bond_live_llm, stripe_checkout, group_practices | Kill switch disables feature for all cohorts in one click without deploy; flag changes logged with updated_by | M | n.a. | 2
- T-OC-10 | In-app announcements | `announcements` + `announcement_receipts` schema; AnnouncementComposer with role/tier/locale targeting and side-by-side NL/EN preview; `AnnouncementBanner` in DashboardLayout | Announcement targeted at providers shows only to provider role in demo; dismiss persists; modal style renders once per user | M | n.a. | 2
- T-OC-11 | Email blast rail | BlastComposer → revived Resend edge function post-Neon; audience from announcements targeting; test-send-to-self required before send; blast log | Cannot send without a successful test-send; blast writes log row with audience size | M | n.a. | 4
- T-OC-12 | Support desk: user lookup | `src/pages/admin/SupportDesk.tsx` UserLookup: search profiles, show metadata (role/tier/links/last activity/open cases), deep links to queues; zero content exposure | Searching seeded user shows metadata; no message/journal content reachable from this screen | S | n.a. | 5
- T-OC-13 | Consented impersonation with audit | `impersonation_grants` schema; request→user consent prompt (NL/EN copy per spec)→30-min read-only session with amber watermark bar; per-route audit events; mockClient write-guard | Without grant, "view as" is impossible; with grant, any write attempt is blocked and every visited route appears in audit_logs; auto-expiry works | L | n.a. | 5
- T-OC-14 | GDPR request queue | `gdpr_requests` schema + GdprQueue UI; +30d deadline auto-set; export bundles user rows to JSON/ZIP (shared lib with client-facing export); erasure executes documented cascade, pseudonymizes safety_cases | Export produces complete bundle for seeded user; erasure removes PII across all 27+ tables per cascade doc; deadline countdown red <7d on Command | L | n.a. | 4
- T-OC-15 | Platform health page + job_runs | `src/pages/admin/PlatformHealth.tsx`; `job_runs` table; window.onerror→client.error events; absorb+delete AdminAPISettings/AdminNotificationSettings stub routes | Failing a seeded job twice turns Jobs panel red; error-rate chart renders from events; stub routes removed from App.tsx | M | n.a. | 5
- T-OC-16 | LLM cost meter | `llm_usage` schema + async logging middleware on `/api/bond`; Health panel + Command widget: €/day, €/DAU, p95 latency, guardrail rate, hashed top-decile users | Every Bond LLM call logs one row (fire-and-forget, no added user latency); €/DAU matches manual calc on seed data | M | n.a. | 4
- T-OC-17 | DailyOpsStrip + weekly panel | Live red/green checks per daily routine item, each linking to its queue; weekly Monday panel with funnel deltas + `owner_log` one-liner field | All 6 daily checks compute from real queue state; owner_log persists and lists history | M | n.a. | 5
- T-OC-18 | Team management UI | `/dashboard/admin/team`: invite by email, role assign/revoke over `admin_roles`; grant/revoke → audit_logs; onboarding email hook for new staff (plan 06 template) | Owner can grant support role; revoked user loses cockpit next load; audit trail complete | S | n.a. | 5
- T-OC-19 | Nightly metric rollup job | Job (mock: on-demand button; real: cron post-Neon) aggregating platform_events → metric_daily; powers all Command sparklines; writes job_runs | Rollup idempotent (re-run same day = same rows); Command widgets read rollups not raw events; failure surfaces in Health | M | n.a. | 4
- T-OC-20 | Cockpit design pass (anti-slop) | Apply plan-01 language to all admin pages: tabular-nums metrics, hairline dividers, status squares, no badge rainbow, mint only on Bond, destructive red only on crisis; NL/EN microcopy sweep | Zero default-shadcn card grids on Command; copy review checklist passes (no exclamation marks, no "users" in NL copy) | M | n.a. | 5

---

## Dependencies & risks

**Cross-domain dependencies (sibling files in `docs/plan/`):**
- **05 (growth/monetization/billing plan):** co-owns the `platform_events` naming contract (T-OC-1/2), owns `subscriptions`/`billing_events`/Stripe webhooks that RevenueOps (T-OC-8) and the MRR/trial widgets read, and consumes the nudge/tier-gate flags from T-OC-9.
- **06 (onboarding/activation plan):** owns the activation definitions the Command activation widget displays (T-OC-4), owns lifecycle/staff onboarding email templates that the blast rail (T-OC-11) and team invites (T-OC-18) send.
- **01 (design language plan):** cockpit design pass (T-OC-20) and AdminShell inherit its tokens/typography rules.
- **Provider generalization plan (02/03):** verification submission UX on the provider side, "provider" terminology, and group-practice/staff roles interact with T-OC-7 and T-OC-18 (a practice manager is NOT an admin_role — keep practice roles in the provider domain).
- **Backend/platform plan (Neon/auth/API cutover):** T-OC-11, 16, 19 and real audit-log enforcement are blocked on Neon + server API; everything else is deliberately mock-first so the cockpit UX lands before the cutover.
- **Bond/client plan:** crisis guardrail hook (T-OC-5) must survive the scripted→LLM swap at the bond engine boundary; LLM logging (T-OC-16) lands with that swap.

**Top risks:**
1. **Audit gap during mock era.** Mock-mode audit_logs are cosmetic until Neon; if real users ever touch the app before cutover, admin content access is effectively unlogged. Mitigation: hard rule — no real-user data before T-OC-6/13 run on the real backend.
2. **Event-contract drift.** If 05/06 emit differently-named or double-fired events, every Command number silently lies. Mitigation: single `docs/plan/events.md` contract + typed event-name union in `track.ts`.
3. **Verification bottleneck = supply bottleneck.** Manual registry checks throttle provider go-live at exactly the moment the marketplace needs supply. Mitigation: `needs_info` fast-path, publish-as-coach-while-pending default, 72h SLA check in DailyOpsStrip.
4. **Impersonation scope creep.** Support pressure will push toward content access "just this once." Mitigation: scope enum in the grant + write-guard in the client, so the shortcut requires a schema change, not a toggle.
5. **Cockpit over-build before revenue.** Nine screens for a team of one can eat a quarter. Mitigation: phase discipline — only T-OC-1/2/5/9/10 land before Phase 4; the rest rides Phase 4–5 behind the money.
6. **GDPR erasure vs safety retention.** Erasing a user who has a crisis case creates a records conflict. Decision embedded in T-OC-14 (pseudonymize safety_cases, retain minimal legal record) needs a legal read before launch.

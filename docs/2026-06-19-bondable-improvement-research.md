# Bondable — Consolidated Improvement Research

**Date:** 2026-06-19 (revised after adversarial critique + code reality-check)
**Owner:** Head of Product
**Inputs:** 4 grounded audits — Therapist experience, Client experience, Two-sided relationship, UI/UX & accessibility heuristic + Engagement/retention/value — plus a security/compliance critique that verified the findings against the live codebase.
**Scope:** Real code (not mockups). The backend is real — a live Supabase project (130 migrations, 11 edge functions, real RLS); the mock (`src/integrations/supabase/client.ts` → `mockClient.ts`, 1220 lines) is dev-only, gated behind `import.meta.env.DEV && VITE_DEV_BYPASS_AUTH`.

**Constraints respected throughout:** supervised-AI-only, GDPR Art. 9 (explicit consent), Belgian dichotomieverbod (no referral commissions on regulated clinicians), crisis escalation always available.

> **What changed in this revision.** The first draft was an excellent *feature backlog* that mistook a practice-management upgrade for a better *therapeutic* product, and treated compliance/safety as prose ("posture carried through") when the code shows it is **unbuilt and, in one place, actively breach-exposed**. Three corrections drive everything below:
> 1. **Compliance and safety are buildable P0 work, not posture.** `grep consent` across all 130 migrations returns **0** — there is no consent table, column, or per-feature gate anywhere. Every "just add a `mental_health_checks` table" is really a migration + RLS policy + consent gate + portable-export wiring. **Scope every "add a table" at ~4x the first draft's implied effort.**
> 2. **There is a live PII leak, not architecture debt.** `supabase/functions/get-client-data/index.ts` uses the **service-role key** (bypasses RLS), accepts an arbitrary `clientId` from the request body, has **no `Authorization` check**, and serves `Access-Control-Allow-Origin: *`. Anyone can enumerate client IDs and exfiltrate full patient records. This is the #1 item, above clinical notes.
> 3. **Outcome capture was built as therapist telemetry, not a shared client-meaningful loop** — and one "outcome" already shipped as a placeholder (`th_outcome` in `ActiveClientsTable.tsx` is a cosmetic label with no data behind it, exactly like Bond).

---

## Executive Summary — the biggest opportunities

Bondable has a strong skeleton: action-focused dashboards, clean brand tokens (deep-teal + mint), crisis safety surfaces, i18n, and working task/journal/session/intake plumbing on a real Supabase backend. It is currently a **transactional task manager** with a **breach-exposed, consent-less data layer**. Before it can be a relationship manager or clinical system of record, it has to be a *safe, lawful* one.

**P0 — must precede all clinical/AI feature work (currently absent from the first draft's roadmap):**

0a. **Edge-function authorization is a live patient-PII breach.** `get-client-data` is unauthenticated, service-role, wildcard-CORS. Fix this first — a product "genuinely better for clients" starts with not leaking their therapy records.

0b. **There is no consent / lawful-basis data model.** Zero consent machinery exists in 130 migrations. You cannot lawfully ship outcomes, clinical notes, Bond, or export without it. Build it as a first-class feature, not a checkbox.

0c. **Crisis detection is read-only — there is no escalation pathway.** Every new disclosure surface (mood checks, Bond reflection, journals, urgent messages) is a place a client can reveal self-harm risk with nothing catching it. A risk-flag → therapist-alert pipeline is table-stakes safety.

**The headline product opportunities (after P0):**

1. **Clinical notes are the missing system-of-record.** The "Clinical Note" quick action dead-ends to `/sessions`. Without trustworthy, consent-gated notes, therapists keep real records elsewhere and Bondable stays a calendar. The biggest *adoption* unlock — but it ships behind 0a/0b.

2. **Outcome measurement must be a *shared, client-meaningful* progress loop — not therapist telemetry.** No PHQ-9 / GAD-7 / ROM exists; the one "outcome" that shipped (`th_outcome`) is a fake label. Merge symptom capture with the client's own goals, plain-language interpretation, and a "your therapist responded" loop.

3. **Measure the therapeutic *alliance*, not just symptoms.** For a product named for the bond, the absence of any session-rating / alliance check is striking — the alliance is the strongest evidence-based predictor of outcome and retention, and a one-question post-session check is cheap.

4. **Continuity signals are absent — the relationship is silent.** After a session, homework, or journal share, the other party doesn't know it mattered. Recaps, homework acknowledgment, a therapist-visible journal, and read receipts turn isolated actions into a therapeutic arc.

5. **The client has no agency in the relationship lifecycle.** Every relationship lever is therapist-initiated. The client cannot flag "I'm not okay this week" between sessions, give structured feedback, pause/end with dignity, or switch therapists — the dichotomieverbod Finder model uniquely makes commission-free switching a *client-protection* feature.

6. **Revenue is invisible — but it comes *after* the product demonstrably helps clients.** EUR is configured, a Payments scaffold exists, but the dashboard shows no earnings and invoices need manual entry. Auto-invoicing + an earnings KPI convert "form tool" into "practice suite" — sequence it after retention is real, because revenue features are worthless on a leaky funnel.

7. **Bond AI is a dead placeholder.** A prominent mint "Talk to Bond" tile fires a toast and does nothing. Gate/reframe now; build supervised reflection-coach value later, behind consent + audit + crisis-escalation.

8. **The Finder marketplace is revenue stream #2 and a client-acquisition + client-switching channel.** `is_regulated` exists; no finder pages/search/profiles/booking. Listing fees (coaches) + free regulated listings is the dichotomieverbod-safe path.

9. **You cannot prove the product works.** There is no product-level success metric (cohort symptom change, retention past session 6, homework→outcome correlation). Pull an internal-only outcomes-analytics layer earlier so you know which of 30 features actually help.

Cross-cutting: accessibility debt is real but the first draft scoped it as cosmetic. The real risk is the **intake, outcome, and crisis paths** being unusable by an anxious person, on a phone, with a screen reader, in their second language — not contrast cleanup (no `prefers-reduced-motion` in `src/index.css`, only 5 files use `aria-live`/`role="alert"`, off-brand yellow intake banner).

---

## Top 12 Improvements (highest-leverage, re-prioritized)

Tags: [Client] / [Therapist] / [Both]. Impact / Effort on H/M/L. P0 = safety/legal blocker.

| # | Improvement | Impact / Effort | For whom |
|---|-------------|-----------------|----------|
| 1 | **Edge-function authorization fix** — require JWT, drop service-role for client reads, scope CORS, enforce RLS (live PII leak) | H / M | [Client] **P0** |
| 2 | **Consent + lawful-basis data model** — `consents` table + data-layer gate; every Art. 9 feature checks it | H / M | [Both] **P0** |
| 3 | **Crisis-escalation pipeline** — PHQ-9 Q9 / severity / Bond risk-language → therapist alert + ever-present crisis card | H / M | [Both] **P0** |
| 4 | **Shared progress loop** (merged outcome capture + client goals) — PHQ-9/GAD-7 *with* plain-language meaning, client goals, and a "therapist responded" signal | H / H | [Both] |
| 5 | **Post-session alliance micro-check** — 1 question ("how connected did you feel?") feeding recap + silent-client flag | H / L | [Both] |
| 6 | **Post-session clinical notes** modal (consent-gated; the system-of-record) | H / H | [Therapist] |
| 7 | **Session recap card** (therapist-authored, visible to both) closing the session loop | M / M | [Both] |
| 8 | **Read receipts + unread badge + urgency** + **client "I'm not okay this week" between-session flag** | M / L | [Both] |
| 9 | **Pre-session nudges** (24h reminder + optional prep note) — no-show reduction | H / L | [Both] |
| 10 | **Gate/reframe Bond AI placeholder** (trust fix now; supervised coach later) | H / L | [Client] |
| 11 | **Session-based auto-invoicing** + "This Week's Earnings" KPI (after retention is real) | H / H | [Therapist] |
| 12 | **Therapist Finder marketplace** (dichotomieverbod-safe; also enables commission-free client switching) | H / H | [Both] |

*Promoted out of the old Top 12:* clinical queue (now T4, still P1), homework loop and journal tab (now quick wins, folded into #7/#8 arc). *Cut from the old Top 12:* none deleted, but outcome measurement (#3 old) is now reframed as #4 "shared progress loop" and split from the alliance check (#5).

---

## P0 — Safety & Legal Blockers (build before any clinical/AI feature)

### P0a. Edge-function authorization — live PII breach — [Client], H / M, **P0**
**Current:** `supabase/functions/get-client-data/index.ts` uses the **service-role key** (RLS-bypassing), accepts an arbitrary `clientId` from the request body, has **no `Authorization` header check**, and serves `Access-Control-Allow-Origin: *`. `supabase/config.toml` sets `verify_jwt = false`. The same zero-auth pattern appears in `send-client-invitation`, `send-admin-notification`, `send-session-notification`, and `cleanup-pending-client`. Anyone can enumerate client IDs and exfiltrate full patient records.
**Improvement:** Require and verify the caller's JWT (`verify_jwt = true` where appropriate); resolve the caller's identity from the token, not the body; use the user-scoped client so RLS applies (reserve service-role for genuinely privileged server tasks with explicit authorization checks); restrict CORS to known origins. Add an authorization test per function. **This is item #1 — above clinical notes — for a mental-health app under GDPR Art. 9.**

### P0b. Consent + lawful-basis data model — [Both], H / M, **P0**
**Current:** `grep consent` across all 130 migrations = **0**. No consent table, no consent column, no per-feature consent. The first draft listed every clinical feature as "gated by explicit consent" but **nothing in the schema can gate anything.**
**Improvement:** Build `consents (id, subject_id, purpose, lawful_basis, granted_at, withdrawn_at, version, evidence)` plus a consent-gate helper in the data layer that every Art. 9 feature must call. Wire consent state into the portable export (E4) and the deletion flow. This is a hard dependency for items 3, 4, 6, and the entire AI track — until it exists, those features are non-compliant by construction.

### P0c. Crisis-escalation pipeline — [Both], H / M, **P0**
**Current:** Crisis resources are always-available (good, `src/components/safety/CrisisResources.tsx`) but **read-only**. There is no defined flow for when a PHQ-9 Q9 (suicidal ideation) scores positive, GAD severity spikes, or Bond/journal/messages surface risk language. Every disclosure surface added below is a new place risk can be missed.
**Improvement:** A risk-flag pipeline: PHQ-9 Q9 / severity thresholds / Bond + journal keyword triggers raise a therapist alert and surface an always-present crisis card, with explicit "Bond/this tool is not for emergencies" framing. This is the difference between an "outcome card" and an "outcome card that silently missed a suicidal client." Pairs with item 3/4/10 — every new surface must register with this pipeline before it ships.

---

## For Clients

### C1. Shared progress loop (outcome capture + client meaning) — [Both], H / H, **P1**
**Current:** `src/components/dashboard/client/ClientKpis.tsx` shows session/task/journal counts only; `ClientDashboardContent.tsx` / `NextSessionCard.tsx` are logistics-focused. No mental-health outcome data anywhere. `ActiveClientsTable.tsx` already renders an `th_outcome` column — **a cosmetic label with no data behind it** (placeholder, like Bond). The first draft built outcomes as therapist telemetry: the client just sees "37 → 31 ↓".
**Improvement (merge of the old C1 + R6 treatment plans — ship as ONE feature):** Add a consent-gated `mental_health_checks` table `(id, client_id, date, phq9_score, gad7_score, q9_flag, notes, therapist_reviewed)`. The client surface must deliver **meaning, not just a score**: (a) plain-language interpretation ("your scores suggest moderate anxiety, improving"); (b) the client's **own goals** tracked alongside the clinical number; (c) a "your therapist responded to your score" loop. PHQ-9 Q9 routes through the crisis-escalation pipeline (P0c). Consent toggle in settings (via P0b); included in portable export. *This single feature is the client-side outcome loop the first draft split across C1 and R6.*

### C2. Homework streaks & visual progress (gentle, non-punitive only) — [Client], M / L, **P2**
**Current:** `src/components/dashboard/client/MyHomework.tsx` lists tasks; `tasks.status` + `completed_at` exist but no visualization or celebration.
**Improvement:** Derive weekly/monthly completion counts (no schema change); add a small ✓ micro-celebration. **Framing constraint:** streaks must be gentle and non-punitive — never shame a relapse or a missed week. (Badges/milestones cut — see Cuts.)

### C3. Bond AI placeholder — gate or reframe — [Client], H / L, **P1**
**Current:** `src/components/dashboard/client/BondCompanionCard.tsx` + `ClientQuickActions.tsx` render a prominent mint "Talk to Bond" tile that fires a toast (`cqa_bond_placeholder`) and does nothing — visually indistinguishable from working tiles.
**Improvement (now):** Replace the dead toast with an honest "coming soon" modal previewing the supervised-AI promise; demote the tile to a low-prominence teaser; keep `AiSupervisedBadge` visible. (Full reflection-coach is E6, behind P0b/P0c.)

### C4. Smart journal-share suggestion — [Client], M / L, **P2**
**Current:** `RecentJournalCard.tsx` has a share toggle but no nudge to share; clients write privately into a void.
**Improvement:** After 3+ private entries, soft toast: "Share this with Dr. Anne for feedback?" One-click share. Add nullable `review_requested_at` to `journal_entries`. (Journal content is a risk surface — register with P0c.)

### C5. Client agency in the relationship lifecycle — [Client], H / M, **P1**
**Current:** Every relationship action is therapist-initiated (therapist shares recap, reviews journal, sets priority). The client's only initiations are "share journal" and "request session."
**Improvement:** Give the client real levers — (a) a between-session **"I'm not okay this week"** flag that routes to P0c and the therapist's queue; (b) structured **feedback** on sessions (feeds C1 + the alliance check, item 5); (c) **pause/end the relationship with dignity**; (d) **request a different therapist** via the Finder, which — under the dichotomieverbod model — switches without commission friction, making this a *client-protection* feature, not just acquisition. A genuinely two-sided product gives the client levers, not just a window into the therapist's workflow.

---

## For Therapists

### T1. Post-session clinical notes — [Therapist], H / H, **P1** (the adoption bet — now consent-gated)
**Current:** `src/pages/Sessions.tsx` "Clinical Note" quick action routes to `/sessions` with no target. No in/post-session note UI; status enum lacks "no-show"/"cancelled". Notes live outside the app.
**Improvement:** `PostSessionNoteModal` from the session card / "Completed" action. Fields: progress summary, homework assigned (links to task dialog), next focus, mood/presentation, **client-consent checkbox enforced via P0b**. Save linked to session; show in detail; Markdown export for EHR; timestamp + signature for the legal record. **Depends on P0a + P0b.**

### T2. Session-based auto-invoicing — [Therapist], H / H, **P2** (sequence after retention)
**Current:** `src/pages/Payments.tsx` + `InvoiceGenerator` require manual line items; hardcoded bank details ("Chase Bank"). No link between completed sessions and billing.
**Improvement:** "Generate invoice for [month]" pulls completed sessions, applies per-client rate (from relationship metadata), shows "4 × €80 = €320", one-click finalize/send, PDF export. Demoted from NOW: revenue features are worthless if retention is broken — ship after the product demonstrably helps clients.

### T3. Revenue KPI + overdue tracking — [Therapist], M / L, **P2** (quick win, but after #1–#5)
**Current:** `DashboardKpis` shows active clients, hours-vs-40h, pending tasks. No income anywhere.
**Improvement:** 4th KPI "This Week's Earnings" (EUR, trend vs last week) + outstanding total and 30-day-overdue count.

### T4. Clinical queue — intake-pending + crisis + next sessions — [Therapist], H / M, **P1**
**Current:** `ClinicalQueue` is imported but its content is unverified; intake backlog and crisis flags are invisible. Intake is assigned per-client via `ClientProfile` with no aggregate view.
**Improvement:** Wire the queue to intake-pending clients ("📋 Intake due" badge, "Send reminder"), recent crisis alerts (**fed by P0c**, including client "not okay this week" flags from C5), and next 3 sessions with countdowns. Mirror a count badge in the sidebar.

### T5. Client activity feed + silent-client flag — [Therapist], M / M, **P2**
**Current:** `TherapistDashboardContent.tsx` / `ActiveClientsTable.tsx` show clients + KPIs but no engagement timeline.
**Improvement:** "Client Activity This Week" — last-active, activity type, red flag if silent >7 days (configurable). Derive from existing timestamps; also surface a dip in the alliance micro-check (item 5).

### T6. Client clinical-summary field (NOT a CRM) — [Therapist], M / M, **P2**
**Current:** `ClientsTable` shows name/email/status only; `ClientProfile` has demographics but no clinical summary.
**Improvement:** A clinical-summary / personal-notes field on the profile. **Cut from the first draft:** the "Client Tags filterable in the table" CRM affordance — framing the therapeutic relationship as a CRM is a category error. Add tags only when there is a clear *clinical* use, not a sales-pipeline one.

### T7. Task templates + completion validation — [Therapist], M / M, **P2 (templates) / P1 (validation)**
**Current:** `src/pages/Tasks.tsx` tasks are one-off; due-date exists but no reminder, validation, or escalation. `denied_reason` exists in schema but has no client-facing UI.
**Improvement:** Reusable task library (Mood Log, Thought Record, Sleep Diary); per-task client reminder; link completion to journal/mood; escalate overdue to the clinical queue; denial-reason picker for clients.

### T8. Intake scoring + conditional logic — [Therapist], H / H, **P1 (scoring) / P2 (branching)**
**Current:** Intake templates are linear; responses are raw text/selections in `ClientProfile` → Intake tab. No scoring, no auto-summary, no branching.
**Improvement:** Scoring templates (PHQ-9/GAD-7 mapping → C1) with auto-severity + trend; skip-logic editor with preview/test mode. Q9-equivalent items route to P0c.

---

## For the Relationship (combined)

### R1. Session recap card (+ optional client-visible summary) — [Both], M / M, **P1**
**Current:** A completed session produces nothing visible to the client; the therapist sees only a checkmark. `sessions.notes` is therapist-private → trust/recall gap.
**Improvement:** Add `recapNotes` (+ optional `clientPrep`, + optional one-way `client_visible_summary` toggle) to sessions. On completion, 2-step modal: topics covered + 1–2 line focus for next time. Render in the client's session detail + notify "Your therapist added session notes." Therapist-authored — no autonomous AI. *(The old R9 "session summary sharing" is folded in here — it was a duplicate line item.)*

### R2. Post-session alliance micro-check — [Both], H / L, **P1** (NEW — strongest outcome predictor)
**Current:** Nothing measures whether the *relationship* is working — only symptoms (once C1 lands) and logistics. For a product named for the bond, that is the central omission.
**Improvement:** A single SRS-style question after each session — "How connected did you feel today?" (1–5). Feeds the client's recap (R1), the therapist's silent-client detection (T5), and the cohort outcomes layer (E5). Cheapest high-evidence retention lever available; a downward trend is an early churn/rupture signal.

### R3. Homework acknowledgment loop — [Both], M / L, **P1**
**Current:** Client marks a task complete; the therapist sees it but cannot respond; homework lands in a void.
**Improvement:** Add `completionNotes` + `therapistFeedback` to tasks. Optional client reflection on completion; therapist replies 1–2 sentences; client sees a feedback badge + notification.

### R4. Therapist-visible journal + "reviewed" signal — [Both], M / L, **P1**
**Current:** Clients share entries (`isSharedWithTherapist`) but there is no therapist UI to view them and no signal back.
**Improvement:** "Journal Entries" tab in `ClientProfile.tsx` filtered to shared entries (date / mood / snippet / seen badge); add `therapistSeenAt`; notify client "Your therapist reviewed your journal" (daily digest). Journal is a risk surface — register with P0c.

### R5. Read receipts + unread badge + urgency + client distress flag — [Both], M / L, **P1**
**Current:** Messages have `readAt` but `ConversationInterface.tsx` shows no ✓/✓✓; no sidebar unread count; no priority.
**Improvement:** Read indicators, sidebar unread badge with toast preview, `priority` enum (standard/urgent/crisis), urgent-floats-to-top sorting. Couples with the C5 client "I'm not okay this week" flag — urgent/crisis tagging routes to P0c. No autonomous escalation — both parties set priority, but the pipeline catches risk language.

### R6. Pre-session nudges + prep note — [Both], H / L, **P1**
**Current:** Sessions appear on calendar; `sessionNotificationService.ts` emails on creation only. No reminders.
**Improvement:** 24h-before in-app/SMS (opt-in) nudge with optional "What's on your mind?" prep note saved to the thread (tagged PRE-SESSION) and surfaced to the therapist. Reuses `sessions` + `notifications`; Twilio/Firebase scaffolded.

### R7. Intake-to-session bridge — [Both], H / M, **P2**
**Current:** Intake answers are read privately; nothing flows into prep or homework.
**Improvement:** Structured intake storage; a `sessionPrep` component surfacing intake highlights + last recap + homework status + client prep note; `intakeTemplate` link on tasks so homework can be scaffolded from intake.

### R8. Multi-therapist / referral continuity (client-owned record) — [Both], H / H, **P2** (NEW — the moat)
**Current:** E4 mentions "consented therapist-to-therapist transfer" only in passing.
**Improvement:** Make client-owned record portability a real, early feature: the client owns their record and can carry it to a new clinician (consented transfer of profile, outcomes, recaps; therapist-private notes redacted). Combined with C5 + the Finder, this is commission-free switching — the strongest expression of the strategic "client-owned profile" vision and the platform's defensible moat. Builds on P0b + E4.

---

## UI/UX & Accessibility (re-scoped: clinical-form usability, not contrast cleanup)

> Re-scope from "WCAG contrast cleanup" to **"the intake, outcome, and crisis paths are usable by someone anxious, on a phone, with a screen reader, in their second language."**

### U1. Clinical-form accessibility pass (intake, PHQ-9, crisis) — H / M, **P1** (NEW, highest a11y priority)
**Current:** The intake and PHQ-9/outcome forms have **no documented screen-reader/keyboard pass** — and these are the highest-stakes forms in the app. Only **5 files** use `aria-live`/`role="alert"`. There is no plain-language / reading-level standard for clinical copy (clients in distress, low health-literacy, non-native Dutch/French speakers). Crisis resources must work **offline and for screen readers under stress** — mentioned once in the first draft but never made a requirement with a test.
**Improvement:** Dedicated SR/keyboard pass on intake, the outcome questionnaire, and the crisis card; `aria-live` on validation and status changes; a documented plain-language / reading-level standard for all clinical copy across Dutch/French/English; an explicit **offline + screen-reader test for the crisis path** as an acceptance criterion.

### U2. Rebrand the intake "pending" banner off yellow — M / L, **P2**
**Current:** `src/components/intake/IntakePendingBanner.tsx` hardcodes `border-yellow-700/40`, `bg-yellow-900/10`, `text-yellow-300` — off-brand and a likely WCAG contrast fail.
**Improvement:** Use `accent`/`secondary` mint tokens with `text-primary` + bold copy (matches the crisis-resources pattern).

### U3. Crisis resources focus rings — M / L, **P2**
**Current:** `src/components/safety/CrisisResources.tsx` has strong ARIA + `tel:` links but no explicit `focus-visible:ring` on the anchors.
**Improvement:** Add `focus-visible:ring-2 ring-ring ring-offset-2` to crisis-line anchors — keyboard users in crisis need a clear focus indicator.

### U4. Reduced-motion support — M / L, **P2**
**Current:** No `@media (prefers-reduced-motion)` in `src/index.css` (confirmed: 0 occurrences) despite transitions/animations — WCAG 2.2 SC 2.3.3 fail.
**Improvement:** Add the standard reduce-motion block (animation/transition durations → 0.01ms).

### U5. Empty states across dashboards — M / M, **P2**
**Current:** `ActiveClientsTable.tsx`, client dashboard sections, and data tables render nothing at 0 rows → blank UI reads as broken.
**Improvement:** Standard empty-state pattern (icon + copy + CTA) for clients, homework, journal, sessions, and "no questions assigned" intake.

### U6. Wire loading skeletons (first load only) — M / M, **P2**
**Current:** `DashboardSkeleton.tsx` exists but pages render no loading state (comments explicitly removed it "for instant UI").
**Improvement:** Show skeleton on first mount when `isLoading && !data`; keep instant updates for refetches.

### U7. Audit mint contrast — M / L, **P2**
**Current:** Mint `hsl(162 73% 44%)` ≈ 5.8:1 on bg (AA pass, AAA fail); risk on mint-tinted backgrounds in `AiSupervisedBadge.tsx`, `BondCompanionCard.tsx`, `SystemStatusCard.tsx`.
**Improvement:** Run contrast checks; if any fail AA, darken mint to ~`hsl(162 73% 38%)` or use `mint-foreground` (deep-teal) for text on mint.

### U8. Mobile responsiveness (Capacitor) — H / H, **P1**
**Current:** `app-sidebar.tsx` uses `variant="inset"` on mobile (no hamburger/Sheet); tables horizontal-scroll with no affordance; no `env(safe-area-inset-*)`; dialogs `sm:max-w-md` may overflow narrow phones. `useIsMobile()` exists but is underused.
**Improvement:** Sidebar → `<Sheet>` below `md` with a header hamburger; scroll affordance or card layout for tables; safe-area padding in `DashboardLayout`; `max-w-[calc(100vw-2rem)]` on dialogs. Prioritize the intake/outcome/crisis paths on mobile first (ties to U1).

### U9. Intake edit / re-intake mode — H / H, **P1**
**Current:** `IntakeFormRenderer.tsx` is read-only; `ClientProfile.tsx` / `ClientIntakeTab.tsx` can't update answers.
**Improvement:** "Edit Intake" mode in `ClientProfile` (swap to inputs, save via `updateClientIntake`); client "request intake update" / "flag for re-submission" flow.

---

## Engagement & Value

### E1. Smart reminder engine — H / M, **P2**
**Current:** Notifications are reactive (session created → email). No silent-client recovery, overdue-task nudges, or check-in cadence.
**Improvement:** Configurable rules (client journal reminders; therapist "task overdue 3 days"; "14-day silent"); cron-driven; timezone-aware; frequency-capped 1/day; opt-in. New `reminder_preferences` + `reminder_logs`. (Edge-function senders must be fixed per P0a first.)

### E2. Therapist Finder marketplace — H / H, **P1 (revenue + client switching)**
**Current:** `is_regulated` flag exists; no finder pages, search, public profiles, or booking. Therapists are internal-only.
**Improvement:** Search/filter (specialization, language, modality, regulated); public profile fields (`public_bio`, `qualifications[]`, `years_experience`, `photo_public_url`, `is_finder_visible`); request-session → pre-fill intake → therapist accept → auto invite/session. **Dichotomieverbod-safe:** coaches pay €10–30/mo listing; regulated therapists list free (no per-booking commission, no price display). Also the mechanism for C5/R8 commission-free client switching. New `finder_requests`, `finder_listing_fees`.

### E3. Client-owned portable profile (GDPR Art. 20) — M / M, **P2**
**Current:** No export/portability; client data is locked in → compliance gap + lock-in fear.
**Improvement:** Settings "Export my data" → machine-readable JSON (profile, sessions, journal, tasks, outcomes, messages, **consent records from P0b**; therapist-private notes redacted). Feeds the consented transfer in R8. New `data_exports`, `data_portability_consents`; pairs with Right-to-Deletion.

### E4. Bond AI supervised reflection coach — H / H, **P3** (behind P0b + P0c + audit trail)
**Current:** Bond is a placeholder (see C3). No supervised-AI data model or value chain.
**Improvement:** On task completion, optional "Chat with Bond" → 3–5 reflection questions (Claude API). Save transcript; therapist reviews before session; client notified and can see what Bond asked. **Constraints:** supervised (therapist-in-loop, never autonomous), consent-gated (P0b), risk language routes to P0c, no fine-tuning on client data, GDPR-safe storage. **Clinical-safety net (NEW):** any AI-assisted clinical-note draft must carry an explicit "AI-generated, therapist must verify" audit trail with the therapist's edits logged — otherwise a hallucinated note enters the legal record.

### E5. Outcomes-analytics layer (internal "does this work?" instrumentation) — M / M, **P2** (NEW, pulled earlier)
**Current:** No product-level success metric. The first draft proposed lots of outcome *capture* but never defined the **denominator** — what "better" means.
**Improvement:** An anonymized, internal-only analytics layer tying features to a clinical/retention north-star: cohort symptom change (from C1), retention past session 6 (the known drop-off cliff), alliance-score trend (R2), homework-completion → outcome correlation. **Folds in the old E5 "onboarding funnel tracking"** (invite_accepted / profile_complete / first_journal / first_session timing) — that was instrumentation, not a standalone feature. This is also the seed of the later opt-in "network flywheel" and the strongest future sales/regulatory asset, but built internal-only first.

### E6. Data export / FHIR + Right to Deletion — M / H, **P3**
**Current:** No structured EHR export; GDPR Art. 17 deletion not built.
**Improvement:** FHIR Bundle / PDF export of the client record (consented) + deletion flow retaining only legally required billing data. (Superset of E3 — sequence E3 first, FHIR later.)

### E7. Supervisor / multi-user role — M / H, **P3**
**Current:** No supervisor/team-lead role; mandatory supervised practice for Belgian trainees is unsupported.
**Improvement:** Read-only supervisor access to supervisee clients/sessions/notes; timestamped supervision comments; "awaiting supervision approval" queue; audit trail. Requires schema role work (build on P0a auth model).

---

## Quick Wins (cheap, do-this-week, with file refs)

| Quick win | File(s) | Effort |
|-----------|---------|--------|
| Gate/reframe Bond placeholder toast → "coming soon" modal | `BondCompanionCard.tsx`, `client/ClientQuickActions.tsx` | L |
| Read receipts + sidebar unread badge | `ConversationInterface.tsx`, sidebar | L |
| Therapist-visible journal tab + `therapistSeenAt` | `ClientProfile.tsx` | L |
| Homework acknowledgment fields (`completionNotes`/`therapistFeedback`) | tasks schema + task UI | L |
| Post-session alliance micro-check (1 question) | session-completion flow, `sessions` | L |
| Homework streak + completion % (derive, no schema; gentle framing) | `client/MyHomework.tsx`, `ClientKpis.tsx`, `ActiveClientsTable.tsx` | L |
| Rebrand intake banner off yellow → tokens | `intake/IntakePendingBanner.tsx` | L |
| Crisis resources focus rings | `safety/CrisisResources.tsx` | L |
| `prefers-reduced-motion` block | `src/index.css` | L |
| Remove/route the "Join Room" dead-end tile | `dashboard/QuickActions.tsx` | L |
| Pre-session 24h nudge (reuse Twilio/Firebase) | `sessionNotificationService.ts`, `notifications` | L |
| Tighten CORS on edge functions to known origins (partial P0a) | `supabase/functions/*/index.ts`, `supabase/config.toml` | L |

---

## Sequenced Roadmap (corrected ordering: safety → client outcomes → revenue)

> The first draft's "NOW" led with clinical notes + invoicing — i.e. a better *therapist business tool* first. The correct ordering for a product "genuinely better for clients AND therapists" puts safety/legal first, the client-side outcome loop second, and revenue last.

### NOW (next 1–2 sprints) — STOP THE BLEEDING: safety, legal, trust
- **P0a Edge-function authorization fix** (live PII breach — nothing else ships safely first).
- **P0b Consent + lawful-basis data model** (hard dependency for all clinical/AI work).
- **P0c Crisis-escalation pipeline** (every new disclosure surface depends on it).
- **Quick-wins batch** (all safe to ship in parallel — cheap, high-trust): Bond gate, read receipts, journal tab, homework loop, alliance micro-check, gentle streaks, U2/U3/U4 a11y, "Join Room" cleanup, R6 pre-session nudge, CORS tightening.

### NEXT (sprints 3–4) — the client outcome loop (the retention bet)
- **C1 Shared progress loop** (merged outcome capture + client goals; consent-gated; Q9 → P0c).
- **R2 Post-session alliance check** (strongest outcome/retention predictor).
- **T1 Post-session clinical notes** (the adoption bet — now safely gated by P0a/P0b).
- **T4 Clinical queue** (fed by P0c + C5 client distress flags).
- **C5 Client agency levers** (between-session flag, feedback, dignified pause/end, switch).
- **U1 Clinical-form accessibility pass / U8 Mobile / U9 Intake edit** — Capacitor + clinical-path P1s.

### LATER (post-retention proof) — revenue, depth, platform
- **T2 Auto-invoicing + T3 earnings KPI + E2 Finder revenue** — *after* the product demonstrably helps clients.
- **R1 Session recap, R3 homework loop depth, R4 journal review, R7 intake-to-session bridge, T8 branching intake.**
- **R8 Multi-therapist continuity / client-owned record portability** (the moat) + **E3 portability**.
- **E5 Outcomes-analytics layer** (internal "does it work?" + folded-in funnel tracking).
- **E1 Smart reminders, U5/U6/U7 empty/loading/contrast, T5 activity feed, T6 clinical-summary field, T7 task templates.**
- **E4 Bond supervised reflection coach + AI-note draft with audit trail** (after T1 notes are stable).
- **E6 FHIR export + Right to Deletion, E7 supervisor/multi-user role.**
- **Network flywheel** (opt-in outcome aggregation, built on E5) — the platform bet; dedicated GDPR governance pass.

---

## Cuts & Demotes (from the first draft)

- **CUT — Milestone badges / gamification (old C5, R8-as-badges).** Gamifying a mental-health journey is generic SaaS thinking and clinically risky — a "50 journal entries" badge can shame relapse and trivialize distress. Keep only gentle, non-punitive streaks (C2). Drop badges, or make them therapist-awarded only.
- **DEMOTE — Bulk client actions (old T7, was P2/H).** Admin convenience at a scale you don't have yet; does nothing for clients or outcomes. Pushed to LATER (not listed above as a near-term item).
- **DEMOTE/RESCOPE — Client notes/tags as "visual CRM" (old T6).** Framing the relationship as a CRM is a category error. Keep the clinical-summary field (T6); cut the filterable-tags CRM affordance until there's a clear clinical use.
- **MERGED — Session summary sharing (old R9) into R1.** It was a duplicate line item; the roadmap was double-counting it.
- **MERGED — Treatment plan visibility (old R6) into C1.** Client goals belong *with* the outcome score in one "shared progress" feature, not a separate sprint.
- **DEMOTE — Self-serve booking (old E3) + bi-directional calendar sync (old E7).** Scheduling commodities available in any practice tool; they don't touch the bond or outcomes. Kept in LATER, must not creep up. (E7 removed as a standalone numbered item; folds into ordinary calendar work.)
- **CUT as a feature — Onboarding funnel tracking (old E5).** It's instrumentation, not a product capability; folded into the E5 outcomes-analytics layer.
- **DEMOTE — Add-client form progressive disclosure (old U8, was P1/H).** Nice form polish, mislabeled; it's M/L and serves therapist data-entry, not clients. Dropped below the safety/outcome work (not a near-term item).

---

## Compliance posture (now mapped to buildable items, not prose)
- **Edge-function auth (P0a)** — the live breach; fix before anything clinical.
- **GDPR Art. 9 (P0b)** — a real `consents` table + data-layer gate; every clinical/intake/outcome/AI feature *checks* it. Not aspirational copy.
- **Crisis safety (P0c)** — read-only resources are not enough; a risk-flag → therapist-alert pipeline backs every disclosure surface. Crisis card always-available + offline + screen-reader-tested (U1).
- **GDPR Art. 20 / 17** — portability (E3) and deletion (E6) on the roadmap; consent records exported and respected.
- **Supervised-AI-only** — every AI feature keeps a therapist in the loop; Bond never decides care; AI note drafts carry an "AI-generated, verify" audit trail with logged edits (E4).
- **Dichotomieverbod** — Finder restricts referral commissions to unregulated coaches; regulated therapists pay listing fees only; commission-free switching is a client-protection feature (C5/R8/E2).

---

## One-line summary for the deck
This is an excellent feature list that mistook a practice-management upgrade for a better therapeutic product, and treated compliance/safety as prose when the code shows it's an unbuilt, breach-exposed P0. Fix edge-function auth + the consent model + crisis-escalation first; merge outcome capture into a *shared, client-meaningful* progress loop with an alliance measure; give the client real relationship levers; deepen accessibility from contrast-cleanup to clinical-form usability; and cut the gamification and CRM/scheduling commodity items — revenue comes only after retention is proven.

**Key files referenced:** `supabase/functions/get-client-data/index.ts` (unauthenticated service-role PII leak), `supabase/config.toml` (`verify_jwt = false`), `src/integrations/supabase/client.ts` (mock is dev-only; backend is real), `src/components/dashboard/ActiveClientsTable.tsx` (`th_outcome` is a placeholder label), `src/index.css` (0 `prefers-reduced-motion`), `src/components/safety/CrisisResources.tsx` (read-only crisis surface), `src/components/dashboard/client/BondCompanionCard.tsx` + `client/ClientQuickActions.tsx` (dead Bond tile).

# 04 — Provider Experience: Bondable as the Daily Driver

Bondable wins providers not with a feature list but with a morning ritual: open the app, see today's clients with everything you need to walk into each session prepared, capture a note in 90 seconds after, and let the system watch the caseload for quiet risk in between. This plan rebuilds the provider dashboard around **today** (not "overview"), adds the clinical spine that is currently missing entirely (session notes, outcomes, invoicing), turns the Finder leads inbox into a real pipeline with respond-time discipline, and lays the workflow surface for group practices. Everything user-facing ships NL-first with a warm professional Flemish voice; everything clinical carries GDPR Art. 9 discipline (consent, audit, lock rules) from day one because retrofitting it is how healthtech products die.

Terminology note: this file says "provider" throughout, per 02-provider-generalization.md. Current code paths still say `therapist` — tickets reference the real paths and mark where renames land.

---

## Decisions

1. **REBUILD the provider dashboard as a Today view; retire the "overview" framing.** `src/components/dashboard/TherapistDashboardContent.tsx` (QuickActions → ActiveClientsTable → DashboardKpis → ClinicalQueue/ProviderLeads) is a reporting page, not a working page. Providers open the app 3–8× a day around sessions; the unit of work is *today's agenda*, not the client roster. Rationale: every serious practice tool (SimplePractice, Epione, Jane) converged on agenda-first. Tradeoff accepted: we lose the at-a-glance caseload table from the landing screen (it moves to `/clients`), and we throw away a dashboard that was rebuilt only weeks ago — sunk cost, but the current one optimizes for demo screenshots, not daily use.

2. **Session notes are a new first-class object (`session_notes` table), not the existing `sessions.notes` text column.** Notes need templates (SOAP/DAP/coach log), draft→signed lifecycle, amend-only-after-lock audit, and per-field structure. Overloading the free-text column would make outcomes, supervision views, and GDPR audit impossible. Tradeoff: a migration and a second place where "notes" exist (`sessions.notes` becomes logistics-only "session remarks"; `sessions.recap` stays the client-shared summary) — three note-ish fields demands very clear labeling in UI and code comments.

3. **Quick-capture is the primary note flow; the full editor is secondary.** A 90-second post-session capture (template chips + 3 structured fields + voice-of-provider free text) directly after each session beats a beautiful editor used never. Rationale: note debt is the #1 stated pain of solo clinicians. Tradeoff: quick-captured notes are thinner; we mitigate with "expand to full note" and a nightly "unfinished notes" nudge rather than blocking.

4. **Caseload intelligence is rule-based v1, no ML.** Risk score = weighted flags (Bond crisis/distress signals, missed/declined sessions, falling alliance ratings from `session_feedback`, unacknowledged `client_checkins`, task-completion collapse, message silence). Transparent rules the provider can inspect ("why is Els flagged?") build trust and are explainable under GDPR; an ML model on zero real users is fiction. Tradeoff: cruder detection, some false positives — acceptable because output is always "attention suggested", never automated action.

5. **Outcomes = built-in measures (session-by-session alliance already exists) + optional standardized questionnaires via the existing intake engine.** Reuse `questionnaire_templates`/`client_questionnaires` for OQ-45-style or custom trackers instead of a parallel outcomes engine. Tradeoff: the intake engine needs a `kind` field and recurring scheduling, stretching its original purpose — cheaper than a second engine, and 03-client-experience benefits from the same mechanism.

6. **Scheduling: build recurrence + availability + waitlist natively; calendar sync = one-way busy-feed (ICS out + Google free/busy in) in Phase 3, full two-way Google sync deferred to Phase 4 behind 08-architecture.** The dormant `google_calendar_connections` table and edge function stay. Rationale: two-way sync is a swamp (conflict resolution, OAuth verification review); a busy-overlay + ICS export delivers 80% of the value. Tradeoff: providers who live in Google Calendar wait one phase for true sync.

7. **Billing UI ships in Phase 3 against mock data; rails (Stripe/SEPA) land in Phase 4 per 08-architecture.** Belgium-aware invoicing (BTW/VAT toggle incl. medical exemption art. 44, RIZIV/mutualiteit fields, terugbetaling attestation note, accountant CSV/UBL export) is a *document* problem before it is a payments problem, and it is a top-3 reason Belgian solo providers pay for software. REBUILD `src/pages/Payments.tsx` (placeholder) as `/dashboard/provider/billing`. Tradeoff: a period where invoices exist but online payment doesn't — fine; most Belgian therapy invoices are paid by bank transfer anyway.

8. **Leads pipeline gets a 48-hour respond-time SLA with visible countdown, and accept flows straight into the existing invite system.** Dead lead inboxes kill marketplaces. SLA nudges are workflow (allowed on any tier); ranking on the Finder is never touched by responsiveness *payment*, but a "usually responds within X" transparency chip (fact, not paid placement) is shown — legal under dichotomieverbod/P2B because it is behavior-based and unbuyable. Tradeoff: pressure on part-time providers; mitigated by pause/holiday mode.

9. **Messaging boundaries are provider-set, client-visible.** Office hours, expected-response-time banner, out-of-office autoreply, quick replies. Rationale: async-messaging burnout is the top reason clinicians abandon client-messaging tools; explicit expectations protect the alliance. Crisis routing is never gated by office hours — the crisis banner (1813/113/112) shows exactly when boundaries are shown. Tradeoff: slight friction in the client compose UI (an "expect a reply by" line) — worth it.

10. **Practice features are a thin, real layer in this plan: shared calendar, internal referral, supervision notes-review; org model itself comes from 02-provider-generalization.md.** We spec the surfaces, 02 owns `practices`/`practice_members`/roles schema. Tradeoff: this plan's Practice-tier tickets hard-block on 02 — sequenced deliberately, Practice tickets are all Phase 4–5.

11. **Free/Pro/Practice split (proposal for 05-monetization.md to ratify): Free = full clinical core for a small caseload (notes, agenda, scheduling basics, leads with SLA, boundaries). Pro = intelligence & efficiency (caseload risk, outcomes dashboards, recurrence/waitlist/availability rules, invoicing, quick replies, analytics). Practice = multi-provider anything.** Never gate: safety (check-ins, crisis, Bond flags — surfacing risk can't be paywalled in a health product), data export (GDPR), or Finder visibility. Tradeoff: giving away the clinical core weakens short-term conversion; it is the compliance-and-ethics moat playing long.

---

## 1. Today view — REBUILD of the provider dashboard

**Route:** `/dashboard/provider` (alias `/dashboard/therapist` until 02's rename). **Replaces** the body of `src/components/dashboard/TherapistDashboardContent.tsx`. New components under `src/components/dashboard/provider/today/`.

### Layout (desktop, 12-col; single column stacks on mobile)

- **Header** — date-forward, typography-led: `Woensdag 2 juli` as the H1 (not "Dashboard Overview"), subtitle `3 sessies · 1 open plek · 2 acties` (EN: `3 sessions · 1 open slot · 2 actions`). No greeting-with-exclamation slop.
- **Left/main (col-span-8): TodayAgenda** — vertical timeline of today's sessions from `SessionService`, each rendered as a **ClientPrepCard**:
  - Time, duration, format icon (praktijk/online), client name, session count ("12e sessie").
  - **Prep strip** (the whole point): last signed note's one-line summary, homework status (`2/3 taken afgerond`), last alliance rating with trend arrow (from `session_feedback`), Bond flag chip if the risk engine raised one (mint-bordered, since it's AI-sourced), unacknowledged check-in badge.
  - Actions: `Voorbereiden` (opens ClientProfile prep drawer), `Notitie starten` (post-time: quick-capture), confirm/deny for pending requests (reuse SessionCard permission logic from `src/pages/Sessions.tsx`).
  - **Gap rows** between sessions ≥ 50 min: quiet inline row `Vrij 14:00–15:00 · 2 mensen op de wachtlijst` with `Vul dit gat` → waitlist picker (§5). Muted styling; never a promotional banner.
- **Right rail (col-span-4): ActionInbox** — one unified queue replacing `ClinicalQueue` + `CheckInAlerts` + inline `ProviderLeads`, sorted by a fixed severity order (never engagement-bait): 1 crisis/check-in flags, 2 Bond risk flags, 3 leads nearing SLA, 4 session requests, 5 unfinished notes, 6 unread messages, 7 intake submissions. Each item = icon + one line + single primary action. Empty state: `Alles bij. Tijd voor koffie.` (EN: `All caught up. Coffee time.`) — small text, no illustration blob.
- **Footer strip: WeekMini** — 5-day dot-density strip (sessions per day) linking to `/calendar`; replaces `DashboardKpis` on this page (KPIs move to Outcomes, §4).

### What moves where
- `ActiveClientsTable` → becomes the heart of `/dashboard/provider/clients` (`src/pages/Clients.tsx`), gaining risk-flag column (§3).
- `QuickActions` → collapsed into a single `+ Nieuw` split-button in the Today header (session / cliënt / taak / notitie). Kill the 5-tile grid — it's template-look.
- `ProviderLeads` full inbox → `/dashboard/provider/leads` (§7); Today shows only SLA-urgent ones inside ActionInbox.

### Data
New `dashboardService.getToday(providerId)` aggregate in `src/services/api/dashboardService.ts` returning agenda + prep data + action items in one call (mockClient first, real endpoint in Phase 4). Prep strip needs `session_notes` (§2) and risk flags (§3) — Today view ships Phase 1 with prep strip fields progressively populating as those land (render nothing, not placeholders, when data is absent).

### Copy (Flemish voice — concrete, unhurried, no exclamation marks)
- NL: `Eerste sessie met Els Vermeulen. Intake ingevuld op 28 juni — lees ze na voor je begint.`
- EN: `First session with Els Vermeulen. Intake completed 28 June — worth a read before you start.`
- NL (gap): `Geen sessies meer vandaag. Twee notities staan nog open van dinsdag.`

---

## 2. Clinical & session notes

### Schema (add to `src/server/db/schema.ts`)

```
note_templates: id, ownerId (null = system), kind ('soap'|'dap'|'coach_log'|'custom'),
  name, fieldsJson (ordered [{key,label_nl,label_en,type:'text'|'scale'|'chips',required}]), isDefault, createdAt
session_notes: id, sessionId FK sessions, providerId, clientId, templateId,
  contentJson (per-field), riskNote text (separate, prompted, never client-visible),
  status ('draft'|'signed'), signedAt, signedBy, createdAt, updatedAt
note_amendments: id, noteId FK, authorId, body, createdAt   -- append-only after signing
```
`auditLogs` (exists, line 525) records every read of a signed note by anyone who is not its author (supervision access, admin) — Art. 9 access trail.

**Three note fields, disambiguated everywhere in UI:**
- `sessions.notes` → relabel **"Praktisch" / "Logistics"** (location codes, "brings partner").
- `sessions.recap` → stays **"Samenvatting voor cliënt" / "Recap for client"** (client-visible, existing loop).
- `session_notes` → **"Klinische notitie" / "Clinical note"** (provider-only + supervision).

### System templates (seed in mockClient + Drizzle seed)
- **SOAP** — Subjectief / Objectief / Analyse / Plan.
- **DAP** — Data / Analyse / Plan.
- **Coach-sessielog** (for `is_regulated=false` providers, default for coaches): Doel vandaag / Wat gebeurde / Afspraken / Volgende stap. Non-clinical wording throughout — coaches must not be nudged into writing pseudo-clinical records.
- Every template ends with two optional shared fields: `Huiswerk` (creates linked `tasks` rows on sign) and `Risico` (feeds §3; prompt copy NL: `Iets gehoord dat je zorgen baart? Noteer het hier — dit blijft privé.` EN: `Heard something that worries you? Note it here — this stays private.`).

### Quick-capture flow (target: 90 seconds)
Trigger: session end time passes → ClientPrepCard flips to `Notitie starten`; also from ActionInbox and SessionDetail header. Sheet (not full page), keyboard-first:
1. Template pre-selected (provider default). 2. Mood/progress chip row (one tap). 3. Per-field textareas, `Tab` to advance; free dictation-friendly. 4. `Huiswerk` chips create tasks inline. 5. **Onderteken** (sign) or **Bewaar als klad** (save draft). Signing sets `signedAt` and locks.
Unfinished-note nudge: ActionInbox item next morning, NL: `Notitie van gisteren (Els V.) staat nog als klad.` Never a red badge — note debt shame doesn't help.

### Lock & amend rules
- `draft`: freely editable by author.
- `signed`: immutable. Edits become `note_amendments` (rendered as timeline under the note: "Aanvulling — 3 juli, 09:12"). No deletion; GDPR erasure requests route through the admin erasure workflow (06-compliance owns), not the provider UI.
- Full note editor + history lives in a new **Notes tab** on `src/pages/ClientProfile.tsx` (chronological, filterable, search) and read-only in `src/pages/SessionDetail.tsx`.

Tier: notes core (templates, quick-capture, lock/amend) = **Free**. Custom template builder + note search across caseload = **Pro**.

---

## 3. Caseload intelligence

**Engine:** `src/services/risk/riskEngine.ts` — pure function `computeRiskFlags(clientBundle) -> RiskFlag[]`, deterministic, unit-testable, runs client-side against mock data now and server-side (cron) after Phase 4.

Rules v1 (each flag = `{type, severity: 'watch'|'attend'|'urgent', evidence: string[], since}`):
- **Bond signal** — crisis pattern hit in Bond (`src/components/bond/` engine already detects 26 patterns; today it only renders resources client-side). Emit an event to a new `bond_flags` table → `urgent`, plus mirrored to admin oversight (coordinates with 07-bond and the existing AdminAllChats flagged view). Distress-adjacent intents (lowMood 3× in 7 days) → `watch`.
- **Check-in flag** — `client_checkins` distress unacknowledged > 24h → `urgent` (exists as CheckInAlerts; folds into this engine).
- **Session pattern** — 2 consecutive cancels/no-shows or nothing booked 21+ days for a weekly-cadence client → `attend`.
- **Alliance slide** — `session_feedback.allianceRating` drops ≥2 points or two consecutive ≤2 → `attend`.
- **Homework collapse** — task completion <25% over 3 weeks after a higher baseline → `watch`.
- **Silence** — no message/journal/Bond/task activity 14 days between sessions → `watch`.

**Surfaces:** severity dot + flag chips on ClientPrepCard and the `/clients` table risk column; **"Waarom?" popover** lists evidence lines verbatim (`Alliantiescore zakte van 4 naar 2 op 24 juni` / `Alliance score fell from 4 to 2 on 24 June`) — transparency is the feature. Dedicated `Aandacht` filter tab on `/clients`. Urgent flags also fire a notification (02/unified notification center, Phase 2 plan).

**Guardrails:** flags are suggestions — copy never diagnoses (`Signalen die aandacht verdienen`, never "at risk of relapse"). Client-facing surfaces never show flags. Flag computation events land in `auditLogs`.

Tier: `urgent` safety flags (Bond crisis, check-ins) = **Free, always** (Decision 11). Full engine (watch/attend rules, filters, history) = **Pro**.

---

## 4. Outcomes dashboard

**Per client** — new **Verloop / Progress tab** on `src/pages/ClientProfile.tsx`:
- Alliance sparkline (`session_feedback` over time) annotated with session dates.
- Task-completion ribbon per week; journal/Bond engagement density (counts only — never content).
- Questionnaire tracker lines: extend intake engine (`questionnaire_templates` gains `kind: 'intake'|'outcome'`, `recurrence: 'once'|'per_session'|'weekly'|'monthly'`; `client_questionnaires` gains `scoreNumeric`). Providers assign e.g. a burnout self-report every 2 weeks; scores plot on the same timeline. Reuses `IntakeTemplateBuilder` (`src/pages/IntakeTemplateBuilder.tsx`) with a scoring step.
- Chart style: thin ink-teal lines on white, dotted reference band, no gradient fills, no card-per-metric grid — one editorial column, `recharts` already available via shadcn.

**Per caseload** — `/dashboard/provider/outcomes` (absorbs `DashboardKpis`):
- Practice health this month: sessions held, no-show %, median alliance, notes signed within 24h %, active clients, response-time median on messages/leads.
- Distribution strips (not averages only): alliance histogram, task-completion spread — a caseload of 4s and 1s must not read as "2.5, fine".
- NL header copy: `Hoe je praktijk het doet — cijfers, geen oordeel.` EN: `How your practice is doing — numbers, not judgment.`

Tier: per-client Verloop tab = **Free** (it improves care directly). Caseload dashboard + outcome questionnaires = **Pro**. Practice-wide roll-up = **Practice** (§9).

---

## 5. Scheduling upgrades

### Schema additions
```
availability_rules: id, providerId, weekday, startTime, endTime, format ('in_person'|'online'|'both'),
  location, validFrom, validUntil
availability_exceptions: id, providerId, date, kind ('closed'|'extra'), startTime, endTime, note
session_series: id, providerId, clientId, rrule (RFC5545 subset: weekly/biweekly, count/until),
  defaults (time, duration, format), createdAt      -- sessions rows get seriesId FK, nullable
waitlist_entries: id, providerId, clientId, preferenceJson (weekdays, daypart, format), note,
  status ('active'|'offered'|'booked'|'removed'), createdAt
sessions += seriesId, cancelledReason ('client_cancelled'|'provider_cancelled'|'no_show'|'late_cancel'), cancelledAt
```

### Features
- **Recurring sessions** — "Herhaal wekelijks" in the create-session dialog; generates next N instances; edit-scope prompt (`alleen deze / deze en volgende`). Cancellation of one instance never silently kills the series.
- **Availability rules** — REBUILD `src/pages/WeeklyTimetable.tsx` (currently a static timetable) into the availability editor: weekly grid painting + exceptions (verlof). Feeds (a) client booking suggestions, (b) Finder profile "beschikbaarheid deze week" summary (fit signal, free for all — never paid placement, per dichotomieverbod), (c) gaps-to-fill on Today.
- **Waitlist** — add-to-waitlist from `/clients` and from a declined-lead flow ("geen plek nu → wachtlijst aanbieden"). Gap on Today → picker of matching entries → one-click `Stel dit moment voor` sends the client a proposed session (existing request/confirm state machine in `sessions.status` handles the rest).
- **No-show handling** — cancelling within the session's past-or-<24h window prompts for `cancelledReason`; no-show sets it, offers a templated follow-up message (NL: `We hadden vandaag een afspraak om 14u. Alles oké? Laat gerust iets weten om een nieuw moment te prikken.`), and counts into risk (§3) + no-show % (§4). A no-show **never** auto-charges — billing consequence is a manual invoice line (§6).
- **Calendar sync stance (Decision 6)** — Phase 3: per-provider secret ICS feed URL (read-only export) + Google free/busy overlay on `src/pages/Calendar.tsx` using the dormant `google_calendar_connections`; Phase 4 (08-architecture): true two-way sync via the existing `supabase/functions` Google logic ported to Vercel.

Tier: single-session scheduling + manual availability = **Free**. Recurrence, availability rules feeding booking, waitlist, ICS/free-busy = **Pro**.

---

## 6. Billing & invoicing (Belgium-aware) — UI spec; rails in 08-architecture

**REBUILD `src/pages/Payments.tsx`** (disabled placeholder) → `/dashboard/provider/billing`, new components `src/components/billing/`.

### Schema
```
provider_billing_settings: providerId PK, legalName, enterpriseNumber (KBO/BCE),
  vatStatus ('vat_exempt_art44'|'vat_21'|'small_business_exempt'), iban, defaultRate,
  invoiceFooterNl, invoiceFooterEn, numberingPrefix, nextNumber
invoices: id, providerId, clientId, number (sequential, immutable, gapless per provider),
  issueDate, dueDate, status ('draft'|'sent'|'paid'|'overdue'|'credited'),
  totalCents, vatCents, currency 'EUR', mutualiteitNote text, pdfUrl, createdAt
invoice_lines: id, invoiceId, sessionId FK nullable, description, qty, unitCents, vatRate
```

### Belgium specifics (the differentiator)
- **VAT**: `vat_exempt_art44` default for erkende psychologen/therapists (prints `Vrijgesteld van btw — art. 44 §1 W.BTW`); coaches default `vat_21`; kleine-onderneming option prints the small-business exemption clause. Driven by `is_regulated` + settings, always overridable.
- **Terugbetaling/mutualiteit**: per-invoice `mutualiteitNote` + a one-click **"Attest voor terugbetaling"** companion PDF (provider name, erkenningsnummer/visumnummer free-text fields on billing settings, session dates, amount) — the paper clients actually hand to CM/Helan/Solidaris. Copy NL: `Voeg dit attest toe voor je ziekenfonds. Bondable geeft geen garantie op terugbetaling — dat beslist je mutualiteit.`
- **Accountant export**: CSV (date, number, client initials, net, VAT, gross, status) + UBL/Peppol-shaped XML export marked *experimenteel* until validated with a real accountant (explicit Phase 4 validation task).
- **Privacy**: invoice descriptions default to `Consultatie — 60 min` (never diagnosis/topic); client full name only on the PDF itself, initials in exports.

### Flow
Sessions marked `completed` accrue to an **Onfacturé / Unbilled** list → select → `Maak factuur` → draft → PDF (server-side in Phase 4; client-side `react-pdf` against mock in Phase 3) → `Verstuur` (email via lifecycle mailer, 02-onboarding/notifications infra) → mark paid manually (bank transfer reality) or via Stripe link when 08 lands rails. Overdue = ActionInbox item at +14 days, gentle: NL `Factuur 2026-014 aan L.D. staat 14 dagen open.`

Tier: **Pro** entirely (invoice count >3/month; first 3 free to taste). Practice adds consolidated numbering + per-provider revenue split (**Practice**).

---

## 7. Leads pipeline (Finder → client)

**Extend** `src/components/dashboard/therapist/ProviderLeads.tsx` + new `/dashboard/provider/leads` page; `provider_requests` table exists.

- **Stages**: `pending → contacted → intake_scheduled → accepted → converted | declined | expired`. Extend the `status` CHECK; add `firstResponseAt`, `expiresAt (createdAt + 7d)`, `declineReason ('full'|'not_a_fit'|'other')`.
- **SLA**: 48h respond-time target. Lead cards show a quiet countdown (`nog 31 u` — text, not a red timer); ActionInbox escalation at 36h; email nudge at 40h (Phase 2 mailer). At `expired`, the seeker is notified and (with their prior consent at request time) re-suggested alternative fits by the Finder — the SLA has teeth or it's decoration. Median response time is published on the public profile as `Reageert meestal binnen 1 dag` — behavior-based transparency, unbuyable, dichotomieverbod-safe.
- **Accept → conversion**: `Accepteer` opens a prefilled invite (name/email from the lead) reusing the existing invite system (`src/components/.../InviteClientPanel`, `clientInvitationService`, `/invite/:token` — c6e6eab). On invite acceptance the lead auto-moves to `converted` and the relationship row is created. If `clientId` is already set (existing Bondable user), skip invite → direct connect.
- **Decline well**: reason required; `full` offers `wachtlijst aanbieden` (§5) and notifies the seeker with alternatives; `not_a_fit` optionally forwards to a named colleague (internal referral, §9, Practice) or back to the Finder.
- **No-poaching / neutrality**: leads inbox order = oldest-first, period. No paid reordering ever. Pause mode (`even geen nieuwe aanvragen` — sets `acceptingNewClients=false`, pauses SLA clocks) prevents SLA pressure from punishing part-timers.

Copy — NL: `Nieuwe aanvraag van Lotte D. over burn-out. Reageer binnen 2 dagen — mensen die snel antwoord krijgen, haken minder af.` EN: `New request from Lotte D. about burnout. Reply within 2 days — people who hear back quickly are far less likely to drop off.`

Tier: leads + SLA + accept/decline = **Free** (marketplace liquidity requires it). Pipeline board view, conversion analytics, decline-forward = **Pro**.

---

## 8. Messaging boundaries

**Extend** `src/pages/Messages.tsx` provider side + settings section in `src/pages/Settings.tsx`.

- **Schema**: `provider_messaging_settings: providerId PK, officeHoursJson (per weekday ranges), expectedResponse ('same_day'|'1_business_day'|'2_business_days'), autoreplyEnabled, autoreplyTextNl/En, oooFrom, oooUntil, oooTextNl/En` and `quick_replies: id, providerId, label, bodyNl, bodyEn, sortOrder`.
- **Client-side banner** in the conversation (composed surface owned by 03-client-experience, spec here): NL `An reageert doorgaans binnen 1 werkdag (ma–vr, 9–17u).` Outside hours, composer stays enabled (never block a client from writing) with `Je bericht komt aan; verwacht antwoord vanaf morgen 9u.` **Crisis exception**: the crisis-resources strip (1813/113/112, existing `CrisisResources` component) renders with any boundary banner — boundaries must never read as "help is closed".
- **Quick replies**: `/` in the provider composer opens the picker; seed four Flemish defaults ("bevestiging afspraak", "verzetten", "tussentijdse steun", "buiten bereikbaarheid"). Editable in settings.
- **Out-of-office**: date-ranged; auto-inserts one autoreply per thread per absence (not per message); Finder profile shows `Met verlof tot 12 augustus` when active.

Tier: office hours + expected-response banner = **Free** (boundary-setting is wellbeing, not upsell). Quick replies + OOO autoreply = **Pro**.

---

## 9. Practice & team (coordinate with 02-provider-generalization.md)

02 owns `practices`, `practice_members (role: 'manager'|'provider'|'assistant'|'supervisor')`, staff onboarding emails, and the rename. This plan owns the working surfaces:

- **Shared practice calendar** — `/dashboard/practice/calendar`: all members' sessions color-coded by member (ink-teal tints, not a rainbow), room/location lane optional. Assistants (role-gated) can schedule on behalf of providers; such actions log `actorId ≠ providerId` in `auditLogs`.
- **Internal referrals** — `practice_referrals: id, practiceId, fromProviderId, toProviderId, clientId, reason, status ('proposed'|'accepted'|'declined')`. Consent-first: the client approves the transfer in-app before any clinical data (notes stay with the original provider by default; explicit per-transfer sharing choice) moves. Feeds from lead-decline (§7) and from ClientProfile.
- **Supervision view** — a `supervisor` sees supervisees' caseload risk summaries and, **only with per-supervisee + per-client consent config**, signed notes (read-only; every read audit-logged per §2). Copy is explicit: NL `Je supervisor An De Wilde kan je ondertekende notities lezen. Dat is zo afgesproken binnen de praktijk.` Client-facing privacy policy surfaces this (06-compliance).
- **Manager cockpit-lite** — practice-level Outcomes roll-up (§4): utilization per provider, lead response medians, unbilled totals. No note content, ever.

Tier: everything here = **Practice**.

---

## Tickets

Build queue for Opus 4.8. Effort: S ≤ half day, M ≤ 2 days, L > 2 days (agent-days).

- `T-PX-1 | Today view shell (REBUILD provider dashboard) | Replace body of src/components/dashboard/TherapistDashboardContent.tsx with TodayAgenda + ActionInbox + WeekMini under src/components/dashboard/provider/today/; add dashboardService.getToday() aggregate (mock); move ActiveClientsTable to src/pages/Clients.tsx; collapse QuickActions into "+ Nieuw" split-button | Landing shows date-H1, today's sessions as timeline with confirm/deny working, unified ActionInbox renders check-ins+leads+requests sorted by severity, old overview components no longer render on landing, nl+en i18n keys added | L | Free | 1`
- `T-PX-2 | ClientPrepCard prep strip | Prep data (last note line, homework status, alliance trend, flags) on agenda cards; graceful absence (render nothing when a source is empty); "Voorbereiden" drawer linking to ClientProfile tabs | Card shows all populated prep fields for seeded demo clients; no placeholder text for missing data; drawer opens with client context | M | Free | 1`
- `T-PX-3 | session_notes schema + services | Add note_templates, session_notes, note_amendments to src/server/db/schema.ts; seed SOAP/DAP/coach-log system templates; noteService (CRUD, sign, amend) in src/services/api/ against mockClient; relabel sessions.notes→"Praktisch" and recap→"Samenvatting voor cliënt" in UI | Draft→signed lifecycle enforced in service (signed rejects update, accepts amendment); templates seeded in mock; three note fields distinctly labeled in SessionDetail | M | Free | 2`
- `T-PX-4 | Post-session quick-capture sheet | 90-second capture sheet from ClientPrepCard/ActionInbox/SessionDetail: template fields, chip rows, Huiswerk→tasks creation, sign or draft; unfinished-note ActionInbox item next day | Full capture of a SOAP note in ≤6 interactions; signing locks; homework chips create tasks rows linked to client; draft resurfaces in ActionInbox | L | Free | 2`
- `T-PX-5 | Notes tab on ClientProfile + locked-note audit | Chronological notes timeline with amendments rendering on src/pages/ClientProfile.tsx; auditLogs write on non-author reads; read-only note view in SessionDetail | Amendment renders as dated addendum under immutable original; audit row created when a different profile reads a signed note (verifiable in mock) | M | Free | 2`
- `T-PX-6 | Risk engine v1 + bond_flags | src/services/risk/riskEngine.ts pure rule engine (6 rules from plan §3) with unit tests; bond_flags table + emit from Bond crisis/pattern detection; severity dots + "Waarom?" evidence popover on /clients and ClientPrepCard | Deterministic tests per rule pass; Bond crisis hit in demo creates urgent flag visible on Today and admin oversight; evidence popover shows verbatim rule lines nl/en | L | Pro (urgent safety flags Free) | 3`
- `T-PX-7 | Aandacht filter + risk column on Clients | Risk column + "Aandacht" tab on src/pages/Clients.tsx (relocated ActiveClientsTable); urgent flags fire notification-center entries | Filter shows only flagged clients ordered by severity; notification created for urgent flags | S | Pro | 3`
- `T-PX-8 | Per-client Verloop (progress) tab | Alliance sparkline from session_feedback, weekly task-completion ribbon, engagement density on ClientProfile; recharts, ink-line editorial style per anti-slop rules | Tab renders for seeded client with ≥5 sessions; no gradients/no card-grid; empty state is one quiet sentence | M | Free | 3`
- `T-PX-9 | Outcome questionnaires via intake engine | questionnaire_templates.kind + recurrence + scoring; scheduling of recurring administrations; score lines plotted on Verloop tab; scoring step in IntakeTemplateBuilder | Provider assigns biweekly self-report; client completion produces scoreNumeric; score plots on client timeline | L | Pro | 3`
- `T-PX-10 | Caseload outcomes dashboard | /dashboard/provider/outcomes absorbing DashboardKpis: monthly practice health metrics + distribution strips (alliance histogram, completion spread) | Page renders from mock aggregates; distributions not just averages; nl+en copy per plan §4 | M | Pro | 3`
- `T-PX-11 | Recurring sessions (session_series) | session_series table + rrule subset; "Herhaal wekelijks/tweewekelijks" in create-session dialog; edit-scope prompt (deze / deze en volgende); seriesId on sessions | Creating weekly series generates instances; cancelling one leaves series intact; edit-scope prompt works both scopes | M | Pro | 3`
- `T-PX-12 | Availability rules (REBUILD WeeklyTimetable) | availability_rules + availability_exceptions; rebuild src/pages/WeeklyTimetable.tsx as paint-grid availability editor with verlof exceptions; expose "beschikbaarheid" summary to finderService profile payload | Rules persist (mock); exceptions override; Finder profile shows availability summary; no payment/rank interaction anywhere | L | Pro | 3`
- `T-PX-13 | Waitlist + gaps-to-fill | waitlist_entries table + add-from-Clients and from lead-decline; gap rows on TodayAgenda matching waitlist preferences; "Stel dit moment voor" creates session request via existing state machine | Gap row lists matching entries; proposing creates pending session the demo client can confirm; statuses transition active→offered→booked | M | Pro | 3`
- `T-PX-14 | No-show & cancellation handling | cancelledReason/cancelledAt on sessions; reason prompt on cancel; no-show templated follow-up message; feeds risk rule + no-show % metric | No-show sets reason, offers prefilled message, appears in outcomes metric and risk evidence; nothing auto-charges | S | Free | 3`
- `T-PX-15 | Calendar: ICS feed out + Google free/busy overlay | Per-provider secret ICS URL (mock-served); free/busy overlay lane on src/pages/Calendar.tsx using google_calendar_connections; explicit "two-way sync later" setting copy | ICS validates in a calendar client; busy blocks render as hatched lanes; no event content imported | M | Pro | 3`
- `T-PX-16 | Billing settings + invoice engine (UI, mock rails) | provider_billing_settings, invoices, invoice_lines schema; REBUILD src/pages/Payments.tsx → /dashboard/provider/billing; unbilled-sessions list → draft invoice → client-side PDF; gapless numbering; VAT modes incl. art. 44 exemption text | Completed session flows to invoice PDF with correct VAT clause per mode; numbering sequential and immutable; description defaults non-clinical | L | Pro | 3`
- `T-PX-17 | Mutualiteit attest + accountant export | Attest-PDF generator (erkenningsnummer fields on billing settings); CSV export (initials only) + experimental UBL export with visible "experimenteel" tag | Attest PDF contains required fields per plan §6; CSV opens in Excel with correct EUR formatting; UBL flagged experimental | M | Pro | 4`
- `T-PX-18 | Leads pipeline stages + SLA clock | Extend provider_requests (stages, firstResponseAt, expiresAt, declineReason); /dashboard/provider/leads page with oldest-first list + quiet 48h countdown; ActionInbox escalation at 36h; pause mode ties to acceptingNewClients | Stage transitions enforced in service; countdown text renders; expiry marks lead expired and (mock) notifies seeker; pause stops clocks | M | Free | 3`
- `T-PX-19 | Lead accept → invite conversion | Accept prefills existing invite flow (clientInvitationService) from lead data; invite acceptance auto-converts lead + creates relationship; existing-user leads skip invite | Demo lead → accept → invite → /invite/:token acceptance → lead status converted and client appears in caseload | M | Free | 3`
- `T-PX-20 | Respond-time transparency chip + SLA emails | Median firstResponse computed per provider; "Reageert meestal binnen X" on ProviderProfilePublic (behavior-based, unbuyable); 40h nudge email template nl/en into lifecycle mailer | Chip reflects seeded response history; no code path lets tier/payment affect chip or ordering; email template registered | S | Free | 4`
- `T-PX-21 | Messaging boundaries: office hours + expected-response | provider_messaging_settings schema + settings UI; client-side banner with expected response + after-hours note; crisis strip always co-rendered with boundary banners | Banner reflects settings in demo; composer never disabled; CrisisResources visible whenever after-hours note shows | M | Free | 2`
- `T-PX-22 | Quick replies + out-of-office | quick_replies schema + "/" picker in provider composer with 4 Flemish seed replies; OOO date range with once-per-thread autoreply + Finder "met verlof" note | Picker inserts reply; autoreply fires once per thread per absence in mock; Finder profile shows verlof line during range | M | Pro | 3`
- `T-PX-23 | Shared practice calendar + assistant scheduling | /dashboard/practice/calendar multi-member view (ink-tint coding); assistant role schedules on behalf with actorId audit logging (depends on 02 practices schema) | Members' sessions render color-coded; assistant-created session logs actor≠provider in auditLogs; role gating enforced | L | Practice | 4`
- `T-PX-24 | Internal referrals (consent-first) | practice_referrals schema + propose/accept/decline flow from ClientProfile and lead-decline; client in-app consent gate before relationship transfer; notes stay unless explicitly shared | Referral requires client approval in demo; declining leaves everything unchanged; note-sharing is separate explicit choice | M | Practice | 4`
- `T-PX-25 | Supervision view + practice roll-up | Supervisor role surface: supervisee risk summaries; consent-configured read-only signed-note access with per-read audit; manager practice metrics roll-up (no note content) | Supervisor sees flags only by default; note access appears only when both consent configs set; every note read audit-logged; manager sees metrics, never content | L | Practice | 5`

---

## Dependencies & risks

### Cross-domain dependencies
- **02-provider-generalization.md** — the provider/therapist rename (routes, i18n keys, `userType` param), `practices`/`practice_members`/roles schema, staff & manager onboarding emails. Blocks T-PX-23/24/25; T-PX-1 ships under the old route alias and renames with 02.
- **05-monetization.md** — must ratify Decision 11's Free/Pro/Practice line and own nudge mechanics (this plan only tags tiers; upgrade surfaces/gates live there). Invoice "first 3 free" taste-gate needs their sign-off.
- **03-client-experience.md** — client-visible halves of: expected-response banner (T-PX-21), waitlist offers and session proposals (T-PX-13), outcome questionnaire completion UX (T-PX-9), recap/alliance loop it already co-owns.
- **07-bond** (AI companion plan) — `bond_flags` event contract (T-PX-6): what the scripted engine emits now and what the real-LLM guardrail emits later; admin oversight mirroring in AdminAllChats.
- **08-architecture.md** — Neon cutover for every new table above; payment rails + PDF/email server-side (T-PX-16/17 rails, invoice email); Google two-way sync (post T-PX-15); cron for server-side risk computation; realtime for leads inbox.
- **06-compliance / GDPR plan** — erasure workflow for signed notes vs. record-keeping duties (Belgian patiëntendossier retention vs. Art. 17 conflict needs legal review), supervision-access consent language, invoice data minimization review.
- **Onboarding plan (Phase 2 owner)** — first-run tours must land on the Today view; empty-state copy for a zero-client provider ("Nog geen cliënten. Publiceer je Finder-profiel of nodig iemand uit.") is theirs to place, ours to write.

### Top risks
1. **Note-field confusion** (`sessions.notes` / `recap` / `session_notes`) — mislabeled UI here creates clinical-privacy incidents (provider-only text shown to client). Mitigate: T-PX-3 relabel ships *before* any note UI; add a lint-style service test asserting client-facing serializers never include `session_notes` or `riskNote`.
2. **Risk engine over/under-flagging erodes trust fast.** A provider who sees two dumb flags stops looking. Mitigate: evidence-transparent popovers, per-rule mute ("verberg dit signaal voor deze cliënt"), tune thresholds against seeded scenarios before real users.
3. **Belgian billing correctness** (art. 44 wording, gapless numbering, mutualiteit attest fields, UBL) — errors create real accounting/legal problems for providers. Mitigate: validate with one Belgian accountant + one erkend psycholoog before removing the "experimenteel" tag (explicit Phase 4 gate, T-PX-17).
4. **SLA pressure backfiring** — part-time providers churning because the countdown feels like Uber. Mitigate: pause mode is one click, copy stays factual not punitive, and expiry helps the *seeker* rather than shaming the provider.
5. **Scope gravity of the Today rebuild** — T-PX-1/2 can absorb weeks if prep-strip data sources (notes, risk) are treated as blockers. Mitigate: absence-renders-nothing rule lets Today ship in Phase 1 skeletal and thicken through Phases 2–3.
6. **Dashboard rebuild fatigue** — this is the second dashboard rebuild (task #20 built the current one). Mitigate: reuse SessionCard permission logic, ProviderLeads internals, and CheckInAlerts data hooks inside the new shell; the rebuild is composition, not scorched earth.
7. **Mock→Neon drift** — every table added here in mockClient must land byte-compatible in Drizzle or Phase 4 becomes a rewrite. Mitigate: schema-first (add to `src/server/db/schema.ts` in the same ticket as the mock seed), which the tickets already mandate.

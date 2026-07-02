# 03 — Client Experience: the between-sessions product

**Thesis.** The client side of Bondable is not a revenue line — it is the retention engine for providers and the supply engine for the finder. A client who opens the app three times a week because it genuinely helps (a gentle Bond check-in, a care plan that feels human, progress they can *see and own*) is the strongest possible reason for a provider to keep paying and for the marketplace to have inventory. Therefore: clients are 100% free, forever, with zero paywalls and zero dark patterns; every client feature below is designed around one loop — *check in → reflect → see progress → arrive at the next session prepared* — with the safety net omnipresent and consent as a visible, revocable product surface, not a buried settings page.

---

## Decisions

1. **Clients are 100% free — permanently, and we say so in-product.** Rationale: (a) mental-health ethics — paywalling any part of the care loop is indefensible and a PR/regulatory liability under GDPR Art. 9 framing; (b) economics — client engagement is what makes provider Pro/Practice tiers worth paying for (engagement analytics, Bond summaries, outcome charts are *provider-side* value); (c) growth — the client-owned portable profile only works as an acquisition loop if it's free to keep when you change providers. Tradeoff accepted: we forgo all B2C revenue and concentrate ARPU risk on providers; 05-monetization must earn everything from the provider side. Boundary rule for 05: **a client-side feature may power a provider-side paid feature (e.g. mood-trend charts visible to provider = Pro), but the client always keeps full free access to their own data and features.**

2. **Bond becomes the daily spine; mood tracking lives INSIDE Bond, not as a separate tracker.** Rationale: a standalone mood widget is commodity slop; a 20-second check-in conversation ("Hoe was vandaag, Lotte?") that links to the client's active goals is differentiated and feeds the therapist summary. Tradeoff: check-in data quality depends on Bond UX quality, and the scripted engine must be structured enough to capture a 1–5 mood + tags deterministically even before the real LLM lands (Phase 3 wires structure; LLM richness comes with 04-platform's `/api/bond`).

3. **Gentle continuity, never streaks.** No streak counters, no fire emojis, no "don't break the chain", no loss-framed notifications. Mechanic: a 7-day "week ribbon" of dots that fills forward and *never shames backwards* — missed days render as neutral, not broken; copy always frames return as welcome ("Fijn dat je er weer bent" / "Good to see you again"). Tradeoff: measurably lower DAU than guilt mechanics would produce; we accept that because guilt mechanics on a mental-health population is both harmful and brand-fatal.

4. **Reuse the questionnaire machinery for outcomes; do not build a parallel assessment system.** `questionnaire_templates/questions/client_questionnaires/questionnaire_responses` (src/server/db/schema.ts:425–496) already model assign→fill→respond. We extend with a `scoring` jsonb column + seeded PHQ-9/GAD-7 templates + a Goal Attainment Scaling (GAS) template type for coaches (`is_regulated=false` providers never see clinical instruments as defaults). Tradeoff: some schema shoehorning (scored instruments have stricter validation than freeform intake), but one system, one builder, one client fill-UX.

5. **REBUILD the client home as "Vandaag" (Today).** The current ClientDashboardContent (quick-action tiles + KPI cards + homework table + right rail) is a therapist-dashboard clone, not a daily companion. Replace with a single prioritized stack (see §7). Explicit REBUILD: `src/components/dashboard/client/ClientDashboardContent.tsx`, `ClientKpis.tsx`, `ClientQuickActions.tsx`. Keep and rehome: NextSessionCard, BondCompanionCard, RecentJournalCard, MyHomework (as data source). Tradeoff: throwing away working UI; justified because the home is the single highest-leverage screen and the current one answers "what data exists" not "what should I do now".

6. **REBUILD client Tasks into a "Care Plan" card view; keep the data table for providers.** `src/pages/Tasks.tsx` is role-aware but renders the same sortable table to both roles. Clients get cards grouped by goal with completion *reflections* and provider *reactions*; providers keep the table (their plan, 02-provider-experience, owns that side). Tradeoff: two render paths for one entity; acceptable because the jobs are genuinely different (manage 40 clients' tasks ≠ do my 3 exercises).

7. **Consent is a product surface: a Consent & Data Center at `/dashboard/client/data`.** Every provider-visible artifact (journal entry, mood trend, Bond summary, assessment result) carries a per-item consent state with a visible chip, default **private**, revocable retroactively (revoke = provider loses access going forward AND past artifact hidden; audit-logged). Export (JSON + human-readable PDF) is a first-class button, not a support ticket. Rationale: this IS layer 4 (portable profile) germinating, and it's our GDPR Art. 9 + portability story made tangible. Tradeoff: consent granularity adds a check to every provider-side read path (04-platform must enforce server-side, not just hide in UI).

8. **Safety net omnipresence: one component, three placements, and crisis events become signals.** Today CrisisResources renders in the dashboard rail and inline in Bond, but crisis detection only logs to console. Rule set: (a) a quiet persistent "Hulp nodig?" affordance in the client shell footer/sidebar on every client route; (b) Bond guardrail stays client-side and offline-capable (bondEngine.ts explicitly requires this — keep); (c) every crisis trigger writes a `crisis_events` row → therapist notification + admin flagged-chats queue (already exists at /dashboard/admin/chats). Assessments join the net: PHQ-9 item 9 > 0 immediately interrupts the questionnaire with the crisis panel (1813 BE / 113 NL / 112) before anything else. Tradeoff: recording crisis events is sensitive data creation; mitigated by minimal payload (timestamp, surface, no message text without consent) — 04-platform owns retention policy.

9. **Bond summaries to the provider are opt-in per summary, with client preview.** Bond drafts a weekly summary ("Deze week: 4 check-ins, stemming gemiddeld 3/5, thema's: slaap, piekeren"); the client reads it first and taps "Deel met Sofie" or "Houd privé". Never auto-shared. Rationale: this is the supervised-AI promise made honest — today BondChat says "your therapist can see this" with no channel behind it (a trust bug, not just a gap). Tradeoff: some clients will never share, reducing provider-side value; that's the correct failure mode.

10. **Terminology: "provider" everywhere client-facing, with the person's actual role word when known.** Client UI says "je begeleider" (your provider/counsellor) generically, and "je psycholoog Sofie" / "je coach Ward" when the provider's `provider_type` is known. Aligns with the platform-wide generalization owned by 01/02. Tradeoff: i18n churn across ~1145 keys; do it once in Phase 1 with the rename sweep.

---

## Spec

### 1. Bond upgrades (Phase 3, with structure landing earlier)

**Files:** `src/components/bond/bondEngine.ts` (extend — swap point at the documented SWAP POINT block), `src/components/bond/BondChat.tsx`, new `src/components/bond/BondCheckIn.tsx`, new `src/services/bondSummaryService.ts`, new `src/services/checkinService.ts` (distinct from existing `clientCheckins` distress check-ins — those stay the safety channel).

**Daily check-in (structured, inside chat).** Bond opens (or a chip triggers) a 3-step micro-flow rendered as chat bubbles with tappable controls, not free text:
1. Mood 1–5 (five tappable faces, neutral design — no red/green judgment colors; use ink-tint scale).
2. Optional tags (max 3): `slaap / piekeren / energie / sociaal / werk-school / lichaam` (+ per-goal tag chips from active goals).
3. One optional sentence ("Wil je er iets bij zeggen?").

Persisted to new table `mood_checkins` (id, client_id, mood smallint, tags text[], note text, goal_ids uuid[], source enum('bond','home','notification'), created_at). Under 25 seconds end-to-end. If the client types distress instead, the crisis guardrail preempts everything (existing behavior, keep).

**Goals.** New table `goals` (id, client_id, provider_id, title, description, status enum('active','paused','reached','archived'), target_date, gas_levels jsonb nullable, created_by). Providers create/edit (02 owns their UX); clients see goals on Vandaag and in check-ins; tasks and check-in tags link to goals (`tasks.goal_id` nullable FK added to schema.ts:326 table).

**Session-prep prompt.** Existing PreSessionNudge stores prep notes in localStorage only (audit-confirmed dead end). Persist to `sessions.prep_note` (new column) with a consent toggle "Mag Sofie dit vooraf lezen?" default ON for prep notes specifically (it's authored *for* the session) but still explicit. Bond offers prep 24h before a session: "Morgen zie je Sofie. Waar wil je het zeker over hebben?"

**Post-session reflection.** 2h after `sessions.status='completed'`, Bond (and a Vandaag card) offers: "Hoe kijk je terug op je gesprek?" → 1 line + optional mood. Stored as a journal entry with `entry_type='session_reflection'` and `session_id` link; complements (does not replace) the existing PostSessionAllianceCheck 1–5.

**Weekly summary → provider (Decision 9).** New table `bond_summaries` (id, client_id, provider_id, week_start, body text, stats jsonb, consent_status enum('draft','shared','kept_private'), shared_at). Phase 3 generates it deterministically from check-in stats + tag frequencies (no LLM needed); Phase 4's real LLM makes prose richer. Client-side preview card copy —
NL: *"Bond heeft een weekoverzicht gemaakt. Jij beslist of Sofie het ziet."* [Deel met Sofie] [Houd privé]
EN: *"Bond drafted a weekly summary. You decide whether Sofie sees it."* [Share with Sofie] [Keep private]

**Bond engine wiring order.** Phase 3: structured check-in flows + summary stats stay scripted/deterministic. Phase 4 (owned by 04-platform): `/api/bond` real LLM behind the same `bondRespond` signature; crisis regex layer remains client-side per the file's own contract.

### 2. Progress & outcomes (Phase 3)

**Files:** extend `src/pages/ClientIntake.tsx` fill-UX or (better) new `src/pages/ClientProgress.tsx` at `/dashboard/client/progress`; extend `src/server/db/schema.ts` questionnaire tables; new `src/components/progress/ScoreChart.tsx`, `MoodTrendChart.tsx`, `GasLadder.tsx`; seed data in the mock client (`src/integrations/supabase/mockClient.ts`).

- Add `questionnaire_templates.template_kind` enum('intake','outcome_scored','gas') and `scoring` jsonb (per-item weights, band cutoffs, crisis_item index). Seed PHQ-9, GAD-7 (official Dutch validated wordings — licensing note: both are public domain), and a 3-goal GAS template (-2..+2 ladder per goal) for coaches.
- **Instrument gating by provider type:** clinical instruments (PHQ-9/GAD-7) are assignable only by `is_regulated=true` providers; coaches get GAS + custom Likert scales. Client-side rendering identical.
- **Client owns the chart.** `/dashboard/client/progress` shows: mood trend (from mood_checkins, 30/90-day), assessment score lines with band shading (e.g. PHQ-9 0–4 minimal … 20–27 severe — bands labeled in calm clinical language, never "you are severe": NL *"scorezone: ernstig verhoogd"*, EN *"score range: severely elevated"*), GAS ladder progress, and per-goal task completion. Every chart has "Deel met je begeleider" toggle (per chart type) and appears in the export.
- **Cadence:** provider assigns instrument + recurrence (e.g. PHQ-9 every 2 weeks); client gets a Vandaag card + notification. Filling takes the existing intake fill-UX with fixed choices; ~90 seconds.
- **Safety:** PHQ-9 item 9 > 0 → immediate inline crisis panel + `crisis_events` row + therapist notification; questionnaire completes afterwards if the client chooses.
- Never gamify scores: no confetti on "improvement", no arrows colored green/red; a lower PHQ-9 line simply trends down with a neutral annotation *"–4 sinds vorige meting"*.

### 3. Journal 2.0 (Phase 3; schema prep in Phase 2)

**Files:** `src/pages/Journal.tsx` (extend, not rebuild — the entry flow, attachments and share badges work), schema `journal_entries` (:237) add `mood smallint null`, `tags text[]`, `prompt_id uuid null`, `entry_type` enum('free','prompted','session_reflection'), `share_scope` enum('private','shared') replacing the boolean; new table `journal_prompts` (id, body_nl, body_en, body_fr, body_es, category, provider_id nullable — null = Bondable library, provider-authored otherwise, is_active).

- **Prompts library:** ~30 seeded prompts across categories (piekeren, zelfbeeld, relaties, werk, dankbaarheid — written, not generated slop; e.g. NL *"Wat zou je vandaag tegen een goede vriend(in) zeggen die zich voelde zoals jij?"* / EN *"What would you say today to a close friend who felt the way you do?"*). Providers can add their own and assign one to a client (creates a Vandaag card).
- **Granular sharing:** per-entry toggle stays; add "share this entry from now on with: [provider name]" per relationship when multiple providers exist. Default private, always. Changing to private retroactively hides it provider-side (Consent Center logs it).
- **Mood tag on entry:** optional same 1–5 + tags as check-ins; feeds the same mood trend chart (single source of truth: journal-entry moods insert a mood_checkins row with source='journal').
- **Quick wins folded in:** debounced autosave draft (localStorage), attachment thumbnails + count in RecentJournalCard, save-confirmation toast (audit: intake submit has no feedback either — same toast pattern).

### 4. Homework → Care Plan (Phase 3; REBUILD client view)

**Files:** REBUILD client render path of `src/pages/Tasks.tsx` into new `src/components/careplan/CarePlanView.tsx` + `TaskCard.tsx` + `CompletionSheet.tsx`; schema `tasks` add `goal_id uuid null`, `completion_reflection text null`, `completed_felt` smallint null (1–5 "hoe ging het?"), new table `task_reactions` (id, task_id, provider_id, kind enum('seen','encourage','note'), note text null, created_at).

- **Client view:** cards grouped under goal headers ("Beter slapen — 2 van 3 gedaan deze week"), each card = title, why-this-helps line (provider-authored `rationale` — add column), due window, single [Gedaan] action.
- **Completion reflection:** tapping Gedaan opens a bottom sheet: "Hoe ging het?" 1–5 + optional line. Skippable in one tap — reflection is invited, never gated.
- **Provider reactions:** provider sees completions with reflections and can react ("Gezien 👌" maps to kind='seen' but rendered as text chip, no emoji per anti-slop; 'encourage' renders NL *"Sofie: goed bezig."*). Client gets a quiet notification. This closes the loop that makes homework feel witnessed rather than assigned.
- **Vandaag integration:** at most 2 task cards surface on the home per day (the ones due soonest); "alles bekijken" goes to the Care Plan. Never show a raw count of overdue items as a red badge — overdue tasks say NL *"Nog open — geen stress, pak het op wanneer het past"* only in the plan view.
- **MyHomework dashboard table** (`src/components/dashboard/client/MyHomework.tsx`) is retired when Vandaag ships; its accept/decline inline actions move onto TaskCard.

### 5. Client-owned profile & Consent Center (Phase 2 skeleton, Phase 4 real export)

**Files:** new `src/pages/ClientData.tsx` at `/dashboard/client/data` (add route to src/App.tsx alongside :250 journal route); new `src/services/consentService.ts`; new tables `consent_grants` (id, client_id, provider_id, artifact_type enum('journal','mood_trend','bond_summary','assessment','prep_note'), artifact_id uuid null — null = category-level, status enum('granted','revoked'), granted_at, revoked_at) and `data_export_requests` (id, client_id, format enum('json','pdf'), status, requested_at, fulfilled_at).

Three tabs:
1. **Wat ik deel / What I share** — matrix of artifact categories × providers, with per-item drill-down; every toggle mirrors the chips shown on the artifacts themselves. One revoke action per row, effective immediately (mock now; server-enforced by 04 in Phase 4).
2. **Mijn gegevens / My data** — plain-language inventory ("12 dagboekfragmenten, 34 check-ins, 3 vragenlijsten…"), export buttons (Phase 2: client-side JSON from mock data — honest instant win; Phase 4: server-generated JSON + PDF including provider-authored recaps the client is entitled to under GDPR Art. 15).
3. **Mijn verbindingen / My connections** — provider relationships with start date and "verbinding beëindigen" (ends sharing, keeps the client's own data — the portable-profile promise). Copy, NL: *"Jouw gegevens zijn van jou. Als je stopt bij een begeleider, neem je alles gewoon mee."* EN: *"Your data is yours. If you stop seeing a provider, everything comes with you."*

This page is deliberately boring-clear: no cards with icons everywhere; a typographic ledger. It is also the seed of platform layer 4 — 04-platform and 05-monetization must treat these tables as canonical, not invent parallel consent flags.

### 6. Psychoeducation resource library (Phase 3)

**Files:** new `src/pages/ClientResources.tsx` at `/dashboard/client/resources`; new tables `resources` (id, title, body_md, locale, format enum('article','audio','pdf','link'), duration_min, category, author_provider_id nullable — null = Bondable curated, is_published) and `resource_assignments` (id, resource_id, client_id, provider_id, note text null, status enum('assigned','opened','done'), assigned_at).

- Launch with ~15 curated Dutch-first pieces (sleep hygiene, piekercirkel, ademhaling 4-7-8, wat is CGT, paniek uitgelegd) — written editorial content, no stock-photo cards; typography-led list like a quality newspaper's explainer section.
- Provider assigns with an optional personal note ("Lees dit eens voor donderdag — sluit aan bij wat we bespraken"). Assignment creates a Vandaag card and a task-like entry in the Care Plan under the relevant goal.
- Client can browse the whole library freely (Free, always); "assigned by your provider" items float to the top. Provider-authored resources are a Practice-tier authoring feature (02/05 own that gate) but *reading* anything is free for clients.

### 7. Client home REBUILD — "Vandaag" (Phase 1 shell + Phase 3 full)

**Files:** REBUILD `src/components/dashboard/client/ClientDashboardContent.tsx` → new `src/components/today/TodayView.tsx` + `TodayCard.tsx` + `WeekRibbon.tsx`; keep `NextSessionCard`, `BondCompanionCard` (de-hardcode: show last check-in mood + a contextual opener instead of the same static tile for everyone — audit flagged this), `RecentJournalCard` as rehomed cards.

**Priority stack (top → bottom), max 5 cards, one column, editorial spacing:**
1. **Safety-relevant** (only when applicable): unacknowledged distress follow-up, crisis follow-up.
2. **Today's check-in** (if not done): one-tap into Bond check-in. Header greets by name + week ribbon. NL: *"Dag Lotte. Klaar voor je check-in van vandaag?"* EN: *"Hi Lotte. Ready for today's check-in?"*
3. **Session-adjacent** (when within 24h either side): prep prompt or post-session reflection; NextSessionCard otherwise collapses to a one-line row.
4. **Care plan**: up to 2 due task cards.
5. **Assigned**: pending assessment or resource.
Footer row (always): quiet links — Journal, Progress, Resources, and the persistent *"Hulp nodig?"* safety affordance.

Empty/complete state is a feature, not a gap: when everything's done, show a calm full-bleed typographic card — NL: *"Alles gedaan voor vandaag. Tot morgen."* EN: *"All done for today. See you tomorrow."* No confetti.

The 5-tile ClientQuickActions and 4-KPI ClientKpis rows are removed; their destinations live in the sidebar and footer links. KPI-style stats move to /progress where they mean something.

### 8. Safety net omnipresence rules (Phase 1 rules; Phase 3 signals)

- **Rule 1 — always one tap away:** persistent "Hulp nodig?" text button in the client shell (sidebar bottom + Vandaag footer + Bond header, replacing the current single-dashboard-card placement as the *only* discoverable path). Opens the existing CrisisResources sheet (component already exports a bare variant — consolidate to one owner component, one sheet pattern; audit flagged the redundancy).
- **Rule 2 — guardrail is client-side and offline-first:** bondEngine crisis regex stays local (its own header mandates this); resources sheet works offline (static tel: links — already true).
- **Rule 3 — crisis becomes a signal:** new table `crisis_events` (id, client_id, surface enum('bond','assessment','checkin'), severity, created_at — no message content by default). Writes trigger: therapist notification (existing notifications table :273), admin flagged queue (AdminAllChats already renders flagged Bond conversations — wire to this), and a Vandaag follow-up card next day: NL *"Gisteren was zwaar. Hoe is het nu?"* with the resources link and a one-tap "stuur Sofie een berichtje".
- **Rule 4 — never gate, never delay:** no consent dialog, no loading state may ever stand between a crisis trigger and the resources panel. Crisis panel renders synchronously from local data.
- **Rule 5 — language:** crisis copy exists in NL/FR/EN/ES with region-correct lines (BE: 1813, Zelfmoordlijn; NL: 113; emergency 112) — current implementation covers BE/NL; add FR-BE line (0800 32 123, Centre de Prévention du Suicide) with the i18n sweep.

### Free vs paid (coordination contract with 05-monetization)

| Surface | Client tier | Provider-side monetizable? |
|---|---|---|
| Bond check-ins, chat, summaries | Free | Summary *analytics across caseload* = Pro |
| Assessments + own charts | Free | Outcome dashboards, export to reports = Pro |
| Journal 2.0 incl. attachments | Free | — |
| Care plan + reflections | Free | Reaction/engagement analytics = Pro |
| Consent Center + export | Free (legal right, never gated) | — |
| Resource library (read/receive) | Free | Authoring own resources = Practice |
| Crisis/safety anything | Free, unconditionally | Never monetized in any form |

Hard line for 05: no client-facing upgrade nudges exist at all. Clients never see the word "Pro".

---

## Tickets

T-CX-1 | Vandaag home shell (REBUILD) | Replace ClientDashboardContent/ClientKpis/ClientQuickActions with TodayView priority stack (src/components/today/*), rehome NextSessionCard/BondCompanionCard/RecentJournalCard, add footer links + done-state | Client home renders max-5-card stack per §7 order; tiles/KPIs gone; all old destinations reachable via sidebar/footer; NL+EN copy in i18n | L | Free | 1
T-CX-2 | Provider terminology sweep in client UI | Replace "therapist" with provider-generic keys across client surfaces (Therapists.tsx → "Mijn begeleiders", Bond supervised-by framing, dashboards); use provider_type word when known | No client-facing "therapist" hardcode remains; nl/en/fr/es keys added; Therapists page renamed route alias kept | M | Free | 1
T-CX-3 | Safety affordance omnipresence | One CrisisResources owner component + sheet; persistent "Hulp nodig?" in client sidebar, Vandaag footer, Bond header; remove redundant bare export duplication | Affordance visible on every client route; sheet opens synchronously offline; FR-BE line added | S | Free | 1
T-CX-4 | Consent & Data Center skeleton | New /dashboard/client/data route (App.tsx) + ClientData.tsx three-tab page; consent_grants + data_export_requests tables in schema.ts; mock-backed consentService; client-side JSON export of own mock data | Page lists artifact-category × provider matrix; toggles persist in mock; JSON export downloads; NL+EN ledger copy | M | Free | 2
T-CX-5 | Journal schema + sharing granularity | Extend journal_entries (mood, tags, prompt_id, entry_type, share_scope), per-relationship share control, retroactive-private honored in provider read path, save toast + autosave draft | Entry saves with mood/tags; toggling private hides provider-side in mock; toast on save; draft survives reload | M | Free | 2
T-CX-6 | Prep note persistence + consent | sessions.prep_note column; PreSessionNudge writes to store not localStorage; "Mag X dit vooraf lezen?" toggle; provider sees consented notes on session detail | Prep note survives reload/device; consent off = provider never receives it; shows in SessionDetail both roles | S | Free | 2
T-CX-7 | Notification wiring for client loop | Vandaag-driving notifications (check-in reminder at user-chosen hour, session prep 24h, new provider reaction, assigned assessment/resource) via notifications table + unified center from 02/04 plan | Each event type creates one notification; reminder hour configurable in settings; no loss-framed copy anywhere | M | Free | 2
T-CX-8 | Bond structured daily check-in | BondCheckIn.tsx 3-step tappable flow in chat; mood_checkins table + checkinService; goal-tag chips; week ribbon component on Vandaag | Check-in completes ≤25s, persists mood/tags/note; ribbon shows 7 neutral dots, no streak count; crisis text preempts flow | L | Free | 3
T-CX-9 | Goals model + client visibility | goals table, tasks.goal_id FK; goals render on Vandaag header context, check-in tags, Care Plan groupings (provider CRUD in 02-provider plan) | Client sees active goals; tasks group under goals; GAS-ready gas_levels jsonb present | M | Free | 3
T-CX-10 | Care Plan client view (REBUILD) | CarePlanView/TaskCard/CompletionSheet replace client render path of Tasks.tsx; rationale column; completion_reflection + completed_felt; retire MyHomework table into TodayCard source | Client tasks render as goal-grouped cards; Gedaan opens skippable reflection sheet; no red overdue badges; provider table untouched | L | Free | 3
T-CX-11 | Provider reactions on completions | task_reactions table; provider reacts seen/encourage/note from their task view; client gets quiet notification + chip on TaskCard | Reaction round-trips in mock; client notification uses warm NL copy per §4; no emoji rendering | S | Free (view) / Pro analytics per 05 | 3
T-CX-12 | Scored outcomes on questionnaire rails | template_kind + scoring jsonb on questionnaire_templates; seed PHQ-9/GAD-7 (NL validated wording) + GAS template; instrument gating by is_regulated; recurrence on assignment | Scored fill computes total + band; coach accounts cannot assign PHQ-9/GAD-7 by default; recurring assignment creates Vandaag card | L | Free | 3
T-CX-13 | PHQ-9 item-9 crisis interrupt | Crisis panel interrupts questionnaire on item 9 > 0; crisis_events row; therapist notification; resume-after option | Interrupt renders synchronously; event logged without answer text; questionnaire resumable; tested in mock | S | Free | 3
T-CX-14 | Client Progress page | /dashboard/client/progress + ScoreChart/MoodTrendChart/GasLadder; per-chart share toggles wired to consent_grants; neutral band annotations | Charts render from mood_checkins + questionnaire_responses mock data; share toggle mirrors Consent Center; included in export | L | Free | 3
T-CX-15 | Journal prompts library | journal_prompts table + 30 seeded NL-first prompts (4 locales); prompt picker in Journal.tsx; provider-assigned prompt creates Vandaag card | Prompted entry stores prompt_id; assigned prompt notifies client; prompts read as written editorial copy (reviewed, no slop) | M | Free | 3
T-CX-16 | Resource library + assignment | resources + resource_assignments tables; ClientResources.tsx at /dashboard/client/resources; 15 seeded NL articles; provider assign-with-note flow (provider UI stub, full in 02) | Client browses/reads all; assigned items float top + Vandaag card + status transitions assigned→opened→done | L | Free (read) / Practice (author) per 05 | 3
T-CX-17 | Bond weekly summary with consent gate | bond_summaries table; deterministic stats-based draft (check-ins count, mood avg, top tags); client preview card with Share/Keep-private; provider receives only shared | Summary generates Mondays from prior week's data; consent_status transitions audited; provider mock inbox shows shared only | M | Free | 3
T-CX-18 | Post-session reflection loop | Bond + Vandaag prompt 2h after completed session; stores journal entry entry_type='session_reflection' linked to session; coexists with alliance check | Reflection appears in Journal and on SessionDetail (client-only unless shared); alliance check unaffected | S | Free | 3
T-CX-19 | Crisis events pipeline | crisis_events table; Bond guardrail + checkin distress + assessment interrupt all write events; therapist notification; AdminAllChats flagged queue consumes; next-day follow-up card | All three surfaces create events in mock; admin queue lists them; follow-up card copy per §8 Rule 3 | M | Free | 3
T-CX-20 | BondCompanionCard personalization | De-hardcode static tile: show last check-in mood/date + contextual opener ("Gisteren sprak je over slaap — hoe was je nacht?" from last tags); keep mint AI framing + supervised line | Card varies with client state in mock across demo personas; unchanged for never-checked-in users with invitational copy | S | Free | 3
T-CX-21 | Server-enforced consent + real export | With Neon cutover: consent_grants enforced in API layer (provider reads filtered server-side); data_export_requests generates JSON + PDF incl. Art. 15 provider-authored data | Revoked artifact 404s at API for provider; export PDF renders in NL/EN; audit_logs rows on grant/revoke | L | Free | 4
T-CX-22 | Real Bond LLM behind check-in structure | Wire /api/bond per bondEngine SWAP POINT (04-platform owns endpoint); keep client-side crisis regex; summaries move from stats-template to LLM prose with same consent gate | Scripted fallback on network failure; crisis regex fires before network call; summary prose passes tone review | L | Free | 4
T-CX-23 | Client mobile polish pass | Responsive Care Plan cards, session-loop stacking (compact prop), Messages selected-state + stale-draft fix, journal attachment previews — the audit's mobile dead-end list | No horizontal scroll on 360px; Messages back-nav resets state; session cards stack vertically | M | Free | 3
T-CX-24 | Portable profile v1 ("neem alles mee") | Connections tab end-relationship flow keeps client data + revokes provider access; re-connect flow shares selected history with a new provider via Consent Center | Ending relationship removes provider access, client retains all artifacts; new-provider onboarding offers selective history share | M | Free | 4

## Dependencies & risks

**Cross-plan dependencies**
- **05-monetization.md** — the Free/paid table in this file is the contract: client-side always free; provider-side analytics over client-generated data (mood trends, engagement, summaries) is where Pro value lives. No client-facing nudges, ever. T-CX-11/14/17 produce the raw material 05 monetizes.
- **02-provider-experience.md** — owns provider-side UX for: goals CRUD (T-CX-9), task rationale + reactions authoring (T-CX-10/11), instrument assignment + outcome dashboards (T-CX-12/14), resource authoring/assignment (T-CX-16), receiving Bond summaries and crisis notifications (T-CX-17/19). Ticket pairs must land in the same phase or client features ship without their provider half.
- **04-platform (infra/backend plan)** — owns `/api/bond` (T-CX-22), Neon migration of all new tables (mood_checkins, goals, bond_summaries, crisis_events, consent_grants, resources, journal_prompts, task_reactions, data_export_requests), server-side consent enforcement (T-CX-21), notification delivery (email/push behind T-CX-7), and crisis-event data-retention policy.
- **01-design-language.md** — TodayView, WeekRibbon, charts, and the Consent Center ledger are the flagship client surfaces for the anti-slop refresh; tokens stay in src/index.css; mint remains Bond-only (check-in controls inside Bond are mint-eligible; Vandaag cards are not).
- **Onboarding plan (06/07 per shared model)** — Vandaag's first-run state doubles as client onboarding (first check-in = activation event); crisis affordance must be shown in the first-run tour.

**Top risks**
1. **Consent enforced only in UI during mock phase.** Until T-CX-21, "revoked" is cosmetic. Mitigation: ship the Center early (Phase 2) but label export "voorbeeld" in demo mode; 04 must treat server enforcement as a Phase 4 blocker, not polish.
2. **Clinical instrument scope creep.** PHQ-9/GAD-7 put us adjacent to medical-device territory (EU MDR) if we *interpret* scores or drive treatment decisions. Mitigation: display scores + validated band labels only, no advice, no alerts except the item-9 safety interrupt; legal review before Phase 4 launch.
3. **Bond over-promising before the real LLM.** Structured check-ins are honest; open chat is scripted and can feel hollow, eroding the exact trust the client loop needs. Mitigation: keep the existing "oefenversie" framing prominent until T-CX-22; suggestion chips steer toward structured flows where the scripted engine is strong.
4. **Engagement without guilt is fragile.** Removing streaks means notifications and Vandaag quality carry retention alone. Mitigation: T-CX-7 reminder is user-scheduled (their hour, their frequency incl. "alleen weekdagen" / "nooit"), and we measure return-after-gap warmly rather than punishing the gap.
5. **Crisis-event data sensitivity.** Logging crisis triggers creates Art. 9 special-category rows. Mitigation: minimal payload (no message text), short retention (04 decides, suggest 12 months), access limited to treating provider + admin safety queue, all reads audit-logged.
6. **Two render paths for tasks** (client cards vs provider table) risks drift on status logic. Mitigation: shared task state machine module consumed by both views; acceptance tests on transitions.

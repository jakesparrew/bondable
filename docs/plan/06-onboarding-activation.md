# 06 — Onboarding & Activation

Bondable's biggest pre-launch risk is not missing features — it is a new provider or client landing on a dense dashboard, not understanding what to do in the first 90 seconds, and never coming back. This plan replaces the legacy role-picker onboarding (`src/pages/Onboarding.tsx`) with four role-aware first-run journeys (solo provider, practice owner/manager, staff member, client), a deliberately restrained in-app guidance pattern library (one welcome moment, teaching empty states, a persistent setup checklist — not popup soup), a complete Resend email lifecycle (mock-templated now, wired after the 08 backend cutover), and acquisition-facing comprehension work so the homepage and finder explain the product in 10 seconds. Every flow terminates in a measurable "activated" state that feeds the metrics plan (07).

---

## Decisions

1. **Checklist-first, wizard-second.** The primary onboarding surface per role is a persistent, dismissible Setup Checklist card on the dashboard, not a forced multi-step wizard. Rationale: providers are busy professionals who abandon forced wizards; a checklist respects their sequence and survives sessions. Tradeoff: slower guaranteed completion of any single step; we accept that and compensate with day-2/7 emails that resume the checklist.

2. **REBUILD `src/pages/Onboarding.tsx`.** The existing page (role picker → name → invite code) conflicts with the invite-token flow (`/invite/:token` → `InviteAccept.tsx`), is not routed in `src/App.tsx`, and assumes clients self-select roles. Roles are now determined by *how you arrive* (signup = provider/practice; invite token = client or staff). Rationale: role self-selection is a known confusion point and a GDPR risk (a client creating a "therapist" account). Tradeoff: we lose the generic self-serve client signup; clients without a provider enter via the Finder or Bond instead — which is the product thesis anyway.

3. **Exactly one modal per role, ever.** A single welcome modal fires once per role on first dashboard load; after that, nothing interrupts except consent/legal changes and crisis-safety UI. All other guidance is ambient (checklist, coach-marks, empty states, changelog panel). Rationale: anti-slop, and interruption fatigue kills trust in a healthcare product. Tradeoff: some features will be discovered later or never; the changelog panel and weekly digest email carry that load.

4. **Sample-data sandbox for providers, clearly labelled, auto-evicted.** New solo providers can toggle "Voorbeeldpraktijk" seed data (3 fictional clients, 2 sessions, 1 lead) so every screen teaches by example. Data carries a persistent banner and is deleted the moment the first real client accepts an invite. Rationale: an empty CRM is the #1 comprehension killer. Tradeoff: engineering cost to guarantee eviction and to keep sandbox rows out of analytics (07 must filter `is_sandbox`).

5. **Email lifecycle is authored now as typed mock templates, delivered later.** All templates live in `src/emails/` (react-email style TSX + a `messageMap.ts` registry with NL/EN subjects), rendered in a dev preview route; actual sending waits for the 08 Resend wiring (`supabase/functions/send-client-invitation` et al. are dormant today). Rationale: copy and sequencing are the hard part and block nothing; wiring is a one-day task post-backend. Tradeoff: no real deliverability learnings until Phase 4.

6. **Client marketing-style drips are opt-in; transactional and care-relevant mail is not.** GDPR Art. 9 context: client emails never contain health content — only neutral prompts ("Je hebt een nieuw bericht") with a login link. Provider drips are legitimate-interest B2B. Rationale: compliance moat is a stated strategy. Tradeoff: client drip reach will be lower; we accept it.

7. **Activation definitions are contractual, not aspirational.** Each role has one binary "activated" definition with a deadline window (below), stored as computed state in `onboarding_progress`, and 07 reports against exactly these. Rationale: without a shared definition, "activation" becomes vibes. Tradeoff: definitions will need revision after real cohorts; versioned in the table (`definition_version`).

8. **Acquisition comprehension = one rebuilt homepage explainer strip + one provider landing section, not a marketing site.** We stay inside `src/pages/Home.tsx` and `Find.tsx`; no separate CMS/marketing stack yet. Pre-users social proof is honest pilot-program framing ("Pilootprogramma — 20 praktijken in Vlaanderen"), never fake testimonials. Tradeoff: less SEO surface for now; deferred to post-launch.

---

## Part 1 — Role-aware first-run flows

### Routing & entry logic (changes to `src/App.tsx`)

| Entry | Who | Destination |
|---|---|---|
| Sign up at `/login` (new: "Voor hulpverleners / For providers" tab) | Solo provider or practice owner | `/welcome/provider` (fork: solo vs practice) |
| `/invite/:token` (existing `InviteAccept.tsx`, type=client) | Client | `/welcome/client` after password setup |
| `/invite/:token` (new type=staff, extends `clientInvitationService.ts` token model) | Staff member | `/welcome/staff` |
| Finder → RequestProviderDialog → provider accepts | Client (lead conversion) | client invite email → `/invite/:token` |

New routes: `/welcome/provider`, `/welcome/practice`, `/welcome/staff`, `/welcome/client` — all thin, 2–4 screens max, skippable after screen 1 except consent. REBUILD: `src/pages/Onboarding.tsx` is deleted and replaced by `src/features/onboarding/` (see components below). `SetupPassword.tsx` stays as-is and chains into the welcome routes.

### 1A. PROVIDER (solo) — guided setup

**Welcome screens (once):** (1) "Welkom bij Bondable" — 3 bullets on what the tool does (agenda, cliëntopvolging, vindbaarheid), real screenshot thumbnails, not illustrations. (2) Fork question: "Werk je alleen of met een team?" → solo continues; team routes to `/welcome/practice`. (3) Sandbox offer: "Wil je met voorbeeldgegevens starten? Drie fictieve cliënten tonen hoe alles werkt. Ze verdwijnen zodra je eerste echte cliënt zich aanmeldt." [Ja, toon voorbeelden / Nee, ik start leeg].

**Persistent Setup Checklist** (card at top of `src/components/dashboard/TherapistDashboardContent.tsx`, collapsible, progress meter "2/6"):
1. Vervolledig je profiel (name, discipline, `is_regulated` declaration, photo) → `/dashboard/therapist/profile`
2. Stel je beschikbaarheid in → `/dashboard/therapist/weekly-timetable` (existing `WeeklyTimetable.tsx`)
3. Nodig je eerste cliënt uit → existing InviteClientPanel flow (`/dashboard/therapist/add-client`)
4. Publiceer je Finder-profiel → `/dashboard/therapist/public-profile` (existing `ProviderPublicProfileEdit.tsx`; the publish toggle Inventory 2 flags as missing is a prerequisite — coordinate with 04)
5. Plan je eerste sessie → sessions flow
6. Maak kennis met Bond (60-sec explainer of the supervised-AI model + what clients see) — comprehension step, no config

Checklist auto-detects completion from data (not manual check-off), persists in `onboarding_progress`, dismissible ("Verberg — je vindt dit terug onder ?"), reachable forever via the ? help menu.

**Activated (solo provider):** profile complete AND availability set AND ≥1 client invite sent AND first session scheduled, within 14 days of signup. Finder publication is tracked separately as `finder_activated` (it is optional — some providers have full caseloads).

### 1B. PRACTICE owner/manager

Depends on the practice/staff data model from **02-provider-generalization.md** (practices, practice_members, roles: owner/manager/member). Flow at `/welcome/practice`: (1) Create practice — name, address, disciplines offered. (2) Invite staff — email list + role per person (manager/member); generates staff invite tokens, queues E-02 emails. (3) Configure — shared calendar defaults, intake template starting set, billing owner (Phase 4, coordinate with 05).

**Manager checklist:** practice profile complete → ≥2 staff invited → ≥1 staff accepted → practice Finder page published → first cross-staff session booked.
**Activated (practice):** ≥2 staff accepted invites AND practice profile complete, within 14 days.

### 1C. STAFF member

Flow at `/welcome/staff` after token accept + password: (1) "An Peeters heeft je toegevoegd aan Praktijk De Brug" — confirm identity, set photo/discipline/`is_regulated`. (2) Availability. (3) Caseload handoff: if the manager pre-assigned clients, show them here ("Je start met 4 cliënten, overgedragen door An") with an explicit acceptance step per client — a clinical-responsibility handshake, logged for GDPR accountability. 
**Activated (staff):** invite accepted AND profile complete AND ≥1 session held or scheduled, within 7 days.

### 1D. CLIENT — warm welcome

Flow at `/welcome/client` (after `/invite/:token` + password): four screens, warm and short.
1. **Welkom** — "Thomas Claes heeft je uitgenodigd. Bondable is de plek waar jullie samenwerken tussen sessies door." One sentence per feature they'll actually use (taken, dagboek, berichten).
2. **Goals (optional, skippable)** — "Waar wil je aan werken?" free text + 6 gentle chips (slaap, piekeren, relaties, rouw, werkdruk, iets anders). Stored, shared with provider only after explicit toggle.
3. **Consent** — the one non-skippable screen. Plain-language Art. 9 consent: what is stored, who sees what (provider sees shared items only; Bond conversations supervised), portability promise, withdraw path. Checkbox per consent category, not one blanket box. (Contract with 08's consent ledger.)
4. **Meet Bond** — inline mini-chat (reuse `src/components/bond/BondChat.tsx` in embedded mode) with one scripted exchange; explicit framing: "Bond is geen therapeut. Alles wat je hier deelt, gebeurt onder toezicht van Thomas." Crisis-line disclosure shown here once (1813 / 113).

**Activated (client):** consent given AND (≥1 Bond exchange OR ≥1 journal entry OR ≥1 task viewed) AND provider connection confirmed, within 7 days.

---

## Part 2 — In-app pattern library & governance

New module `src/features/onboarding/`: `OnboardingProvider.tsx` (context: role, checklist state, coach-mark ledger), `useOnboarding.ts`, `SetupChecklist.tsx`, `WelcomeModal.tsx`, `Coachmark.tsx`, `EmptyState.tsx` (promoted to `src/components/common/`), `SandboxBanner.tsx`, `HelpMenu.tsx`, `ChangelogPanel.tsx`. Service: `src/services/api/onboardingService.ts` (mock-backed like the other 21 services). Schema additions to `src/server/db/schema.ts`: `onboarding_progress` (user_id, role, steps jsonb, activated_at, definition_version, is_sandbox), `announcements` (id, title, body_md, audience_role, published_at), `announcement_reads`.

### Interruption governance (hard rules, enforced in `OnboardingProvider`)

- **May interrupt (modal):** role welcome (once per role per account, ever), consent/legal change, crisis-safety UI. Nothing else — including upgrade nudges from 05, which must use the checklist card, banner, or notification center slots.
- **Coach-marks:** max 3 per surface, max 5 per calendar day, only on first visit to a surface, "Sla alles over" always visible, none on viewports <640px, none within 10s of a modal. Ledger persisted so they never repeat.
- **Nudges/announcements (05's system):** max 1 banner-level nudge per session, never in the first 60s, never on Bond or crisis surfaces. Changelog is pull-only (badge dot on ? menu, no popup).
- **? Help affordance:** persistent in the dashboard header (both sidebars): reopens checklist, replays coach-marks for current page, links to changelog panel and crisis resources.

### The 10 teaching empty states (spec + copy)

All use `EmptyState.tsx`: small line-art glyph in ink (no emoji, no illustration blobs), one heading, one sentence, one primary action, optional secondary "Toon voorbeeld" that reveals an annotated sample row inline. NL first, EN below.

1. **Provider · Clients list** (`src/pages/Clients.tsx`) — NL: "Nog geen cliënten. Stuur een uitnodiging — je cliënt vult zelf haar gegevens in en verschijnt hier." CTA: "Cliënt uitnodigen". EN: "No clients yet. Send an invite — your client fills in her own details and appears here." 
2. **Provider · Leads inbox** (ProviderLeads) — NL: "Hier komen aanvragen binnen van mensen die je via Zoek een hulpverlener vinden. Publiceer je profiel om zichtbaar te zijn." CTA: "Profiel publiceren". EN: "Requests from people who find you in the directory land here. Publish your profile to become visible."
3. **Provider · Finder profile unpublished** (`ProviderPublicProfileEdit.tsx`) — NL: "Je profiel is nog niet zichtbaar. Vervolledig de drie velden hieronder en zet het live wanneer jij er klaar voor bent." EN: "Your profile isn't visible yet. Complete the three fields below and go live when you're ready." (Note near toggle: ranking is fit-based only — payment never affects placement.)
4. **Provider · Sessions week view** (`Sessions.tsx`, provider role) — NL: "Geen sessies deze week. Plan er één in, of deel je boekingslink zodat cliënten zelf een moment kiezen." EN: "No sessions this week. Schedule one, or share your booking link so clients pick a time themselves."
5. **Provider · Intake templates** (`IntakeTemplates.tsx`) — NL: "Nog geen intakeformulieren. Start van een sjabloon — het CLB-model voor eerste gesprekken staat klaar." CTA: "Start van sjabloon". EN: "No intake forms yet. Start from a template — a first-conversation model is ready to adapt."
6. **Client · Journal** (`Journal.tsx`) — NL: "Je dagboek is leeg — en dat is oké. Eén zin over vandaag is genoeg om te beginnen. Alleen jij leest dit, tenzij je het deelt." EN: "Your journal is empty — that's fine. One sentence about today is enough to start. Only you can read this unless you choose to share."
7. **Client · Tasks** (`Tasks.tsx`, client role) — NL: "Nog geen taken. Thomas kan hier oefeningen voor tussen jullie sessies klaarzetten." EN: "No tasks yet. Thomas can place exercises here to work on between your sessions." (Provider first name interpolated.)
8. **Client · Messages** (`Messages.tsx` / ConversationInterface no-results — Quick Win from Inventory 1) — NL: "Nog geen berichten. Stuur gerust een eerste bericht — Thomas antwoordt wanneer het past, dit is geen chatdienst met wachttijden." EN: "No messages yet. Feel free to write first — Thomas replies when it suits; this isn't a live chat with response timers."
9. **Client · Bond first open** (`BondChat.tsx`) — replaces cold input with three starter chips + one line: NL: "Ik ben Bond. Ik luister, ik oordeel niet, en Thomas kijkt mee op wat we bespreken." EN: "I'm Bond. I listen, I don't judge, and Thomas oversees what we discuss."
10. **Manager · Team (new page from 02)** — NL: "Nog geen teamleden. Nodig collega's uit — zij bepalen zelf hun beschikbaarheid en profiel." CTA: "Collega uitnodigen". EN: "No team members yet. Invite colleagues — they manage their own availability and profile."

### Sample-data sandbox (provider)

`localStorage`-flagged in mock era (`bondable_sandbox=1`, sits alongside `bondable_demo_role`; post-backend it becomes `onboarding_progress.is_sandbox` + seeded rows tagged `is_sandbox=true`). Seeds: 3 clients ("Voorbeeld — Lotte V.", "Voorbeeld — Karim B.", "Voorbeeld — Mia D."), 2 sessions, 3 tasks, 1 lead, 1 shared journal entry. Persistent top banner (`SandboxBanner.tsx`): "Je bekijkt voorbeeldgegevens. Ze verdwijnen automatisch bij je eerste echte cliënt. [Nu verwijderen]". Eviction: on first real client-invite acceptance, delete sandbox rows and toast "Voorbeeldgegevens verwijderd — dit is nu jouw praktijk." 07 must exclude `is_sandbox` rows from all metrics.

### Feature announcements

`ChangelogPanel.tsx`: right-side sheet from the ? menu, cards per release (title, 2 sentences, optional 20s clip), unread badge dot only. Admin authors entries via owner cockpit (09). Never a popup.

---

## Part 3 — Email lifecycle (Resend, mock-templated now)

All templates in `src/emails/templates/*.tsx`, registry `src/emails/messageMap.ts` (id, audience, trigger, NL/EN subject, i18n keys), dev preview at `/dev/emails` (dev-only route). Sending is wired in Phase 4 via 08's Resend infra (existing dormant functions `supabase/functions/send-client-invitation`, `send-admin-notification`, `send-session-notification` are replaced by one queue-driven mailer per 08). Compliance rails: client emails carry zero health content; drips have one-click unsubscribe; transactional does not. Sender: "Bondable" <mail@bondable.be>, reply-to support.

### Transactional (Phase 2 templates, Phase 4 live)

| ID | Trigger | Subject NL / EN | Body summary |
|---|---|---|---|
| E-01 | Provider invites client | "Thomas Claes nodigt je uit op Bondable" / "Thomas Claes invited you to Bondable" | NL: Thomas gebruikt Bondable om jullie traject op te volgen. Maak je account in twee minuten aan; jij bepaalt wat je deelt. EN: Thomas uses Bondable to support your work together. Set up your account in two minutes; you decide what you share. |
| E-02 | Manager invites staff | "An Peeters voegt je toe aan Praktijk De Brug" / "An Peeters is adding you to Praktijk De Brug" | NL: Je collega's plannen en volgen cliënten op via Bondable. Aanvaard de uitnodiging om je agenda en profiel in te stellen. EN: Your colleagues schedule and follow up clients in Bondable. Accept to set up your calendar and profile. |
| E-03 | Practice created | "Praktijk De Brug staat klaar" / "Praktijk De Brug is ready" | NL: Je praktijk is aangemaakt. Volgende stap: nodig je team uit — elk teamlid beheert zijn eigen agenda. EN: Your practice is set up. Next: invite your team — each member manages their own calendar. |
| E-04 | Password setup/reset | "Stel je wachtwoord in" / "Set your password" | NL: Klik binnen 24 uur op de link om je wachtwoord te kiezen. Vroeg je dit niet aan, negeer deze mail. EN: Use the link within 24 hours to choose a password. If you didn't request this, ignore this email. |
| E-05 | Session reminder, 24h (both parties) | "Morgen om 14u: sessie met Thomas" / "Tomorrow at 2pm: session with Thomas" | NL: Je sessie vindt morgen plaats. Lukt het niet? Verzet ten laatste vandaag via de app. EN: Your session is tomorrow. Can't make it? Reschedule today via the app. No health content. |
| E-06 | Session confirmed/changed/denied | "Je sessie van 12 juli is bevestigd" / "Your July 12 session is confirmed" | NL: Thomas bevestigde jullie afspraak. Details en voorbereiding vind je in de app. EN: Thomas confirmed your appointment. Details and prep live in the app. |
| E-07 | New lead (provider) | "Nieuwe aanvraag via je Bondable-profiel" / "New request via your Bondable profile" | NL: Iemand zocht een hulpverlener en koos jouw profiel. Reageer binnen 48 uur — snelle reacties bepalen de ervaring, niet je positie. EN: Someone searching for care chose your profile. Reply within 48 hours — responsiveness shapes their experience, never your ranking. |
| E-08 | Unacknowledged client check-in >4h (provider) | "Een cliënt vraagt je aandacht" / "A client flagged a check-in" | NL: Een cliënt stuurde een check-in die nog open staat. Bekijk hem in je wachtrij. EN: A client sent a check-in that's still open. Review it in your queue. Deliberately name-free and content-free. |

### Activation drips (Phase 2 templates, Phase 4 live; steps auto-skip if already done)

**Provider solo** (legitimate interest, unsubscribable): 
- D0 E-10 "Welkom bij Bondable — je eerste drie stappen" / "Welcome to Bondable — your first three steps". NL: Profiel, beschikbaarheid, eerste cliënt: meer heb je niet nodig om te starten. De checklist in je dashboard houdt bij waar je zit. EN mirror.
- D2 E-11 "Word vindbaar voor wie jou zoekt" / "Become findable for the people looking for you". NL: Je Finder-profiel kost tien minuten en rangschikt puur op match, nooit op betaling. Zet het live wanneer jij klaar bent. EN mirror.
- D7 E-12 "Je eerste cliënt uitnodigen duurt één minuut" / "Inviting your first client takes a minute". NL: Stuur een uitnodiging; je cliënt vult zelf alles in. Zo verhuist je administratie vanzelf naar één plek. EN mirror.
- D14 E-13 "Zo verloopt een sessie op Bondable" / "How a session flows on Bondable". NL: Van voorbereiding tot recap en opvolgtaken: één korte rondleiding. Daarna staat alles klaar voor je echte praktijk. EN mirror.

**Practice manager:** D0 E-15 team-setup welcome; D2 E-16 "Twee collega's uitgenodigd = praktijk actief" (invite nudge with acceptance status); D7 E-17 configure intake templates + shared agenda; D14 E-18 first practice-wide week recap.
**Staff:** D0 E-20 welcome ("An heeft alles voorbereid — jij hoeft enkel je profiel en agenda in te stellen"); D2 E-21 profile completeness (photo + discipline drive client trust); D7 E-22 caseload confirmation reminder if handoffs pending.
**Client** (OPT-IN at consent screen, zero health content): D0 E-25 warm welcome + what-you-control recap; D2 E-26 "Maak kennis met Bond" (supervised framing, one line, one button); D7 E-27 journal/tasks gentle intro; D14 E-28 "Hoe voelt het tot nu toe?" — invites in-app feedback, never asks for content by mail.

### Recurring, win-back, trial

- **E-30 Weekly provider digest** (Mon 07:30, Phase 4): subject NL "Je week: 6 sessies, 2 open taken, 1 nieuwe aanvraag" (real numbers in subject) / EN mirror. Body: caseload summary, unacknowledged check-ins count, one suggested action. Numbers only, no client names.
- **E-31 Provider win-back** (21 days inactive, max 2 sends): NL "Je praktijk op Bondable wacht op je" — status snapshot + one-click resume of checklist. Clients get NO marketing win-back; if a client goes silent, the *provider* is nudged in-app instead (care relationship, not funnel).
- **E-33/34/35 Trial-ending** (D-7, D-3, D0) — sequencing and copy owned here, pricing/offer logic owned by **05-monetization**: honest, no fake urgency. NL D-7: "Nog zeven dagen Pro — dit gebruikte je het meest." Shows their own usage; downgrade path stated plainly ("Zonder Pro behoud je al je gegevens en cliënten").

---

## Part 4 — Acquisition-facing comprehension

- **Homepage 10-second strip** (`src/pages/Home.tsx`, coordinate visual language with 01-design-language): directly under the hero, a three-column typographic strip — "Vind een hulpverlener die past" (→ /find), "Werk samen tussen sessies door" (client value), "Eén werkplek voor je praktijk" (→ provider section). Each column: one verb-first sentence, one real UI screenshot cropped tight, no icons/gradients. Rewrite hero subline to name the category in one sentence: NL "Bondable verbindt cliënten, hulpverleners en een begeleide AI-companion in één vertrouwde omgeving." 
- **Provider landing section** (`Home.tsx` anchor `/#voor-hulpverleners` + nav link): problem-first copy ("Je administratie in vijf tools, je cliënten in geen enkele"), 4 concrete capabilities with real numbers in the mock screenshots (6 cliënten, 3 sessies deze week), pricing teaser (from 05), CTA "Start gratis — geen kaart nodig".
- **Finder comprehension** (`src/pages/Find.tsx`): one-line trust header above filters: NL "Rangschikking gebeurt uitsluitend op match. Betaling koopt nooit een plaats in deze lijst." plus the `is_regulated` badge legend ("Erkend hulpverlener — beschermde titel" vs "Coach") explained in a hover/sheet, transparency-first.
- **Pre-users social proof — pilot framing:** an honest strip: NL "Bondable draait in pilootfase met praktijken in Vlaanderen. Word pilootpraktijk: gratis Pro tijdens de piloot, rechtstreekse lijn naar het team." CTA feeds a pilot-application form (stored as lead for owner cockpit 09). No invented testimonials, no fake logos, no counter widgets.

---

## Part 5 — Activation metrics (definitions feeding 07-analytics)

All computed from `onboarding_progress` + event stream (07 owns instrumentation; sandbox rows excluded).

| Metric | Definition | Target (pilot) |
|---|---|---|
| `provider_activation_rate` | % solo providers reaching Decision-7 definition ≤14d | 40% |
| `practice_activation_rate` | % practices with ≥2 accepted staff + complete profile ≤14d | 50% |
| `staff_activation_rate` | % staff invites → activated ≤7d | 70% |
| `client_activation_rate` | % client invites → activated ≤7d | 60% |
| `ttfv_provider` | median hours signup → first client invite sent | <48h |
| `ttfv_client` | median hours invite accept → first meaningful action (Bond/journal/task) | <24h |
| `checklist_dropoff` | per-step completion funnel (6 steps, solo provider) | step-level, no target yet |
| `invite_acceptance_rate` | client + staff invites accepted / sent, by 7d | 65% |
| `drip_effect` | activation rate: drip-opened vs not (E-10..E-13 cohorts) | directional only |
| `finder_publish_rate` | % activated providers who also publish ≤30d | 50% |

---

## Tickets

T-OA-1 | Onboarding state foundation | `src/features/onboarding/` module: OnboardingProvider, useOnboarding, onboardingService.ts (mock-backed), `onboarding_progress` + `announcements` tables in src/server/db/schema.ts; localStorage persistence in mock era | Checklist/coach-mark/welcome state survives reload; role-scoped; sandbox flag modeled | M | n.a. | 2
T-OA-2 | REBUILD legacy Onboarding page into role-routed welcome flows | Delete src/pages/Onboarding.tsx; add /welcome/provider,/welcome/practice,/welcome/staff,/welcome/client routes in src/App.tsx; entry logic per invite-token type vs signup | Each role lands on correct flow; no role self-selection anywhere; skippable except client consent | L | Free | 2
T-OA-3 | Provider Setup Checklist with auto-detected progress | SetupChecklist.tsx on TherapistDashboardContent.tsx; 6 steps wired to real data checks (profile, timetable, invite, publish, session, Bond explainer) | Progress meter reflects data, not clicks; dismiss + reopen via ? menu; activated_at written when definition met | M | Free | 2
T-OA-4 | Client warm welcome (goals → consent → meet Bond) | 4-screen flow at /welcome/client; granular Art.9 consent screen; embedded BondChat first exchange; crisis-line disclosure | Consent non-skippable and stored per category; goals optional; Bond exchange logged for activation | L | Free | 2
T-OA-5 | Welcome modal + coach-mark system with governance caps | WelcomeModal.tsx (once per role, ever) + Coachmark.tsx with ledger; enforce max 3/surface, 5/day, first-visit-only, none <640px | Caps enforced in OnboardingProvider; replay only via ? menu; zero repeats across sessions | M | Free | 2
T-OA-6 | EmptyState component + the 10 teaching empty states | src/components/common/EmptyState.tsx; wire NL/EN copy from this plan into Clients.tsx, ProviderLeads, ProviderPublicProfileEdit.tsx, Sessions.tsx, IntakeTemplates.tsx, Journal.tsx, Tasks.tsx, Messages.tsx, BondChat.tsx, Team page | All 10 render with i18n keys (en/nl minimum), one primary action each, no emoji/illustration slop | M | Free | 2
T-OA-7 | Provider sample-data sandbox with auto-eviction | Sandbox seeds in mockClient.ts (tagged is_sandbox), SandboxBanner.tsx, eviction on first real client acceptance, toggle in welcome + checklist | Seeds visibly labelled "Voorbeeld —"; eviction deletes all sandbox rows + toast; analytics exclusion flag present | M | Free | 2
T-OA-8 | ? Help menu + ChangelogPanel | HelpMenu.tsx in both dashboard headers; ChangelogPanel sheet reading `announcements`; unread badge dot; links to checklist, coach-mark replay, crisis resources | Pull-only (no popup); admin-authored entries render; badge clears on open | S | Free | 2
T-OA-9 | Email template library + messageMap + dev preview | src/emails/templates/*.tsx for E-01..E-35, messageMap.ts registry (NL/EN subjects, triggers), dev-only /dev/emails preview route | Every email in this plan renders in preview in NL and EN; registry typed; zero sending | L | n.a. | 2
T-OA-10 | Staff invite flow (token type=staff) | Extend clientInvitationService.ts token model + InviteAccept.tsx to branch staff → /welcome/staff; E-02 template hook | Staff token accept creates practice_members row (schema from 02); expiry + revoke work | M | Practice | 2
T-OA-11 | Practice owner/manager first-run | /welcome/practice: create practice → invite staff w/ roles → configure; manager checklist on dashboard | Practice activated state computed; ≥2 invites sendable in one screen; roles assigned per invite | L | Practice | 2
T-OA-12 | Staff first-run with caseload handoff acceptance | /welcome/staff 3 screens; per-client handoff acceptance logged (who, when) | Handoff requires explicit accept per client; log queryable; skippable if no handoffs | M | Practice | 3
T-OA-13 | Wire transactional emails to Resend queue | Connect E-01..E-08 triggers to 08's mailer (replaces dormant supabase/functions/send-client-invitation, send-session-notification, send-admin-notification); client mail content-minimal | Invite/password/session/lead/check-in mails send in staging; zero health data in any client email body; delivery logged | L | n.a. | 4
T-OA-14 | Activation drips + weekly digest + win-back scheduler | Drip engine (D0/2/7/14 per role, auto-skip completed steps), E-30 Monday digest with real numbers, E-31 provider win-back at 21d (max 2), client drips gated on opt-in consent | Steps skip when done; unsubscribe works per-category; digest numbers match dashboard; no client marketing without opt-in | L | Free | 4
T-OA-15 | Trial-ending sequence (with 05) | E-33/34/35 at D-7/D-3/D0 showing user's own usage stats; downgrade-path copy; offer logic from 05-monetization | Fires only for trialing accounts; usage numbers real; no dark-pattern urgency copy | M | Pro | 4
T-OA-16 | Homepage 10-second comprehension strip + hero subline | Home.tsx: 3-column typographic strip w/ real screenshots, rewritten subline (NL/EN), aligned with 01 design tokens | Strip renders <1.5s; passes anti-slop review (no gradients/emoji/exclamation copy); i18n complete | M | n.a. | 1
T-OA-17 | Provider landing section + pilot program strip | Home.tsx /#voor-hulpverleners anchor section + honest pilot-program block + application form stored as lead | Nav link works; form submits to leads store visible in owner cockpit (09); copy problem-first NL/EN | M | n.a. | 2
T-OA-18 | Finder trust header + is_regulated legend | Find.tsx one-line ranking-transparency header; badge legend sheet explaining erkend vs coach | Header on /find and /find/match; legend reachable from every badge; never framed as quality ranking | S | n.a. | 1
T-OA-19 | Activation metrics instrumentation contract | Emit onboarding events (step_completed, activated, checklist_dismissed, sandbox_toggled, coachmark_seen, email_opened stub) per 07's event schema; sandbox exclusion | All Part-5 metrics computable from events in mock mode; definitions versioned | M | n.a. | 2
T-OA-20 | Announcement authoring in owner cockpit | Admin CRUD for `announcements` (audience, publish date) inside 09's cockpit surface | Owner can publish; badge appears for target roles only; unpublish removes | S | n.a. | 5

---

## Dependencies & risks

**Cross-plan dependencies**
- **02-provider-generalization.md**: practice/practice_members schema + roles (blocks T-OA-10/11/12); "therapist"→"provider" rename changes routes referenced throughout this plan; Team page hosts empty state #10.
- **01-design-language.md**: EmptyState, checklist card, welcome modal, and Home.tsx strip must consume the refreshed token set; email templates need the brand header/footer spec.
- **05-monetization.md**: trial-ending copy/cadence here, offer/pricing logic there (T-OA-15); nudge system must obey this plan's interruption governance (1 banner/session, no modals).
- **04-provider-features.md**: Finder publish toggle + booking link are checklist steps 4–5 prerequisites; unified notification center hosts nudge + announcement slots.
- **07-analytics.md**: consumes Part-5 activation definitions verbatim; must filter `is_sandbox`; owns event pipeline T-OA-19 emits into.
- **08-infrastructure.md**: Resend domain/queue, consent ledger, auth cutover — gates every Phase-4 ticket (T-OA-13/14/15); until then emails are preview-only by design.
- **09-owner-cockpit.md**: pilot-application leads and announcement authoring land there.

**Top risks**
1. **Practice model slips → half the onboarding matrix blocked.** Mitigation: solo-provider and client flows (T-OA-2..9) have zero dependency on 02; ship them first.
2. **Checklist auto-detection reads mock services that 08 later replaces** — completion checks must go through onboardingService, never direct table pokes, or the Neon cutover silently breaks activation tracking.
3. **Consent screen becomes legalese** and tanks client activation; copy needs a legal pass *and* a plain-language pass, in that order, before build.
4. **Email deliverability cold-start** (new domain, .be audience): 08 must set up SPF/DKIM/DMARC and warm the domain during pilot before drips scale.
5. **Sandbox leakage into analytics or the Finder** would fabricate metrics and fake providers; `is_sandbox` must be excluded at the query layer (07) and sandbox providers must be unpublishable.
6. **Rename churn**: every route/copy string here says "therapist" today; if 02's rename lands mid-build, i18n keys must be aliased, not forked, to avoid double-maintaining copy.

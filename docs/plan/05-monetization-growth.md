# 05 — Monetization & Growth

Bondable monetizes exactly one side of the marketplace: providers pay for workflow leverage (more clients managed, better outcomes visibility, billing, Bond supervision, practice management), while clients and finder visibility stay free forever. This keeps the flywheel legally clean under the Belgian dichotomieverbod (payment can never buy placement), keeps client acquisition frictionless (free clients = provider value = willingness to pay), and lets every upgrade nudge be honest: we only ever sell a provider a tool they already bumped into, never anxiety, never reach. The commercial layer is designed dormant-first — entitlements, meters and nudges ship as code before Stripe goes live — so the Phase 4 cutover is a config flip, not a rebuild.

## Decisions

1. **Providers pay, clients never do.** Rationale: marketplace liquidity — every free client a provider invites deepens that provider's lock-in and seeds the finder; charging clients would throttle the exact asset (client-side engagement, Bond usage, portable profiles) that makes Pro worth paying for. Tradeoff accepted: zero direct revenue from the (much larger) client population; we forgo a consumer-subscription Bond upsell until at least post-PMF, and we accept that client-heavy infra cost (Bond LLM tokens) is subsidized by provider ARPU.
2. **Three tiers: Free (3 active clients), Pro €39/mo, Practice €29/seat/mo annual (min 2 seats).** Rationale: anchored under US incumbents (SimplePractice Essential $49→Plus $99/mo ≈ €45–92; TherapyNotes $59/mo solo ≈ €55) and above EU coaching tools (CoachAccountable ~$20, Practice.do ~$30) — Belgian solo therapists gross €50–90/session, so €39 ≈ half of one session/month, an easy defend. Tradeoff: €39 leaves money on the table vs. US anchors, but Benelux willingness-to-pay is untested and we prioritize conversion volume + testimonial density over ARPU in year one.
3. **Free cap = 3 *active* clients, not features amputated.** Rationale: the cap converts on success (a growing caseload) rather than on frustration; a solo starter can run a real, complete practice on Free, which is our best finder-supply and word-of-mouth engine. Tradeoff: some lifestyle providers (≤3 clients) never pay — we accept them as marketplace inventory.
4. **14-day full-Pro trial, no card, auto-downgrade to Free.** Rationale: card-upfront kills top-of-funnel in a skeptical, GDPR-sensitive healthcare audience; downgrade-to-Free (not lockout) means trial data is never hostage — clients and notes stay accessible, Pro-only surfaces re-gate. Tradeoff: lower trial→paid rate than card-upfront (~2–3x lower industry-wide); we compensate with the day-10/13 email sequence and in-app usage meters.
5. **The dichotomieverbod fence is enforced in code, not policy.** Finder ranking consumes a frozen `RANKING_INPUTS` allowlist; subscription tier, seat count, and billing status are structurally absent from the ranking function and a CI test fails the build if they enter. Rationale: "we promise" doesn't survive an audit or a journalist; a failing test does. Tradeoff: we give up the single highest-converting monetization lever in every marketplace playbook (paid placement) — permanently and on purpose. This is the moat, stated on a public transparency page.
6. **Nudges are event-triggered, capped, and banned from clinical surfaces.** One `<UpgradeMoment>` dialog max per 7 days per user; zero monetization UI inside Bond chat, crisis flows, client-facing messages, or check-in/alliance surfaces. Rationale: mental-health context — a guilt-toned upsell next to a crisis banner is brand-ending. Tradeoff: slower conversion than aggressive SaaS norms; we accept it and measure `nudge→upgrade` efficiency instead of raw impressions.
7. **Ship the monetization machinery dormant in Phase 3, flip it live in Phase 4.** `useEntitlements()` returns all-unlocked until Stripe is wired; gates/meters/badges render in "preview" mode behind a dev flag. Rationale: decouples commercial UX from the Neon/auth/Stripe cutover (owned by plan 08), and lets nudge copy be reviewed in-product early. Tradeoff: dead-ish code in the bundle for one phase; acceptable at this size.
8. **REBUILD `src/pages/Payments.tsx` entirely.** It is a placeholder with no reusable structure; it becomes `/dashboard/provider/billing` (plan summary, seats, invoices, payment method, cancel/downgrade flows). Also REBUILD the tier-agnostic parts of `src/pages/AdminSettings.tsx` billing stubs. Rationale: cheaper than retrofitting a mock. Tradeoff: none meaningful — nothing real exists there.
9. **Referral rewards are service credits, never visibility.** Provider-refers-provider pays out 1 month of Pro credit to both sides on the referee's first paid invoice. Rationale: credits keep cash out of the loop (no marketing-fee VAT headaches at launch) and are provably ranking-neutral. Tradeoff: weaker incentive than cash; revisit post-launch.
10. **Analytics is a first-class deliverable of this plan, shipped in Phase 2 — before billing.** Every activation/conversion event defined below lands in `analytics_events` from the moment onboarding ships, so Phase 4 pricing decisions and the Phase 5 owner cockpit (plan 07) run on months of data, not guesses. Tradeoff: instrumentation work fronted before it "pays"; it's the cheapest insurance we can buy.

---

## 1. Tier structure & pricing

### 1.1 Tiers (all prices EUR, VAT-exclusive; Stripe Tax handles BE 21% / NL 21%)

| | **Free** | **Pro** — €39/mo or €390/yr (2 mo free) | **Practice** — €35/seat/mo or €29/seat/mo annual, min 2 seats |
|---|---|---|---|
| Active clients | **3** | Unlimited | Unlimited per seat |
| Sessions, calendar, messages, tasks, journal-sharing | ✔ full | ✔ | ✔ |
| Intake templates | 1 template | Unlimited + template library | Shared org template library |
| Finder profile & ranking | ✔ **identical ranking to paid** | ✔ identical | ✔ identical, + practice page |
| Leads inbox | ✔ (respond within 7 days) | ✔ + lead analytics, saved replies | ✔ + round-robin assignment to staff |
| Bond for their clients | ✔ basic (chat, crisis guardrail) | ✔ + **Bond supervision console** (transcript review queue, escalation inbox, weekly digest) | ✔ + org-level supervision oversight |
| Outcomes & progress | — (FeaturePeek only) | ✔ alliance-check trends, task-completion, journal cadence per client | ✔ + cross-caseload rollups for managers |
| Billing/invoicing clients | — | ✔ invoices, payment links (Stripe Connect, plan 08) | ✔ + org invoicing, per-staff reconciliation |
| Advanced scheduling | — | ✔ recurring sessions, buffers, Google Calendar sync | ✔ + shared rooms/resources |
| Staff & roles | — | — | ✔ manager/staff roles, staff onboarding emails, seat management |
| Data export (GDPR) | ✔ always | ✔ | ✔ |
| Support | Community/email | Priority email | Priority + onboarding call |

Definitions: an **active client** is a `clients` row with status `active`; archived clients don't count and archiving is one click and reversible (never hold data hostage — GDPR posture and decency). **Trial**: 14 days full Pro, no card, starts at provider signup (not first login), one per provider identity. Downgrade at day 14 → Free; if >3 active clients at downgrade, nothing is deleted — the provider picks 3 to keep active, the rest become read-only "over cap" until upgrade or archive.

### 1.2 Rationale & anchors (keep on file for the pricing page FAQ)
- SimplePractice: $49–$99/mo; TherapyNotes: $59/mo (solo); both US-feature-heavy (insurance claims) — irrelevant in BE/NL, so we price below.
- EU/coaching: CoachAccountable ~$20/mo entry, Practice.do ~$30/mo — feature-shallow vs. Bond supervision + finder. We price above them and justify with the AI + marketplace layer.
- Sanity check: Belgian psychologist conventioned rate ≈ €82/session (RIZIV/INAMI 2025 psychologische zorg); €39/mo < half a session. Practice at €29/seat undercuts per-seat SimplePractice group pricing meaningfully.
- Annual = 2 months free (16.7%), the boring, credible discount. No lifetime deals, no launch coupons baked into anchoring.

### 1.3 Files
- `src/config/entitlements.ts` — single source of truth: `TIERS`, `LIMITS = { free: { activeClients: 3, intakeTemplates: 1 } }`, `FEATURES` map (`outcomes`, `billing`, `bond_supervision`, `advanced_scheduling`, `lead_analytics`, `staff_roles`…) → minimum tier.
- `src/hooks/useEntitlements.ts` — `{ tier, limits, can(feature), usage: { activeClients }, isTrial, trialDaysLeft }`; mock-backed until plan 08 wires Neon; dev override via `localStorage bondable_demo_tier`.
- Schema (add to `src/server/db/schema.ts`, coordinate plan 08): `subscriptions` (id, owner_profile_id, org_id?, tier, status, stripe_customer_id, stripe_subscription_id, seats, current_period_end, trial_ends_at, cancel_at_period_end), `nudge_events`, `referrals`, `analytics_events` (below).

---

## 2. The legal fence (dichotomieverbod + EU P2B)

1. **Structural separation.** `src/services/api/finderService.ts` ranking gets refactored so scoring consumes only a typed `RankingInputs` object built by `buildRankingInputs()`; the type has no tier/billing/seat fields, so paid status *cannot* be passed without a type error. `is_regulated` and rating are display/transparency fields; per the guardrail, `is_regulated` is also excluded from `RankingInputs`.
2. **CI guard.** `src/services/api/__tests__/rankingNeutrality.test.ts`: (a) static check that `finderService` ranking path has no import from billing/entitlements modules; (b) property test — same profile ranked as Free vs Pro vs Practice yields identical score and position.
3. **Product rule, written down.** Paid tiers buy *workflow*, never *presence*: no "featured" slots, no boosted cards, no Pro badge **in the public finder** (Pro badges exist only in provider-facing and practice-internal UI). Finder cards for Free and Practice providers are pixel-identical structures.
4. **Public transparency page** `/how-ranking-works` (route in `src/App.tsx`, page `src/pages/RankingTransparency.tsx`): plain-language NL/FR/EN explanation that ranking = fit only (specialty, language, modality, availability, location, accepting_new_clients), that money never influences it, and that this is both Belgian law (dichotomieverbod) and our policy everywhere. Linked from every finder page footer and from the pricing page. This satisfies P2B Art. 5 main-parameters disclosure.
5. **Referral rewards** (Section 5) are Pro-credits only and never touch `provider_profiles` or ranking — noted here because auditors will ask.

---

## 3. The ethical nudge system

### 3.1 Component library — `src/components/monetization/`

**`<ProGate feature minTier fallback="peek|lock" />`** — hard gate wrapping a Pro/Practice surface. Renders children if `can(feature)`; else a gate card: feature name, one-sentence value, static preview screenshot (real UI, greeked data), `Bekijk Pro` / `See Pro` button → `/dashboard/provider/billing/plans`, and a quiet `Niet nu` dismiss. Never a full-screen takeover; always shows *where* the feature lives so the app stays learnable.

**`<FeaturePeek feature />`** — teaser using the provider's *own real data*, blurred/cropped: e.g. outcomes chart rendered from their actual alliance checks with a frosted overlay and "Dit is jouw echte data — ontgrendel de details met Pro." Rule: the peek must be honest (computed from real rows, no fake up-and-to-the-right curves). Emits `feature_peek_viewed`.

**`<UpgradeMoment trigger />`** — event-triggered dialog (Radix Dialog, standard card styling — no gradient, no confetti). Max ONE per user per rolling 7 days across all triggers, deduped per trigger per 30 days, persisted in `nudge_events` (columns: id, profile_id, trigger, action shown|clicked|dismissed|converted, created_at). Always: title, two sentences, single primary CTA, `Later` secondary, ESC/overlay-close works, "Toon dit niet meer" checkbox honored forever per trigger.

**`<UsageMeter metric />`** — persistent, calm counter in provider Clients header and sidebar footer: "14/15 actieve cliënten" pattern → for us "2/3 actieve cliënten" (text-muted-foreground; switches to primary-colored text at cap, never red — red is reserved for crisis/destructive). Clicking opens the plans page. No meter renders below 60% usage.

**`<ProBadge />` / `<PlanChip />`** — 11px uppercase tracking-wide chip in deep-teal ink on `#dbe8e6` border, marking Pro features in nav and settings (provider-facing only; NEVER in public finder, never mint — mint stays AI-only).

### 3.2 Governance rules (enforced in `nudgeGovernor.ts`, not left to discipline)
- Frequency: ≤1 `UpgradeMoment` / 7 days; ≤1 `FeaturePeek` impression logged per surface per session; gates are ambient (always visible where the feature lives) and don't count against caps.
- Forbidden zones: Bond chat and anything mint, crisis flows (`CrisisResources`, `BetweenSessionCheckIn`, flagged-chat surfaces), client-therapist message threads, session detail while a session is `pending` confirm, and ALL client-role surfaces (clients never see monetization — nothing to sell them).
- Tone: no exclamation marks, no urgency ("Laatste kans!"), no guilt ("Je cliënten verdienen beter"), no fake scarcity, no dark-pattern button asymmetry (decline is a real button, same size family). Value is stated as what the provider *gets*, in Flemish register (jij/je, warm-professional).
- Every nudge is dismissible; every dismissal is remembered; conversion attribution: last `nudge_clicked` within 72h of `subscription_created` tags the winning trigger.

### 3.3 Top 10 upgrade moments — copy (NL first, EN second)

| # | Trigger id | NL | EN |
|---|---|---|---|
| 1 | `client_cap_reached` | **Je praktijk groeit.** Je hebt nu 3 actieve cliënten — het maximum in het gratis plan. Met Pro werk je zonder limiet, met dezelfde rustige werkruimte. → *Bekijk Pro* / *Later* | **Your practice is growing.** You've reached 3 active clients — the free plan's limit. Pro removes the cap, same calm workspace. → *See Pro* / *Later* |
| 2 | `client_cap_approaching` (2/3) | Nog plaats voor één actieve cliënt in je gratis plan. Goed om te weten vóór je volgende intake. | Room for one more active client on the free plan. Worth knowing before your next intake. |
| 3 | `locked_template_clicked` | Meerdere intakeformulieren horen bij Pro. Je huidige formulier blijft gewoon werken. | Multiple intake templates are part of Pro. Your current form keeps working as-is. |
| 4 | `outcomes_teaser_viewed` (3rd view) | Dit overzicht is gebaseerd op jouw echte sessies en taken. Pro maakt de details zichtbaar — per cliënt, per week. | This overview is built from your real sessions and tasks. Pro reveals the detail — per client, per week. |
| 5 | `bond_flag_no_console` | Bond markeerde deze week 2 gesprekken voor jouw overzicht. De supervisieconsole in Pro bundelt ze in één wachtrij met context. | Bond flagged 2 conversations for your review this week. Pro's supervision console gathers them in one queue, with context. |
| 6 | `lead_sla_missed` | Een aanvraag via Vind een begeleider wacht al 5 dagen. Pro stuurt je een melding bij elke nieuwe aanvraag. *(Reageren is en blijft gratis.)* | A finder request has been waiting 5 days. Pro notifies you the moment a request arrives. *(Responding is and stays free.)* |
| 7 | `recurring_session_attempted` | Wekelijks terugkerende sessies inplannen hoort bij Pro — één keer instellen, klaar. | Recurring weekly sessions are a Pro feature — set once, done. |
| 8 | `invoice_needed` (marked 3+ sessions completed in a month) | Je rondde deze maand 6 sessies af. Met Pro maak je daar in twee klikken facturen van. | You completed 6 sessions this month. Pro turns those into invoices in two clicks. |
| 9 | `trial_day_10` | Nog 4 dagen Pro-proefperiode. Wat je gebouwd hebt blijft — enkel de Pro-functies vergrendelen straks. Geen kaart nodig tot je kiest. | 4 days left on your Pro trial. Everything you built stays — only Pro features re-lock. No card until you decide. |
| 10 | `second_staff_invited` (Pro user invites a colleague) | Twee begeleiders, één praktijk? Het Practice-plan geeft jullie gedeelde sjablonen, rollen en een teamoverzicht — €29 per zetel per maand (jaarlijks). | Two providers, one practice? The Practice plan adds shared templates, roles and a team overview — €29 per seat per month (annual). |

Copy #2, #9 render as inline banners (not dialogs) and don't consume the dialog cap. Numbers in copy are interpolated live (`{{count}} sessies`), never hardcoded.

---

## 4. Upgrade trigger map

| Event (analytics name) | Fires | Nudge | Surface | Cap handling |
|---|---|---|---|---|
| `client_activated` making count=2 | on 2/3 | inline banner #2 + UsageMeter appears | `src/pages/therapist/Clients` header (post-rename: provider) | banner, uncapped, dismiss-per-30d |
| `client_cap_hit` | add-client attempt at 3/3 | `<ProGate>` on Add Client flow + UpgradeMoment #1 | `AddClient` / `InviteClientPanel` | dialog cap applies |
| `intake_template_create_blocked` | 2nd template attempt | UpgradeMoment #3 | `IntakeTemplates` (`/dashboard/therapist/intake-forms`) | dialog cap |
| `feature_peek_viewed{feature:outcomes}` ≥3 | 3rd distinct day | UpgradeMoment #4 | new Outcomes tab (plan 04 builds it; we gate it) | dialog cap |
| `bond_conversation_flagged` && tier=free | weekly digest moment | UpgradeMoment #5 | provider dashboard `ClinicalQueue` area | dialog cap; NEVER inside the flagged transcript itself |
| `lead_response_overdue` (>96h) | once per lead | UpgradeMoment #6 | `ProviderLeads` | dialog cap; lead actions themselves never gated |
| `recurring_session_attempted` | toggle click | inline ProGate popover #7 | session create dialog (`SessionService` surfaces) | ambient |
| `sessions_completed_month` ≥3 && tier=free | monthly, once | UpgradeMoment #8 | Sessions list | dialog cap |
| `trial_day_10` / `trial_day_13` | scheduled | banner #9 + lifecycle email | dashboard shell | banner, uncapped |
| `staff_invite_attempted` on Pro | 2nd provider invited | UpgradeMoment #10 (Pro→Practice) | settings/team | dialog cap |

Implementation: `src/services/api/nudgeService.ts` — `evaluate(event)` runs governor checks (caps, forbidden-zone route match via `useLocation`, per-trigger dismissals) and returns render instructions; all triggers ALSO log to `analytics_events` regardless of whether a nudge renders (so we can measure suppressed demand).

---

## 5. Growth loops

1. **Provider invites client (free, seeds everything).** Existing `/invite/:token` self-onboarding (`clientInvitationService.ts`) stays free and unlimited *in count* (only *active* concurrency is capped) — the invite email is the client's first brand touch, so it gets the plan-02 email treatment. Attribution: `invite_sent` → `invite_accepted` → `client_activated` chain with `provider_id`.
2. **Client finds provider (finder = paid-free acquisition).** Every finder request (`RequestProviderDialog`) that lands on a provider without an account triggers a claim-your-profile email loop (coordinate plan 02/08); providers acquired via finder get tagged `acquisition_channel=finder`. Finder is the SEO surface: public profile pages (`/find/:providerId`) get meta/schema.org markup (plan 01 IA ticket) — free compounding acquisition.
3. **Provider refers provider.** `referrals` table (code, referrer_profile_id, referee_profile_id, status pending|converted|credited). Personal link `bondable.be/r/{code}` → signup attribution. Reward: 1 month Pro credit to both, applied via Stripe customer balance credit on referee's first paid invoice. Surfaced quietly in Settings → "Nodig een collega uit"; no popups.
4. **Practice invites staff.** Each staff seat invited via manager dashboard (plan 06/owner-generalization builds the org model) gets the staff onboarding email sequence (plan 02); every activated staff member is a future solo-Pro or practice-expansion node. Metric: `seat_activated` / `seat_invited` ratio.
5. **Loop guardrail:** no growth mechanic may message *clients* with provider-acquisition content, and referral rewards never touch ranking (Section 2.5).

---

## 6. Instrumentation — analytics event schema

`analytics_events` table: `id, profile_id (nullable for anon finder), anon_id, role, org_id, event, properties jsonb, tier_at_event, session_id, created_at`. Client emits via `src/services/api/analyticsService.ts` — `track(event, properties)`; batched, fails silent, respects a consent flag (GDPR: analytics consent separate from care data; anonymous finder events are cookieless-aggregated). This feeds plan 07's owner cockpit directly — event names below are the contract.

**Naming:** `snake_case`, object_action order. Core funnel:

| Funnel | Events (properties) |
|---|---|
| Acquisition | `signup_started(role, channel)`, `signup_completed(role, channel, referral_code?)`, `finder_search(filters)`, `finder_profile_viewed(provider_id)`, `finder_request_sent(provider_id, is_regulated)` |
| Activation (provider) | `onboarding_step_completed(step)`, `first_client_invited`, `first_client_activated`, `first_session_created`, `finder_profile_published`, `activation_reached` (composite: ≥1 active client + ≥1 session within 14d) |
| Activation (client) | `invite_accepted`, `first_bond_message`, `first_task_completed`, `first_journal_entry` |
| Monetization | `trial_started`, `trial_day_10`, `feature_peek_viewed(feature)`, `gate_hit(feature)`, `nudge_shown(trigger)`, `nudge_clicked(trigger)`, `nudge_dismissed(trigger)`, `checkout_started(tier, interval)`, `subscription_created(tier, interval, seats, mrr_eur)`, `subscription_upgraded`, `subscription_canceled(reason)`, `payment_failed` |
| Growth | `invite_sent(kind: client|staff|provider_referral)`, `referral_converted`, `seat_invited`, `seat_activated`, `lead_received`, `lead_responded(hours_to_response)` |
| Health (for 07) | derived, not events: MRR, ARPU, trial→paid %, Free→Pro %, nudge conversion by trigger, activation rate by channel, finder liquidity (requests/published profile) |

Rule: every ticket in every plan file that adds a user-visible surface must name which of these events it emits; this file owns the registry (`src/config/analyticsEvents.ts` exports the union type so typos fail typecheck).

---

## 7. Stripe subscription model (rails owned by plan 08; shape owned here)

- **Products:** `bondable_pro`, `bondable_practice`. **Prices:** `pro_monthly` €39, `pro_yearly` €390, `practice_seat_monthly` €35, `practice_seat_yearly` €348/seat (=€29/mo). All `tax_behavior: exclusive` + Stripe Tax (BE/NL/EU OSS VAT).
- **Trial:** subscription created at signup with `trial_period_days: 14`, `payment_method_collection: 'if_required'` (no card); `trial_settings.end_behavior.missing_payment_method: 'cancel'` → webhook downgrades `subscriptions.tier` to `free`. Trials are Pro-only; Practice starts as a Pro-trial that converts with quantity.
- **Seats:** Practice = one subscription, `quantity = seats`; seat changes via subscription update with `proration_behavior: 'create_prorations'`. Minimum quantity 2 enforced app-side.
- **Webhooks** (Vercel function, plan 08): `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid`, `invoice.payment_failed` → upsert `subscriptions`; `invoice.paid` with referral pending → apply two customer-balance credits (Section 5.3).
- **Checkout:** Stripe Checkout hosted pages (not embedded) for launch — less PCI/UI surface, faster; portal = Stripe Billing Portal for card/invoice self-serve, linked from `/dashboard/provider/billing`. Client-side never touches keys beyond publishable.
- **Provider→client payments (invoicing feature) is Stripe Connect and explicitly Phase 4-late/Phase 5** — separate money flow, separate risk review; do not conflate with platform subscriptions.

---

## 8. Pricing page spec

**Public `/pricing`** (`src/pages/Pricing.tsx`, route in `src/App.tsx`, linked from homepage nav + footer):
- Typography-led, three columns on the standard white-card/`#dbe8e6`-border system; NO gradient hero, no emoji, no "Unlock your potential". H1: NL **"Eerlijke prijzen voor echt werk."** / EN **"Honest pricing for real work."** Subline: NL "Cliënten gebruiken Bondable altijd gratis. Begeleiders betalen voor gereedschap — nooit voor zichtbaarheid." / EN "Clients always use Bondable free. Providers pay for tools — never for visibility."
- Monthly/annual toggle (annual pre-selected, "2 maanden gratis" chip). Practice column shows per-seat math with a live 3-seat example: "3 zetels × €29 = €87/maand, jaarlijks gefactureerd."
- Feature table mirrors Section 1.1 exactly (single source: render from `entitlements.ts` so page and gates can't drift).
- A distinct bordered block (not a card among cards): **"Waarom je bij ons geen zichtbaarheid kunt kopen"** → 3 sentences + link to `/how-ranking-works`. This block is a trust asset; give it room.
- FAQ (accordion, 6 items): active-client definition, what happens after trial, archiving vs deleting, VAT/invoicing, cancel anytime, data export on any tier. Example copy, trial FAQ NL: "Na 14 dagen schakel je automatisch over naar het gratis plan. Je gegevens en cliënten blijven exact waar ze zijn — enkel Pro-functies vergrendelen opnieuw."
- Concrete Flemish example strip: "An Peeters, klinisch psychologe in Gent, beheert 14 cliënten in Pro" — real-sounding, no stock-photo grid.

**In-app `/dashboard/provider/billing`** (REBUILD of `src/pages/Payments.tsx`): current plan card (tier, renewal date, seats, trial countdown), UsageMeter block, plan-change grid (same `entitlements.ts` render), invoice list (Stripe), portal link, cancel flow with a one-question reason select (feeds `subscription_canceled.reason`) and zero retention dark patterns (cancel is one screen).

---

## Tickets

- T-MG-1 | Entitlements config + useEntitlements hook | Create `src/config/entitlements.ts` (tiers, limits, features map) and `src/hooks/useEntitlements.ts` with mock backing + `bondable_demo_tier` localStorage override; export TypeScript types consumed by all gates | Hook returns correct tier/limits/usage in all three demo roles; demo tier switch flips gates live; typecheck passes | M | n.a. | 3
- T-MG-2 | Analytics service + event registry | `src/services/api/analyticsService.ts` (batched track(), consent-aware, silent-fail) + `src/config/analyticsEvents.ts` typed registry per Section 6; wire signup/onboarding/invite events emitted by plan-02 surfaces | Events appear in `analytics_events` (mock store until 08); unknown event name fails typecheck; consent=off emits nothing | M | n.a. | 2
- T-MG-3 | Ranking neutrality fence | Refactor `src/services/api/finderService.ts` to `buildRankingInputs()` + frozen `RankingInputs` type excluding tier/billing/is_regulated; add `rankingNeutrality.test.ts` (no billing imports; Free vs Pro identical scores) | CI fails if tier data enters ranking; identical profile ranks identically across tiers in test | M | n.a. | 1
- T-MG-4 | Public transparency page /how-ranking-works | `src/pages/RankingTransparency.tsx` + route in `src/App.tsx`; NL/FR/EN/ES i18n keys; footer links from `/find*` pages and pricing page | Page renders in 4 languages; linked from all finder pages; states dichotomieverbod plainly | S | n.a. | 1
- T-MG-5 | Monetization component library (dormant) | Build `src/components/monetization/{ProGate,FeaturePeek,UpgradeMoment,UsageMeter,ProBadge}.tsx` on existing tokens (no mint, no red); Radix dialog for UpgradeMoment; storybook-style demo route behind dev flag | All five render per Section 3.1; keyboard-dismissible; zero renders for client role; visual review passes anti-slop rules | L | n.a. | 3
- T-MG-6 | Nudge governor + nudge_events | `src/services/api/nudgeService.ts` + `nudgeGovernor.ts`: 7-day dialog cap, per-trigger 30-day dedupe, forbidden-route matcher (bond/crisis/messages), persistent dismissals; `nudge_events` table in `src/server/db/schema.ts` | Two triggers in one week → second dialog suppressed but logged; nudges never render on forbidden routes (test) | M | n.a. | 3
- T-MG-7 | Trigger wiring: caps & counters | Wire `client_cap_hit`/`client_cap_approaching` into Add/Invite client flows and Clients header UsageMeter ("2/3 actieve cliënten"); enforce 3-active-client limit + over-cap read-only state on downgrade | At 3/3 add-client shows ProGate + UpgradeMoment #1; archiving frees a slot instantly; meter hidden below 60% | M | Free | 4
- T-MG-8 | Trigger wiring: feature moments | Wire triggers #3–#8, #10 per Section 4 map into IntakeTemplates, Outcomes peek, ClinicalQueue digest, ProviderLeads SLA, session create, Sessions monthly, team settings; all emit analytics regardless of render | Each trigger fires ≤ governed frequency with NL/EN copy from Section 3.3; suppressed nudges still logged | L | Pro/Practice | 4
- T-MG-9 | FeaturePeek: outcomes on real data | Outcomes teaser computes real aggregates (alliance checks via `sessionFeedbackService`, task completion via `tasksService`) and renders blurred chart with honest-data rule | Peek shows provider's real numbers; `feature_peek_viewed` logged once/surface/session; no fabricated curves | M | Free | 3
- T-MG-10 | Stripe products, prices, trial config | Coordinate plan 08: create products/prices per Section 7 (test mode), trial_period_days=14 no-card, Stripe Tax on; `subscriptions` table + webhook upserts | Test-mode checkout for Pro monthly/yearly and Practice seats completes; trial creates sub without card; webhook updates tier in DB | L | Pro/Practice | 4
- T-MG-11 | Billing page REBUILD | REBUILD `src/pages/Payments.tsx` → `/dashboard/provider/billing`: plan card, trial countdown, usage, plan-change grid rendered from `entitlements.ts`, invoices, Billing Portal link, one-screen cancel with reason | Upgrade/downgrade/cancel round-trips against Stripe test; cancel logs reason; page renders from entitlements config (no duplicated feature list) | L | n.a. | 4
- T-MG-12 | Public pricing page | `src/pages/Pricing.tsx` per Section 8 with NL/EN (+fr/es keys), annual toggle, per-seat math example, ranking-neutrality trust block, 6-item FAQ; homepage nav + footer links | Feature table renders from `entitlements.ts`; copy matches Section 8; passes anti-slop review; `checkout_started` fires from CTAs | M | n.a. | 4
- T-MG-13 | Trial lifecycle: banners + downgrade | Trial state in `useEntitlements`; day-10/13 inline banners (#9), day-14 downgrade to Free with keep-3-active picker (nothing deleted, over-cap read-only); emails via plan-02 rails | Simulated clock: banners at d10/d13, downgrade at d14 preserves all data; picker required only when >3 active | M | Free | 4
- T-MG-14 | Provider referral loop | `referrals` schema + `bondable.be/r/{code}` attribution on signup; Settings block "Nodig een collega uit"; dual 1-month Pro credit on referee's first paid invoice via Stripe customer balance | Referral signup attributed; credits applied exactly once on first invoice.paid; zero effect on finder ranking (covered by T-MG-3 test) | M | Pro | 4
- T-MG-15 | Finder claim-your-profile loop | When `RequestProviderDialog` targets an unclaimed/unregistered provider, queue claim email (plan 02 mailer) with `acquisition_channel=finder` attribution through signup | Claim link lands in signup with channel tag; `signup_completed(channel:finder)` logged; no email without consent-compatible basis | M | n.a. | 4
- T-MG-16 | Lead SLA + response analytics | Add `lead_received`/`lead_responded(hours_to_response)` to `ProviderLeads`; overdue (>96h) fires trigger #6; Pro lead analytics mini-panel (response time, conversion) | Overdue nudge respects caps; responding always possible on Free; Pro panel shows real per-provider stats | M | Pro | 4
- T-MG-17 | Practice seat management + billing | Seats UI in Practice settings (invite/deactivate staff ↔ Stripe quantity, min 2, prorations); manager sees per-seat status; `seat_invited`/`seat_activated` events | Seat add/remove updates Stripe quantity + invoice preview; deactivated seat frees quantity next period; org model from plan 06 respected | L | Practice | 4
- T-MG-18 | Monetization funnel feed for owner cockpit | Materialized funnel queries (trial→paid, Free→Pro, nudge conversion by trigger, MRR/ARPU, activation by channel, finder liquidity) exposed via `adminService` for plan 07 cockpit | Cockpit renders all Section 6 health metrics from `analytics_events`+`subscriptions` on seeded data; numbers reconcile with Stripe test dashboard | M | n.a. | 5

---

## Dependencies & risks

**Dependencies**
- `docs/plan/08-*` (platform rails / Neon-auth-Stripe cutover): owns Stripe keys, webhooks, `subscriptions` persistence, Vercel functions — T-MG-10/11/13/14/17 block on it; T-MG-1/2/5/6 deliberately don't.
- `docs/plan/02-*` (onboarding & activation): owns the email rails (Resend) that carry trial d10/d13 emails, claim-your-profile, staff onboarding sequences; owns where activation events are emitted (T-MG-2 contract).
- `docs/plan/01-*` (design language & provider generalization): the therapist→provider rename changes routes referenced throughout (`/dashboard/therapist/*` → provider); all monetization components consume the refreshed tokens; pricing page ships in the new language.
- `docs/plan/04-*` (provider features): builds the Outcomes surface, advanced scheduling, and Bond supervision console that Pro actually *sells* — Pro without them is an empty box; sequence Pro launch after at least outcomes + supervision console exist.
- `docs/plan/06-*` (practices/org model): org/roles schema is a hard prerequisite for the Practice tier (T-MG-17).
- `docs/plan/07-*` (owner cockpit): consumer of the Section 6 event registry and T-MG-18 funnel feeds — treat event names as a frozen contract.

**Risks**
1. **Pro launches before Pro value exists.** If billing (Phase 4) lands before outcomes/supervision console (Phase 3, plan 04), churn and refunds follow. Mitigation: launch gate — Pro checkout stays disabled until the three headline Pro features are live.
2. **Ranking-neutrality regression.** A future contributor adds "boost verified/paying providers" innocently. Mitigation: T-MG-3 CI test + transparency page makes the promise public and expensive to break.
3. **Nudge fatigue / brand damage in a clinical product.** Even governed nudges can feel wrong next to crisis content. Mitigation: forbidden-zone matcher is route-based and tested; quarterly copy review; watch `nudge_dismissed`/`nudge_shown` ratio >60% as a kill signal per trigger.
4. **No-card trial + free tier = conversion may underwhelm.** Accept for year one; the meters/emails are the lever. If trial→paid <8% after 3 months of data, revisit card-optional-at-day-7 — decision belongs to the owner cockpit data, not vibes.
5. **VAT/invoicing complexity (BE/NL, sole traders vs BVs).** Stripe Tax covers rates but reverse-charge B2B needs VAT-ID capture at checkout; get a Belgian accountant review before live mode.
6. **Client-side entitlement enforcement only.** Until plan 08's real backend, caps are bypassable — fine in mock/demo, unacceptable at cutover; T-MG-10 acceptance must include server-side enforcement of active-client caps.
7. **Analytics consent (GDPR).** Monetization analytics must never mingle with Art. 9 health data; `analytics_events.properties` schema review (no free-text, no clinical content) required before Phase 2 ships.

# Bondable Master Plan

**Date:** 2026-07-02 · **Status:** approved-for-build pending owner sign-offs (§8) · **Executor:** Opus 4.8, one phase-wave per session, build-gated (`npx vite build` green before every commit).

This is the reconciliation and sequencing layer over the eight domain plans in this folder. **Where a domain file disagrees with this file, this file wins.** An adversarial critique pass found ~20 cross-file contradictions and 5 unowned items; §3 resolves every contradiction with an explicit ruling, §4 assigns the missing owners. Domain files are the deep specs; this is the law and the build order.

| # | File | Owns |
|---|------|------|
| 01 | [01-design-language.md](01-design-language.md) | Type, tokens, components, motion, voice, anti-slop checklist |
| 02 | [02-provider-generalization.md](02-provider-generalization.md) | Provider taxonomy, rename, practices/staff, verification model |
| 03 | [03-client-experience.md](03-client-experience.md) | Client home, Bond check-ins, outcomes, consent center, safety |
| 04 | [04-provider-experience.md](04-provider-experience.md) | Today view, notes, caseload intel, scheduling, invoicing, leads |
| 05 | [05-monetization-growth.md](05-monetization-growth.md) | Tiers/pricing, nudge machinery, growth loops, analytics registry |
| 06 | [06-onboarding-activation.md](06-onboarding-activation.md) | Welcome flows, checklist, popup governance, email lifecycle |
| 07 | [07-owner-superadmin.md](07-owner-superadmin.md) | Owner cockpit, safety/verification/GDPR queues, comms, flags |
| 08 | [08-architecture-backend.md](08-architecture-backend.md) | Adapter seam, Neon/Auth/API, notifications, Bond LLM, Stripe rails |
| 09 | [09-compliance-gate.md](09-compliance-gate.md) | Deferred-but-load-bearing GDPR/legal items (pre-launch gate) |

---

## 1. Thesis

Bondable becomes the place where Belgian care providers **run their practice** and clients **stay connected between sessions** — with a supervised AI companion neither side gets anywhere else, and a finder that turns client demand into provider revenue. Clients are free forever; providers pay for intelligence and efficiency, never for visibility. The design language is a considered European healthcare brand — typography-led, border-first, mint reserved for AI — not a template.

North-star metric: **weekly active care relationships** (client ↔ provider pairs with ≥1 meaningful interaction that week). Everything in this plan feeds it: onboarding creates relationships, daily-value features sustain them, monetization taxes the workflow around them, the cockpit watches them.

## 2. Canonical commercial model

**Providers pay. Clients are free forever** (stated in-product; the client side is the asset that makes Pro worth paying for).

| | **Free** | **Pro — €39/mo or €390/yr** | **Practice — €29/seat/mo, annual, min 2 seats** |
|---|---|---|---|
| Active clients | **3** (archiving free & reversible; data never hostage) | Unlimited | Unlimited |
| Core clinical loop (sessions, notes, tasks, journal, messages, intake) | ✔ full | ✔ | ✔ |
| Finder profile + leads (48h SLA tools) | ✔ full — **marketplace behavior identical on every tier** | ✔ | ✔ |
| Per-client progress (Verloop tab) | ✔ (care quality is never gated) | ✔ | ✔ |
| Caseload outcomes dashboard, exports, reports | FeaturePeek only | ✔ | ✔ |
| Bond supervision console | — | ✔ | ✔ |
| Advanced scheduling (recurring, waitlist, gaps-to-fill) | — | ✔ | ✔ |
| Invoicing engine (BE: art. 44 VAT, mutualiteit, UBL/CSV) | — | ✔ | ✔ |
| Practice features (shared calendar, staff roles, manager views) | — | — | ✔ |
| Safety flags, crisis alerts, data export | **Never gated, any tier** | | |

14-day full-Pro trial, no card; auto-downgrade preserves everything (keep-3-active picker). Referral rewards are **service credits only** (1 month, both sides). **Dichotomieverbod is enforced in code**: frozen `RankingInputs` type excludes tier/billing, CI neutrality test + grep-guard (finder modules may not import billing), public `/how-ranking-works` page. Pro checkout stays launch-gated until outcomes + supervision console + advanced scheduling actually exist (no empty-box churn).

## 3. Canonical rulings (contradiction resolutions)

Numbered R1–R21. Opus: when executing any ticket that touches these topics, apply the ruling, not the domain file's original text.

**R1 — Pro price is €39/mo (€390/yr).** The €29 on 01's upgrade-page spec is an error (that's the Practice per-seat number). Fix copy when building T-DL-15/T-MG-11.

**R2 — Lead SLA is 48h on every tier.** (04/06/07 win; 05's 96h/"Free responds within 7 days" is void.) Marketplace responsiveness is a quality bar, not a paid feature — tier-degraded lead handling would be paying for marketplace advantage through the back door. Nudge copy #6 rewritten against 48h.

**R3 — Routes are `/dashboard/provider/*`.** (04/05 win over 02's `/dashboard/pro/*`.) Temporary `<Navigate replace>` redirects from `/dashboard/therapist/*` during the transition; delete the redirects at the end of Phase 2. Client-side route stays `/dashboard/client/*`.

**R4 — Full rename, no alias layer.** (02 wins; 08's "alias therapist" compat is void.) Pre-production = zero users = zero migration debt tolerated. Acceptance: `grep -ri therapist src/` returns only the historical-comment allowlist (02 §migration). `bondable_demo_role` localStorage value `therapist` is normalized to `provider` on read.

**R5 — Relationship table is `care_relationships`.** (02 wins over 08's `client_provider_relationships`.) 08's T-AB-2 renames accordingly.

**R6 — `provider_type` enum has six values** (02): `clinical_psychologist, clinical_orthopedagogue, psychotherapist, coach, counselor, other`. 08's four-value enum is void. Psychiatrists/paramedical professions deferred past v1.

**R7 — Org tables are `practices`, `practice_members`, `practice_invites`; roles `owner|manager|staff`** (02). 08's `organizations`/`organization_members` naming is void — Better Auth's organization plugin is configured to map onto the `practices` tables (it supports custom table/model names; if a hard constraint appears, the plugin tables become an auth-internal detail and `practices` remains the app-domain source of truth). 04's `supervisor|assistant` roles deferred: v1 models supervision as a per-member capability flag, not a role.

**R8 — One write path for `is_regulated`, two cooperating models.** `provider_credentials` rows (02) are the evidence; `provider_verifications` cases (07) are the review workflow. Queue approval updates credential status and then calls `recomputeRegulated(providerId)` — which is the **only** writer of `profiles.is_regulated` (= regulated type AND verified). 07's "approval directly sets is_regulated" is void.

**R9 — Badge label is "Erkend hulpverlener"** (02; matches shipped finder copy). EN: "Registered clinician". Coaches with verified certificates: "Geverifieerde coach".

**R10 — `src/pages/Onboarding.tsx` is deleted, replaced by `/welcome/*` routes** (06). 02's provider-type + credential steps become steps *inside* `/welcome/provider` — 02's T-PG-8 retargets there; no rebuilt Onboarding.tsx exists.

**R11 — Billing route split.** `/dashboard/provider/billing` = the provider's own subscription (05's T-MG-11/08's T-AB-13 rebuild `Payments.tsx` here). `/dashboard/provider/invoicing` = invoicing *clients* (04's T-PX-16 retargets here; sidebar label NL "Facturatie"). Two products, two routes, collision resolved.

**R12 — One analytics spine.** Table `analytics_events` + rollup `metric_daily`; service `src/services/api/analyticsService.ts` + typed registry `src/config/analyticsEvents.ts` (05 owns both); **snake_case** event names (`finder_request_sent`). 07's `platform_events`/`track.ts` becomes a thin re-export of analyticsService (cockpit reads the same spine); 08's PostHog EU is an optional Phase-4+ *sink* behind consent, same taxonomy, never a second registry.

**R13 — One announcements schema** (merged): `announcements(id, title, body_md, audience jsonb {roles, tiers}, style, starts_at, ends_at, published_at, created_by)` + `announcement_reads`. 07 owns authoring (cockpit CommsCenter); 06 owns rendering (in-app changelog panel). One migration, two UIs.

**R14 — One EmptyState primitive**: `src/components/ui/empty-state.tsx` with 01's line-motif SVG system (T-DL-5). 06's `components/common/EmptyState.tsx` is void; 06's ten teaching empty-state contents (copy NL/EN) are the *content* spec consumed by 01's component (T-OA-6 retargets).

**R15 — Popup governance: 06 is law; upgrade nudges are never modal.** Modals are reserved for: role-welcome (once per role, ever), consent/legal changes, crisis UI. 05's `UpgradeMoment` re-specs as a **non-modal slide-in card** (bottom-right, dismissible, auto-dismiss 12s), still capped at 1 per 7 days, still banned from Bond/crisis/messages surfaces. Owner note: you asked for "pop-ups" — this delivers the attention mechanics without the resentment mechanics; interruptive upgrade modals in a mental-health product poison trust and reviews. See §8-D if you want to overrule.

**R16 — Free-tier outcomes split** (04+05 reconciled): per-client Verloop tab = Free (care for the individual client is never degraded). Caseload-level dashboard, cohort analytics, exports/reports = Pro (FeaturePeek for Free). This *is* the tier line; both files' tickets align to it.

**R17 — Bond transcripts: consent-with-transparency model** (03/05/08 reconciled).
1. Activating Bond requires explicit informed consent that names the supervising provider and the safety oversight ("supervised" must mean something).
2. Default provider view = **flags + weekly summaries** (client previews and approves each summary before it's shared — 03 stands).
3. Full-transcript access exists for the supervising provider, but every access is audit-logged **and visible to the client** in their Data Center ("Bekeken door je begeleider op 3 juli").
4. Crisis flags always surface to the provider immediately — safety overrides privacy, and the consent copy says so plainly.
The Pro "supervision console" (T-PX-26, §4) is the queue UI over exactly this: flags → summaries → audited transcript drill-down.

**R18 — One check-in escalation ladder.** Unacknowledged distress check-in: **t0** in-app + push to provider → **4h** email to provider → **24h** escalate to practice manager (solo: backup contact if configured) + urgent flag in ActionInbox → **48h** auto-create `safety_case` in the owner cockpit. The 06/04/08/07 thresholds all map onto this single ladder.

**R19 — Trial sequence.** Emails **D7** (value recap with the provider's own usage numbers), **D11** ("ends in 3 days"), **D14** (ended + keep-3-active picker). In-app trial banner from **D10**. 06 owns copy (E-33/34/35 retimed), 05 owns triggers + downgrade mechanics.

**R20 — Digest cadence.** Weekly Monday 07:30 provider digest is the default (06). A daily 06:00 morning digest exists as an **opt-in Pro setting**, off by default. 08's cron supports both; no digest is sent when there is nothing to say.

**R21 — Activation definitions: 06's contractual definitions win** and are stored versioned in `onboarding_progress` (solo provider: profile complete AND availability set AND ≥1 client invite AND first session, within 14d; practice 14d; staff 7d; client 7d). 05's simpler formula is renamed `activation_lite` and kept only as a funnel-comparison metric. 07's cockpit reports the contractual one.

## 4. Gap-filling tickets (master-owned; the critique's five orphans)

| Ticket | What | Phase | Tier |
|---|---|---|---|
| **T-PX-26 — Bond supervision console** | `/dashboard/provider/bond-supervision`: work-queue of Bond flags (severity-sorted), approved weekly summaries per client, audited transcript drill-down per R17, acknowledge/escalate actions feeding the R18 ladder. Consumes 08's `/api/bond/review`. The headline Pro feature 05 sells — now it has an owner (04's domain). | 4 | Pro |
| **T-I18N-1 — Dutch completion sweep** | Every user-facing string through `t()` with reviewed NL; kill remaining hardcoded English in dashboards/dialogs; NL is the reference language. | 2 | n.a. |
| **T-I18N-2 — FR-BE parity** | Full French pass (Belgium-first legal reality; crisis copy in FR is non-negotiable — Centre de Prévention du Suicide 0800 32 123 alongside 1813/113). | 5 | n.a. |
| **T-I18N-3 — ES decision** | Deferred; `es` locale stays frozen (not deleted) until a market case exists. | 5 | n.a. |
| **T-MG-16 — Notification-center nudge slot** | "Voor jou" slot type in the notification center: max 1 active monetization notification, dismissible, 30-day dedupe, governor-controlled (satisfies the "upgrade via notifications" ask within R15). | 3 | n.a. |
| **T-AB-27 — Mobile delivery (infra)** | Capacitor packaging refresh, push-permission UX flow, store-release checklist, deep links for `/invite/:token` + `/welcome/*`. | 5 | n.a. |
| **T-CX-24 — Mobile client UX pass** | Touch polish on Vandaag/Bond/Care Plan, mobile-specific onboarding variant, safe-area audit. | 5 | n.a. |
| **09-compliance-gate.md** | Written alongside this file — resolves 04/08's dangling references; §7 below. | gate | n.a. |

## 5. Phased roadmap (the build order for Opus)

Each phase = 1–3 build waves; a wave is one Opus session: implement wave tickets → `npx vite build` green → live-verify in preview → commit + push. Mock/demo mode keeps working after **every** wave (it is the permanent sales-demo environment — 08 R).

### Phase 1 — Foundation & Face (~3 waves)
The app stops looking like a template and stops saying "therapist".
- **Wave 1.1 Design system:** T-DL-1 (Fraunces + Instrument Sans), T-DL-2 (token refresh; fix mint `--ring` violation), T-DL-3 (border-first elevation), T-DL-4 (badge REBUILD), T-DL-7 (one toast system), T-DL-11 (motion foundation).
- **Wave 1.2 Provider generalization:** T-PG-1 (taxonomy module), T-PG-2 (schema: types/credentials/practices per R5–R7), T-PG-3 (role enum + auth), T-PG-4 (routes per R3), T-PG-5 (mechanical rename per R4), T-PG-6 (i18n sweep), T-PG-7 (derived `is_regulated` per R8).
- **Wave 1.3 Face rebuilds:** T-DL-5+content (EmptyState per R14), T-DL-6 (KPI strips), T-DL-8 (tables/mobile cards), T-DL-12 (homepage hero + login), T-DL-13 (finder editorial), T-PG-11 (finder type facet + badges per R9).
- Exit: anti-slop checklist passes on home, login, both dashboards, finder; grep-zero on "therapist"; build green.

### Phase 2 — Activation (~3 waves)
A new provider, staff member, or client reaches value without help.
- **Wave 2.1 Onboarding core:** T-OA-1 (state foundation + announcements table per R13), T-OA-2 (/welcome/* per R10, embedding T-PG-8 steps), T-OA-3 (provider Setup Checklist), T-OA-4 (client warm welcome + Art.9 consent), T-OA-5 (welcome modal + coach-mark caps per R15).
- **Wave 2.2 Comprehension & practice:** T-OA-6 (teaching empty states), T-OA-7 (sample-data sandbox), T-OA-11 (practice owner/manager first-run), T-PG-12/13 (practice entity + staff invites), T-OA-16 (homepage 10-second strip).
- **Wave 2.3 Email library + measurement:** T-OA-9 (all E-01..E-35 as typed mock templates + `/dev/emails` preview; **staff & manager onboarding mails included**), T-MG-2 (analytics service + registry per R12), T-OC-1/T-OC-2 (spine + emit points, as re-exports per R12), T-I18N-1.
- Exit: all four role first-runs demo-able end-to-end in mock; activation events flow; every email visible in the preview drawer.

### Phase 3 — Daily value (~4 waves)
The reasons to open Bondable every day, both sides.
- **Wave 3.1 Provider Today:** T-PX-1 (Today view REBUILD), T-PX-2 (ClientPrepCards), T-PX-3/4 (session_notes engine + 90-second capture), T-PX-6 (risk engine v1 + flags feeding R18).
- **Wave 3.2 Client daily loop:** T-CX-1 (Vandaag REBUILD), T-CX-3 (safety omnipresence), T-CX-8 (Bond structured check-in), T-CX-10 (Care Plan REBUILD), T-CX-6 (prep-note persistence + consent).
- **Wave 3.3 Outcomes & library:** T-CX-12 (PHQ-9/GAD-7/GAS on questionnaire rails), T-CX-13 (item-9 crisis interrupt), T-CX-14 (client Progress page), T-PX-8 (Verloop tab — Free per R16), T-CX-16 (resource library), T-CX-4 (Consent & Data Center), T-CX-17 (weekly summaries per R17), T-CX-19 (crisis events pipeline).
- **Wave 3.4 Scheduling, leads & dormant money:** T-PX-11 (recurring), T-PX-12 (availability REBUILD), T-PX-13 (waitlist/gaps), T-PX-18/19 (leads SLA per R2 + lead→invite conversion), T-PX-16 (invoicing UI per R11, mock rails), T-MG-1 (entitlements, all-unlocked), T-MG-5/6 (nudge kit + governor per R15), T-MG-3/4 (neutrality fence + transparency page), T-MG-16.
- Exit: a full provider day and client week are demo-able; money machinery visible but dormant.

### Phase 4 — Business (~5 waves; external accounts required — §8-G)
Mock → production rails; the till opens.
- **Wave 4.1 Seam & API:** T-AB-1 (adapter), T-AB-4 (Hono/Zod scaffold), T-AB-2/3 (schema per R4–R7), Neon branch setup.
- **Wave 4.2 Auth & policy:** T-AB-6 (Better Auth + org plugin per R7), T-AB-7 (authz policy layer), real signup/login replacing demo-only paths (demo mode stays).
- **Wave 4.3 Service cutover:** T-AB-8 (+ follow-on waves: clinical core → finder/leads → journal/intake), T-AB-10 (notification outbox), T-AB-11 (Resend live; E-01..E-08 via T-OA-13), T-OA-14 (drips + digest per R19/R20), R18 ladder live via cron.
- **Wave 4.4 Money live:** T-AB-13/T-MG-10 (Stripe + webhooks + portal), T-AB-14 (server-enforced entitlements + CI fence), T-MG-11 (billing page per R11), T-MG-12 (pricing page), T-MG-7/8/13 (triggers + trial per R19), T-OC-8 (revenue ops).
- **Wave 4.5 Bond live:** 08's `/api/bond` (claude-fable-5, prompt caching, crisis pre-filter, audit), T-PX-26 (supervision console per R17), T-OC-16 (LLM cost meter), T-AB-16 (encryption at rest), **09 compliance gate review — blocks real-user launch, not the build**.
- Exit: a real provider can sign up, pay, invite a real client, and run care with Bond supervised — while demo mode still works for sales.

### Phase 5 — Command & scale (~3 waves)
The owner runs the platform in 10 minutes a day.
- **Wave 5.1 Cockpit:** T-OC-3 (AdminShell + roles), T-OC-4 (Command dashboard), T-OC-5/6 (SafetyQueue REBUILD consuming R18 cases), T-OC-7 (verification queue per R8).
- **Wave 5.2 Ops:** T-OC-9 (feature flags), T-OC-13 (consented impersonation), T-OC-14 (GDPR queue), comms center (R13 authoring), DailyOpsStrip.
- **Wave 5.3 Reach:** T-I18N-2 (FR), SSE realtime v2, finder SEO prerender + sitemap, T-AB-27 + T-CX-24 (mobile), T-OA final drips/win-back.

## 6. Metrics that matter (07 reports these; definitions locked here)
- **North star:** weekly active care relationships.
- **Activation** (R21, contractual, versioned) per role; funnel: signup → activated → habitual (3 consecutive weekly-active weeks).
- **Finder liquidity:** searches → profile views → requests → accepted → converted-to-relationship (with 48h SLA compliance %).
- **Bond health:** check-in completion, weekly summaries shared %, crisis events (count + time-to-acknowledge per R18), €/DAU LLM cost.
- **Commercial:** trials started, trial→paid %, MRR/ARR, Free→Pro trigger attribution (which nudge converted), churn + downgrade reasons.

## 7. Compliance gate (see 09-compliance-gate.md)
Deferred by owner decision, but **load-bearing**: Art. 9 consent flows (Bond activation, journal sharing, summaries), erasure-vs-clinical-retention matrix (legal review required — Belgian patiëntendossier retention rules for regulated providers), DPA inventory (Neon, Vercel, Resend, Stripe, Anthropic, PostHog-if-used), encryption at rest (T-AB-16), audit-log coverage, and the R17 transparency mechanics. **Nothing in Phases 1–3 is blocked by it; Phase 4.5's real-user launch is.**

## 8. Owner sign-offs needed (everything else is decided)
- **A. Pricing:** Free = 3 active clients; Pro €39/€390; Practice €29/seat annual min 2. (Anchors: SimplePractice $29–99, TherapyNotes ~$49; we price under US suites, above bare EU coaching tools.)
- **B. Naming:** "provider" internally, NL "hulpverlener" generically + specific type labels; "therapeut" survives only as the psychotherapist label. Routes `/dashboard/provider/*`.
- **C. v1 verticals:** the six-type taxonomy (R6) — psychiatrists, diëtisten, kinés deferred.
- **D. Nudge modality:** R15 (no modal upgrade interrupts). Overrule = one-line change in the governor config; the machinery supports it. My strong recommendation: don't.
- **E. Clients free forever** — stated in-product; it's a strategic commitment, hard to walk back.
- **F. Bond transcript model:** R17 (consent + client-visible access log). This is the trust-defining decision of the product.
- **G. Phase-4 accounts to create when we get there:** Neon prod, Vercel, Resend (+ sending domain, e.g. `mail.bondable.be`), Stripe live, Anthropic API, Sentry, PostHog EU (optional).

## 9. Execution protocol for Opus
1. Work wave-by-wave in §5 order; within a wave, ticket order as listed. Read the owning domain file section before each ticket; apply §3 rulings over file text.
2. Every user-facing string via `t('key','NL default')`; NL is the reference language (EN via locale file).
3. Anti-slop checklist (01 §9) run per screen touched; mint = AI-only; crisis surfaces are never experiment targets, never nudged, never gated.
4. Mock/demo mode must survive every wave — it is the permanent sales demo. New tables get mock seeds in the same wave.
5. Build-gate + live preview verification before every commit; commit per wave with `feat(phaseN.M): …`; push to `jakesparrew/bondable` main.
6. When a domain file contradicts reality discovered mid-build, prefer: ruling (§3) → domain file → judgment; log the deviation in the commit body.

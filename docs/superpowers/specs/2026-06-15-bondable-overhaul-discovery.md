# Bondable — Overhaul Discovery & Analysis

**Date:** 2026-06-15 · **Status:** Discovery (pre-design) · **Confidential**

Inputs synthesized: the Bondable pitch deck (18 slides), both market-research reports (general + Belgium), a full codebase map, and a 7-agent research fleet (4 competitor deep-dives + 3 internal audits). This document is the evidence base that feeds the phased overhaul. It does **not** change code.

---

## 0. The one-page thesis

Bondable already owns **Layer 1** — a proven, multi-role practice tool (1,300+ providers, 5.0★, −40% no-shows) — plus the warm provider↔client relationship. The strategy is to build three more layers on top and become the **connected-care OS** no one else is:

| Layer | SimplePractice / Jane | Headway / Grow / Alma | Wysa / Woebot / Ash | NiceDay / Minddistrict / BloomUp (EU) | **Bondable** |
|---|:---:|:---:|:---:|:---:|:---:|
| **1 · Practice tool** | ✓ | ✓ | ✗ | ✓ | ✓ |
| **2 · Client-facing AI care agent** (plan-linked, supervised) | ✗ | ✗ | ✓ (standalone) | ✗ | ✓ |
| **3 · Finder marketplace** | ◐ (Therapy Finder) | ✓ (insurance) | ✗ | ◐ (booking) | ✓ |
| **4 · Client-owned portable profile** | ✗ | ✗ | ✗ | ✗ | ✓ |
| **EU/GDPR-native** | ✗ | ✗ | ◐ | ✓ | ✓ |

**The findings that should shape everything:**

1. **Two columns are empty across the entire competitive set** — a *client-facing, plan-linked, supervised* AI agent and a *client-owned, portable* profile. These are Bondable's real moats. Build order should protect them.
2. **The clinician-supervised model is now the only legal one.** In 2025–26 the standalone-autonomous-AI-therapist category hit a wall: Woebot shut down, Slingshot/Ash pulled out of the UK, Character.AI settled teen-suicide suits, and Illinois (WOPR Act) + Nevada (AB 406) banned *autonomous* AI therapy. Bondable's "supervised by your therapist" architecture isn't just safer — it's the surviving side of the line. Clinician-linked players (Wysa, Limbic) thrived.
3. **AI scribe is table stakes, not a differentiator** (9 of 11 practice tools have one). Bondable needs one to be credible, but should compete on *price model* (metered, à la $0.01/min or $0.99/note) and *plan integration*, not the scribe alone.
4. **EU/GDPR is wide open.** Every US incumbent is HIPAA-first and awkward-to-impossible in Europe; EU incumbents are desktop-era and lack the agent/marketplace/portable-profile. Compliance-by-design + modern UX + the 4-layer vision is a genuinely uncontested position in Benelux/EU.
5. **The market just paid $6–7B for Bondable's thesis.** Spring Health acquired Alma (2026) to build "the first lifelong mental-health platform" — continuity that *follows the patient*. Bondable's client-owned portable profile is the EU-native, **client-owned** (not employer/payer-owned) expression of exactly that.
6. **The codebase is sound but pre-overhaul.** Solid React/Supabase foundation, but: duplicate service layer, TypeScript strictness off, no tests, several **CRITICAL edge-function auth gaps**, no consent/export/erasure machinery, no crisis-safety, and a hardcoded-color sprawl that makes the rebrand a real (not trivial) effort. Dutch is missing (Benelux-blocking).

---

## 1. Competitive landscape → where to play

### 1.1 Practice tools / EHR (Layer 1 — feature parity + engagement)
Mature, crowded, converging on AI scribes. Differentiation has moved to *all-in-one breadth*, *client engagement/programs*, and *owning demand* (only SimplePractice's Therapy Finder does this).

**Strongest patterns to borrow:**
- **Automatic waitlist that backfills cancellations** (Jane, Zanda) — converts dead slots to revenue; direct therapist-income lever.
- **Risk-flagging on intake/outcome-measures** (SimplePractice MBC auto-flags high-risk answers) — clinical safety *and* the seed of the agent's crisis story.
- **Outcome measures (ROM) as a schedulable first-class object** (Jane, SP, Owl, Embloom's 450+ library) — recurring PHQ-9/GAD-7 with trend charts; the data backbone the agent reasons over.
- **AutoPay / card-on-file by default** (SimplePractice + Stripe) — monetization unlock on the existing payments scaffold.
- **AI treatment-plan generation tied to modality** (TherapyNotes TherapyFuel) — the plan the AI generates becomes the plan the agent executes against.
- **AI Session Prep** (Practice Better) — auto-summarize last note when opening a new one; tiny cost, big value.
- **Programs / sequenced client journeys + science-based activity library** (Quenza "Pathways", Healthie, Practice Better) — package existing tasks/journaling into reusable programs the agent can assign.
- **Per-active-client pricing** (Quenza) and **metered AI pricing** (Practice Better $0.01/min, Tebra $0.99/note) — friendlier on-ramps than flat seats.

**Closest twin:** **Quenza** (Dutch-built: homework/pathways/portfolio, white-label, per-client pricing). Watch as reference *and* potential Benelux competitor.

### 1.2 AI mental-health agents (Layer 2 — the moat, done safely)
The market bifurcated: standalone autonomous bots hit the regulatory/liability wall; **clinician-linked, compliance-by-design players thrived**.

**Adopt (engagement/outcomes):**
- **Cognitive restructuring as the core loop** (Wysa: 91.6% restructured a negative thought in one conversation) — pre-populated from the treatment plan's targets.
- **Between-session check-ins + proactive nudges** referencing *this week's* homework/goal (Wysa Copilot, Limbic Care) — the retention engine standalone apps lack.
- **Structured sessions** with a beginning/middle/end (Sonia, Yuna) feel more therapeutic and aid retention; open-ended chat is now a *liability*.
- **Validated-instrument deltas** surfaced to client + clinician (Youper JITAI moved PHQ-9/GAD-7).
- **Voice + WhatsApp channel** (Clare&Me, Ebb) — Benelux-relevant, but a GDPR data-residency decision first.

**Mandatory safety stack (non-negotiable — copy Wysa/DCB0129):**
- **Deterministic, clinician-validated flows for ALL high-risk content — GenAI fenced out of crisis** (the lesson of NEDA Tessa's harm).
- **Two-channel crisis detection:** passive AI detection **+** always-visible one-tap SOS (Wysa: AI catches 82%, users self-select 18% — need both).
- **Confirm → escalate → follow up, never "solve":** local helpline + safety plan + grounding, then verify contact was made. Localize to **Zelfmoordlijn 1813 (BE)**, **Tele-Onthaal 106**, **113 (NL)**, **112** — not 988.
- **Human-in-the-loop logging to the *supervising* clinician** (Wysa Copilot) — this is what makes the agent "supervised," and the literal WOPR requirement.
- **Condition-aware constraints** — because the agent knows the treatment plan, forbid contraindicated suggestions (the Tessa failure becomes impossible).
- **"This is AI" transparency, repeated** (EU AI Act Art. 50, live **2 Aug 2026**) — periodic, context-aware reminders, not one-time.
- **Avoid "therapy/diagnosis" claims** (Headspace "not a therapist", Yuna "coach", Earkick "educational") to stay out of MDR/high-risk. Position: "care agent supporting your treatment plan, supervised by your clinician."

### 1.3 Marketplaces / finders (Layer 3 — the flywheel)
US insurance-take-rate model is **off the table** (EU, private-pay). Transferable mechanics:

- **Algorithmic matching beats directory browse — quantified:** SonderMind's 20+-variable match → **~50% higher retention**; BetterHelp **93%+ preference match**. **Bondable's free client AI conversation *is* the matching intake, done better** — its structural advantage.
- **Give choice, not assignment:** AI proposes a ranked shortlist of ~3 with plain-language "why this match"; client picks (Grow/Zencare pattern; BetterHelp's opaque auto-assign is a trust liability). This also makes neutrality auditable.
- **Continuous re-match** (BetterUp) + **free rematch** (Grow) — a retention feature, not a failure.
- **Identity/language/cultural filters** (Grow) — cheap, high value, essential for multilingual Belgium.
- **Monetization (private-pay reality):** the **Coaching.com hybrid** — flat SaaS for the tool + **take-rate ONLY on finder-sourced bookings** (CoachHub 30–40% / Coaching.com 15–25% on coaching; lower or per-lead on therapy). Provider keeps 100% of their *own* clients (Zencare-style). **Differentiate take-rate by side** (coaching tolerates commission; EU therapy resists it).
- **Cold-start = supply-first via the free tool** (the practice tool *is* the supply magnet); **start in one narrow niche** (Dutch-speaking Brussels burnout/anxiety); the **free AI manufactures demand** (the genuinely novel, investable flywheel). Coaching is the easier beachhead (unregulated, commission-tolerant) to subsidize the harder therapy side.
- **Trust = curation** (Zencare interviews every clinician + Vetted badge): in the EU, curation is the differentiator. Verify therapist licenses; surface **ICF/EMCC** credentials for coaches.

> ⚖️ **Legal go/no-go:** A take-rate on a *therapist's clinical session* touches EU fee-splitting/anti-kickback norms (Belgian medical/psychologist deontology). **Match on fit, never on who pays; payment must NOT be a ranking parameter** (EU P2B Reg. 2019/1150 — disclose ranking parameters). Keep a match audit log. **A Belgian healthcare/competition lawyer must confirm the therapist-side commission before it ships.**

### 1.4 EU/Benelux + portable-profile precedents (Layer 4 + GTM)
- **Feature parity bar (table stakes, not differentiation):** encrypted video + async chat; a **validated questionnaire/ROM engine** with auto-scoring + norm groups (benchmark Embloom); **modular "routes"** assignable/sequenced (Minddistrict, Quenza); **diary/registration tracking** surfaced to the therapist (NiceDay); treatment plan + homework + notes; **EHR export**.
- **No Benelux incumbent owns "client-owned + portable + cross-provider for mental health."** mynexuzhealth/MijnGezondheid/Vidis are *provider/state-anchored* with one-time global consent; **EHDS** (in force Mar 2025, rollout ~2029) makes portability a legal tailwind but won't ship a consumer MH profile. **This is the white space — lead the brand with it.**
- **Portable-profile design patterns to adopt:** granular consent on **data-type × recipient × purpose**, revocable, with a **"who accessed your data" log** (Apple "Share with Provider" UX + Consent2Share granularity + EUDI/EHDS audit log — these become *legal rights* under EHDS). Store the profile as **FHIR resources** and expose **patient-directed SMART-on-FHIR scopes** → instant GDPR Art. 20 export + on-ramp to MyHealth@EU and Belgium's Vidis-FHIR (2026–27). Position Bondable as a **mental-health "data wallet/operator"** (MyData language) that complements EUDI.
- **Reimbursement wedge:** copy **BloomUp's automatic mutualité-refund** flow (Helan ~€10/session, CM) as a private-pay sweetener while staying private-pay core. Treat **mHealthBELGIUM M3 / DiGA** as a *deliberate later fork* that trades "wellness" positioning for medical-device status.
- **Distribution optionality:** **OpenUp's** employer-paid, anonymous, aggregate-reporting B2B2C lane — design the data model to support an "anonymous employer cohort" from the start.
- **Dutch-first is non-negotiable.** Minddistrict, NiceDay, Embloom, BloomUp all ship native Dutch; English-only (Quenza, Clare&Me) signals "not built for this market." Ship **NL (Flanders tone) + FR** for full Belgium, **EN** for expats.

---

## 2. Feature menu — the curated brainstorm

Organized by layer + cross-cutting. **Impact** and **Effort** are H/M/L. **P** = priority (P1 soonest/highest-leverage). ⚖️ = compliance-sensitive.

### Layer 0 — Practice tool: engagement, retention, monetization, clinical
| # | Feature | Why / evidence | Impact | Effort | P |
|---|---|---|---|---|---|
| 0.1 | **AI scribe / ambient session notes** (metered pricing) | Table stakes; compete on $0.01/min not flat $35 | H | M | P1 |
| 0.2 | **Outcome measures (ROM) engine** — recurring PHQ-9/GAD-7, auto-scored, trend charts | Clinical value + agent's data backbone (Jane/Embloom) | H | M | P1 |
| 0.3 | **Risk-flagging on intake/ROM** → routes high-risk answers to therapist | Safety + seeds crisis story (SimplePractice MBC) | H | M | P1 |
| 0.4 | **Auto-waitlist backfill** for cancellations | Direct revenue/retention (Jane, Zanda) | M | M | P2 |
| 0.5 | **AutoPay / card-on-file default** | Monetization on existing payments scaffold (SP+Stripe) | M | M | P2 |
| 0.6 | **AI treatment-plan generation** (modality-aware) | Becomes the plan the agent executes (TherapyFuel) | H | M | P2 |
| 0.7 | **AI Session Prep** — summarize last note on open | Cheap, high perceived value (Practice Better) | M | L | P2 |
| 0.8 | **Programs / sequenced journeys + activity library** | Reusable care paths the agent assigns (Quenza/Healthie) | H | M | P2 |
| 0.9 | **Telehealth (video) — bundled** | Parity (NiceDay, Healthie include it) | M | H | P3 |
| 0.10 | **AI "catch me up on this client" history summary** | Low-risk AI utility (Carepatron) | M | L | P3 |
| 0.11 | **AI form builder** (generate intake from a prompt) | Accelerates onboarding (Practice Better) | M | L | P3 |
| 0.12 | **Reputation/review management** | Feeds finder ranking (Tebra) | L | M | P3 |

### Layer 1 — Client-facing AI care agent (the moat)
| # | Feature | Why / evidence | Impact | Effort | P |
|---|---|---|---|---|---|
| 1.1 | **Plan-linked context** — agent reads consented profile/goals/tasks/journal/notes | The differentiator vs every standalone bot | H | H | P1 |
| 1.2 | **Cognitive-restructuring core loop** (CBT), pre-populated from plan targets | Highest-yield validated micro-intervention (Wysa) | H | M | P1 |
| 1.3 ⚖️ | **Crisis detection (two-channel) + deterministic escalation flows** to BE/NL lines + supervising clinician | Non-negotiable; legal + safety | H | H | P1 |
| 1.4 ⚖️ | **"This is AI" transparency, repeated** (AI Act Art. 50, Aug 2026) | Mandatory; cheap; trust | M | L | P1 |
| 1.5 | **Between-session check-ins + proactive nudges** (this week's homework/goal) | Retention engine (Wysa Copilot, Limbic Care) | H | M | P2 |
| 1.6 | **Clinician supervision dashboard** — review/approve agent activity, see flags | Makes "supervised" real (Wysa Copilot) | H | M | P2 |
| 1.7 | **Structured sessions** (beginning/middle/end) vs open chat | Retention + lower liability (Sonia/Yuna) | M | M | P2 |
| 1.8 ⚖️ | **Condition-aware guardrails** (forbid contraindicated advice) | The Tessa failure becomes impossible | H | M | P2 |
| 1.9 | **Validated-instrument deltas** surfaced to client + clinician | Closes the outcomes loop (Youper) | M | M | P3 |
| 1.10 | **Voice / WhatsApp channel** | Benelux engagement (Clare&Me) — GDPR residency first | M | H | P3 |

### Layer 2 — Therapist & coach finder (the flywheel)
| # | Feature | Why / evidence | Impact | Effort | P |
|---|---|---|---|---|---|
| 2.1 | **AI-driven matching from the agent conversation** → ranked shortlist of ~3 with "why" | Bondable's structural advantage; +50% retention (SonderMind) | H | H | P1 |
| 2.2 | **Rich provider profiles** (bio, specialties, languages, modality, availability, video intro) | Conversion driver (Zencare) | H | M | P1 |
| 2.3 ⚖️ | **Referral-neutral ranking** (fit only; payment never ranks) + match audit log | EU P2B + anti-kickback (legal gate) | H | M | P1 |
| 2.4 | **Real-time booking + card-on-file** (3-click, à la Doctoranytime) | Liquidity (BE incumbent parity) | M | M | P2 |
| 2.5 | **Credential verification** (therapist license; ICF/EMCC badge for coaches) | Trust by curation (Zencare/ICF) | M | M | P2 |
| 2.6 | **Free rematch + continuous re-match** from check-in signals | Retention (Grow, BetterUp) | M | M | P2 |
| 2.7 ⚖️ | **Take-rate on finder-sourced bookings only** (side-differentiated) | Monetization (Coaching.com hybrid) — legal review | H | M | P2 |
| 2.8 | **Pay-per-lead option** for therapists | Deck's model; value-priced | M | M | P3 |
| 2.9 | **No-show/cancellation policy engine** (provider-set, grace, 24–36h window) | Revenue protection (Headway/Grow) | M | M | P3 |

### Layer 3 — Client-owned portable profile (the white space)
| # | Feature | Why / evidence | Impact | Effort | P |
|---|---|---|---|---|---|
| 3.1 ⚖️ | **Granular consent** (data-type × recipient × purpose, revocable) | GDPR Art. 9 explicit consent + the profile engine | H | H | P1 |
| 3.2 ⚖️ | **"Who accessed your data" log** + data export (Art. 20) + erasure (Art. 17) | Legal rights; EHDS-aligned; trust | H | M | P1 |
| 3.3 | **Portable profile stored as FHIR + patient-directed SMART scopes** | Portability + MyHealth@EU/Vidis on-ramp | H | H | P2 |
| 3.4 | **Consent-scoped context injection to the agent** ("client feeds the AI") | Makes "client owns + chooses to share" literally true | H | M | P2 |
| 3.5 | **Continuity on provider switch** — context follows the client | Solves the pain Spring/Alma paid $6–7B for | H | M | P2 |
| 3.6 | **Downloadable portfolio of completed work** | Concrete first step to "client-owned" (Quenza) | M | L | P2 |
| 3.7 | **"Data wallet/operator" positioning** + future EUDI interop | GDPR-first brand narrative (MyData) | M | M | P3 |

### Cross-cutting — compliance spine, trust, brand, growth, platform
| # | Feature | Why / evidence | Impact | Effort | P |
|---|---|---|---|---|---|
| X.1 ⚖️ | **Compliance spine**: consent records, audit logging (wire the unused `audit_logs`), DPIA, DPO, GBA basis | Prerequisite/moat; ships with the agent | H | H | P1 |
| X.2 | **Brand & design-system overhaul** (deep teal + mint, tokens) | The visible "overhaul"; unblocks pillars | H | M | P1 |
| X.3 | **Dutch (nl) locale + language switcher** | Benelux-blocking; easy | H | L | P1 |
| X.4 | **Subscription tiers** (Free → €25 → €55; agent as premium) | Deck business model | M | M | P2 |
| X.5 | **Mutualité auto-refund** (BloomUp-style) | Private-pay sweetener (BE) | M | M | P3 |
| X.6 | **B2B2C employer lane** (anonymous cohort) | Second GTM (OpenUp) | M | H | P3 |
| X.7 | **Mobile safe-area + push-driven nudges** | Native polish; powers agent nudges | M | M | P2 |
| X.8 | **MFA for therapists; file AV-scan** | Health-data hardening | M | M | P3 |

---

## 3. Internal improvement backlog (what to fix)

Consolidated from the three audits, prioritized. Full detail in the audit transcripts.

> 📌 **Decision (2026-06-15, founder):** all **legal & security/compliance** work below (edge-function auth, GDPR consent/export/erasure, DPIA/DPA, crisis-safety, formal Belgian legal review, take-rate sign-off) is **acknowledged and required — but deliberately deferred ("do it later").** Product/design work proceeds first; these stay on the books as **mandatory pre-launch** follow-ups, not dropped. Treat them as a known debt with a hard gate before any real-data EU launch.

### 3.1 🔴 Security — CRITICAL (address early; part of the compliance spine)
| Issue | Where | Fix |
|---|---|---|
| **Edge functions lack JWT/role verification** — `ai-chat`, `get-secret`, `get-client-data`, `send-*-notification`, `cleanup-pending-client` can be invoked by anyone; several run with the **service-role key** | `supabase/functions/*` | Verify caller JWT + ownership/role at the top of every function |
| **`get-secret` returns any env var with no auth** | `functions/get-secret/index.ts` | Require admin JWT; whitelist allowed secrets |
| **Twilio webhook signature check is non-blocking** ("proceeding" on failure) + fuzzy last-7-digit phone match + no active-relationship check | `functions/twilio-webhook/index.ts` | Make signature verification mandatory (403 on fail); exact E.164 match; verify `client_therapist_relationships.status='active'` |
| **Role escalation** — user can set `role` from signup metadata; no UPDATE policy on `profiles.role` | `handle_new_user` trigger + RLS | Ignore role from metadata (default `client`); block non-admin updates to `role` |
| **`ai_settings` readable by any authenticated user** (policy is `FOR ALL`, no SELECT restriction effect) | intake RLS migration | Restrict SELECT to admin |
| **Google Calendar refresh token stored plaintext** | `google_calendar_connections` | Encrypt via Supabase Vault |

> Note: the Supabase **anon/publishable** key in `.env`/`client.ts` is *safe to be public* (RLS enforces access) — not a leak. No service-role secret is committed to the repo. The real exposure is the **edge-function auth gaps** above.

### 3.2 🟠 GDPR / compliance machinery — MISSING (build with the agent)
- No **consent management** table/flow (Art. 7) · no **data export** (Art. 20) · no **erasure** (Art. 17) · no **right-to-object**.
- `audit_logs` table exists but **isn't meaningfully wired / has no retention/immutability**.
- No **crisis detection/escalation** anywhere.
- **DPIA + DPA(Supabase) + DPO** not in place — required before EU launch with Art. 9 data.

### 3.3 🟡 Architecture & code health (refactor before/with feature work)
- **Duplicate service layer** — `services/api/*` vs `services/api/optimized/*` (7 pairs). Consolidate to the optimized versions; retire legacy.
- **Custom `CacheManager` (12 files, 38+ instances) largely duplicates React Query.** Migrate to React Query; keep cache only for non-query data.
- **God-files** (>600 LOC): `Profile.tsx` (1319), `ClientsTable.tsx` (1063), `ConversationInterface.tsx` (995), `Tasks.tsx` (986), `ClientProfile.tsx` (970), `Sessions.tsx` (691). Extract components + hooks.
- **TypeScript strictness off** (`noImplicitAny`, `strictNullChecks` false); ~109 `any`. Enable phased.
- **No tests** (0 files) and **CI is deploy-only** (no lint/type/build/test gates). Add Vitest + CI gates.
- **Type duplication** across `src/types`, `integrations/supabase/types.ts`, inline. Make generated Supabase types canonical.
- **Realtime subscriptions** inconsistent (19 direct `.on()` calls); risk of leaks. Wrap in hooks via `RealtimeOptimizer`.
- **Schema smells:** legacy `clients` table vs `profiles`; `age` stored as TEXT (use `date_of_birth`); no soft-deletes/versioning for compliance.

### 3.4 🟡 UX / brand / mobile / i18n (the "Foundation" sub-project)
- **Rebrand effort = MODERATE→HIGH:** ~1,500+ **hardcoded hex** class strings (`bg-[#111111]`, etc.) bypass the token system. Centralize teal/mint tokens in `index.css` + Tailwind, then refactor. `tailwind.config.ts` already reads CSS vars (good).
- **Branding assets** still placeholder: favicon, `manifest.webmanifest` (missing name/short_name), splash `#232323`. Regenerate with Capacitor Assets.
- **i18n ~95%** but hardcoded English in `ErrorBoundary`, address dialog, date picker, confirm dialogs. **Add `nl` locale** (copy + translate ~1,074 keys) + a language switcher.
- **Accessibility gaps:** dialog focus traps, some missing `htmlFor`, decorative-icon `aria-hidden`, **contrast must be validated for teal/mint (WCAG AA)**.
- **Mobile:** no `viewport-fit=cover` / `env(safe-area-inset-*)` — notch clipping. Add safe-area CSS vars; replace hardcoded `pt-14`.
- **Performance** is decent (lazy routes, React Query) — memoize charts, profile re-render hotspots, enable bundle visualizer in CI.

---

## 4. How this feeds the overhaul (recommended sequencing)

The discovery reinforces the earlier plan, with one adjustment: **fold the security CRITICALs + compliance spine forward**, because they're cheap, they de-risk everything, and they *are* the moat.

- **Phase 0 · Foundation** (chosen starting point): rebrand to Bondable identity (teal/mint tokens), add Dutch + switcher, restructure IA/navigation around the 4 layers with entry points, reposition the existing tool. **+ quick wins:** fix the CRITICAL edge-function auth gaps, `.env.example`, branding assets. *Highest-visibility, lowest-risk, unblocks the pillars.*
- **Phase 1 · AI care agent + compliance spine** — plan-linked context, CBT loop, **crisis safety stack**, AI-Act transparency, clinician supervision dashboard; consent records + audit logging + DPIA. (Deck #1; Q3–Q4 2026.)
- **Phase 2 · Client-owned profile** — granular consent, access log, export/erasure, FHIR + SMART scopes, continuity-on-switch. (Q1–Q2 2027; feeds the agent.)
- **Phase 3 · Finder + business model** — AI matching → shortlist, neutral ranking + audit log, profiles, booking, take-rate (**after legal sign-off**), tiers/pay-per-lead. (Q3 2027; the flywheel.)
- **Continuous:** architecture refactors (service consolidation, TS strictness, tests, god-file splits) interleaved with the phase that touches those files.

**Next step:** return to the brainstorming flow and design **Phase 0 (Foundation)** in detail — or, if priorities shifted given the security findings, decide whether to slot a small "security hardening" pass first.

---

## 5. Belgium — legal limits & the supervised-AI path

Research synthesis (2026-06-15), **not legal advice**; formal Belgian lawyer sign-off is deferred (see §3 note) but required pre-launch. Bottom line: **a clinician-*supervised* AI is viable in Belgium; an *autonomous* AI therapist is not.**

### 5.1 Red lines (what is NOT allowed / high-risk)
1. **Psychotherapy is a *reserved act*, not a free activity.** Under the law of 4 Apr 2014 (am. 10 Jul 2016, in force 1 Sept 2016, in the coordinated act on healthcare professions/WUG), psychotherapy may only be performed by **clinical psychologists, clinical orthopedagogues, and psychotherapy-trained physicians** (with a **visum** from FPS Health). An **AI cannot be the legal "behandelaar" (treater)**; autonomous AI assessment/diagnosis/treatment of a psychological condition risks the **criminal offence of unlawful practice of healthcare**.
2. **Title protection.** "psycholoog/psychologue" is protected (law of 1993, am. 2024); using it (or "klinisch psycholoog"/"psychotherapeut") without registration is criminal **titelmisbruik**. The AI/service must never present as these.
3. ⚠️ **Dichotomieverbod (Art. 38 §2 WUG)** — prohibits agreements giving a healthcare professional a **direct/indirect profit or advantage**, explicitly including **patient-referral benefits / fee-splitting**. It binds clinical psychologists. **→ A pay-per-lead or take-rate commission on referrals to *regulated clinicians* is legally hazardous and conflicts with the pitch-deck monetization on the therapy side.** (Pure **coaches are unregulated** → the ban does not bind them; commission models are viable on the coaching track.)
4. **"Treats/diagnoses" claims → MDR medical device + high-risk AI.** A clinical claim pulls the app under the **MDR** (CE mark + conformity assessment; Belgian FAGG/FAMHP notification = mHealthBELGIUM M1) **and**, via **AI Act Art. 6(1)**, makes the AI **high-risk by default**. Staying "wellness/support" + supervised avoids both.
5. **Health data** = GDPR **Art. 9** special category → **explicit, specific consent + mandatory DPIA**; no model-training on therapy data without a distinct basis (GBA/APD guidance, 19 Sep 2024). **AI Act Art. 50** transparency ("tell users it's AI") is due **2 Aug 2026**.

### 5.2 The permissible supervised model (the "how")
A plan-linked, supervised agent is defensible if **all** hold:
- **A licensed human clinician is always the responsible treater**; the AI is **decision-support** (triage, psychoeducation, between-session support, homework/plan reinforcement, structured check-ins, surfacing info *to the clinician*). Clinician can **review / override / stop**; AI never autonomously changes the plan.
- **Honest framing** — "AI support alongside your therapist's plan," never "therapy/treatment/diagnosis."
- **AI transparency** at first interaction (NL/FR/EN), persistent; disclose any emotion recognition.
- **Crisis → humans**, hard-wired: supervising clinician + **Zelfmoordlijn 1813** (NL), **0800 32 123** (FR), **Tele-Onthaal 106** *(verify 106 vs Brussels 107)*, **112**. AI never manages acute suicidality alone.
- **GDPR**: separate explicit consent, DPIA, minimisation; Art. 9(2)(h) "under responsibility of a bound health professional" fits the supervised model.
- **Kwaliteitswet (22 Apr 2019)** duties: clinically relevant AI interactions feed/are reviewable in the **patiëntendossier**; continuity of care preserved.

### 5.3 Two-track design consequence
- **Therapy track (regulated, strict):** supervised-treater + referral-**neutral** economics. Monetize via flat clinician **subscription/listing**, **B2C client-pay**, or **the AI product itself** — **not** per-lead/commission on clinical referrals.
- **Coaching track (unregulated, flexible):** commission/pay-per-lead viable; AI support lighter — but must **never tip into diagnosis/treatment**, and stays subject to consumer/advertising law.

### 5.4 Open items for the (deferred) Belgian lawyer
Support-vs-treatment boundary spec for the agent; safe marketplace fee model under the dichotomieverbod (and platform's own exposure as counterparty); MDR qualification opinion; AI-Act risk-tier confirmation + Digital Omnibus timing (high-risk provisionally deferred to 2 Dec 2027); Belgian AI-Act authority designation (BIPT lead, pending); GDPR controller/processor mapping + EHDS; patiëntendossier custody for AI logs; exact crisis-line routing.

---

*Sources: pitch deck; Bondable_Marktonderzoek(.docx) general + Belgium; 7-agent research fleet (competitor web research with inline citations + read-only codebase audits), 2026-06-15. Market figures are directional; the therapist-side take-rate and any medical-device positioning require Belgian legal review before implementation.*

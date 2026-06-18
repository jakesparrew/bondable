# Bondable — Improvement Playbook
*Consolidated from 6 strategic lenses + adversarial critique · 2026-06-18 · Head of Product*

---

## North Star

**Own the connective tissue of EU mental health: the only single-vendor loop of practice tool → clinician-supervised AI → referral-neutral finder → client-owned portable profile — where GDPR, the EU AI Act, the MDR, and the dichotomieverbod are the moat, not the tax.**

### What "best in the world" actually requires (not just "best-positioned in Benelux")
"Best mental-health platform" is a *clinical-outcomes-and-trust* claim, not a feature claim. A feature roadmap with a clinical halo is not enough. The 10/10 version is won on three things this document now treats as first-class:
1. **Demonstrated outcomes** — a published evidence program, not "a nicer SimplePractice with a chatbot."
2. **A real safety & governance spine** — a named owner, an incident process, after-hours coverage, and legal classifications decided *before* code, not labels sprinkled on a roadmap.
3. **Trust made visceral** — provable erasure, transparent sub-processors, and neutrality you can audit.

### Who we serve, and the one organizing idea
- **The client at their most vulnerable:** calm, safe, one-action-per-screen, crisis help one tap away (cached/offline), their data is *theirs* and travels with them — and *provably deletable*.
- **The clinician under time pressure:** dense, fast, keyboard-first; gives back an hour a day; lets them supervise AI without being overwhelmed; and keeps the *medico-legal record clean* (they always attest; AI-drafted vs. clinician-attested is legally distinguishable).
- **The regulator/payer:** every AI message is visibly supervised and labelled; matching is provably neutral; consent is explicit and revocable. Compliance is *legible at a glance*.
- **The one idea:** *Make the compliance the brand.* Mint = AI = supervised. Teal = the human bond. The four layers reinforce one flywheel no siloed competitor (SimplePractice, Headway, Wysa, Minddistrict) can assemble.

> **The biggest strategic risk, named out loud:** the moat is *sequencing-dependent*. If Layer-2 AI ships before Layer-1 clinician trust, the safety spine, and Layer-4 consent machinery, you get a chatbot with legal exposure and no flywheel. **Build the safety/legal/consent foundation first.** The rest of this document enforces that ordering.

---

## ⛔ TIER 0 — Gates that block the whole thesis (do before anything in "Next")

These are not features. They are *go/no-go prerequisites*. Each gates the AI roadmap; until they clear, dates downstream are fiction.

| # | Gate | Why it blocks everything | I/E · P |
|---|------|--------------------------|---------|
| G1 | **Close the CRITICAL edge-function auth gaps + book a pen-test** (see §Internal Backlog) | Shipping a "Trust Center" over unfixed auth holes is a liability *amplifier* — you'd be advertising the thing you're failing at. **No AI feature and no Trust Center copy ships until these are closed.** | H/M · P0 |
| G2 | **Commission written legal opinions, before any agent appears on a dated roadmap:** (a) **MDR classification** of the plan-tethered agent; (b) **AI Act risk-tier** (Art.50 transparency *vs.* high-risk under Annex III / MDR-adjacency); (c) **Art.9 legal basis** (explicit consent vs. Art.9(2)(h) healthcare provision — different revocation consequences for the agent); (d) **coaching-side commission** sign-off (broader than dichotomieverbod — Psychologencommissie + Orde der Artsen codes on fee-splitting/advertising/independence). | These determine whether the flagship is a 6-month build or a 2-year CE-marking program — and whether the take-rate is even legal. Everything's timeline depends on the answers. | H/L to commission · P0 |
| G3 | **Stand up the crisis-safety stack + name a Clinical Safety Officer + define an after-hours escalation SLA + kill-switch protocol.** | "Never let efficiency erode the approval gate" is a *sentiment*, not a *mechanism*. You cannot ship a supervised agent to vulnerable people without an answer to: *what happens at 2am when the supervising clinician is asleep and the classifier fires?* The single biggest hole today. (DCB0129/0160-style clinical risk management + hazard log.) | H/M · P0 |
| G4 | **Name the LLM model-hosting decision as a gating compliance choice.** If the agent/scribe calls a US-headquartered model (even on EU infra), you have an Art.9 + Schrems/transfer problem that contradicts "EU-private." Decide and document hosting/residency **before** the scribe ships. | "EU data residency" is the entire brand claim; the model host is load-bearing for it, not an implementation detail. | H/M · P0 |
| G5 | **Decide minors/guardian scope explicitly — default: scope minors OUT until the delegated/guardian-consent model is designed.** Belgium's mature-minor doctrine + guardian consent has no model in the portable-profile/consent-ledger design today. | Silently allowing minors is a GDPR landmine and a clinical-safety hole. Youth MH is the most underserved segment *and* the highest-risk — earn the right to it deliberately, later. | H/M · P0 (decision) |

---

## Top 12 Highest-Leverage Moves

*Gates G1–G5 above precede all of these. The Top-12 are the highest-leverage moves once (or alongside, for the cheap ones) the gates clear.*

| # | Move | Impact / Effort | When |
|---|------|-----------------|------|
| 1 | **Crisis-safety stack + Clinical Safety Officer + after-hours SLA + hazard log** (G3 made concrete) — the prerequisite for *any* AI and the gap most likely to end the company | H / M | Now |
| 2 | **NL (Flemish-native) as a first-class locale** — ~60% of Belgium + all of NL; "Benelux-first" is not credible without it | H / M | Now |
| 3 | **EUR + Bancontact/iDEAL/SEPA subscription billing + VAT (incl. medical-exemption handling); gate on capability not client-count; default annual** — fix the USD placeholder; this is a non-negotiable market-entry blocker | H / M | Now |
| 4 | **AI transparency + crisis surfaces as visible product** (mint "AI · supervised by Dr.X" badge; BE/NL crisis lines one tap, *cached/offline*) — front-runs Art.50, gates every AI feature | H / L | Now |
| 5 | **AI clinical scribe with legally-clean attestation provenance** (SOAP/DAP + pre-session brief, EU-private host per G4, NL/FR; clinician always attests; AI-drafted vs. attested portions distinguished and audit-trailed) — the "hour a day back" wedge *and* the clinician's real day-one objection (medico-legal record integrity), answered | H / M | Now |
| 6 | **Measurement-Based Care engine** (PHQ-9/GAD-7/WHO-5/ORS-SRS, auto-scheduled, trended) with **rules-based deterioration *alerts*** (e.g. PHQ-9 jump ≥5, item-9 flag) — cheapest clinical moat; the raw material of the outcomes dataset. *(Not a "model" — see C6.)* | H / L–M | Now |
| 7 | **Clinical-evidence & validation program** — pre-registered study protocol, clinical advisory board, an academic partner (KU Leuven / UGent / UCLouvain), an effect-size target. Start *now*; it compounds slowly | H / M | Now (start) |
| 8 | **Living Treatment Plan** (versioned object, not a PDF) — the spine the AI reads, ROM attaches to, and the portable profile carries | H / H | Next |
| 9 | **Supervised AI Care Agent ("Bond"), plan-tethered + human-in-the-loop** + clinician Supervision Console — the category-defining flagship; the *only* legal AI model. **Gated on G2–G3.** | H / H | Next |
| 10 | **Client-owned portable care profile** (export → consent ledger → cross-provider grant/revoke) **with first-class Art.17 erasure** reconciled against mandatory clinical-record retention — the singular structural moat | H / H | Next |
| 11 | **Referral-neutral finder, dichotomieverbod-by-design** — implement the `is_regulated` flag (**absent from the schema today** — the single make-or-break design decision, currently unbuilt): therapy = subscription/visibility; coaching = commission (gated on G2(d)) | H / H | Next |
| 12 | **Mutualiteit / payer + employer (EAP) partnerships** + the **group-practice / multi-clinician org model** (org roles, supervision hierarchies for trainees, shared waitlists, org-level consent) — the highest-ARPU lane, where the B2B2C money actually lives. **Architect the org model now even if you sell it later.** | H / H | Later (architect now) |

**What got cut from the old Top-12:** the *two-mode design system* and *Stripe Connect take-rate* were demoted out of the headline list — both are craft/monetization ambitions that were crowding the safety/compliance "Now" (see Cuts C4, C8). Design and Connect are real, but they are "Next," not "Now."

---

## UI/UX & Brand

- **3-tier semantic token rebrand (deep-teal + mint).** Global primitives → semantic aliases → component tokens; rebrand becomes a one-file swap. **Mint is reserved exclusively for "AI / supervised-by-clinician"** so the brand does compliance work. **H / L · P1**
- **Ship "Client Calm" properly FIRST; let "Clinician Dense" follow.** The two-mode design system is genuinely elegant and *eventually* differentiating — but a dual-personality design system is a multi-month effort competing for the exact window as the safety stack + NL localization. **The vulnerable user is the priority.** Don't let design ambition crowd out the safety "Now." **H (calm) / H (full system) · P2 for the dense mode**
- **WCAG 2.2 AA sweep** — target size (≥24px), focus-not-obscured, accessible auth (password managers/passkeys, no paste-blocking), `prefers-reduced-motion` everywhere. Regulatory under EAA/EN 301 549; ethical for a vulnerable audience. **H / L–M · P1**
- **Non-judgmental microcopy + a "tone" lint rule.** Centralize strings (needed for i18n anyway); ban harsh words ("Failed", "You missed") in client-facing namespaces. **H / L · P1**
- **Skeletons over spinners + inviting empty states.** Spinners read as "broken" to an anxious user. One `<EmptyState>` / `<Skeleton>` covers all list surfaces. **M / L · P1**
- **Offline / degraded-mode safety, not "polish."** Crisis resources must be **cached and reachable offline** (a person in distress in a tunnel still needs them); journal drafts must persist locally. For a mental-health app this is a *safety requirement*, not Capacitor polish. **M / L · P1**
- **First-class dark mode ("calm-night", not inverted).** Apps open at night when distress peaks; warm-shifted, desaturated, dimmed mint, OLED option. **H / M · P2**
- **Role-aware IA + navigation.** Clients: 4-tab calm bottom-nav (Home / Talk / Journal / Plan). Clinicians: ⌘K command palette + left rail. Map every current + planned feature to a home. **H / M · P1**
- **Two divergent onboarding journeys.** Client: consent-as-conversation (GDPR Art.9 + AI supervision as delight). Clinician: import clients + connect calendar + first intake in <5 min. **H / M · P1**
- **Therapeutic data-viz (two languages).** Client: soft gradient mood bands, gentle "no data", patterns-to-notice-not-scores. Clinician: dense, exportable PHQ-9/GAD-7 trajectories. **H / M · P1**
- **Storybook + visual-regression** across modes/themes/locales — the substrate for shipping a consistent UI fast through the Neon migration. **M / M · P2**

## Features & Usefulness

- **"Open it every morning" client home** — one card: today's exercise + 10-sec mood check-in + message your therapist. Daily-active is the whole ballgame. **H / L · P1**
- **Daily mood/affect check-in** (emoji + slider) — the atomic habit that feeds ROM, AI context, and between-session visibility. **H / L · P1**
- **Session-prep digest ("catch me up in 30 seconds")** — auto one-screen: ROM trend, mood, homework, journal flags, unread. The "can't go back" feature. **H / M · P1**
- **Smart reminders + no-show defense** (2-way SMS; **WhatsApp for *logistics only* — appointment confirm/reschedule, never clinical content**, with a hard data-flow boundary; see C3). **H / L · P1**
- **Homework streaks & gentle nudges, clinically-gated** — tied to therapist-assigned exercises, visible to clinician, compassionate tone (no shaming). **M / L · P1**
- **Treatment Plans → Programs/Journeys engine** (e.g. "8-week CBT for GAD": modules, worksheets, ROM checkpoints, AI tasks auto-orchestrated). The spine connecting all four layers. **H / H · P1–P2**
- **Crisis-detection & escalation pipeline** — risk classification on chats/journals/mood → graduated response (BE/NL lines, clinician alert per the after-hours SLA, consented safety contact). Part of G3; unlocks every AI feature legally. **H / H · P1**
- **Smart scheduling: waitlist auto-fill + intelligent slotting** — acute value given long Belgian waitlists. *(Quantify your own gains; don't quote borrowed benchmarks as promises — see C5.)* **H / M · P2**
- **Secure rich async messaging as a clinical channel** (voice notes, worksheet sharing) — with boundary controls to protect clinicians from burnout. **M / M · P2**
- **Calendar 2-way sync hardening** + Outlook/iCal, recurring & group sessions. **M / M · P2**
- **Crisis resources pinned, always one tap (and cached)** (1813 / 113 / Tele-Onthaal 106 / 112) — safety baseline + trust signal; prerequisite for any AI. **M / L · P1**
- **Belgian clinical content pack (NL/FR)** — localized CBT/ACT worksheets & psychoeducation; table-stakes credibility. **H / M · P1**
- **Interoperability with the clinician's existing world (name it now, build P2).** "Switch in a weekend" is good, but the best platform also *coexists*: Belgian clinicians live in **eHealthBox**, use **Recip-e**, sometimes Hector/CareConnect. FHIR is named for the *portable profile* but not for *ingesting* from incumbents. Real continuity-of-care needs read/write against the Belgian rails, not just a pretty export. **H / H · P2 (architect/name now)**

## AI & Intelligence

> **Every item below is gated on G2 (legal classifications) and G3 (safety stack). Nothing AI-facing ships until those clear.**

- **Ambient session scribe (DPIA-gated, opt-in, EU-private host per G4)** — clinician-edited, never auto-files; clean attestation provenance (see Top-12 #5). **H / M · P1**
- **Pre-session brief + journal sentiment/theme tagging** — pure synthesis of data you already store; low GDPR surface. **H / L · P1**
- **Always-on crisis classifier on every free-text surface** — build first so all AI inherits the safety net; two-channel (passive detection + always-visible one-tap SOS); document for DPIA. **H / M · P1**
- **AI transparency layer (Art.50 by design)** — "AI-assisted · reviewed by [clinician]" badge + "how this was generated" + feedback, *repeated/periodic* (not one-time). **M / L · P1**
- **Smart intake triage & auto-routing** — AI reads intake free-text → focus areas, urgency, modality fit, draft plan skeleton. Builds on shipped intake forms. **M / M · P1**
- **Multilingual AI (NL-first)** across all surfaces — fix the NL gap *via* AI, not only static i18n. **H / M · P1**
- **The Supervised Care Agent ("Bond")** — client-facing, lives *inside* the clinician-authored plan; delivers agreed psychoeducation/exercises/check-ins; cannot diagnose or change the plan; every conversation summarized to the supervising clinician. **H / H · P2 (post-gates)**
- **Clinician Supervision & Oversight Console** — per-client AI feed, approve/edit/escalate, capability toggles, immutable audit log. Without it the agent is illegal; with it, supervision *is* the paid product. **H / H · P2**
- **Agent safety & guardrail architecture (the "clinical constitution")** — scope limits, crisis interrupt, refusal+escalate, deterministic (non-GenAI) flows for ALL high-risk content, red-team suite, provenance logging. **H / H · P1–P2**
- **Deterioration alerts → (later) a model.** *Now:* rules-based alerts (PHQ-9 jump, item-9 flag). *Later:* a longitudinal risk model once 12–18 months of labeled outcomes exist. **Calling a rules engine a "model" is the kind of overclaim regulators punish (C6).** Rules: **H / M · P1**. Model: **H / H · Later**.
- ⚖️ **Treatment recommender ("clients like this responded to…")** — **MDR / AI-Act classification required before it appears even at P2** (plausibly a medical device / high-risk clinical decision-support). Decision-support only, cites guidelines, clinician decides. **Tagged ⚖️ pending G2.** **H / H · P2 (gated)**
- 🔬 **Clinician-trainable-per-client AI ("teach your agent") → moved to Later/research.** This is the *highest-liability, lowest-maturity* idea in the document: per-client customization of a clinical AI multiplies the red-team surface, DPIA complexity, and "the AI said something harmful that the clinician 'trained'" liability. **Behind a working, guardrailed base agent. (C1.)** **H / H · Later (research)**
- **Watch-outs:** liability gravity (never let efficiency erode the approval gate); don't overclaim clinically (decision-*support*, not diagnosis); consent fatigue (make Art.9 consent a valued exchange); **don't quote borrowed efficacy stats as your own (C5).**

## Marketing / GTM & Growth

- **Reposition as "Connected Care OS"; name the category** — stop selling against SimplePractice on features you'll lose on. **H / L · P1**
- **"Powered by Bondable" badge on every client touchpoint** (reminders, intake, journaling emails) — free two-sided virality seeding the finder's demand side. **H / L · P1**
- **NL localization as a launch event** + deep-teal/mint rebrand relaunch beat. **H / M · P1**
- **"Mutualiteit reimbursement" SEO tool + "Am I reimbursed?" checker** — own the SERP Belgians actually search; captures clients, signals BE-system fluency. **H / M · P1**
- **Provider directory pages as SEO landing pages** (`bondable.be/[stad]/[naam]`) — retention perk + seeds finder supply + long-tail ranking, pre-marketplace. **H / M · P1**
- **Founder-led "supervised, not autonomous" thought leadership** + capture stranded AI-therapy refugees — a once-a-decade narrative gift (post WOPR/Nevada/Woebot collapse). **H / L · P1**
- **"Switch in a weekend" migration concierge + comparison pages** — removes the #1 incumbent lock-in (data inertia). **H / M · P1**
- **Provider→provider referral program** (sidesteps dichotomieverbod entirely) — cold-start supply accelerant. **H / L · P1**
- **PLG self-serve onboarding with AI setup** — signup → first client messaged in <10 min. **H / M · P1**
- **Cold-start sequencer: single-player → concierge → city-by-city network flip** — launch one city (Gent/Leuven) to liquidity first, not nationwide. **H / H · P1**
- **Trilingual SEO engine structured around journeys** (wachtlijst, terugbetaling, coach vs psycholoog, burn-out) — the only channel that compounds pre-marketplace. **H / H · P1**
- **Federation tracks** — ICF/EMCC (coaching, commission-legal monetization lab) vs VVKP/BFP (therapy, referral-neutral). **H / M · P1**
- **Evidence-led PR — your own numbers, not borrowed ones.** Reframe all external benchmarks ("industry evidence suggests 25–40% no-show reduction…") and commit to publishing *your* measured outcomes. For a health product, overclaiming is reputationally fatal. The −40% no-show figure is a pre-existing Bondable claim; treat capacity/no-show industry stats as evidence to *test*, not promise. **(C5.)** **H / M · P1**
- **GP/huisarts referral rail + university pipeline + employer/EAP channel** — Belgium-native front doors; concentrated demand. **H / M–H · P2**
- **Outcomes data → thought-leadership flywheel** ("Benelux Mental Health Index", waitlist-transparency map) — earned media + payer ammunition, downstream of the evidence program (Top-12 #7). **H / M · P2**

## Monetization

- **Reprice in EUR, anchor to the Belgian wallet** ("€25/mo = less than half a session"); rename tiers (Starter / Practice / Studio); drop the empty $100 tier as a launch SKU. **M / L · P1**
- **Gate on capability, not client-count; switch the axis to per-clinician seats** — never tax the moat (more clients = richer profiles = smarter AI). **H / L · P1**
- **Default to annual (2 months free — the 10/12 ratio is already coded)** + founder lifetime-locked pricing for first 100 practices + 14-day no-card reverse trial of the top tier. **M / L · P1**
- **Multi-currency/locale billing from day one** — EUR + Bancontact/iDEAL/SEPA + BTW/TVA, with medical-VAT-exemption handling. Wrong local payment methods = silent conversion killer. **H / M · P1**
- **Stripe Connect take-rate ("bill your client through Bondable") → resequenced to NEXT.** Becoming a payment facilitator for *healthcare* invoices adds KYC, money-flow, VAT-on-medical-exemption, and PSD2 complexity on top of an already-overloaded "Now." **Get basic EUR + Bancontact/SEPA subscription billing working first; Connect is a "Next." Park it in ONE place, not two. (C4.)** **H / M · P2**
- **AI Care Agent as the flagship premium tier** — price per-active-client-on-agent or flat top tier to protect LLM COGS; sell the supervision, not just the AI. **H / H · P2 (post-gates)**
- **Finder two-rail model encoded in the schema** (`is_regulated`, currently absent): therapy = subscription/visibility/verification (referral-neutral); coaching = pay-per-lead/commission (gated on G2(d)). The single make-or-break design decision. **H / H · P1 (schema) / P2 (monetize)**
- **Pay-per-lead credit-pack economy on the coaching side** — highest-intent revenue, where aggressive marketplace economics are legal (subject to G2(d)). **H / H · P2**
- **"Bondable Certified" verified-profile recurring SKU** — legal on both tracks (certification, not referral); doubles as marketplace quality control. **M / M · P2**
- **B2B2C employer/EAP lane (PEPM)** — 10–50× solo-therapist ARPU; brings clients in bulk; doesn't touch dichotomieverbod. Needs the **group/org model** (see Top-12 #12). **H / H · P2**
- **Keep the portable profile free** (supply magnet; GDPR Art.20 export can't be paywalled) — architect a future consumer-premium layer for optionality. **M / M · P3**
- **Moonshot: mHealthBELGIUM M3 reimbursement** — agent becomes free-to-patient, paid-by-RIZIV; multi-year CE-marking/evidence commitment (ties directly to the evidence program, Top-12 #7), but architect data capture now. **H / H · Later**

## Moat & Differentiation

- **Client-owned, portable, signed care profile** — data follows the *patient*, not the practice. Network effects accrue to the patient-owned record; Bondable is its home. Inverts the industry. **H / H · P1 (architecture) / Next (ship)**
- **Trust through radical erasure, not just export.** Art.17 "delete everything, and prove it's gone" is harder, more emotionally important, and the thing US incumbents structurally cannot offer — and the playbook previously under-indexed it. Make a verifiable **deletion certificate** the visceral trust act. **Reconcile against mandatory Belgian clinical-record retention (see L4): "what we must keep, what we delete, and why."** **H / M · P1**
- **Supervised, plan-tethered AI agent** as the *only legal* model post-2025 collapse — beat Limbic on plan-tethering + the owned profile. **H / H · Next**
- **A defensible *matching science*, not "AI does the intake."** SonderMind's 20-variable match → ~50% higher retention. The free AI conversation is an *input*, not a model. Treat match quality as a measured, evaluated, improving, *published* metric. The real flywheel: outcomes dataset → match quality → outcomes. Name the matching model as a first-class product. **H / H · P2**
- **Therapeutic-alliance measurement as the north-star metric.** The single best predictor of MH outcomes is the *therapeutic alliance* — and no competitor measures/optimizes for it directly. ORS/SRS is in the MBC engine; *promote alliance to the headline metric* and tune the agent, matching, and continuity around protecting it. The most genuinely differentiated clinical position available, and nobody owns it. **H / M · P2**
- **Clinician outcomes benchmarking, handled ethically.** "Am I as effective as my peers — privately, constructively?" is a craving no incumbent serves. Done wrong it's surveillance; done right (private, normed, improvement-oriented) it's the stickiest clinician feature imaginable and the engine of quality. **A named pillar with an explicit ethics guardrail**, not a buried "Later" line. **H / H · P2**
- **Referral-neutral finder, marketed as neutrality** ("we don't sell your therapist match") — turns dichotomieverbod into a regulator-and-client trust weapon; ranking parameters disclosed (EU P2B Reg. 2019/1150); match audit log. **H / M · P1**
- **Convert install base into finder supply (OpenTable move)** — a US entrant starts at zero Belgian supply + zero local compliance. **H / M · P1**
- **Trust Center: EU data-residency + sub-processor transparency + one-click GDPR export + granular revocable consent ledger.** *(Ships only after G1 — see C2: don't market security maturity you don't yet have.)* **M–H / L–M · P1 (post-G1)**
- **"Compliance-done-for-you" provider onboarding** (auto privacy notice, consent flows, processing register) — turns GDPR fear into a reason to switch. **H / M · P1**
- **Independent data-governance board + published charter.** *(This replaces the vague "Patagonia of mental-health data" framing — C2. Concrete governance teeth, not vibes.)* **M / M · P2**
- **Verified provider credentials** (RIZIV/INAMI/visa-number registry; eIDAS-ready) — a claim US "list-anyone" directories cannot make. **H / M · P2**
- **Internationalization as architecture, not a moonshot.** To be "best in the *world*" (not "best in Benelux"), locale/legal/payment/crisis-line/credential-registry must be **config**, FHIR-native storage from day one, with a per-country compliance template. **Cheap if done early, near-impossible to retrofit. Either commit to the abstraction now, or honestly admit the ceiling is Benelux. (A13.)** **H / M · P1 (as a principle)**
- **Proprietary Benelux outcomes dataset** (privacy-preserving, consented) — better matching, clinician benchmarking, reimbursement evidence; Flatiron-style compounding moat. Downstream of the evidence program. **H / H · P2**
- **World-class clinician UX (the "Superhuman/Linear bar")** — craft as defensibility in a market of ugly, slow incumbents. **H / H · P2**
- **Moonshots:** EHDS-native mental-health record standard · EU "care passport" credential · pan-EU compliance-template expansion (each country = a config file).

---

## Sequenced Roadmap

### ⛔ GATE 0 (start immediately, blocks NEXT) — the safety/legal/consent foundation
G1 close CRITICAL edge-function auth + book pen-test · G2 commission legal opinions (MDR class, AI-Act tier, Art.9 basis, coaching commission) · G3 crisis-safety stack + Clinical Safety Officer + after-hours SLA + hazard log + kill-switch · G4 decide EU-private LLM hosting · G5 decide minors/guardian scope (default: out).

### NOW (0–3 months) — make the moat legible, seed the data, fund the rest
*(The honest "Now" is narrower than before: safety + market-entry + clinician-love + data seed. Growth, design depth, Connect, the agent itself, the finder, and the recommender are **not** here — they're Next/Later.)*
**Foundation & compliance:** AI transparency badge · two-channel crisis classifier + pinned, **cached/offline** BE/NL crisis lines · guardrail "constitution" v0 · Trust Center + one-click GDPR export + **verifiable erasure** + consent-ledger v0 (**after G1**) · compliance-done-for-you onboarding · `is_regulated` flag added to schema.
**EU-native brand/locale:** NL (Flemish-native) localization launch · deep-teal/mint token rebrand · **"Client Calm" mode shipped properly** · WCAG 2.2 AA sweep · non-judgmental microcopy + tone lint.
**Clinician love + data seed:** AI scribe with clean attestation provenance (NL/FR, EU-private) · pre-session brief · journal sentiment tagging · MBC engine (PHQ-9/GAD-7/WHO-5/ORS-SRS) with **rules-based deterioration alerts** · clinician supervision dashboard v0 · **evidence program kickoff** (advisory board + academic partner + pre-registered protocol).
**Habit foundation:** "open-every-morning" client home · daily mood check-in · smart 2-way reminders (WhatsApp logistics-only).
**Monetization rails:** EUR + Bancontact/iDEAL/SEPA + VAT (medical-exemption) · gate-on-capability + per-seat · default-annual + founding cohort + reverse trial.

### NEXT (3–9 months) — turn on the flywheel (post-gates)
**The spine:** Living Treatment Plan → Programs/Journeys engine.
**The agent, supervised:** Care Agent "Bond" + full Supervision Console + between-session engagement engine. *(Deterioration → rules now; model only once data exists.)*
**The structural moat:** client-owned portable profile (export → consent ledger → cross-provider grant/revoke) + verifiable erasure reconciled to retention + verified provider credentials + continuity-of-care handoff.
**The finder:** referral-neutral two-rail finder (`is_regulated`) → convert install base into supply → one-city-to-liquidity (Gent/Leuven) → coaching pay-per-lead sandbox (post-G2(d)).
**Monetization depth:** Stripe Connect take-rate (resequenced here, not Now) · AI agent premium tier.
**Brand depth:** "Clinician Dense" mode build-out · calm-night dark mode · therapeutic data-viz · Storybook + visual regression.
**GTM depth:** trilingual journey-based SEO engine · ICF/EMCC + VVKP/BFP federation tracks · first mutualiteit pilot.
**Interop, named:** scope eHealthBox / Recip-e / FHIR-ingest coexistence.

### LATER (9+ months) — make it structural
Outcomes dataset + Benelux Mental Health Index/waitlist map · outcome-informed matching as a *measured* model · therapeutic-alliance as north-star · ethical clinician benchmarking · ⚖️ treatment recommender (post MDR/AI-Act gate) · 🔬 clinician-trainable-per-client AI (research) · **group-practice/org model + supervision hierarchies** · employer/EAP (PEPM) + mutualiteit/payer + GP referral rail · Belgian eHealth/eID + eHealthBox read/write · world-class clinician-UX polish.
**Generational bets:** mHealthBELGIUM M3 reimbursement · EHDS-native record standard · EU care-passport credential · value-based/outcomes pricing · pan-EU compliance-template expansion · independent data-governance charter.

---

## Belgium / EU legal reality — what's settled, and the soft spots to harden

The thesis correctly centers: supervised-AI-only (post WOPR/Nevada collapse), Art.50 transparency (live 2 Aug 2026), dichotomieverbod-by-design via `is_regulated`, the take-rate go/no-go, P2B ranking disclosure, and Art.9 consent. Remaining soft spots, now elevated to gates or named risks:

- **L1 · AI Act *risk classification* is unstated and must be decided (→ G2).** A plan-tethered clinical care agent is plausibly **high-risk** (Annex III / MDR-adjacent), not merely an Art.50 transparency case. High-risk means conformity assessment, risk management, logging, documented human oversight — a far heavier lift. **Get it classified in writing before the agent gets a date.**
- **L2 · `dichotomieverbod` is necessary but not sufficient (→ G2(d)).** Belgian psychologists' (Psychologencommissie) and physicians' (Orde der Artsen) codes govern fee-splitting, advertising, and independence more broadly. Coaches touching clinical-adjacent content can still trip advertising/health-claim rules. **Get a Belgian healthcare lawyer's sign-off on the *coaching* commission too**, not just the therapy side.
- **L3 · Cross-border data within "EU-private" needs specificity (→ G4).** If the agent/scribe calls a US-headquartered model (even on EU infra), you have an Art.9 + Schrems/transfer question. **Model-hosting is a gating compliance choice, load-bearing for the entire "compliance is the brand" claim.**
- **L4 · Data/records-retention policy is missing.** Belgian healthcare records have *legal minimum retention periods* that can *conflict* with Art.17 erasure. The best platform has a crisp answer to "what we must keep, what we delete, and why" — reconcile this with the radical-erasure moat above.
- **MDR question (→ G2(a)).** A clinical claim pulls the app under MDR (CE mark + conformity assessment; FAGG/FAMHP → mHealthBELGIUM M1) and, via AI Act Art.6(1), makes the AI high-risk by default. Staying "wellness/support" + supervised avoids both — but the *plan-tethered agent and the recommender* must be classified explicitly.

---

## Cuts, downgrades & corrections (what changed from the prior draft, and why)

- **C1 · "Teach your agent" (per-client trainable AI):** P1 → **Later/research.** Highest-liability, lowest-maturity idea; behind a guardrailed base agent.
- **C2 · "Patagonia of mental-health data" framing:** **cut** → replaced with a concrete **independent data-governance board + published charter.**
- **C3 · "WhatsApp-first":** **downgraded** → WhatsApp for **logistics only** (confirm/reschedule), never Art.9 clinical content; clear data-flow boundary. As written it contradicted the compliance-as-moat thesis.
- **C4 · Stripe Connect take-rate:** **Now → Next**, and de-duplicated (it was parked in two places). Basic EUR/Bancontact/SEPA subscription billing first.
- **C5 · Borrowed stats (−40% no-shows, 25–40% capacity):** **reframed** as "industry evidence suggests" + commit to measuring your own. Overclaiming is reputationally fatal for a health product.
- **C6 · "Risk-stratified model" / "longitudinal model":** **downgraded** to rules-based *alerts* now; *model* later once 12–18 months of labeled outcomes exist. Don't call a rules engine a model.
- **C7 · Treatment recommender:** **tagged ⚖️ MDR/AI-Act-review-required** before it appears even at P2.
- **C8 · Two-mode design system as a P1/H-effort flagship:** **demoted** — ship "Client Calm" first; "Clinician Dense" follows. Don't let design ambition crowd the safety/compliance "Now."

---

## Quick Wins (do this week)
1. **Reserve mint for AI surfaces only** + ship the "AI · supervised by [clinician]" badge component (compliance as visual language). **H / L**
2. **Pin BE/NL crisis resources, and make them cached/offline-reachable** (1813 / 113 / Tele-Onthaal 106 / 112), always one tap. **M / L**
3. **Microcopy + tone-lint pass** on client-facing strings; centralize for i18n. **H / L**
4. **Skeletons replace spinners**; one inviting `<EmptyState>` pattern. **M / L**
5. **Reprice the page to EUR**, default the annual toggle, point "Most Popular" at the AI tier, kill the empty $100 tier (fix `src/components/PricingSection.tsx`, still USD-stubbed). **M / L**
6. **"Powered by Bondable" footer** on every client-facing message/email/intake. **H / L**
7. **Provider→provider referral** ("invite a colleague, both get 2 months"). **H / L**
8. **WCAG 2.2 mechanical wins** — target sizes ≥24px, fix focus-obscured, enable password-manager autocomplete + OTP paste, `prefers-reduced-motion` in the token layer. **H / L**
9. **Founder LinkedIn manifesto:** "Autonomous AI therapy is illegal and unsafe; supervised AI is the only future." **H / L**
10. **Start the NL extraction** — audit hardcoded strings, pseudo-localize to catch layout breaks. **H / L (kickoff)**
11. **Add the `is_regulated` flag to the Drizzle schema** — it's the make-or-break finder design decision and it's **not in `src/server/db/schema.ts` today.** Cheap now, painful to retrofit. **H / L**
12. **Open the auth-gap tickets + draft the legal-opinion brief (G1, G2).** The two things that unblock every date downstream. **H / L (kickoff)**

---

## Internal Backlog — the gating security & compliance debt (from the audits)

> 📌 Prior founder decision (2026-06-15) deferred legal/security work as "do it later." **This playbook revises that posture for the safety-critical subset:** G1 (auth) and G3 (crisis safety) are reclassified as *blocking gates*, because shipping AI or a Trust Center on top of them is a liability amplifier, not a deferred nicety.

**🔴 Security — CRITICAL (G1, gate everything):**
- Edge functions lack JWT/role verification — `ai-chat`, `get-secret`, `get-client-data`, `send-*-notification`, `cleanup-pending-client` (several run with the service-role key). Verify caller JWT + ownership at the top of every function.
- `get-secret` returns any env var with no auth → require admin JWT + whitelist.
- Twilio webhook signature check non-blocking + fuzzy phone match + no active-relationship check → mandatory 403 on fail; exact E.164; verify active relationship.
- Role escalation via signup metadata; no UPDATE policy on `profiles.role` → ignore role from metadata; block non-admin role updates.
- `ai_settings` readable by any authenticated user → restrict SELECT to admin.
- Google Calendar refresh token stored plaintext → encrypt (Vault).
- **Book a pen-test before any Trust Center copy ships.**

**🟠 GDPR machinery — MISSING (build alongside the agent, ship erasure/export/consent before real-data EU launch):** consent management (Art.7) · data export (Art.20) · erasure (Art.17, with retention reconciliation per L4) · right-to-object · wire the unused `audit_logs` with retention/immutability · DPIA + Supabase/Neon DPA + DPO.

**🟡 Architecture/code health (interleave with the feature that touches the files):** consolidate duplicate service layer · migrate custom `CacheManager` → React Query · split god-files (`Profile.tsx` 1319 LOC, etc.) · enable TS strictness phased · add Vitest + CI gates (currently deploy-only, 0 tests) · canonicalize generated Supabase types · wrap realtime subscriptions in hooks.

---

*Concrete codebase hooks:* tokens in `src/index.css` + `tailwind.config.ts`; components in `src/components/ui/`; pricing placeholder still USD-stubbed at `src/components/PricingSection.tsx` (lines ~13–14); **`is_regulated` flag NOT yet present** in `src/server/db/schema.ts` (the playbook's make-or-break design decision, currently unbuilt); evidence base in `docs/superpowers/specs/2026-06-15-bondable-overhaul-discovery.md`.

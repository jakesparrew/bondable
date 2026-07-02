# 09 — Compliance Gate (deferred, load-bearing)

**Status:** intentionally deferred by owner decision ("legal and security later") — but referenced by 04 (erasure/retention, supervision consent) and 08 (consent/DPA prose), so the items live here with owners and a clear gate. **Nothing in Phases 1–3 is blocked. Phase 4.5 real-user launch is blocked until every item below is ✅.**

Bondable processes GDPR **Art. 9 special-category (health) data**. That is the lens for everything here.

## 1. Consent inventory (explicit, granular, revocable — UI ships in Phase 3, wording is legal-reviewable)
| Consent | Where captured | Ticket |
|---|---|---|
| Account + care relationship (Art. 9 processing basis) | `/welcome/client` consent screen | T-OA-4 |
| Bond activation incl. supervision + safety override (per R17: named provider, flags always visible, audited transcript access) | Bond first-run | T-CX-8 / T-PX-26 |
| Journal entry sharing (per entry) | Journal | shipped, review wording |
| Weekly summary sharing (per summary, client previews) | Bond summary card | T-CX-17 |
| Prep-note visibility | Session prep | T-CX-6 |
| Consent & Data Center (view/revoke everything, one place) | `/dashboard/client/data` | T-CX-4 |
| Marketing email (opt-in only; zero health content in any client email) | welcome flows + prefs | T-OA-9 |

## 2. Erasure vs clinical retention — matrix needing LEGAL REVIEW (flagged in 04)
The tension: GDPR Art. 17 erasure vs Belgian clinical record-keeping duties for regulated providers (patiëntendossier retention — commonly cited as 30 years for clinical psychologists under WUG-adjacent rules; **verify with counsel, do not assert in product copy**).
- Proposed v1 policy (to be confirmed): client-authored content (journal, check-ins, Bond messages) = erasable on request; provider clinical notes about a client = retention-bound for regulated providers, erasure request logged + client informed of the legal basis; coach notes (non-regulated) = erasable.
- `gdpr_requests` queue (T-OC-14) auto-sets the 30-day response deadline and records the applied matrix row per artifact.

## 3. Processor / DPA inventory (sign before Phase 4.5)
Neon (EU region), Vercel (fra1), Resend (EU sending domain), Stripe, **Anthropic (Bond LLM — zero-retention/no-training config + DPA)**, Sentry (EU), PostHog EU (only if adopted per R12), FCM (push — metadata only, no health content in payloads, ever).

## 4. Technical safeguards (built in Phase 4, verified at gate)
- App-layer AES-256-GCM encryption of clinical free text (T-AB-16: journal, notes, recaps, check-in notes, Bond bodies, intake free-text).
- AuthZ policy layer as RLS-equivalent, unit-tested matrix (T-AB-7); server-enforced entitlements (T-AB-14).
- Append-only audit logs: note reads/amendments (T-PX-3), Bond transcript access (R17), impersonation (T-OC-13), admin case actions (T-OC-6).
- Data export: client-facing (T-CX-4) and admin GDPR bundle (T-OC-14) share one serializer.
- No health data in: analytics events (R12 registry is typed to prevent it), push payloads, email subject lines, logs.

## 5. The gate checklist (Phase 4.5 exit)
- [ ] Counsel review: consent wording (§1), retention matrix (§2), privacy policy + `/how-ranking-works` claims
- [ ] All DPAs signed (§3); Anthropic zero-retention confirmed in writing
- [ ] §4 safeguards implemented + spot-audited (encryption keys in Vercel env, key rotation documented)
- [ ] DPIA drafted (Art. 35 — required: large-scale Art. 9 processing + AI component)
- [ ] Crisis-flow legal posture confirmed (duty-of-care vs privacy, R17/R18 wording)
- [ ] Breach-response runbook (72h notification path) written into 07's ops routines

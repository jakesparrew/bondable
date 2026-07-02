# 02 — Provider Generalization: from "therapist" to a credible multi-vertical provider model

Bondable today hardcodes a single provider archetype — "therapist" — into its role enum (`user_role` in `src/server/db/schema.ts:48`), its routes (`/dashboard/therapist/*`), 156 source files, its NL copy ("therapeut" ×33 in `src/locales/nl.json`), and its relationship tables (`client_therapist_relationships`). The finder already sells a broader promise ("erkende hulpverleners en coaches") that the product model can't deliver. This plan generalizes the provider side into a typed taxonomy (psychologists, orthopedagogues, psychotherapists, coaches, counselors in v1), adds group practices with owner/manager/staff roles and seat management, introduces a credential-verification pipeline that makes `is_regulated` an *earned, derived* property instead of a self-declared boolean, and does the full internal rename NOW — while the backend is still a mock and the Neon cutover (Phase 4) hasn't baked "therapist" into a real database. Clinical credibility is preserved by one rule applied everywhere: **the more specific the label, the better** — a client sees "je psycholoog An", never a generic "provider", and a coach is never dressed up as a clinician.

---

## Decisions

1. **Full internal rename to `provider`, done in Phase 1 — not an alias layer.**
   Rationale: we are pre-production with a mock in-memory backend; tasks #13–15 (Neon auth/API cutover) are still pending. This is the cheapest moment in the product's entire life to rename the role enum, the relationship tables, and the routes. An alias layer ("keep `therapist` internally, show `provider` in UI") is permanent debt: every future engineer, every Drizzle migration, every API contract carries the lie.
   Tradeoff accepted: a large mechanical churn now (~156 files, `mockClient.ts` seed keys, 12+ service files) and a week of rename tickets before feature work. We take it because Phase 4 makes it 10× more expensive.

2. **v1 taxonomy = five talk-based professions; medical professions deferred.**
   `provider_type` enum v1: `clinical_psychologist`, `clinical_orthopedagogue`, `psychotherapist`, `coach`, `counselor`. Deferred to v2+: `psychiatrist` (physician — needs RIZIV billing, prescriptions, eHealth integration we don't have), `sexologist`, `dietitian`, `speech_therapist` (logopedist), plus `other` as an escape hatch added now but hidden from the finder until reviewed.
   Rationale: v1 types all fit the product's existing session/homework/journal/Bond loop with zero medical machinery. Belgian WUG law (klinische psychologie & orthopedagogiek are regulated health professions since 2016, requiring a *visum* from FOD Volksgezondheid) gives us a crisp regulated/unregulated line inside this set.
   Tradeoff: we say "not yet" to psychiatrists and paramedical professions — some group practices will have members we can't onboard fully (they can join a practice as staff with an `other` type, unlisted in the finder).

3. **`is_regulated` becomes derived, never user-set: `f(provider_type, verification_status)`.**
   `profiles.is_regulated` stays as a stored column (the finder/dichotomieverbod invariant lives there today and 20+ call sites read it), but it is written ONLY by the service layer: `true` iff `provider_type` is a regulated type (`clinical_psychologist`, `clinical_orthopedagogue`, `psychotherapist`*) AND `verification_status = 'verified'`. An unverified psychologist displays as "verificatie in behandeling" and gets NO erkend badge — treated like a coach for badging until credentials clear. (*Psychotherapy in Belgium may only be practiced by WUG professionals; a `psychotherapist` must supply a base-profession credential to verify.)
   Tradeoff: a real psychologist has a worse badge for a few days after signup. Acceptable — the alternative (self-declared regulation) is a legal and trust liability.

4. **Naming rule: specific > generic; NL generic = "hulpverlener", EN generic = "provider"; "therapeut" is retired as the generic term.**
   User-facing copy always prefers the concrete type label ("Je psycholoog An Verhaeghe" / "Your coach Jef Peeters"). Where the type is unknown or plural-mixed: NL "hulpverlener(s)" (already the finder's word), EN "provider(s)". "Therapeut" survives only as the label for `psychotherapist`. Implemented via a `providerLabel(type, lang, {possessive})` helper + `provider_types.*` i18n keys — no more hardcoded "therapist" strings.
   Tradeoff: "provider" in EN is slightly clinical-administrative; we accept it because "practitioner" is wrong for coaches and per-type labels do the warm work anyway.

5. **Routes: `/dashboard/therapist/*` → `/dashboard/pro/*`, with permanent client-side redirects.**
   `pro` is short, type-neutral, and reads well in NL and EN. The generic `:userType` routes in `src/App.tsx` accept `pro`. Legacy `/dashboard/therapist/*` URLs `<Navigate replace>` to their `pro` twin for one release, then die (no real users, no external links yet).
   Tradeoff: "pro" is informal for clinicians; mitigated because the URL is not brand copy — the sidebar and headers carry the specific labels.

6. **Practices are an organizational layer; care relationships stay person-to-person.**
   New `practices` + `practice_members` (roles `owner` | `manager` | `staff`) + `practice_invites` tables. A client is ALWAYS connected to an individual provider (renamed `care_relationships` table), never "to the practice" — this keeps Bond supervision, notes ownership, and GDPR responsibility attached to a named human. The practice adds: shared lead inbox (finder requests routed to the practice can be claimed/assigned), practice-wide calendar (busy/free of members), seat management, and a practice page in the finder listing its members.
   Tradeoff: no "pool the client, anyone answers" model in v1 — some group practices work that way for intake. We support it only at the *lead* stage (unassigned leads claimable by staff), not after a care relationship exists.

7. **Managers see operations, never clinical content.**
   Owner/manager visibility: member list, seat usage, session *counts* and load, unassigned finder leads, aggregate response times, billing. NOT visible: session notes, journal shares, messages, intake answers, Bond transcripts of any member's clients. A treating provider can explicitly share a specific note/case for supervision (`shared_for_supervision` flag per note, logged in `audit_logs`), which is a deliberate act, not a manager right. GDPR Art. 9 forbids "the boss can read everything" by design, and clinicians will not adopt a tool that leaks their notes to a practice owner.
   Tradeoff: managers who are also clinical supervisors must ask per-case. Correct default; supervision workflows can deepen later.

8. **Verification = credential records reviewed by the owner cockpit; badges are transparency, never rank.**
   New `provider_credentials` table (visum number, erkenningsnummer, diplomas, coach certificates + file upload). Admin review queue lives in the owner cockpit (see `07-owner-superadmin.md`). Resulting badges: **"Erkend hulpverlener"** (verified regulated), **"Geverifieerd coach"** (coach with ≥1 verified certificate), no badge otherwise. Ranking/matching in `finderService.ts` never reads verification or payment tier — the existing dichotomieverbod invariant extends unchanged.
   Tradeoff: manual review doesn't scale; fine at Belgium-launch volume, and the cockpit ticket includes a CSV/API check assist for the FOD visum register later.

9. **Free / Pro / Practice tiers hang off this model.**
   Individual providers: Free, Pro. Group practices: Practice tier (per-seat). Practice features (shared leads, practice finder page, manager dashboard) are Practice-tier gated — workflow features, never visibility (P2B-safe). Pricing mechanics belong to the billing plan (`06-business-tiers.md` or equivalent); this plan defines *what* is gated.
   Tradeoff: solo providers can't buy practice features à la carte; keeps the tier story simple.

---

## Spec

### A. Taxonomy & type metadata (single source of truth)

New file `src/lib/providerTypes.ts`:

```ts
export type ProviderType =
  | 'clinical_psychologist' | 'clinical_orthopedagogue' | 'psychotherapist'
  | 'coach' | 'counselor' | 'other';

export const PROVIDER_TYPE_META: Record<ProviderType, {
  regulated: boolean;              // eligible for erkend badge (still needs verification)
  credentialKinds: CredentialKind[]; // what verification asks for
  finderListed: boolean;           // 'other' = false in v1
  bondSupervisionCopy: 'clinical' | 'coaching'; // Bond framing variant
}> = {
  clinical_psychologist:  { regulated: true,  credentialKinds: ['visum','erkenningsnummer'], finderListed: true,  bondSupervisionCopy: 'clinical' },
  clinical_orthopedagogue:{ regulated: true,  credentialKinds: ['visum','erkenningsnummer'], finderListed: true,  bondSupervisionCopy: 'clinical' },
  psychotherapist:        { regulated: true,  credentialKinds: ['base_profession','psychotherapy_training'], finderListed: true, bondSupervisionCopy: 'clinical' },
  coach:                  { regulated: false, credentialKinds: ['certificate'], finderListed: true,  bondSupervisionCopy: 'coaching' },
  counselor:              { regulated: false, credentialKinds: ['certificate','diploma'], finderListed: true, bondSupervisionCopy: 'coaching' },
  other:                  { regulated: false, credentialKinds: ['certificate'], finderListed: false, bondSupervisionCopy: 'coaching' },
};
```

Label helper (used by every surface; kills hardcoded "therapist"):

```ts
providerLabel(type, t, { form: 'generic' | 'specific', possessive?: boolean })
// NL: psycholoog / orthopedagoog / psychotherapeut / coach / begeleider / hulpverlener
// EN: psychologist / educational psychologist / psychotherapist / coach / counselor / provider
```

### B. Data model — Drizzle changes (`src/server/db/schema.ts`)

```ts
// RENAMES (pre-Neon, so these are schema-source edits + regenerated migration, no data migration)
export const userRole = pgEnum('user_role', ['provider', 'client', 'admin']);   // was 'therapist'
// client_therapist_relationships → care_relationships; therapist_id → provider_id
// (same rename on conversations, sessions, tasks, clientCheckins, clients(legacy): therapistId → providerId)

// NEW enums
export const providerType = pgEnum('provider_type',
  ['clinical_psychologist','clinical_orthopedagogue','psychotherapist','coach','counselor','other']);
export const verificationStatus = pgEnum('verification_status',
  ['unverified','pending','verified','rejected']);
export const practiceRole = pgEnum('practice_role', ['owner','manager','staff']);
export const credentialKind = pgEnum('credential_kind',
  ['visum','erkenningsnummer','base_profession','psychotherapy_training','diploma','certificate']);

// provider_profiles: ADD columns
providerType: providerType('provider_type').notNull().default('coach'),
verificationStatus: verificationStatus('verification_status').notNull().default('unverified'),
practiceId: uuid('practice_id').references(() => practices.id, { onDelete: 'set null' }),

// NEW tables
export const practices = pgTable('practices', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),            // finder URL /find/practice/:slug
  city: text('city'), country: text('country').default('BE'),
  bio: text('bio'), photoUrl: text('photo_url'),
  seatLimit: integer('seat_limit').notNull().default(3),   // Practice tier controls this
  isPublished: boolean('is_published').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => profiles.id),
  createdAt/updatedAt ...
});
export const practiceMembers = pgTable('practice_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  practiceId: uuid('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role: practiceRole('role').notNull().default('staff'),
  status: text('status').notNull().default('active'),      // active | suspended
  joinedAt ...,
}, uniq(practiceId, profileId));
export const practiceInvites = pgTable('practice_invites', {
  id, practiceId FK, email, role: practiceRole default 'staff',
  token: text('token').notNull(), expiresAt, acceptedAt, invitedBy FK profiles,
});
export const providerCredentials = pgTable('provider_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  kind: credentialKind('kind').notNull(),
  reference: text('reference'),            // visum nr / erkenningsnummer / cert id
  issuer: text('issuer'),                  // FOD Volksgezondheid, VVKP, ICF, ...
  fileUrl: text('file_url'),
  status: verificationStatus('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => profiles.id),
  reviewedAt: timestamp(...), reviewNote: text('review_note'),
  createdAt ...
});
// provider_requests: ADD practiceId uuid nullable + assignedTo uuid nullable
//   (a finder lead can target a practice; staff claim it → assignedTo set)
```

`is_regulated` derivation lives in one service function `recomputeRegulated(providerId)` called on provider_type change and on credential review — mock now, DB trigger at Neon cutover.

### C. The rename — migration checklist (every line = part of a ticket)

Role & auth: `src/server/db/schema.ts` (enum + relation names), `src/hooks/api/useAuthManager.tsx` (`UserRole` union, `setDemoRole`, localStorage normalizer: stored `'therapist'` reads as `'provider'`), `src/components/RouteProtection.tsx`.
Routes (16 files reference `dashboard/therapist`): `src/App.tsx` (route defs + `<Navigate>` redirects), `src/pages/Home.tsx` (demo-entry buttons), `src/pages/AddClient.tsx`, `ClientProfile.tsx`, `IntakeTemplates.tsx`, `IntakeTemplateBuilder.tsx`, `Onboarding.tsx`, `ProviderPublicProfileEdit.tsx`, `Tasks.tsx`, `src/components/dashboard/{ActiveClientsTable,ClinicalQueue,QuickActions,TherapistDashboardContent}.tsx`, `src/components/dialogs/EditClientDialog.tsx`, `src/components/tables/ClientsTable.tsx`.
Pages renamed: `TherapistDashboard.tsx` → `ProDashboard.tsx`; `Therapists.tsx` (client side) → `MyProviders.tsx` (route `/dashboard/client/providers`, redirect from `/therapists`); `components/dashboard/TherapistDashboardContent.tsx` → `ProDashboardContent.tsx`; `components/dashboard/therapist/` dir → `pro/`; `dialogs/JoinTherapistDialog.tsx` → `JoinProviderDialog.tsx`.
Services renamed: `therapistService.ts` → `providerService.ts`, `therapistClientService.ts` → `providerClientService.ts`, `clientTherapistService.ts` + `optimized/clientTherapistService.ts` → `careRelationshipService.ts`, plus therapist-keyed fields inside `clientService, dashboardService, intakeService, inviteCodeService, adminService, finderService, sessionNotificationService, sharedJournalService, lastSessionUtil, clientInvitationService` and `src/integrations/supabase/mockClient.ts` seed keys (`therapist_id` → `provider_id`, table key `client_therapist_relationships` → `care_relationships`).
i18n: `src/locales/{en,nl,fr,es}.json` — replace `therapist*` keys with `provider*` keys + new `provider_types.*` namespace; NL sweep of 33 "therapeut" occurrences (keep only for the psychotherapist type label).
Verification gate: `grep -ri therapist src/` returns 0 hits outside `providerTypes.ts` comments and the legacy-redirect lines.

### D. Onboarding & profile surfaces per type

- **Provider self-onboarding** (extends `Onboarding.tsx`, REBUILD recommended — current page is single-archetype): step 1 asks "Wat doe je?" with the five type cards; regulated types get a credential step (visum/erkenningsnummer + upload), coaches/counselors get an optional certificate step with honest copy. Submitting sets `verification_status='pending'` and shows the state on their public-profile editor.
  NL: "Ben je klinisch psycholoog, orthopedagoog of psychotherapeut? Dan vragen we je visum- of erkenningsnummer. Zo weten cliënten zeker met wie ze praten." / EN: "Clinical psychologist, orthopedagogue or psychotherapist? We'll ask for your visa or registration number, so clients know exactly who they're talking to."
- **`ProviderPublicProfileEdit.tsx`**: replace the read-only regulated badge block (line ~460) with a verification panel: current status, credential list, "Dien in ter verificatie" CTA, and the derived badge preview. provider_type shown, changeable only while `unverified` (afterwards via support — prevents badge laundering).
- **Client-facing** `MyProviders.tsx`: each connected provider card shows type label + badge; join dialog copy generalized.

### E. Group practices — surfaces

- `/dashboard/pro/practice` (new page `src/pages/PracticeSettings.tsx`): create practice (name, city, bio) → creator becomes `owner`. Tabs: Members (list, roles, seat usage "4 van 6 zitplaatsen gebruikt"), Invites (email + role; reuses the invite-token pattern from `clientInvitationService.ts` / `/invite/:token` — new route `/practice-invite/:token`), Practice profile (finder listing, publish toggle), Billing pointer.
- **Manager dashboard** `/dashboard/pro/practice/overview` (Practice tier): member load (clients per member, sessions this week), unassigned lead queue, response-time aggregate. NO clinical content — the API layer simply never exposes notes/messages/journals across profiles, this is not a UI filter.
  NL empty state: "Nog geen aanvragen voor jullie praktijk. Zodra jullie praktijkpagina online staat, komen aanvragen hier binnen." / EN: "No requests for your practice yet. Once your practice page is live, requests land here."
- **Lead routing**: `ProviderLeads` component gains a practice tab; unassigned practice leads are claimable ("Neem op" / "Claim") → sets `assignedTo`, notifies the client-side requester with the specific person's name and type.
- **Shared calendar**: practice view over existing Calendar page — members as busy/free lanes; event details only for your own events. (Depends on calendar work in `04-provider-features.md`.)
- **Staff invitation emails** are specced in `03-onboarding-activation.md`; this plan owns the token/roles model they ride on.

### F. Finder, Bond, and intake adaptation

- **Finder** (`Find.tsx`, `FinderFilters.tsx`, `ProviderCard.tsx`, `MatchResultCard.tsx`, `finderService.ts`): add provider_type facet ("Psycholoog / Psychotherapeut / Coach / Begeleider"); cards show the type label above the fit line; badges per Decision 8. `FindMatch` fit logic gains a type-appropriateness rule: clinically-flavored answers (trauma, diagnosis, medication, eetstoornis) constrain results to regulated types with the transparent explanation NL: "Je vraag klinkt klinisch — we tonen enkel erkende hulpverleners." / EN: "Your question sounds clinical — we're only showing regulated providers." Payment/tier remains absent from ranking inputs (unchanged invariant).
- **Practice pages**: `/find/practice/:slug` lists members with their own fit data; the practice page itself is never ranked above individuals — it's reachable from member cards ("Deel van Praktijk De Brug").
- **Bond supervision framing** (`src/components/bond/BondChat.tsx`, `BondCompanionCard`): copy variant per `bondSupervisionCopy`. Clinical: NL "Bond werkt onder toezicht van je psycholoog An." Coaching: NL "Bond ondersteunt je traject met coach Jef. Bond is geen therapie." / EN: "Bond supports your track with coach Jef. Bond is not therapy." Crisis guardrail (already 26 patterns, BE/NL lines 1813/113) is IDENTICAL for all types; for coaching-supervised clients the post-crisis follow-up additionally suggests finding a regulated provider via the finder.
- **Intake** (`IntakeTemplates.tsx`, `intakeService.ts`): seed template presets per provider_type (clinical intake incl. risk questions vs coaching intake incl. goals/werk-context); template library filtered by the provider's type with "toon alles" override.

---

## Tickets

T-PG-1 | Provider type taxonomy module | Create `src/lib/providerTypes.ts` (ProviderType, PROVIDER_TYPE_META, providerLabel helper) + `provider_types.*` i18n keys in all 4 locales (NL: psycholoog/orthopedagoog/psychotherapeut/coach/begeleider/hulpverlener) | Meta table drives regulated/finderListed/bond copy; providerLabel returns correct NL+EN forms incl. possessive | S | n.a. | 1

T-PG-2 | Schema: provider_type, verification, practices | Extend `src/server/db/schema.ts`: new enums (provider_type, verification_status, practice_role, credential_kind), provider_profiles columns (providerType, verificationStatus, practiceId), new tables practices/practice_members/practice_invites/provider_credentials, provider_requests + practiceId/assignedTo; regenerate Drizzle migration | Migration compiles; relations exported; is_regulated documented as derived-only | M | n.a. | 1

T-PG-3 | Rename role enum + auth types therapist→provider | `schema.ts` user_role enum, `useAuthManager.tsx` (UserRole union, setDemoRole, normalize legacy localStorage 'therapist'→'provider'), `RouteProtection.tsx` | Demo role switch works with old stored value; typecheck clean; no 'therapist' in role types | S | n.a. | 1

T-PG-4 | Rename routes /dashboard/therapist→/dashboard/pro | `src/App.tsx` route defs + `<Navigate replace>` legacy redirects; update the 16 files linking to dashboard/therapist (Home, AddClient, ClientProfile, IntakeTemplates, IntakeTemplateBuilder, Onboarding, ProviderPublicProfileEdit, Tasks, dashboard components, EditClientDialog, ClientsTable) | All pro pages reachable at /dashboard/pro/*; old URLs redirect; demo-entry buttons work | M | n.a. | 1

T-PG-5 | Rename pages/components/services (mechanical sweep) | TherapistDashboard→ProDashboard, TherapistDashboardContent→ProDashboardContent, dashboard/therapist dir→pro, Therapists.tsx→MyProviders.tsx (route /dashboard/client/providers + redirect), JoinTherapistDialog→JoinProviderDialog; services: therapistService→providerService, therapistClientService→providerClientService, clientTherapistService(+optimized)→careRelationshipService; mockClient.ts keys therapist_id→provider_id, client_therapist_relationships→care_relationships; schema relation renames | `grep -ri therapist src/` → 0 hits outside providerTypes.ts comments + redirect lines; app boots in all 3 demo roles | L | n.a. | 1

T-PG-6 | i18n copy sweep: therapeut→type-specific/hulpverlener | Replace therapist* keys with provider* keys in en/nl/fr/es.json; NL sweep of 33 "therapeut" occurrences; wire providerLabel into ClientKpis, BondChat personalization, MyProviders, Sessions/SessionDetail name lines | Client dashboard says "Je psycholoog An" for typed providers, "je hulpverlener" fallback; fr/es parity keys added | M | n.a. | 1

T-PG-7 | Derived is_regulated service | `recomputeRegulated(providerId)` in providerService: profiles.is_regulated = META[type].regulated && verificationStatus==='verified'; called on type change + credential review; remove any direct is_regulated writes | Unverified psychologist shows no erkend badge; verifying flips badge without manual flag edit; finder rank unaffected | S | n.a. | 1

T-PG-8 | Provider onboarding rebuild: type choice + credentials | REBUILD `src/pages/Onboarding.tsx` provider path: type cards step, credential step per META.credentialKinds (visum/erkenningsnummer inputs + file upload → provider_credentials rows, status pending), honest NL/EN microcopy | Choosing coach skips visum step; regulated types can't finish without credential entry (skip = stays unverified with clear consequence copy) | M | Free | 2

T-PG-9 | Verification panel on ProviderPublicProfileEdit | Replace read-only regulated badge block (~line 460) with verification status panel: credential list, submit CTA, badge preview, "in behandeling" state; provider_type locked after verification | Status renders all 4 states; badge preview matches finder badge exactly | M | Free | 2

T-PG-10 | Admin credential review queue hooks | providerCredentials review API (approve/reject + note → recomputeRegulated) + minimal queue UI in AdminProviders.tsx (pending tab, doc preview, approve/reject); full cockpit UX per 07-owner-superadmin.md | Approve flips badge end-to-end in mock; audit_logs row written per decision | M | n.a. | 2

T-PG-11 | Finder: provider_type facet + badges + type-aware match | FinderFilters type facet; ProviderCard/MatchResultCard type label + 3-state badge (Erkend hulpverlener / Geverifieerde coach / none); finderService filter + FindMatch clinical-constraint rule with transparent explanation copy | Filtering by type works; clinical-flavored match query returns regulated-only with explanation; ranking inputs unchanged (no tier/payment/verification weight) | M | Free | 3

T-PG-12 | Practice entity + settings page | `src/pages/PracticeSettings.tsx` at /dashboard/pro/practice: create practice (creator=owner), members tab w/ roles + seat usage, practice profile tab w/ publish toggle; practiceService | Owner can create, edit, publish; seatLimit enforced on member count; staff see read-only membership | L | Practice | 3

T-PG-13 | Staff invitation flow | practice_invites token flow: owner/manager invites by email+role; /practice-invite/:token accept page (reuse InviteAccept pattern); accepted → practice_members row + provider profile bootstrap; email template content per 03-onboarding-activation.md | Invite→accept→member appears with correct role; expired token shows friendly NL/EN error; seat limit blocks over-invite | M | Practice | 3

T-PG-14 | Practice leads: routing, claim, assignment | provider_requests.practiceId + assignedTo; ProviderLeads practice tab with unassigned queue + "Neem op"/"Claim"; claim notifies requester with claimer's name+type | Practice lead claimable once; assignment visible to owner/manager; individual leads unchanged | M | Practice | 3

T-PG-15 | Manager overview (ops-only) | /dashboard/pro/practice/overview: member load (client counts, sessions/week), unassigned leads, response-time aggregate; API layer exposes zero clinical content cross-profile (enforced in services, not UI) | Manager sees counts only; attempting note/message fetch for another member's client returns nothing; owner sees billing pointer | L | Practice | 3

T-PG-16 | Supervision note-sharing (explicit, consented) | shared_for_supervision flag per session note/recap + share dialog naming the recipient; audit_logs entry; recipient sees shared items in a dedicated "Supervisie" list | Share is per-item + revocable; manager role alone grants no access; audit trail complete | M | Pro | 4

T-PG-17 | Bond supervision copy per provider type | BondChat + BondCompanionCard consume bondSupervisionCopy: clinical vs coaching framing (NL+EN); coaching variant adds "Bond is geen therapie" line + post-crisis finder suggestion for regulated help | Client of a coach sees coaching frame; crisis guardrail behavior identical across types | S | Free | 3

T-PG-18 | Intake template presets per provider type | Seed clinical + coaching template presets in intakeService; IntakeTemplates filters library by provider's type with "toon alles" toggle | New psychologist sees clinical preset first; coach sees goals-based preset; existing custom templates untouched | S | Pro | 3

T-PG-19 | Practice page in finder | /find/practice/:slug public page listing members (each with own fit/badge); member cards link "Deel van Praktijk X"; practice never ranked above individuals | Practice page renders from slug; unpublished practice 404s; ranking of individuals unchanged | M | Practice | 4

---

## Dependencies & risks

**Cross-domain dependencies**
- `01-design-language.md`: badge visual system (erkend/geverifieerd/none), type-label typography on cards — T-PG-9/11 consume its tokens; sequence design tokens first within Phase 1.
- `03-onboarding-activation.md`: owns the onboarding email content + first-run tours; T-PG-8 (in-app type/credential flow) and T-PG-13 (staff invite tokens) are its substrate. Staff & manager onboarding emails ride the practice_invites token.
- `04-provider-features.md` / `05-client-features.md`: practice shared calendar and the "today view" build on practices tables (T-PG-12); MyProviders rename (T-PG-5) touches client surfaces they extend.
- `06` (business/tiers/billing plan): Practice tier seatLimit + gating of T-PG-12/13/14/15/19; Stripe per-seat billing must read practice_members count.
- `07-owner-superadmin.md`: credential review queue UX, verification SLAs, moderation of practice pages — T-PG-10 provides the hooks it consumes.
- Neon migration (tasks #13–15): the rename tickets T-PG-2..5 MUST land before the real Drizzle migration runs against Neon, or we rename a live database later.

**Top risks**
1. **Rename blast radius** (T-PG-5, 156 files): mechanical but easy to half-finish; mitigate with the grep-zero acceptance gate and doing it in one focused PR series before any Phase 2+ feature branches fork off.
2. **Legal accuracy of the taxonomy**: WUG/visum rules for psychotherapy practice have edge cases (grandfathered practitioners, orthopedagogue scope). Have a Belgian health-law check before public launch of verification copy; keep PROVIDER_TYPE_META as the single point of change.
3. **Badge-before-verification gap**: real clinicians onboarding pre-cockpit (T-PG-10) sit unverified; if review lags, credible providers look bad. Mitigate: cockpit queue ships in Phase 2, and "verificatie in behandeling" copy is respectful, not warning-flavored.
4. **Manager-privacy regression risk**: a future convenience feature ("let the manager reply to a member's messages") would breach Decision 7; encode the boundary in the service layer + an audit-log test, not in component props.
5. **Coach positioning drift**: marketing pressure to blur coach/clinician distinction would violate the dichotomieverbod transparency stance; the derived is_regulated (T-PG-7) makes blurring technically hard — keep it that way.

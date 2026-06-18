# Bondable — Project Overview & State

**Updated:** 2026-06-18 · **Read this first.** Single source of truth for what Bondable is, where the code stands, and what's next. Companion docs linked in §15.

---

## 1. What Bondable is
Bondable (by Sidestream; founder Gaetan Jansseune) is a **Belgium/Benelux-first "connected care operating system" for mental health**. Today the shipped product is a **B2B practice-management tool** for therapists & coaches. The strategy is to grow it into the platform that connects client and provider for life — *human where it must, AI where it can*.

## 2. The vision — 4 layers + flywheel
No competitor combines all four; this is the "white space":
1. **Practice tool** — *have it* (clients, sessions, tasks, messaging, journaling, intake, calendar, payments).
2. **Client-facing AI care agent** — 24/7, tied to the treatment plan, **supervised by the clinician**, crisis-safe. (Not autonomous — that's the only legal model.)
3. **Therapist & coach finder** — matchmaking marketplace; the growth engine.
4. **Client-owned, portable, GDPR-first profile** — client controls sharing; continuity of care.

**Flywheel:** more clients → more providers → better matches → richer profiles → smarter AI → better outcomes → more clients.

## 3. Market & positioning (condensed — full analysis in the discovery doc)
- TAM digital mental health ~$80bn; AI-in-mental-health ~24% CAGR. Belgium: ~9.5M adults, >15k psychologists, large private-pay segment alongside limited RIZIV reimbursement.
- Competitors are **siloed**: SimplePractice/Jane (practice tool), Headway/Grow/Alma (tool + US-insurance finder), Wysa/Woebot/Limbic (AI agent), BloomUp/NiceDay/Minddistrict (EU tools). **None do all four layers; none own a client-owned portable profile.**
- The 2025–26 market killed *autonomous* AI therapists (legal/liability); **clinician-supervised** AI is the surviving model. Spring Health bought Alma to chase "lifelong" continuity — Bondable's client-owned profile is the EU-native, client-owned version of that.

## 4. Business model
Clients **free**, therapists **pay**. SaaS tiers (Free → €25 → €55/mo; AI agent as a premium tier) + **pay-per-lead** + **finder commission**.
> ⚖️ Belgium constraint: the **dichotomieverbod** restricts paying commission for referrals to *regulated clinicians* (psychologists/psychotherapists). Coaching side is flexible. Therapy-side referral economics must be referral-neutral (flat/listing/client-pay) — confirm with a BE lawyer.

## 5. Current product — what works today
Roles: **therapist / client / admin**. Implemented & working (verified in the demo):
- Therapist & client **dashboards** (stats + activity feed)
- **Clients** + therapist↔client relationships, invite codes
- **Sessions** (upcoming/history, scheduling, detail), **Calendar** (Google sync)
- **Tasks** (assign/track, statuses, priorities)
- **Messaging** (in-app + SMS/WhatsApp via a Twilio edge function)
- **Journaling** (client) with selective sharing to therapist
- **Intake forms** (questionnaire templates → questions → client responses; assign + view)
- **Payments** (scaffold), **Notifications/Push** (Firebase + Capacitor)
- **AI chat** scaffold (therapist-facing, OpenAI, admin-configurable) — *not* the client agent yet
- i18n **EN / FR / ES** (NL missing — Benelux-blocking), mobile via Capacitor (iOS/Android)

## 6. Tech stack & architecture
- **Frontend:** React 18 + **Vite 5** + TypeScript (strict mode OFF) + Tailwind + **shadcn/Radix**; React Query; react-router-dom; date-fns; recharts; mapbox-gl; i18next. ~295 TS/TSX files.
- **Mobile:** Capacitor 7 (iOS/Android), Firebase messaging, local notifications.
- **Dev server:** Vite on **port 8080** (`npm run dev`). (README's 5173 is stale.)
- **Data layer:** still **Supabase-shaped** — 14 files import the Supabase client (`supabase.from(...)`, realtime, edge functions, storage). This is the layer being migrated.

## 7. Backend state & the Neon migration (where we are)
- **Original backend = Supabase** (Postgres + Auth + RLS + Realtime + Edge Functions + Storage). The **Supabase project was deleted** → the app has no live backend.
- **Decision:** migrate the DB to **Neon** (serverless Postgres, eu-central-1 Frankfurt) + **Neon Auth** (JWT/JWKS, OIDC-style — Auth URL + JWKS URL).
- **Done:** clean **Drizzle schema** (`src/server/db/schema.ts`, 23 tables + `user_role` enum + relations), Neon client (`src/server/db/index.ts`), `drizzle.config.ts`, and paste-ready SQL: **`drizzle/0000_init.sql`** (tables) + **`drizzle/0001_seed.sql`** (demo data). **The Neon DB has been built** (user ran the SQL).
- **Not done (the real work):** the app still talks to Supabase. A browser can't hit Postgres directly → need a **backend API layer** (Vercel functions via Drizzle) + rewrite the ~14 data-using files + wire **Neon Auth** + re-home RLS/RPCs/triggers + realtime + storage + functions. See `drizzle.config.ts` notes and the migration-notes doc.

## 8. Demo / explore mode (run the app WITHOUT a backend)
A **dev-only mock backend** lets you run/click the whole app with seeded data:
- `src/integrations/supabase/mockClient.ts` — in-memory mock of the Supabase client (seeded: 6 profiles, clients, sessions, tasks, messages, journals, notifications).
- `useAuthManager.tsx` — login bypass (mock signed-in user).
- Gated by flags; **stripped from real production builds unless explicitly enabled**:
  - **Local dev:** set `VITE_DEV_BYPASS_AUTH=therapist` (or `client`/`admin`) in `.env.local`, run `npm run dev`, open `http://localhost:8080/dashboard/therapist`.
  - **Shareable deploy:** set `VITE_DEMO_MODE=true` (Vercel env var) → the demo runs in a production build (verified: builds clean).
- ⚠️ Demo data is in-memory (edits don't persist). It's for *seeing/showing* the app, not real use.

## 9. Repo, hosting & infra
- **GitHub:** `github.com/jakesparrew/bondable` — pushed as **one clean squashed commit** (inherited history dropped to remove a leaked Mapbox secret). Full prior history preserved on the **`atfbcs-old`** remote (`atfbcs/bondable-app`) and the local **`backup-full-history`** branch.
- **Vercel:** new project (connect the GitHub repo; set `VITE_DEMO_MODE=true` for a live demo). `vercel.json` = SPA rewrite only.
- **Neon:** eu-central-1, DB built; **Neon Auth** enabled.
- Secrets live in gitignored **`.env.local`** (Neon `DATABASE_URL`, Stripe test keys, Neon Auth URLs). `.env.example` documents them.

## 10. Migration status
| Item | Status |
|---|---|
| Neon data foundation (Drizzle schema + client + SQL) | ✅ done |
| Neon DB built (tables + seed) | ✅ done (user ran SQL) |
| Dev/demo explore mode | ✅ done |
| Repo on GitHub + clean history | ✅ done |
| Auth → Neon Auth | ⏳ pending |
| API/data layer + replace `supabase.from` calls | ⏳ pending (the big one) |
| Realtime, storage, edge functions → Vercel | ⏳ pending |
| Stripe payments (server-side) | ⏳ pending |
| Rebrand + Dutch + IA (the "overhaul" Phase 0) | ⏳ pending |
| The 3 new pillars (agent, finder, profile) | ⏳ future |

## 11. Key decisions log
- **Keep the app, don't rebuild from scratch** — it's a working, feature-rich product; rewrites are the classic time-sink. Refactor the foundation underneath instead.
- **Neon** for the DB (founder's call: cheaper to scale; Supabase free tier pauses). **Neon Auth** for login.
- **Demo/mock mode** to make the app runnable/shareable during the migration.
- **Squashed history** into the new repo (clean start + drops the leaked Mapbox secret).
- **Belgium-first**, EU/GDPR-native, **supervised-AI-only**.

## 12. Known issues & must-fix
- 🔐 **Rotate the leaked Mapbox secret token** (was hardcoded in old `MapPreview.tsx`; lives in the old `atfbcs` history).
- 🔐 Security patterns from the Supabase era (edge functions lacked JWT/role checks; role-escalation via signup metadata) — the **new API layer must enforce auth/ownership** properly.
- 🟠 **No GDPR machinery** (consent / export / erasure / audit) — required pre-launch.
- 🟡 Tech debt: **duplicate service layer** (`services/api` vs `services/api/optimized`), **TS strictness off**, **no tests**, **god-files** (Profile.tsx 1319 LOC, etc.), custom cache vs React Query.
- 🟡 **Dutch (nl) locale missing**; ~1,500 hardcoded hex colors make the rebrand real work.

## 13. Legal & compliance (Belgium/EU) — deferred, but mandatory pre-launch
- **Supervised AI only.** A licensed clinician stays the responsible treater; the AI does triage/psychoeducation/between-session support. Autonomous AI therapy = unlawful practice (criminal).
- **No "treat/diagnose" claims** → avoids MDR medical-device + high-risk AI status. Position as "support."
- **GDPR Art. 9**: explicit consent + DPIA; **AI Act Art. 50** "this is AI" transparency (live 2 Aug 2026).
- **Crisis escalation** hard-wired to humans + BE/NL lines (Zelfmoordlijn 1813, Tele-Onthaal 106, 113 NL, 112).
- **Dichotomieverbod**: therapy-side referral commission is restricted (coaching flexible). Full detail + lawyer questions in the migration/legal section of the discovery doc.

## 14. How to run it
```powershell
# Dev (explorable demo, no backend needed):
#   ensure .env.local has VITE_DEV_BYPASS_AUTH=therapist
npm run dev               # → http://localhost:8080/dashboard/therapist

# Build the Neon database (one-time, in the Neon web SQL editor):
#   paste & run drizzle/0000_init.sql, then drizzle/0001_seed.sql

# Production demo build:
#   set VITE_DEMO_MODE=true (e.g. in Vercel env vars) → npm run build
```

## 15. Related docs & memory
- `docs/superpowers/specs/2026-06-15-bondable-overhaul-discovery.md` — competitor teardown, 50+ feature menu, internal audit, Belgium legal (§5).
- `docs/superpowers/specs/2026-06-15-neon-migration-notes.md` — RLS/RPC re-home inventory + migration layers.
- `docs/2026-06-18-bondable-improvement-playbook.md` — the "best in the world" improvement playbook *(generated separately)*.
- Memory: `bondable-strategic-vision`, `bondable-known-issues`, `bondable-infra-stack`, `working-style-gaetan`.

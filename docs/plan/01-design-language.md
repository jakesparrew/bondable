# 01 — Design Language: "Flemish Clinical Warm"

Bondable's bones are good — a disciplined teal/mint token system already lives in `src/index.css` — but the app reads as default-shadcn because nothing above the token layer has an opinion: system font stack (no typeface is loaded anywhere in the app; only a dead mockup in `docs/design/dashboard-action.html` imports Plus Jakarta), one radius (1rem) on everything, shadow-on-every-card, stock empty states, and stock sonner toasts. This plan defines a typography-led, border-first, editorially spaced visual language — "Flemish Clinical Warm" — that keeps 100% of the teal/mint brand equity while replacing the template grammar underneath it: a characterful serif for display, a quiet humanist sans for UI, a three-tier radius scale, elevation reserved for overlays, a continuous-line "bond" illustration motif, and a monetization grammar that looks like premium stationery rather than a paywall. Mint stays strictly AI-only — and we fix the one place today's tokens already violate that rule (`--ring`).

## Decisions

1. **Typography pairing: Fraunces (display serif) + Instrument Sans (UI), self-hosted via @fontsource.** Rationale: Fraunces' optical-size axis gives warm, slightly wonky old-style forms at display sizes (human, editorial, unmistakably not-a-template) while Instrument Sans is a humanist grotesque that reads calm and European without the "every-AI-app-uses-Inter" fingerprint. Both are OFL, variable, and available as `@fontsource-variable/*` packages — zero licensing or CDN/GDPR issues (self-hosted, no Google Fonts request). Tradeoff accepted: ~90KB extra woff2 payload and Fraunces requires discipline (display-only) or it turns twee; we enforce via a `font-display` Tailwind utility used only at h1/h2/stat-value level.
2. **Border-first elevation; shadows reserved for overlays.** Cards at rest = white + 1px `--border`, no shadow. Shadow tokens exist only for floating layers (popover, dropdown, dialog, toast) and a single hover-raise on interactive cards. Rationale: the soft-shadow-on-everything look is the single biggest "AI-generated" tell; borders on the existing `#dbe8e6` line read as considered print design. Tradeoff: slightly less "depth" on dense dashboards — compensated by spacing rhythm and section flattening (Decision 4).
3. **Three-tier radius scale replaces the single 1rem.** `--radius-ctl: 0.5rem` (inputs, buttons, badges), `--radius-card: 0.875rem` (cards, dialogs), `--radius-hero: 1.25rem` (marketing/Bond surfaces only). Rationale: uniform rounded-2xl is cookie-cutter; differentiated radii create recognizable rhythm and make controls feel more precise. Tradeoff: touching `tailwind.config.ts` radius mapping means a visual diff on nearly every screen — acceptable because it's Phase 1 and pre-production.
4. **Flat sections on dashboards; cards only for actionable objects.** A card is earned by being clickable, dismissible, or a discrete record (a session, a lead, a journal entry). KPI groups, page sections, and filters become flat regions separated by whitespace + a serif section heading — no card-in-card nesting. Tradeoff: requires REBUILD of stat-card rows and some dashboard groupings rather than restyling.
5. **Mint stays AI-only, enforced — including fixing `--ring`.** Today `--ring: 162 72% 42%` (mint) paints every focus ring app-wide, quietly diluting the reservation. Ring becomes teal; mint gains its own `--ring-ai` used only inside Bond/matcher surfaces. Semantic success gets a distinct deep green (hue 152, darker/duller than mint) so success states never read as AI. Tradeoff: success-green vs mint proximity demands a contrast-checked pairing; specified below with exact HSL.
6. **Motion is functional and tiny: 3 durations, 1 easing family, everything respects `prefers-reduced-motion`.** 120ms micro / 200ms standard / 320ms overlay, `cubic-bezier(0.2, 0, 0, 1)` out-expo feel. One signature motion only: the Bond "breathing" dot and the continuous-line draw-in on empty states. Tradeoff: no scroll-triggered theatrics on the homepage — deliberate; healthcare brands earn trust through stillness.
7. **Illustration = one continuous line ("the bond"), photography = duotone real-Belgium, icons = Lucide at 1.5px stroke, 20px grid, no filled variants.** No 3D blobs, no isometric people, no stock AI art. Tradeoff: custom line artwork for ~8 empty states is real design labor (specs provided so it can be drawn as SVG in-code); duotone photography needs 5–6 licensed photos of actual Flemish/Benelux settings.
8. **Monetization grammar: "quiet keyline" — Pro features are visible, rendered real, and marked with a hairline ink chip; never blurred screenshots, never gradient badges, never modal interrupts.** Rationale: in a health context, aggressive paywalls destroy trust and can look like care-gating; showing the real (non-functional) UI with a calm label converts on comprehension. Tradeoff: lower short-term nudge aggressiveness; the monetization plan's nudge system must live within these rails.
9. **Voice: warm professional Flemish — "je/jij", concrete, zero exclamation marks in product UI, crisis screens switch to short imperative sentences.** Tradeoff: "je" (not "u") is a real brand choice; slightly informal for some 60+ clinicians, but consistent with a companion product and modern Flemish health communication (cf. Fit in je Hoofd).
10. **REBUILD verdicts are explicit:** stat/KPI cards (REBUILD), empty states (REBUILD as a system), toasts (REBUILD on sonner theme API), Tasks table mobile presentation (REBUILD to card list), badges (REBUILD variant system). Sidebar, dialogs, Bond chat, finder cards are RETOUCH.

---

## 1. Typography system

**Install:** `npm i @fontsource-variable/fraunces @fontsource-variable/instrument-sans`; import both in `src/main.tsx`. Map in `tailwind.config.ts`:

```ts
fontFamily: {
  sans: ['"Instrument Sans Variable"', 'system-ui', 'sans-serif'],
  display: ['"Fraunces Variable"', 'Georgia', 'serif'],
}
```

Fraunces settings: use high optical size (`font-variation-settings: "opsz" 72, "SOFT" 50, "WONK" 0`) via a `.font-display` base layer rule in `src/index.css`; weight 560 for headings (not 700 — bolder Fraunces gets heavy fast).

**Type scale (rem / line-height / family / weight / usage):**

| Token | Size/LH | Face | Use |
|---|---|---|---|
| display-xl | 3.0/1.05 | Fraunces 560 | Homepage hero, marketing only |
| display-lg | 2.25/1.1 | Fraunces 560 | Page h1 (dashboard page titles) |
| display-md | 1.5/1.2 | Fraunces 540 | Section headings, dialog titles, stat values |
| title | 1.125/1.35 | Instrument 600 | Card titles, table headers, nav groups |
| body | 0.9375/1.55 | Instrument 450 | Default UI text (15px — calmer than 16 in dense dashboards) |
| body-sm | 0.8125/1.5 | Instrument 450 | Meta, timestamps, helper text |
| label | 0.75/1.3 | Instrument 550, tracking +0.04em, uppercase optional | Badges, column labels, "PRO" chips |
| numeric | inherits | Instrument, `font-variant-numeric: tabular-nums` | All stats, tables, times |

Rules: Fraunces never below 1.25rem and never in tables, forms, chat bubbles, or toasts. Bond chat is 100% Instrument (the AI does not get the editorial voice — the brand does). Letter-spacing on Fraunces display: -0.01em.

**Files:** `src/main.tsx` (imports), `tailwind.config.ts` (fontFamily + fontSize scale), `src/index.css` (`@layer base` h1–h3 defaults + `.font-display` variation settings), then sweep `text-2xl font-bold`-style ad-hoc classes in page headers to the new scale.

## 2. Color tokens — exact updates to `src/index.css`

Keep: `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--accent`, `--border`, `--sidebar-*`, `--mint` exactly as-is (brand equity). Change/add in `:root` (light; mirror dark block with lifted lightness):

```css
/* CHANGED */
--ring: 174 50% 30%;               /* teal focus ring — mint ring was leaking AI color app-wide */
--radius: 0.875rem;                /* card tier; see radius scale below */

/* NEW — semantic status (soft = tinted surface, on = text/icon on soft) */
--success: 152 42% 33%;            /* deep sage green ~#316b52 — distinct hue+value from mint */
--success-soft: 150 35% 93%;
--warning: 36 84% 40%;             /* burnt amber ~#bc7a0f, AA on white */
--warning-soft: 40 78% 93%;
--info: 206 45% 38%;               /* slate blue ~#35618d — used sparingly (system notices) */
--info-soft: 208 40% 94%;
--destructive-soft: 0 65% 96%;

/* NEW — AI-only (Bond, matcher, admin flagged-chat surfaces) */
--ring-ai: 162 72% 42%;
--mint-soft: 160 55% 93%;          /* AI surface tint; replaces ad-hoc mint/10 opacities */

/* NEW — elevation + radius scale */
--radius-ctl: 0.5rem;
--radius-hero: 1.25rem;
--shadow-overlay: 0 12px 32px -8px hsl(174 62% 16% / 0.14), 0 2px 8px hsl(174 62% 16% / 0.06);
--shadow-raise: 0 4px 14px -4px hsl(174 62% 16% / 0.10);   /* hover-only on interactive cards */
```

Expose in `tailwind.config.ts` (`success`, `success-soft`, `warning`, `warning-soft`, `info`, `info-soft`, `mint-soft`, `boxShadow: { overlay, raise }`, `borderRadius: { ctl, card: 'var(--radius)', hero }`). Enforcement rule for reviewers: any `bg-mint*`, `text-mint*`, `ring-ai` class outside `src/components/bond/`, `src/pages/BondChat.tsx`, FindMatch matcher components, and admin flagged-Bond views is a build-review failure. `is_regulated` badge uses teal outline (trust = brand color), never mint, never gold.

Dark mode exists in tokens but the brand is LIGHT-ONLY today — keep the dark block updated for parity but do not ship a toggle in Phase 1.

## 3. Spacing, grid, elevation, radius rhythm

- Base unit 4px; components use the 8-point ladder: 8/12/16/20/24/32/48/64.
- **Page frame:** dashboard content `max-w-[1120px]`, px-6 (mobile px-4), page title block = display-lg + body-sm subtitle, 32px below title, 48px between flat sections. Marketing/public pages `max-w-[1200px]`, 96px section spacing.
- **Card anatomy:** padding 20px (dense lists) or 24px (feature cards); 1px `border-border`; `radius-card`; NO shadow at rest. Interactive cards: `hover:shadow-raise hover:border-primary/20 transition-shadow duration-200`.
- **Flat section:** heading (display-md) + optional right-aligned action, content directly on `--background`. Used for: KPI rows, quick actions, filters, settings groups.
- **Overlay layers only** get `shadow-overlay`: dialog, popover, dropdown, toast, command menu.
- **Dividers:** prefer 24–32px whitespace over `<Separator>`; hairlines only inside tables and list rows.
- Density rule: tables row-height 48px, list rows 56px, touch targets ≥44px on Capacitor.

## 4. Motion principles

- Durations: 120ms (hover, toggle, checkbox), 200ms (card raise, tab switch, accordion), 320ms (dialog/sheet enter, page-level empty-state line draw). Exits are 0.75× their enters.
- Easing: `--ease-out: cubic-bezier(0.2, 0, 0, 1)`; `--ease-in-out: cubic-bezier(0.45, 0, 0.15, 1)` for moves. No bounce, no spring on clinical surfaces.
- Enter pattern: fade + 4px rise (`opacity 0→1, translateY 4px→0`, 200ms) for cards appearing after loading; stagger max 40ms across max 6 items.
- Signature moments (only two): (a) Bond presence — a 2px mint dot with 3.2s ease-in-out scale 1→1.15 "breath" on the Bond card and chat header; (b) empty-state line motif draws in via `stroke-dashoffset` 600ms once.
- `@media (prefers-reduced-motion: reduce)`: kill all transform/opacity transitions and both signatures (dot static, line pre-drawn) via a global rule in `src/index.css`.
- Skeletons: use existing `skeleton.tsx` but with `--muted` pulse at 1.6s; never spinners for content loads (spinners only inside buttons).

## 5. Illustration, photography, iconography

- **Motif — "the bond line":** one continuous 1.5px line (stroke `currentColor` at `text-primary/40`) that loops once (a soft knot — two paths meeting) — drawn as inline SVG components in a new `src/components/illustration/` folder. Variants: `LineMeet` (two lines converge — matching/finder), `LineLoop` (journal/reflection), `LineSteps` (tasks/progress), `LineWave` (calm/Bond — this one only may use mint stroke), `LineBranch` (practice/team). Sizes 96–160px. These are code-drawable (a designer or Opus writes the paths), no image assets needed.
- **Empty-state artwork spec:** motif (top, 120px) + display-md Fraunces one-liner + body-sm explanation + single primary action. Never an emoji, never a gray circle icon-in-circle.
- **Photography (public homepage + finder only):** real Benelux settings — a Gentse rijwoning practice room, Antwerp street at cargo-bike hour, a Leuven consultation corner. Duotone treatment: shadows → `#0f403c`, highlights → `#f4f8f7` (CSS `filter: grayscale(1)` + teal multiply overlay, or pre-processed). No faces in hero images (privacy tone); hands, rooms, streets. Never inside dashboards.
- **Iconography:** Lucide only, `strokeWidth={1.5}`, sizes 16/20 (never 24 inside cards). No two-tone, no filled. Sparkles icon is Bond-reserved. Kill any icon-in-tinted-circle pattern except the 5 quick-action tiles, which become the ONLY place a tinted circle is allowed (brand consistency through scarcity).

## 6. Component redesign list (worst offenders)

| Component | Verdict | Before → After |
|---|---|---|
| Stat/KPI cards (`src/components/dashboard/client/*`, therapist `DashboardKpis`) | **REBUILD** | 4 bordered cards each with icon-circle + label + number → one flat KPI strip: tabular Fraunces display-md numbers, Instrument label-caps above, hairline dividers between items, whole strip on background (no cards). Delta indicators use success/warning tokens. |
| Empty states (all pages) | **REBUILD** (new `src/components/ui/empty-state.tsx`) | Random per-page "No X found" text → single `<EmptyState motif variant title action>` consuming the line-motif spec; used by Tasks, Messages, Journal, Sessions, Leads, Finder no-results. |
| Toasts (`sonner.tsx`, `toast.tsx`) | **REBUILD theme** | Default sonner white pill → ink surface (`#0f403c` bg, white text, radius-ctl, shadow-overlay, 3.5s, bottom-left desktop / top mobile); success shows sage check, destructive stays red-on-ink. Standardize on sonner; delete the parallel Radix `toast.tsx`/`toaster.tsx` path (two toast systems today). |
| Tables (`src/pages/Tasks.tsx`, table.tsx) | **REBUILD mobile / retouch desktop** | Horizontal-scroll all-columns mobile → below `md:` render row-cards (title, status badge, due, one action); desktop: 48px rows, label-caps header row on background (not card), first column medium weight, actions revealed on row hover. |
| Badges (`badge.tsx`) | **REBUILD variants** | Default filled shadcn pills → outline-first system: `status` (soft bg + on-color text: success-soft/warning-soft/info-soft/destructive-soft), `trust` (teal outline — is_regulated "Erkend hulpverlener"), `ai` (mint-soft, Bond only), `pro` (see §7). Radius-ctl, label type style, never uppercase for statuses. |
| Dialogs (`dialog.tsx` + Task/Session dialogs) | Retouch | rounded-2xl + centered everything → radius-card, Fraunces display-md title left-aligned, 24px padding, footer actions right with quiet `ghost` cancel; destructive confirms restate the object name ("Verwijder taak 'Ademhalingsoefening'?"). |
| Sidebar (`sidebar.tsx` + app nav) | Retouch | Fine base (deep-teal is distinctive) → add label-caps group headers, active item = `--sidebar-accent` pill radius-ctl + 2px mint left rule ONLY on the Bond nav item (AI marker), 20px icons, tighten to 40px item height, workspace/practice switcher slot at top for group practices (design now, per provider-generalization plan). |
| Quick-action tiles (client dashboard) | Retouch | 5 equal tinted tiles → Bond tile visually distinct (mint-soft bg + breath dot), other 4 white bordered; tile label body weight 550, icon 20px in the single allowed tinted circle. |
| Session cards + inline loop (PreSessionNudge/Recap/AllianceCheck in `Sessions.tsx`) | Retouch | Stacked dense inline blocks → loop items become a single quiet slot under the card (one at a time by priority), compact prop on mobile; statuses use new badge system. |
| Finder cards (`Find.tsx`, ProviderProfilePublic) | Retouch | Standard listing card → editorial card: provider name in Fraunces title-size, specialty line, trust badge, availability dot (success token), fit-explanation sentence in body-sm italic. No photos in results grid until real photos exist (initials avatar in teal). |
| Homepage `Home.tsx` | **REBUILD hero** | Current CTA layout → typography-led hero: Fraunces display-xl on canvas, one duotone photo band, The Coach entry framed with mint-soft + supervised-by-human line; demo-entry panel restyled as a quiet dev-only strip (kept per demo-entry memory). |
| Login (`Login.tsx`) | Retouch | Centered card on canvas → split: left 40% ink panel with LineWave motif + one Flemish sentence, right form on canvas; sets the brand at the door. |

## 7. Monetization visual grammar ("quiet keyline")

- **Pro chip:** `<Badge variant="pro">` — 1px `border-foreground/25`, transparent bg, label-caps "PRO" in `text-foreground/70`, radius-ctl. Practice tier chip: same with "PRACTICE". Never gradient, never gold, never a crown/lock icon, never mint (mint ≠ money, ever).
- **Locked-feature preview:** render the real component non-interactive at `opacity-60` inside a `border-dashed border-border` frame; top-right Pro chip; one value sentence + quiet `outline` button "Ontdek Pro". NEVER blur, never a lock overlay on client-care features (only provider workflow features are gated — per compliance guardrails, care and visibility are never gated).
- **Upgrade highlight (in-flow nudge):** a flat inset strip (`bg-secondary`, radius-card, no border) with body-sm text + inline text-link. Max ONE nudge visible per page; dismissible (persist per feature 30 days); appears only after the free feature was actually used (earned-context rule).
- **Upgrade page/dialog:** stationery style — canvas bg, Fraunces headings, hairline-separated tier columns, tabular pricing in EUR ("€29/maand, excl. btw"), current plan marked with a sage check. Comparison rows are concrete verbs ("Stuur intake automatisch bij nieuwe cliënt"), not adjectives.
- **Copy pattern:** NL "Dit zit in Bondable Pro. Je huidige plan blijft gewoon werken." / EN "This is part of Bondable Pro. Your current plan keeps working as-is." — always states no loss.

## 8. Microcopy voice guide — warm professional Flemish

Principles: je/jij; verbs over nouns; concrete numbers and real names in examples (Lotte, Wout, praktijk De Brug); no exclamation marks; no "geweldig/amazing"; crisis screens: short imperatives, no metaphors, phone numbers as the biggest element. Ten moments (NL / EN):

1. Welcome first-run (client): "Dag Lotte. Dit is jouw plek — alles hier blijft tussen jou en je begeleider." / "Hi Lotte. This space is yours — everything here stays between you and your provider."
2. Empty tasks: "Nog geen opdrachten. Je begeleider zet hier oefeningen klaar na jullie volgende gesprek." / "No tasks yet. Your provider will add exercises here after your next session."
3. Task done: "Genoteerd. Wout ziet dat je dit hebt afgerond." / "Noted. Wout can see you've completed this."
4. Journal saved (private): "Bewaard. Alleen jij kan dit lezen." / "Saved. Only you can read this."
5. Bond disclaimer (persistent, above chat): "Bond is een hulpmiddel, geen hulpverlener. Je begeleider kijkt mee." / "Bond is a tool, not a clinician. Your provider stays involved."
6. Crisis escalation (Bond/check-in): "Dit klinkt zwaar. Je hoeft dit niet alleen te dragen. Bel 1813 (BE) of 113 (NL) — dag en nacht bereikbaar. Bel 112 bij direct gevaar." / "This sounds heavy. You don't have to carry it alone. Call 1813 (BE) or 113 (NL) — available day and night. Call 112 if you're in immediate danger."
7. Generic error: "Dat lukte net niet. Je gegevens zijn niet verloren — probeer het opnieuw." / "That didn't work just now. Nothing was lost — please try again."
8. Session confirmed (provider): "Vastgelegd: donderdag 14u met Lotte D. Zij krijgt automatisch een herinnering." / "Booked: Thursday 2 pm with Lotte D. She'll get a reminder automatically."
9. Invite sent (provider): "Uitnodiging verstuurd naar lotte@… — ze kan zelf haar gegevens invullen. Je ziet het zodra ze start." / "Invitation sent to lotte@… — she can fill in her own details. You'll see it the moment she starts."
10. Consent/data (GDPR moments): "Jouw gegevens blijven van jou. Je kan ze altijd meenemen of laten verwijderen — zonder gedoe." / "Your data stays yours. Take it with you or have it deleted, any time — no hassle."

Anti-patterns list for the i18n sweep (`src/i18n/locales/*`): "Oeps!", "Geweldig!", "Unlock", "Supercharge", "empower", any "!" outside legal-required strings, "u"-form mixing.

## 9. Anti-slop checklist (run per screen before merge)

1. Zero gradients except duotone photo treatment; zero purple/blue anywhere.
2. Mint appears ⇢ is this an AI surface? If not, fail. Focus rings teal everywhere except Bond.
3. At most one shadow visible at rest; overlays only.
4. Radius: controls 0.5rem, cards 0.875rem — no rounded-full pills except avatars and status dots.
5. Fraunces present at exactly one level per view (page title or hero), never in body/controls.
6. No icon-in-tinted-circle outside the 5 quick-action tiles.
7. Copy: no exclamation marks, no "!" emoji, no English clichés; NL uses je-form; concrete example data (Flemish names, real dates, EUR).
8. Empty state uses the EmptyState component with a line motif — never bare "No results".
9. Every interactive element has a visible 120–200ms state change and a reduced-motion fallback.
10. Screen still works at 360px width without horizontal scroll (tables become cards).
11. Pro/locked UI follows quiet-keyline: no lock icons, no blur, max one nudge.
12. Would this screen look at home in a Vitra catalogue or a Flemish hospital's annual report? If it looks like a Dribbble shot or a shadcn demo, redo.

---

## Tickets

- T-DL-1 | Load and wire the type system | Add @fontsource-variable/fraunces + instrument-sans imports in src/main.tsx; fontFamily + fontSize scale in tailwind.config.ts; base-layer heading rules + .font-display variation settings in src/index.css | Both fonts render self-hosted (no external font request in network tab); h1–h3 across dashboards use display scale; body is 15px Instrument | M | n.a. | 1
- T-DL-2 | Token refresh in src/index.css + tailwind.config.ts | Change --ring to teal, --radius to 0.875rem; add success/warning/info (+soft), destructive-soft, ring-ai, mint-soft, radius-ctl/hero, shadow-overlay/raise; expose all in Tailwind; mirror dark block | All new utilities compile; no mint focus ring outside Bond; grep shows zero remaining ad-hoc hex colors in components | S | n.a. | 1
- T-DL-3 | Border-first elevation sweep | Remove rest shadows from card.tsx and all dashboard cards; add shadow-overlay to dialog/popover/dropdown/command; hover:shadow-raise on interactive cards only | Visual audit: at rest, zero shadows on any dashboard; overlays cast shadow-overlay | M | n.a. | 1
- T-DL-4 | Badge system REBUILD | Rewrite src/components/ui/badge.tsx variants: status (4 soft tokens), trust (teal outline, used for is_regulated), ai (mint-soft), pro/practice (quiet keyline); migrate all usages (Sessions, Tasks, Finder, admin) | All status badges use semantic tokens; is_regulated badge is outline-teal; no filled default pills remain | M | n.a. | 1
- T-DL-5 | EmptyState component + line-motif SVG set | New src/components/ui/empty-state.tsx + src/components/illustration/{LineMeet,LineLoop,LineSteps,LineWave,LineBranch}.tsx with draw-in animation + reduced-motion static; adopt in Tasks, Messages, Journal, Sessions, Leads, Find no-results | Every listed page shows motif + Fraunces one-liner + single action when empty; animation disabled under prefers-reduced-motion | M | n.a. | 1
- T-DL-6 | KPI strip REBUILD (client + provider dashboards) | Replace stat-card rows in src/components/dashboard/client/* and therapist DashboardKpis with flat KPI strip: Fraunces tabular numbers, label-caps, hairline dividers | No bordered/shadowed KPI cards remain; numbers use tabular-nums; strip responsive to 360px (2×2) | M | n.a. | 1
- T-DL-7 | Toast system REBUILD | Theme sonner.tsx to ink surface spec; migrate remaining Radix toast.tsx/toaster.tsx callers to sonner and delete the duplicate system | One toast system in bundle; toasts are ink bg with semantic accents; 3.5s auto-dismiss; screen-reader announced | S | n.a. | 1
- T-DL-8 | Tables: desktop retouch + mobile card REBUILD | table.tsx: 48px rows, label-caps headers on background, hover-revealed row actions; Tasks.tsx (+ ActiveClientsTable, AdminClients/Providers): below md render row-cards | Tasks usable at 360px with no horizontal scroll; desktop headers no longer inside a card | L | n.a. | 1
- T-DL-9 | Dialog + form retouch | dialog.tsx: radius-card, Fraunces left-aligned titles, footer pattern; destructive confirms restate object name; align input/select/button to radius-ctl and 15px body | All dialogs follow anatomy; buttons/inputs radius-ctl; destructive confirm shows object name | M | n.a. | 1
- T-DL-10 | Sidebar retouch + Bond mint marker | sidebar.tsx/app nav: label-caps groups, 40px items, active pill, 2px mint left rule on Bond item only; reserve top slot for practice switcher (per provider plan) | Bond is the only mint element in nav; groups labeled; switcher slot renders placeholder behind flag | S | n.a. | 1
- T-DL-11 | Motion foundation | Add duration/easing CSS vars + global prefers-reduced-motion kill-switch in src/index.css; enter fade-rise utility; Bond breath dot component; apply stagger to dashboard card mounts | All transitions use the 3 sanctioned durations; reduced-motion disables transforms and both signature animations | S | n.a. | 1
- T-DL-12 | Homepage hero REBUILD + Login retouch | Home.tsx: Fraunces display-xl hero, duotone photo band, mint-soft Coach entry with supervised framing, dev demo strip; Login.tsx split ink-panel layout | No gradient/blob hero; Coach entry passes mint-rule; login shows motif panel; Lighthouse a11y ≥ 95 on both | L | n.a. | 1
- T-DL-13 | Finder card + profile editorial retouch | Find.tsx results card per §6 (Fraunces name, trust badge, availability dot, fit sentence); ProviderProfilePublic header same grammar; initials avatars until real photos | Ranking UI shows zero paid-placement affordances; is_regulated rendered as trust badge with tooltip explaining it's informational | M | Free | 1
- T-DL-14 | Session loop + quick-action tile retouch | SessionCard inline loop → single prioritized slot, compact on mobile; client quick-action tiles: Bond tile mint-soft + breath dot, others white/bordered | One loop item visible at a time per card; tiles pass icon-circle scarcity rule | M | n.a. | 1
- T-DL-15 | Monetization UI kit (quiet keyline) | Build ProBadge, LockedPreview (dashed frame + opacity-60 real UI), NudgeStrip (dismissible, 30-day persist, one-per-page guard) as src/components/monetization/*; storybook-style demo route in dev | Components exist and enforce: no blur, no lock icons, max one NudgeStrip mounted per route; dismiss persists in localStorage | M | Pro | 2
- T-DL-16 | Upgrade page stationery design | Pricing/upgrade surface per §7: canvas bg, Fraunces, hairline tier columns, EUR tabular pricing, concrete-verb feature rows; NL+EN copy from §8 pattern | Page contains zero gradients/locks; copy passes anti-pattern list; current plan marked with sage check | M | Pro | 4
- T-DL-17 | Voice + i18n slop sweep | Audit src/i18n/locales/{en,nl}.json against §8 anti-patterns; rewrite offending strings in warm-Flemish voice; fix je/u mixing; crisis strings match §8.6 exactly | Zero "!" in product strings (non-legal); crisis copy verbatim per spec; fr/es flagged for follow-up translation (i18n plan) | M | n.a. | 2
- T-DL-18 | Duotone photography + homepage art direction assets | Source/license 5–6 Benelux setting photos; pre-process duotone (teal/canvas) or CSS treatment; integrate on Home + Find headers only | Photos are real locations, no stock-AI imagery, faces avoided; total added weight < 400KB via responsive srcset | M | n.a. | 2
- T-DL-19 | Anti-slop gate | Add docs/design/anti-slop-checklist.md (§9 verbatim) and a PR-template checkbox; wire a grep-based CI lint for mint-class usage outside allowed paths | Checklist file exists; CI fails on bg-mint/text-mint/ring-ai outside src/components/bond, BondChat, FindMatch, admin flagged views | S | n.a. | 1

## Dependencies & risks

**Dependencies on other plan files:**
- `02-provider-generalization.md` (naming "provider/practice", sidebar practice-switcher slot in T-DL-10, trust-badge wording for coaches vs erkende hulpverleners in T-DL-4/13).
- `03-onboarding-activation.md` (first-run tours and lifecycle emails must consume the type/voice system; email templates in supabase/functions/* need the same voice + a lightweight email-safe palette — Fraunces via fallback Georgia in email).
- `04-client-features.md` / `05-provider-features.md` (new surfaces must build on EmptyState, badge, KPI-strip primitives — land T-DL-1..7 before feature batches).
- `06-monetization.md` (nudge logic, tier gates, Stripe upgrade flow must render exclusively through the T-DL-15 kit and §7 rails; ranking-neutrality rule constrains any finder monetization UI).
- `07-owner-cockpit.md` (admin/cockpit uses same tokens; flagged-Bond views are the only admin surfaces allowed mint).

**Top risks:**
1. **Half-applied language is worse than none** — if T-DL-1/2/3 land but page sweeps stall, the app looks inconsistent; mitigate by shipping the foundation tickets in one release train and gating feature work on them.
2. **Fraunces misuse spreads** (serif in cards/buttons) making the app look like a magazine; mitigated by base-layer rules + checklist item 5, but requires review discipline.
3. **Success-green vs mint confusion** for low-vision users; validated pairing (hue 152@33% vs 162@44%) must be contrast-checked in real components — if ambiguous in practice, darken success to 30% lightness.
4. **Radius/shadow sweep merge conflicts** with parallel feature branches (Phase 1 concurrency); sequence T-DL-2/3 first, freeze card.tsx API.
5. **Photography sourcing stalls** (licensing real Belgian locations); homepage REBUILD (T-DL-12) must not block on T-DL-18 — ship with line motifs first, photos as progressive enhancement.
6. **Duplicate toast systems** (T-DL-7) touch many call sites; regression risk on error surfacing — grep-driven migration with a temporary shim.

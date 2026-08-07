# Bondable — Backlog & blockers

Wat er nog moet gebeuren, en vooral: **wat we van jou nodig hebben** voordat het kán.
Bijgewerkt: 2026-08-06.

De app draait vandaag volledig op een **in-memory mock backend** (`src/integrations/supabase/mockClient.ts`)
plus localStorage-services. Alles is klikbaar en demonstreerbaar, maar niets is
echt: er wordt geen mail verstuurd, geen betaling gedaan, geen data bewaard
tussen browsers. Dat is bewust — het is de permanente demo-omgeving — maar het
betekent dat de onderstaande blockers écht blockers zijn.

---

## 1. Wat we van de eigenaar nodig hebben (harde blockers)

Zonder deze accounts/keys kan het betreffende stuk niet live. Elk item hieronder
is aan de codekant al voorbereid.

| # | Nodig | Waarvoor | Wat er dan aan gaat |
|---|-------|----------|---------------------|
| B1 | **Resend API-key + geverifieerd verzenddomein** (bv. `mail.bondable.be`, met SPF/DKIM/DMARC) | Alle e-mail | 27 klaarstaande templates (`src/emails/messageMap.ts`), cliënt-invite, lead-antwoord + magic link, sessieherinneringen, staf/manager-onboarding, trial-mails, weekdigest |
| ~~B2~~ | ~~**Neon Postgres**~~ — **GEDAAN.** DB draait (EU, `eu-central-1`), 23 tabellen gemigreerd, `ai_settings` + `coach_usage` in gebruik door Bond. De rest van de app draait nog op de mock-adapter; die omzetting is het echte resterende werk. |
| B3 | **Vercel-project** (of bevestiging van het bestaande) | API-laag + deploy | Serverless `/api`-routes i.p.v. de mock-adapter |
| B4 | **Stripe live keys** (+ btw-instellingen BE) | Abonnementen | Pro €39 / Praktijk €29-per-zetel, 14-daagse trial, facturatie, klantportaal |
| ~~B5~~ | ~~**Anthropic API-key**~~ — **GEDAAN via Vercel AI Gateway.** Bond draait op een echt model (`anthropic/claude-sonnet-4.6`), streaming, key server-side. Resteert: DPA/verwerkersovereenkomst met Vercel + de modelaanbieder, en bevestiging van de verwerkingsregio (art. 9-data). |
| B6 | **Eigen analytics-property** (Plausible/Matomo EU, of eigen GA) | Cijfers | Er stond een geërfde Google Analytics-ID in `index.html` die data naar de vórige ontwikkelaar stuurde én zonder toestemming laadde — verwijderd. `analyticsService` is consent-aware en staat standaard uit |
| ~~B8~~ | ~~**Echte auth**~~ — **GEDAAN via Neon Auth.** Registreren/inloggen/Google zijn echt (JWT + JWKS server-side), /api/coach kent ingelogde gebruikers (accountcap i.p.v. apparaatcap), /api/coach-admin eist profiles.role=admin, gesprekken worden per account bewaard met wisknop. Resteert: COACH_ADMIN_TOKEN-fallback verwijderen zodra de admin-console zelf inlogt, en e-mailverificatie aanzetten zodra mail loopt (nu shared Neon-provider of B1). |
| B9 | **DPA + verwerkingsregio** voor Vercel AI Gateway en de modelaanbieder | Bond met echte cliëntdata | Art. 9-data loopt nu langs de gateway. Nodig vóór echte cliënten, niet vóór verder bouwen. |
| B7 | **Juridische review** (advocaat/DPO) | Live gaan met echte cliënten | Zie `docs/plan/09-compliance-gate.md`: consent-teksten, bewaartermijn-matrix (art. 9 + Belgische patiëntendossierregels), DPA's, DPIA |

> **Volgorde-advies:** B8 eerst (de endpoints staan open), dan B3 + de mock→Neon-omzetting,
> dan B1 (e-mail maakt het product rond), dan B4 (geld). B7 en B9 blokkeren alleen
> de échte launch met echte cliënten, niet de bouw.

---

## 2. Beloftes die de UI doet maar het systeem (nog) niet waarmaakt

Deze zijn expliciet gemarkeerd in de code. Ze moeten waar worden zodra B1/B2 er zijn.

- [ ] **Lead-antwoordpad** — e-mails worden naar een lokale `bondable_outbox`
      geschreven i.p.v. verstuurd. Magic link werkt binnen de browsersessie.
      → Aan te sluiten op Resend (B1).
- [ ] **Cliënt-invite** (`InviteClientPanel`) — link wordt gegenereerd, mail niet verstuurd.
- [ ] **Bond "onder supervisie"** — de provider-supervisieconsole toont vandaag
      alleen wat de mock genereert; de consent-gated overdracht van
      intake/nulmeting naar het providerdossier is nog niet echt.
- [ ] **De Wachtruimte-overdracht** — wat een wachtende cliënt voorbereidt
      (intake, nulmeting, doelen) moet bij de eerste sessie écht in het
      providerbeeld verschijnen.
- [ ] **Founding-teller** — staat per browser in localStorage; twee bezoekers
      claimen allebei nummer 1. Moet server-side (B2).
- [ ] **Verificatie van erkenning** — visum/erkenningsnummer wordt opgeslagen,
      maar niemand controleert het. De cockpit-wachtrij bestaat; het proces niet.

---

## 3. Bekende gaten / opgeruimd maar niet af

- [ ] **Prerendering / SSR voor SEO** — `<Seo>` zet titel + canonical per route,
      maar een crawler die geen JS uitvoert ziet enkel `index.html`. Voor
      `/wachttijden/{stad}` en providerprofielen (de hele SEO-inzet) is
      prerendering nodig (vite-plugin-ssg of Vercel prerender).
- [ ] **Provider-profiel-URL's zijn UUID's** (`/find/<uuid>`) — onvindbaar en
      niet deelbaar. Slug nodig (`/find/an-verhaeghe-gent`).
- [ ] **Stadspagina's** (`/psycholoog/gent`) bestaan nog niet — alleen
      `/wachttijden/{stad}`.
- [ ] **Ontbrekende publieke pagina's**: over-ons, contact, privacyverklaring,
      algemene voorwaarden. Op een platform dat art. 9-consent vraagt is dat een
      vertrouwens- én compliancegat.
- [ ] **Resterende ruwe kleuren** (~ AdminAISettings 13, password-strength-input 6,
      TaskActionDropdown 5, address-dialog 4) — buiten de vorige sweep gevallen.
- [ ] **Engelse strings** op enkele cliëntkaarten (My Homework, Next Session,
      Quick Actions, KPI-labels) naast de nieuwe Nederlandse tekst.
- [ ] **`address-dialog.tsx`** heeft Engelse placeholders ("Region", "Postal Code").
- [ ] **`phone-input.tsx`** zet US (+1) bovenaan; BE/NL/FR horen eerst.
- [ ] **Weesbestanden** na het verwijderen van Payments.tsx:
      `PaymentHistoryTable.tsx`, `InvoiceGenerator.tsx` (nergens meer geïmporteerd).
- [ ] **De grote rename** `therapist` → `provider` in code/routes/tabellen
      (ruling R4). Gebruikersgericht is het al "hulpverlener"; intern niet.

---

## 4. Productideeën die klaarliggen (geen blocker, wel waarde)

- [ ] **Kwartaalrapport wachttijden** — `/wachttijden` is de basis; een
      PDF/persbericht per kwartaal is de backlink-motor (VRT, De Standaard,
      Sociaal.Net schrijven hier jaarlijks over).
- [ ] **Huisartsen-onepager** — zij moeten vandaag "sorry, zes maanden" zeggen;
      met De Wachtruimte kunnen ze iets aanbieden.
- [ ] **Omgekeerde invite** — cliënt nodigt zijn eigen therapeut uit
      ("Lotte wil haar voortgang met je delen"). Goedkoopste B2B-kanaal, nul CAC.
- [ ] **Reviewsysteem** — bewust nog niet gebouwd. De verzonnen sterren zijn
      verwijderd; een echt systeem moet "geverifieerd na een echte sessie" zijn
      (EU Omnibus / WER Boek VI vereist dat je zegt hoe je verifieert).
- [ ] **Afstandsfilter in de finder** ("binnen 15 km") — waarschijnlijk
      waardevoller dan een kaart.
- [ ] **Teleconsult** — bring-your-own-link (Teams/Zoom/Meet) is de goedkope
      eerlijke versie; geen eigen video bouwen.
- [ ] **Data-export voor de hulpverlener** (cliënten CSV, ondertekende notities,
      factuurboek) — vertrouwen én AVG.

---

## 5. Afgesproken beslissingen (niet heropenen zonder reden)

- **Cliënten zijn altijd gratis.** Zij zijn de vraagzijde die providers doet betalen.
- **Free-plan = 15 actieve cliënten** (verhoogd van 3: 3 is geen praktijk maar een
  demo, en dwingt tot upgraden vóór je waarde ervaart). Upgrade-trigger is
  *groei*, niet *straf*. De echte betaalmuur ligt op features (facturatie +
  attesten, outcomes, Bond-supervisieconsole, geavanceerde agenda).
- **Dichotomieverbod:** betaling beïnvloedt NOOIT de ranking of zichtbaarheid in
  de finder. Afgedwongen in code (`RankingInputs`) + CI-test + publieke uitleg op
  `/how-ranking-works`.
- **Geen verplicht account om contact op te nemen.** Het account ontstaat als
  bijproduct van de magic link.
- **Geen Google Maps-embed** op providerprofielen: zet cookies en lekt het IP van
  iemand die een psycholoog zoekt. Een "Toon op kaart"-link doet hetzelfde werk.
- **Upgrade-nudges zijn nooit modaal** en nooit op Bond-, crisis- of cliëntschermen.
- **Geen verzonnen data.** Geen nepbeoordelingen, geen nepagenda, geen
  "X mensen wachten"-teller. Liever een lege staat dan een leugen.

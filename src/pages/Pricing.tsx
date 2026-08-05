/**
 * Pricing — Bondable's PUBLIC pricing page (front-of-house, at `/pricing`).
 *
 * Ticket T-MG-12 · plan 05 §8. Standalone public page with its OWN slim top nav
 * and footer (like Home) — NOT DashboardLayout. Stationery style: flat canvas,
 * exactly one Fraunces level (the h1), hairline-separated tier columns, concrete
 * verb-led feature rows, EUR tabular pricing, a monthly/annual toggle, a distinct
 * ranking-neutrality trust block linking to /how-ranking-works, and a 6-item FAQ.
 *
 * CANONICAL COMMERCIAL MODEL (master-plan §2): Clients free forever. Free = 3
 * active clients + full core tools + finder/leads. Pro €39/mo or €390/yr.
 * Practice €29/seat/mo annual, min 2 seats. 14-day full-Pro trial, no card.
 * DICHOTOMIEVERBOD: paid tiers NEVER buy finder visibility.
 *
 * ANTI-SLOP: no mint (mint is AI-only), no gradients, no emoji, border-first,
 * one shadow max at rest, warm-professional Flemish je/jij, zero exclamation
 * marks. New strings use t('key','NL default') inline.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '@/components/seo/Seo';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Minus,
  ShieldCheck,
  Search,
  LogIn,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { analyticsService } from '@/services/api/analyticsService';
import { ANALYTICS_EVENTS } from '@/config/analyticsEvents';

type Interval = 'monthly' | 'annual';
type TierId = 'free' | 'pro' | 'practice';

/* Feature-row availability per tier. `note` overrides the check with concrete text. */
interface Cell {
  ok: boolean;
  note?: string;
}
interface FeatureRow {
  label: string;
  free: Cell;
  pro: Cell;
  practice: Cell;
}

const Pricing = () => {
  const { t } = useTranslation();
  const [interval, setInterval] = useState<Interval>('annual');

  const isAnnual = interval === 'annual';

  /** Fire checkout_started; real Stripe checkout is wired later (plan 08). */
  const startCheckout = (tier: 'pro' | 'practice') => {
    analyticsService.track(ANALYTICS_EVENTS.checkout_started, { tier, interval });
  };

  /* Prices per §1.1. Practice is annual-only per the canonical model (€29/seat). */
  const proPrice = isAnnual ? '€390' : '€39';
  const proUnit = isAnnual
    ? t('pricing_per_year', '/jaar')
    : t('pricing_per_month', '/maand');
  const proMonthlyEquivalent = isAnnual ? '€32,50' : '€39';

  /* Concrete verb-led rows — mirrors §1.1, phrased as what the provider DOES. */
  const rows: FeatureRow[] = [
    {
      label: t('pricing_row_clients', 'Actieve cliënten begeleiden'),
      free: { ok: true, note: t('pricing_row_clients_free', 'Tot 3') },
      pro: { ok: true, note: t('pricing_row_unlimited', 'Onbeperkt') },
      practice: { ok: true, note: t('pricing_row_unlimited_seat', 'Onbeperkt per zetel') },
    },
    {
      label: t('pricing_row_core', 'Sessies, agenda, berichten en taken beheren'),
      free: { ok: true },
      pro: { ok: true },
      practice: { ok: true },
    },
    {
      label: t('pricing_row_finder', 'Een profiel tonen in de finder'),
      free: { ok: true, note: t('pricing_row_finder_free', 'Zelfde ranking') },
      pro: { ok: true, note: t('pricing_row_finder_pro', 'Zelfde ranking') },
      practice: { ok: true, note: t('pricing_row_finder_practice', 'Zelfde ranking + praktijkpagina') },
    },
    {
      label: t('pricing_row_leads', 'Aanvragen ontvangen en beantwoorden'),
      free: { ok: true },
      pro: { ok: true, note: t('pricing_row_leads_pro', '+ analyse, bewaarde antwoorden') },
      practice: { ok: true, note: t('pricing_row_leads_practice', '+ toewijzing aan teamleden') },
    },
    {
      label: t('pricing_row_intake', 'Intakeformulieren opstellen'),
      free: { ok: true, note: t('pricing_row_intake_free', '1 sjabloon') },
      pro: { ok: true, note: t('pricing_row_intake_pro', 'Onbeperkt + bibliotheek') },
      practice: { ok: true, note: t('pricing_row_intake_practice', 'Gedeelde teambibliotheek') },
    },
    {
      label: t('pricing_row_bond', 'Bond-supervisie opvolgen voor je cliënten'),
      free: { ok: true, note: t('pricing_row_bond_free', 'Basis') },
      pro: { ok: true, note: t('pricing_row_bond_pro', '+ supervisieconsole') },
      practice: { ok: true, note: t('pricing_row_bond_practice', '+ toezicht op teamniveau') },
    },
    {
      label: t('pricing_row_outcomes', 'Uitkomsten en voortgang meten'),
      free: { ok: false },
      pro: { ok: true, note: t('pricing_row_outcomes_pro', 'Per cliënt, per week') },
      practice: { ok: true, note: t('pricing_row_outcomes_practice', '+ rollups voor managers') },
    },
    {
      label: t('pricing_row_billing', 'Facturen en betaallinks maken'),
      free: { ok: false },
      pro: { ok: true },
      practice: { ok: true, note: t('pricing_row_billing_practice', '+ per-medewerker afrekening') },
    },
    {
      label: t('pricing_row_scheduling', 'Terugkerende sessies en agenda-sync instellen'),
      free: { ok: false },
      pro: { ok: true, note: t('pricing_row_scheduling_pro', '+ Google Agenda') },
      practice: { ok: true, note: t('pricing_row_scheduling_practice', '+ gedeelde ruimtes') },
    },
    {
      label: t('pricing_row_staff', 'Medewerkers en rollen beheren'),
      free: { ok: false },
      pro: { ok: false },
      practice: { ok: true },
    },
    {
      label: t('pricing_row_export', 'Je gegevens exporteren (GDPR)'),
      free: { ok: true },
      pro: { ok: true },
      practice: { ok: true },
    },
  ];

  const faqs = [
    {
      q: t('pricing_faq_active_q', 'Wat telt als een actieve cliënt?'),
      a: t(
        'pricing_faq_active_a',
        'Een cliënt met de status "actief". Gearchiveerde cliënten tellen niet mee, en archiveren doe je met één klik — omkeerbaar. Zo bepaalt je groei wanneer je upgradet, niet een blokkade.',
      ),
    },
    {
      q: t('pricing_faq_trial_q', 'Wat gebeurt er na de proefperiode?'),
      a: t(
        'pricing_faq_trial_a',
        'Na 14 dagen schakel je automatisch over naar het gratis plan. Je gegevens en cliënten blijven exact waar ze zijn — enkel Pro-functies vergrendelen opnieuw. Er is geen kaart nodig tot je zelf kiest.',
      ),
    },
    {
      q: t('pricing_faq_archive_q', 'Archiveren of verwijderen — wat is het verschil?'),
      a: t(
        'pricing_faq_archive_a',
        'Archiveren zet een cliënt op non-actief zonder iets te wissen; je zet het met één klik terug. Verwijderen wist gegevens definitief. We houden je gegevens nooit gegijzeld: wat je opbouwt, blijft van jou.',
      ),
    },
    {
      q: t('pricing_faq_vat_q', 'Hoe zit het met btw en facturatie?'),
      a: t(
        'pricing_faq_vat_a',
        'De vermelde prijzen zijn exclusief btw. Belgische en Nederlandse btw (21%) wordt bij afrekening toegevoegd. Je ontvangt bij elke betaling een correcte factuur voor je boekhouding.',
      ),
    },
    {
      q: t('pricing_faq_cancel_q', 'Kan ik op elk moment opzeggen?'),
      a: t(
        'pricing_faq_cancel_a',
        'Ja. Opzeggen gaat in één scherm, zonder retentietrucs. Je behoudt Pro tot het einde van je lopende periode en zakt daarna terug naar het gratis plan. Je cliënten en gegevens blijven bewaard.',
      ),
    },
    {
      q: t('pricing_faq_dataexport_q', 'Kan ik mijn gegevens meenemen?'),
      a: t(
        'pricing_faq_dataexport_a',
        'Op elk plan, ook het gratis, exporteer je je gegevens (GDPR). Je bent nooit vastgeklonken aan Bondable — porteerbaarheid is een recht, geen premiumfunctie.',
      ),
    },
  ];

  const tierNav = (id: TierId) =>
    id === 'free'
      ? t('pricing_tier_free', 'Gratis')
      : id === 'pro'
        ? t('pricing_tier_pro', 'Pro')
        : t('pricing_tier_practice', 'Praktijk');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Seo
        path="/pricing"
        title="Prijzen voor hulpverleners"
        description="Cliënten gebruiken Bondable altijd gratis. Voor hulpverleners: gratis starten met 3 actieve cliënten, Pro aan €39 per maand, of Praktijk aan €29 per zetel. Zichtbaarheid in de finder kun je nooit kopen."
      />
      {/* ── Slim top nav (Home-style) ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/favicon.ico" alt="" className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight text-primary">
              Bondable
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="text-foreground">
              <Link to="/find">{t('home_nav_find', 'Vind hulp')}</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden text-muted-foreground sm:inline-flex"
            >
              <Link to="/how-ranking-works">
                {t('pricing_nav_ranking', 'Hoe ranking werkt')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/login">
                <LogIn className="h-4 w-4" />
                {t('home_nav_login', 'Inloggen')}
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero — typography-led, the ONLY Fraunces on the page ─────────── */}
        <section className="mx-auto w-full max-w-[1200px] px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t('pricing_eyebrow', 'Eén kant betaalt · nooit voor zichtbaarheid')}
            </span>
            <h1 className="mt-5 font-display text-display-lg text-foreground">
              {t('pricing_title', 'Eerlijke prijzen voor echt werk')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {t(
                'pricing_subtitle',
                'Cliënten gebruiken Bondable altijd gratis. Begeleiders betalen voor gereedschap — nooit voor zichtbaarheid.',
              )}
            </p>
          </div>

          {/* Interval toggle — annual pre-selected, boring credible discount */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label={t('pricing_toggle_label', 'Facturatie-interval')}
              className="inline-flex rounded-ctl border border-border bg-card p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isAnnual}
                onClick={() => setInterval('monthly')}
                className={`rounded-[calc(var(--radius-ctl)-4px)] px-4 py-1.5 text-sm font-medium transition-colors ${
                  !isAnnual
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('pricing_toggle_monthly', 'Maandelijks')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isAnnual}
                onClick={() => setInterval('annual')}
                className={`rounded-[calc(var(--radius-ctl)-4px)] px-4 py-1.5 text-sm font-medium transition-colors ${
                  isAnnual
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('pricing_toggle_annual', 'Jaarlijks')}
              </button>
            </div>
            <Badge variant="success">{t('pricing_toggle_save', '2 maanden gratis')}</Badge>
          </div>
        </section>

        {/* ── Three tier columns, hairline-separated ──────────────────────── */}
        <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <div className="grid grid-cols-1 divide-y divide-border rounded-card border border-border bg-card lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {/* Gratis */}
            <TierColumn
              name={tierNav('free')}
              price="€0"
              unit={t('pricing_free_unit', 'altijd')}
              blurb={t('pricing_free_blurb', 'Een volledige praktijk voor wie klein start — tot 3 actieve cliënten.')}
              cta={
                <Button asChild variant="outline" className="w-full rounded-ctl">
                  <Link to="/signup/provider">{t('pricing_free_cta', 'Gratis beginnen')}</Link>
                </Button>
              }
            />

            {/* Pro — recommended, marked with a quiet success check */}
            <TierColumn
              name={tierNav('pro')}
              price={proPrice}
              unit={proUnit}
              highlight
              badge={
                <Badge variant="success" className="gap-1">
                  <Check className="h-3 w-3" />
                  {t('pricing_pro_badge', 'Meest gekozen')}
                </Badge>
              }
              subprice={
                isAnnual
                  ? t('pricing_pro_subprice', '{{eq}} per maand, jaarlijks gefactureerd', {
                      eq: proMonthlyEquivalent,
                    })
                  : t('pricing_pro_subprice_monthly', 'of €390 per jaar (2 maanden gratis)')
              }
              blurb={t('pricing_pro_blurb', 'Onbeperkte cliënten, uitkomsten, de Bond-supervisieconsole en facturatie.')}
              cta={
                <Button asChild className="w-full rounded-ctl" onClick={() => startCheckout('pro')}>
                  <Link to="/signup/provider">
                    {t('pricing_pro_cta', 'Start 14-daagse proef')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              }
              footnote={t('pricing_pro_footnote', '14 dagen volledige Pro, geen kaart nodig')}
            />

            {/* Praktijk — per-seat math with live 3-seat example */}
            <TierColumn
              name={tierNav('practice')}
              price="€29"
              unit={t('pricing_practice_unit', '/zetel /maand')}
              subprice={t('pricing_practice_subprice', 'jaarlijks gefactureerd, min. 2 zetels')}
              blurb={t('pricing_practice_blurb', 'Voor teams: gedeelde agenda, rollen en managementoverzichten.')}
              example={t(
                'pricing_practice_example',
                '3 zetels × €29 = €87/maand, jaarlijks gefactureerd',
              )}
              cta={
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-ctl"
                  onClick={() => startCheckout('practice')}
                >
                  <Link to="/signup/provider">{t('pricing_practice_cta', 'Praktijk opzetten')}</Link>
                </Button>
              }
            />
          </div>

          {/* Clients-free-forever line, given its own quiet room */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t(
              'pricing_clients_free',
              'Cliënten gebruiken Bondable altijd gratis — de proef en de betaalde plannen gelden enkel voor begeleiders.',
            )}
          </p>
        </section>

        {/* ── Feature comparison table ────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('pricing_compare_title', 'Wat je op elk plan kunt doen')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('pricing_compare_sub', 'Concreet werk, niet losse functies. Elke rij is iets wat je doet.')}
          </p>

          <div className="mt-6 overflow-hidden rounded-card border border-border">
            {/* Header row */}
            <div className="grid grid-cols-[1.6fr_repeat(3,1fr)] items-end gap-2 border-b border-border bg-card px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-6">
              <span>{t('pricing_compare_col_action', 'Actie')}</span>
              <span className="text-center">{tierNav('free')}</span>
              <span className="text-center">{tierNav('pro')}</span>
              <span className="text-center">{tierNav('practice')}</span>
            </div>
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1.6fr_repeat(3,1fr)] items-center gap-2 px-4 py-3.5 text-sm sm:px-6 ${
                  i % 2 === 1 ? 'bg-card/40' : 'bg-background'
                }`}
              >
                <span className="pr-2 text-foreground">{row.label}</span>
                <FeatureCell cell={row.free} />
                <FeatureCell cell={row.pro} highlight />
                <FeatureCell cell={row.practice} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Ranking-neutrality trust block (distinct bordered block) ─────── */}
        <section className="mx-auto w-full max-w-[1200px] px-4 pb-14 sm:px-6">
          <div className="rounded-hero border border-primary/25 bg-secondary/40 p-6 sm:p-9">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl border border-primary/30 bg-card text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="max-w-2xl">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {t('pricing_trust_title', 'Waarom je bij ons geen zichtbaarheid kunt kopen')}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {t(
                    'pricing_trust_body',
                    'De finder rangschikt begeleiders enkel op fit: specialisatie, taal, plaats en beschikbaarheid. Je abonnement, je aantal zetels en je betaalstatus zitten structureel niet in de ranking — een betaald plan koopt gereedschap, nooit een betere plaats. Dat is Belgische wetgeving (dichotomieverbod) én onze regel overal.',
                  )}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-5 rounded-ctl">
                  <Link to="/how-ranking-works">
                    {t('pricing_trust_link', 'Lees hoe ranking werkt')}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Concrete Flemish example strip ──────────────────────────────── */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
            <p className="text-sm text-muted-foreground">
              {t(
                'pricing_example_strip',
                'An Peeters, klinisch psychologe in Gent, beheert 14 cliënten in Pro — voor minder dan de helft van één sessie per maand.',
              )}
            </p>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[760px] px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('pricing_faq_title', 'Veelgestelde vragen')}
          </h2>
          <Accordion type="single" collapsible className="mt-6 rounded-card border border-border bg-card px-4 sm:px-6">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      {/* ── Footer (Home-style) with cross-links ────────────────────────── */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/favicon.ico" alt="" className="h-6 w-6" />
            <span className="text-sm font-semibold text-primary">Bondable</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              {t('pricing_footer_home', 'Home')}
            </Link>
            <Link to="/find" className="inline-flex items-center gap-1 hover:text-foreground">
              <Search className="h-3.5 w-3.5" />
              {t('home_nav_find', 'Vind hulp')}
            </Link>
            <Link to="/how-ranking-works" className="hover:text-foreground">
              {t('pricing_nav_ranking', 'Hoe ranking werkt')}
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground sm:max-w-[16rem] sm:text-right">
            {t(
              'home_footer_neutral',
              'Onafhankelijke matching op basis van fit, nooit op betaling. © Bondable',
            )}
          </p>
        </div>
      </footer>
    </div>
  );
};

/* -------------------------------------------------------------------------- */

interface TierColumnProps {
  name: string;
  price: string;
  unit: string;
  subprice?: string;
  blurb: string;
  cta: React.ReactNode;
  badge?: React.ReactNode;
  footnote?: string;
  example?: string;
  highlight?: boolean;
}

const TierColumn = ({
  name,
  price,
  unit,
  subprice,
  blurb,
  cta,
  badge,
  footnote,
  example,
  highlight,
}: TierColumnProps) => (
  <div className={`flex flex-col p-6 sm:p-7 ${highlight ? 'bg-secondary/30' : ''}`}>
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-base font-semibold text-foreground">{name}</h3>
      {badge}
    </div>
    <div className="mt-4 flex items-baseline gap-1.5">
      <span className="font-display text-display-md tabular text-foreground">{price}</span>
      <span className="text-sm text-muted-foreground">{unit}</span>
    </div>
    {subprice && <p className="mt-1 text-xs text-muted-foreground">{subprice}</p>}
    {example && (
      <p className="mt-3 rounded-ctl border border-border bg-card px-3 py-2 text-xs tabular text-foreground">
        {example}
      </p>
    )}
    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{blurb}</p>
    <div className="mt-6">{cta}</div>
    {footnote && <p className="mt-2 text-center text-xs text-muted-foreground">{footnote}</p>}
  </div>
);

const FeatureCell = ({ cell, highlight }: { cell: Cell; highlight?: boolean }) => (
  <span
    className={`flex flex-col items-center justify-center text-center ${
      highlight ? 'rounded-ctl bg-secondary/40 py-1' : ''
    }`}
  >
    {cell.ok ? (
      <Check className="h-4 w-4 text-success" aria-label="inbegrepen" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground/50" aria-label="niet inbegrepen" />
    )}
    {cell.note && <span className="mt-1 text-[11px] leading-tight text-muted-foreground">{cell.note}</span>}
  </span>
);

export default Pricing;

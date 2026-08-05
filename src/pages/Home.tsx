/**
 * Home — Bondable's PUBLIC homepage (the front-of-house marketing landing).
 *
 * This is the front door at "/". From here a visitor can:
 *  - talk to "The Coach" (the supervised AI chat — Bond),
 *  - find a coach / therapist (the public Finder marketplace),
 *  - log in, or
 *  - (demo) inspect the whole app by entering as a Care provider or a Client
 *    (and a small Admin link for the superadmin), via the runtime role bypass.
 *
 * "Flemish Clinical Warm": typography-led hero on flat canvas. Fraunces appears
 * at exactly one level (the h1). Mint is reserved for AI surfaces — used here on
 * the single "The Coach" primary CTA only. New strings use t('key','NL default').
 */

import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  LogIn,
  Users,
  Lock,
  HeartHandshake,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import Seo from '@/components/seo/Seo';
import {
  BondVignette,
  CheckinVignette,
  FinderVignette,
  ProviderTodayVignette,
  AdminChainVignette,
  LeadsVignette,
} from '@/components/home/FeatureVignettes';
import FeaturedProviders from '@/components/home/FeaturedProviders';
import {
  isBypassAvailable,
  setDemoRole,
  clearDemoRole,
  getStoredDemoRole,
} from '@/hooks/api/useAuthManager';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const bypass = isBypassAvailable();
  const activeRole = getStoredDemoRole();

  /** Enter the app as a role (full navigation so the auth provider re-reads it). */
  const enterAs = (role: 'therapist' | 'client' | 'admin', path?: string) => {
    setDemoRole(role);
    window.location.assign(path ?? `/dashboard/${role}`);
  };

  /** "The Coach" — drop straight into the supervised AI chat (Bond). */
  const talkToCoach = () => {
    if (bypass) {
      enterAs('client', '/dashboard/client/bond');
    } else {
      navigate('/login');
    }
  };

  const exitDemo = () => {
    clearDemoRole();
    window.location.assign('/');
  };

  const roleLabel = (r: NonNullable<typeof activeRole>) =>
    r === 'therapist'
      ? t('home_role_therapist', 'Hulpverlener')
      : r === 'admin'
        ? t('home_role_admin', 'Admin')
        : t('home_role_client', 'Cliënt');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Seo
        path="/"
        title="Bondable — mentale steun die je verbindt, niet vervangt"
        description="Praat vandaag nog met The Coach, je AI-begeleider onder supervisie van een echte hulpverlener. En vind een coach of erkende therapeut die bij je past — op basis van fit, nooit op betaling."
      />
      {/* Active-demo banner */}
      {activeRole && (
        <div className="bg-secondary/70 border-b border-border">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-2 px-4 py-2 text-sm sm:flex-row sm:px-6">
            <span className="text-muted-foreground">
              {t('home_demo_active', 'Demo actief als')}{' '}
              <span className="font-semibold text-foreground">{roleLabel(activeRole)}</span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  window.location.assign(`/dashboard/${activeRole}`)
                }
              >
                {t('home_demo_continue', 'Ga naar dashboard')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={exitDemo}>
                {t('home_demo_exit', 'Demo verlaten')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top nav */}
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
              <a href="#providers">{t('home_nav_providers', 'Voor hulpverleners')}</a>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden text-muted-foreground sm:inline-flex"
            >
              <Link to="/pricing">{t('home_nav_pricing', 'Prijzen')}</Link>
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
        {/* Hero — typography-led text + a LIVE replica of the Bond UI, so the
            first screen already shows the product instead of describing it. */}
        <section className="mx-auto w-full max-w-[1200px] px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            {/* Eyebrow */}
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t('home_hero_eyebrow', 'België-first · gesuperviseerde AI-zorg')}
            </span>

            {/* Headline — the only Fraunces on the page */}
            <h1 className="mt-5 font-display text-display-xl text-foreground">
              {t('home_hero_title', 'Mentale steun die je verbindt, niet vervangt')}
            </h1>

            {/* Subtitle */}
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {t(
                'home_hero_subtitle',
                'Praat met The Coach, je AI-begeleider onder supervisie van een echte hulpverlener. Vind, wanneer je er klaar voor bent, een coach of therapeut die bij je past.',
              )}
            </p>

            {/* CTAs */}
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* Primary — The Coach. The ONLY mint element on the page. */}
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  onClick={talkToCoach}
                  className="h-14 w-full rounded-hero bg-mint px-8 text-base font-semibold text-mint-foreground hover:bg-mint/90 sm:w-auto"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-mint-foreground/70 animate-breath"
                  />
                  {t('home_hero_coach_cta', 'Praat met The Coach')}
                </Button>
                <p className="max-w-[16rem] text-xs text-muted-foreground">
                  {t(
                    'home_hero_coach_note',
                    'Onder supervisie van een echte hulpverlener',
                  )}
                </p>
              </div>

              {/* Secondary — neutral outline */}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 w-full rounded-ctl px-8 text-base sm:w-auto"
              >
                <Link to="/find">
                  <Search className="h-5 w-5" />
                  {t('home_hero_find_cta', 'Vind een hulpverlener')}
                </Link>
              </Button>
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              {t(
                'home_hero_disclaimer',
                'Geen noodhulp. Bij crisis bel 112 of de Zelfmoordlijn 1813.',
              )}
            </p>
          </div>

          {/* The product, not a promise: a miniature of the real Bond chat. */}
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <BondVignette />
            <p className="mt-3 text-center text-label text-muted-foreground lg:text-left">
              {t(
                'home_hero_vignette_caption',
                'Zo ziet een gesprek met The Coach eruit — altijd met een echte hulpverlener op de achtergrond.',
              )}
            </p>
          </div>
          </div>
        </section>

        {/* 10-second comprehension strip — how it works in three steps */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('home_how_eyebrow', 'Zo werkt het')}
            </span>
            <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {[
                {
                  n: '01',
                  title: t('home_how_1_title', 'Praat met The Coach'),
                  body: t(
                    'home_how_1_body',
                    'Begin vandaag, zonder wachtlijst. Bond luistert en helpt je ordenen, onder supervisie van een echte hulpverlener.',
                  ),
                },
                {
                  n: '02',
                  title: t('home_how_2_title', 'Vind wie bij je past'),
                  body: t(
                    'home_how_2_body',
                    'Zoek een coach of erkende hulpverlener op basis van fit: specialisatie, taal en plaats. Nooit op betaling.',
                  ),
                },
                {
                  n: '03',
                  title: t('home_how_3_title', 'Werk samen verder'),
                  body: t(
                    'home_how_3_body',
                    'Sessies, opdrachten en je dagboek op één plek. Wat je deelt, blijft tussen jou en je begeleider.',
                  ),
                },
              ].map((step) => (
                <div key={step.n} className="border-t border-border pt-4">
                  <span className="font-display text-display-md tabular text-primary/60">
                    {step.n}
                  </span>
                  <h3 className="mt-2 text-title font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-body-sm text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For clients — real UI, explained, with a CTA per feature */}
        <section className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            {t('home_clients_eyebrow', 'Voor jou')}
          </span>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('home_clients_title', 'Steun die er elke dag is, niet alleen tijdens je sessie')}
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Daily check-in */}
            <div className="flex flex-col">
              <CheckinVignette />
              <h3 className="mt-5 text-title font-semibold text-foreground">
                {t('home_feat_checkin_title', 'Eén minuut per dag, helemaal van jou')}
              </h3>
              <p className="mt-1.5 max-w-md text-body-sm leading-relaxed text-muted-foreground">
                {t(
                  'home_feat_checkin_body',
                  'Een korte check-in houdt bij hoe het echt met je gaat. The Coach onthoudt het, je hulpverlener ziet de lijn — alleen als jij dat wil. Geen streaks, geen schuldgevoel.',
                )}
              </p>
              <button
                type="button"
                onClick={talkToCoach}
                className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                {t('home_hero_coach_cta', 'Praat met The Coach')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Finder */}
            <div className="flex flex-col">
              <FinderVignette />
              <h3 className="mt-5 text-title font-semibold text-foreground">
                {t('home_feat_finder_title2', 'Vind wie écht bij je past')}
              </h3>
              <p className="mt-1.5 max-w-md text-body-sm leading-relaxed text-muted-foreground">
                {t(
                  'home_feat_finder_body2',
                  'Zoek op specialisatie, taal en plaats tussen erkende hulpverleners en geverifieerde coaches. De volgorde is puur op fit — een plaats in de resultaten is bij ons niet te koop.',
                )}
              </p>
              <Link
                to="/find"
                className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                {t('home_hero_find_cta', 'Vind een hulpverlener')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Trust strip — quiet, factual */}
          <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:gap-8">
            <span className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t('home_trust_verified', 'Erkenning en visum geverifieerd')}
            </span>
            <span className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
              <Lock className="h-4 w-4 text-primary" />
              {t('home_trust_gdpr', 'Jouw gegevens blijven van jou')}
            </span>
            <Link
              to="/how-ranking-works"
              className="inline-flex items-center gap-2 text-body-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <Search className="h-4 w-4 text-primary" />
              {t('home_trust_ranking', 'Ranking is nooit te koop — lees hoe het werkt')}
            </Link>
          </div>
        </section>

        {/* Real providers from the finder — clients see immediately that
            finding someone is a thing you can do here. Neutral order, never
            curated, never paid (dichotomieverbod). */}
        <FeaturedProviders />

        {/* For providers */}
        <section id="providers" className="border-t border-border bg-card">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl space-y-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <HeartHandshake className="h-4 w-4 text-primary" />
                  {t('home_providers_eyebrow', 'Voor hulpverleners')}
                </span>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {t('home_providers_title', 'Laat cliënten je vinden en beheer je praktijk')}
                </h2>
                <p className="text-muted-foreground">
                  {t(
                    'home_providers_body',
                    'Maak een publiek profiel aan in de finder, ontvang aanvragen van goed passende cliënten en run je hele praktijk in één omgeving.',
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                {bypass ? (
                  <Button
                    size="lg"
                    onClick={() => enterAs('therapist', '/dashboard/therapist/public-profile')}
                  >
                    <Stethoscope className="h-4 w-4" />
                    {t('home_providers_cta', 'Word hulpverlener op Bondable')}
                  </Button>
                ) : (
                  <Button asChild size="lg">
                    <Link to="/signup/provider">
                      <Stethoscope className="h-4 w-4" />
                      {t('home_providers_cta', 'Word hulpverlener op Bondable')}
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* The provider workday, shown not told: prep → 90s admin → leads */}
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <ProviderTodayVignette />
                <p className="mt-2.5 text-label text-muted-foreground">
                  {t('home_prov_vig_today', 'Kom voorbereid in elke sessie — laatste notitie, huiswerk en wat je cliënt wil bespreken.')}
                </p>
              </div>
              <div>
                <AdminChainVignette />
                <p className="mt-2.5 text-label text-muted-foreground">
                  {t('home_prov_vig_chain', 'Notitie, factuur en terugbetalingsattest in één beweging na je sessie.')}
                </p>
              </div>
              <div>
                <LeadsVignette />
                <p className="mt-2.5 text-label text-muted-foreground">
                  {t('home_prov_vig_leads', 'Aanvragen van cliënten die al voorbereid zijn: intake ingevuld, nulmeting klaar.')}
                </p>
              </div>
            </div>

            <p className="mt-8 text-body-sm text-muted-foreground">
              {t('home_prov_pricing_note', 'Gratis tot 15 actieve cliënten.')}{' '}
              <Link
                to="/pricing"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {t('home_prov_pricing_link', 'Bekijk prijzen')}
              </Link>
            </p>
          </div>
        </section>

        {/* Demo / inspect — quiet dev-only strip (behavior + handlers intact) */}
        {bypass && (
          <section className="border-t border-border bg-background">
            <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
              <div className="rounded-card border border-dashed border-border bg-card p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-ctl bg-secondary text-primary">
                    <Lock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t('home_demo_title', 'Bekijk de app (demo)')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        'home_demo_subtitle',
                        'Stap zonder login binnen om alles te inspecteren.',
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => enterAs('therapist')}
                    className="h-12 justify-start gap-3 rounded-ctl"
                  >
                    <Stethoscope className="h-4 w-4 text-primary" />
                    {t('home_demo_therapist', 'Bekijk als hulpverlener')}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => enterAs('client')}
                    className="h-12 justify-start gap-3 rounded-ctl"
                  >
                    <Users className="h-4 w-4 text-primary" />
                    {t('home_demo_client', 'Bekijk als cliënt')}
                  </Button>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => enterAs('admin')}
                    className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {t('home_demo_admin', 'Of bekijk de superadmin →')}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div className="max-w-xs">
              <div className="flex items-center gap-2">
                <img src="/favicon.ico" alt="" className="h-6 w-6" />
                <span className="text-sm font-semibold text-primary">Bondable</span>
              </div>
              <p className="mt-2 text-body-sm text-muted-foreground">
                {t(
                  'home_footer_tagline',
                  'Mentale steun die je verbindt, niet vervangt. Gemaakt in België.',
                )}
              </p>
            </div>

            <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-body-sm sm:grid-cols-2">
              <Link to="/find" className="text-muted-foreground hover:text-foreground">
                {t('home_nav_find', 'Vind hulp')}
              </Link>
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground">
                {t('home_nav_pricing', 'Prijzen')}
              </Link>
              <Link
                to="/how-ranking-works"
                className="text-muted-foreground hover:text-foreground"
              >
                {t('home_footer_ranking', 'Hoe we rangschikken')}
              </Link>
              <Link to="/login" className="text-muted-foreground hover:text-foreground">
                {t('home_nav_login', 'Inloggen')}
              </Link>
            </nav>
          </div>

          {/* Crisis line stays visible on every public page — safety before marketing. */}
          <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t(
                'home_footer_neutral',
                'Onafhankelijke matching op basis van fit, nooit op betaling. © Bondable',
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                'home_footer_crisis',
                'Bondable is geen noodhulp. Bel 112, of de Zelfmoordlijn 1813 (BE) / 113 (NL).',
              )}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

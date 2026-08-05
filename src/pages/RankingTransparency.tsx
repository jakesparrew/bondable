/**
 * RankingTransparency — Bondable's PUBLIC ranking-transparency page, at
 * `/how-ranking-works`.
 *
 * Ticket T-MG-4 · plan 05 §2.4. Standalone public page with its own slim top nav
 * and footer (like Home) — NOT DashboardLayout. Plain-language explanation that
 * the finder ranks ONLY on fit (specialisatie, taal, plaats, beschikbaarheid),
 * that payment/tier NEVER affects ranking or placement (Belgian dichotomieverbod
 * + EU P2B main-parameters disclosure, Art. 5), and what the Erkend / coach
 * badges mean (transparency, not ranking).
 *
 * Calm, editorial. ShieldCheck motif. Exactly one Fraunces level (the h1).
 * ANTI-SLOP: no mint, no gradients, no emoji, border-first, warm-professional
 * Flemish je/jij, zero exclamation marks. Strings via t('key','NL default').
 */

import { Link } from 'react-router-dom';
import Seo from '@/components/seo/Seo';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Search,
  LogIn,
  Languages,
  MapPin,
  Sparkles,
  CalendarClock,
  Ban,
  BadgeCheck,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const RankingTransparency = () => {
  const { t } = useTranslation();

  /* The four ranking inputs — the ONLY signals the finder consults (§2.4). */
  const factors = [
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: t('ranking_factor_spec_title', 'Specialisatie'),
      body: t(
        'ranking_factor_spec_body',
        'Waarmee je begeleider werkt — angst, rouw, relaties, werkstress — afgezet tegen waar jij hulp bij zoekt.',
      ),
    },
    {
      icon: <Languages className="h-5 w-5" />,
      title: t('ranking_factor_lang_title', 'Taal'),
      body: t(
        'ranking_factor_lang_body',
        'De talen waarin je begeleider werkt, zodat je een gesprek voert in de taal die voor jou vertrouwd voelt.',
      ),
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      title: t('ranking_factor_place_title', 'Plaats'),
      body: t(
        'ranking_factor_place_body',
        'Waar je begeleider werkt, en of het online of ter plaatse is — praktisch dichtbij wanneer dat telt.',
      ),
    },
    {
      icon: <CalendarClock className="h-5 w-5" />,
      title: t('ranking_factor_avail_title', 'Beschikbaarheid'),
      body: t(
        'ranking_factor_avail_body',
        'Of je begeleider op dit moment nieuwe cliënten aanneemt, zodat je geen tijd verliest aan volle agenda’s.',
      ),
    },
  ];

  /* What NEVER touches ranking — the fence, stated plainly. */
  const excluded = [
    t('ranking_excl_tier', 'Welk abonnement een begeleider heeft (Gratis, Pro of Praktijk)'),
    t('ranking_excl_pay', 'Of een begeleider ons betaalt — betalen koopt gereedschap, geen plaats'),
    t('ranking_excl_seats', 'Het aantal zetels of de omvang van een praktijk'),
    t('ranking_excl_boost', 'Er bestaan geen uitgelichte plaatsen, geen gebooste kaarten, geen advertenties'),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Seo
        path="/how-ranking-works"
        title="Hoe de finder rangschikt"
        description="Bondable rangschikt hulpverleners alleen op fit: specialisatie, taal, plaats en beschikbaarheid. Betaling of abonnement heeft nooit invloed op je plaats in de resultaten."
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
              <Link to="/pricing">{t('ranking_nav_pricing', 'Prijzen')}</Link>
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
        {/* ── Hero — the ONLY Fraunces on the page ────────────────────────── */}
        <section className="mx-auto w-full max-w-[820px] px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t('ranking_eyebrow', 'Transparantie · dichtomieverbod + EU P2B')}
          </span>
          <h1 className="mt-5 font-display text-display-lg text-foreground">
            {t('ranking_title', 'Hoe de finder rangschikt')}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            {t(
              'ranking_lede',
              'De finder rangschikt begeleiders op één ding: hoe goed ze bij jou passen. Niet op wie het meeste betaalt, want dat kan bij ons niet. Hieronder lees je precies welke signalen we gebruiken — en welke we bewust nooit aanraken.',
            )}
          </p>
        </section>

        {/* ── The four fit factors ────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[820px] px-4 sm:px-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {t('ranking_factors_title', 'Waarop we wél rangschikken: fit')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              'ranking_factors_sub',
              'Vier signalen, allemaal over de match tussen jou en je begeleider. Meer niet.',
            )}
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {factors.map((f) => (
              <div
                key={f.title}
                className="rounded-card border border-border bg-card p-5 transition-all hover:border-primary/20 hover:shadow-raise"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-ctl bg-secondary text-primary">
                  {f.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The fence: what never affects ranking ───────────────────────── */}
        <section className="mx-auto w-full max-w-[820px] px-4 py-12 sm:px-6">
          <div className="rounded-hero border border-primary/25 bg-secondary/40 p-6 sm:p-9">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl border border-primary/30 bg-card text-primary">
                <Ban className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {t('ranking_fence_title', 'Waarop we nooit rangschikken: geld')}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {t(
                    'ranking_fence_body',
                    'Betaling verandert nooit de volgorde of plaats van een begeleider in de finder. Dit staat niet alleen in ons beleid — het zit ingebouwd in de code. De rangschikking krijgt gegevens over abonnement, zetels of betaalstatus simpelweg niet te zien, en een test in onze bouwstraat blokkeert elke wijziging die dat zou doorbreken.',
                  )}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {excluded.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Ban className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Law note */}
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {t(
              'ranking_law_note',
              'Waarom zo streng? In België verbiedt het dichotomieverbod dat betaling de doorverwijzing naar zorg beïnvloedt. De Europese P2B-verordening verplicht ons bovendien om onze belangrijkste rangschikkingscriteria openlijk te tonen — deze pagina doet dat. We passen die regel overal toe, niet enkel waar de wet ons dwingt.',
            )}
          </p>
        </section>

        {/* ── Badges: transparency, not ranking ───────────────────────────── */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto w-full max-w-[820px] px-4 py-12 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {t('ranking_badges_title', 'Wat de badges betekenen')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                'ranking_badges_sub',
                'Badges geven je context over een begeleider. Ze veranderen nooit de volgorde in de finder.',
              )}
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-4 rounded-card border border-border bg-background p-5">
                <span className="mt-0.5">
                  <Badge variant="trust" className="gap-1">
                    <BadgeCheck className="h-3 w-3" />
                    {t('ranking_badge_regulated_label', 'Erkend')}
                  </Badge>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t('ranking_badge_regulated_title', 'Erkende hulpverlener')}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {t(
                      'ranking_badge_regulated_body',
                      'Deze begeleider is een wettelijk erkende zorgverlener, bijvoorbeeld een klinisch psycholoog of psychotherapeut met een erkenning. De badge toont een feit over hun statuut — het is geen keurmerk van ons en geeft geen voorrang in de rangschikking.',
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-card border border-border bg-background p-5">
                <span className="mt-0.5">
                  <Badge variant="outline">{t('ranking_badge_coach_label', 'Coach')}</Badge>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t('ranking_badge_coach_title', 'Coach of begeleider')}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {t(
                      'ranking_badge_coach_body',
                      'Deze begeleider werkt als coach of niet-erkende hulpverlener. Dat maakt hen niet minder waardevol — het is een ander soort ondersteuning. Ook deze badge is louter informatie en speelt geen rol in de volgorde.',
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ─────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[820px] px-4 py-14 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {t('ranking_cta_title', 'Klaar om iemand te vinden die past?')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  'ranking_cta_body',
                  'Zoek op fit — specialisatie, taal en plaats. Rustig en neutraal.',
                )}
              </p>
            </div>
            <Button asChild size="lg" className="rounded-ctl">
              <Link to="/find">
                <Search className="h-5 w-5" />
                {t('ranking_cta_button', 'Vind een begeleider')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
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
            <Link to="/pricing" className="hover:text-foreground">
              {t('ranking_nav_pricing', 'Prijzen')}
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

export default RankingTransparency;

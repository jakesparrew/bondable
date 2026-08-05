/**
 * WachttijdenStad — de stadspagina van de Wachtlijstradar (/wachttijden/:stad).
 *
 * Dit is de Belgische SEO-inzet. "Wachttijd psycholoog Gent" is een zoekopdracht
 * met intentie: iemand zit vast en wil weten waar hij wél binnen kan. Elke stad
 * krijgt daarom een eigen pagina met een eigen canonical, een eigen h1 en een
 * antwoord dat klopt: de band per discipline, wie er vandaag nog aanneemt, en
 * wat je kan doen terwijl je wacht.
 *
 * EERLIJK BOVEN ALLES: bij elk cijfer staat waarop het steunt. De enige harde
 * lijst op deze pagina zijn de hulpverleners die nú nieuwe cliënten aannemen —
 * dat zijn echte profielen, geen schatting.
 *
 * DICHOTOMIEVERBOD: die lijst is neutraal geordend (op naam, zoals de finder).
 * Betaling speelt nergens mee.
 *
 * ANTI-SLOP: precies één Fraunces-niveau (de h1), border-first, semantische
 * kleuren, geen gradients. Alle strings via t('key','NL default').
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronLeft, MapPin, ShieldCheck } from 'lucide-react';

import FinderLayout from '@/components/finder/FinderLayout';
import Seo from '@/components/seo/Seo';
import EmptyState from '@/components/ui/empty-state';
import LineWave from '@/components/illustration/LineWave';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { providerBadge, providerLabel } from '@/lib/providerTypes';
import WachtruimteCrisis from '@/features/wachtruimte/WachtruimteCrisis';
import WaitlistCapture from '@/features/wachtruimte/WaitlistCapture';
import {
  DISCIPLINES,
  WAIT_BAND_META,
  bandMeta,
  disciplineMeta,
  getAcceptingProviders,
  getCity,
  type CityWait,
  type DisciplineWait,
} from '@/services/api/waitTimeService';
import type { Provider } from '@/services/api/finderService';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const pct = (share: number): string => `${Math.round(share * 100)}%`;

const WachttijdenStad = () => {
  const { t } = useTranslation();
  const { stad } = useParams<{ stad: string }>();
  const slug = (stad ?? '').toLowerCase();

  const [city, setCity] = useState<CityWait | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getCity(slug), getAcceptingProviders(slug)])
      .then(([found, accepting]) => {
        if (!active) return;
        setCity(found);
        setProviders(accepting);
      })
      .catch(() => {
        if (!active) return;
        setCity(null);
        setProviders([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  /* ----- laden -------------------------------------------------------- */
  if (loading) {
    return (
      <FinderLayout>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-card" />
            ))}
          </div>
        </div>
      </FinderLayout>
    );
  }

  /* ----- onbekende stad ------------------------------------------------ */
  if (!city) {
    return (
      <FinderLayout>
        <Seo
          path={`/wachttijden/${slug}`}
          title="Deze stad staat nog niet in de wachtlijstradar"
          description="We publiceren wachttijden voor de Vlaamse centrumsteden en Brussel. Bekijk het volledige overzicht per stad."
          noIndex
        />
        <div className="mx-auto w-full max-w-2xl">
          <EmptyState
            bordered
            motif={<LineWave />}
            title={t('wachttijden_stad_404_title', 'Deze stad staat er nog niet bij')}
            description={t(
              'wachttijden_stad_404_body',
              'We publiceren voorlopig de Vlaamse centrumsteden en Brussel. Bekijk het overzicht om te zien wat er wel al is.',
            )}
            action={
              <Button asChild>
                <Link to="/wachttijden">
                  {t('wachttijden_stad_404_cta', 'Naar alle wachttijden')}
                </Link>
              </Button>
            }
          />
        </div>
      </FinderLayout>
    );
  }

  const psycholoog = city.disciplines.find((d) => d.disciplineId === 'psycholoog');
  const headline = bandMeta(city.headlineBand);

  /* JSON-LD: FAQPage — dit is letterlijk hoe mensen de vraag stellen. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Hoe lang is de wachttijd voor een psycholoog in ${city.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: psycholoog
            ? `Indicatief ${bandMeta(psycholoog.band).label.toLowerCase()}, op basis van ${psycholoog.declaredCount} opgegeven wachttijden in ${city.name}. ${Math.round(psycholoog.acceptingShare * 100)}% van de psychologen in ons panel neemt op dit moment nieuwe cliënten aan.`
            : `We hebben voor ${city.name} nog te weinig opgaven om een betrouwbare wachttijd te publiceren.`,
        },
      },
      {
        '@type': 'Question',
        name: `Zijn er in ${city.name} hulpverleners die nu nieuwe cliënten aannemen?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            providers.length > 0
              ? `Ja. Op dit moment staan er ${providers.length} hulpverleners in ${city.name} op Bondable die nieuwe cliënten aannemen.`
              : `Op dit moment staat er in ${city.name} niemand op Bondable die nieuwe cliënten aanneemt. Je kan je e-mailadres achterlaten om bericht te krijgen zodra er een plek vrijkomt.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Wat kan je doen terwijl je op een wachtlijst staat?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Je kan vandaag al beginnen: praten met The Coach (begeleide AI onder supervisie van een hulpverlener), je intake alvast invullen, een nulmeting doen en noteren wat je wil bespreken. Zo is je eerste gesprek meteen drie gesprekken waard.',
        },
      },
    ],
  };

  return (
    <FinderLayout>
      <Seo
        path={`/wachttijden/${city.slug}`}
        title={`Wachttijd psycholoog en therapeut in ${city.name}`}
        description={`Hoe lang wacht je in ${city.name} op een psycholoog, psychotherapeut of coach? Indicatieve wachttijden per discipline, plus de hulpverleners die vandaag nieuwe cliënten aannemen.`}
        jsonLd={jsonLd}
      />

      <article className="mx-auto w-full max-w-4xl space-y-12">
        {/* Kop ----------------------------------------------------------- */}
        <header className="space-y-4">
          <Link
            to="/wachttijden"
            className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t('wachttijden_stad_back', 'Alle wachttijden')}
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {city.province}
            </Badge>
            <Badge variant={headline.tone}>{headline.short}</Badge>
          </div>

          <h1 className="font-display text-display-lg text-foreground">
            {t(
              'wachttijden_stad_title',
              'Wachttijden psycholoog en therapeut in {{city}}',
              { city: city.name },
            )}
          </h1>

          <p className="max-w-2xl text-muted-foreground">
            {psycholoog
              ? t(
                  'wachttijden_stad_intro',
                  'Voor een psycholoog in {{city}} reken je indicatief op {{band}}. Dat cijfer steunt op {{n}} opgegeven wachttijden; {{share}} van de profielen neemt op dit moment nieuwe cliënten aan.',
                  {
                    city: city.name,
                    band: bandMeta(psycholoog.band).label.toLowerCase(),
                    n: psycholoog.declaredCount,
                    share: pct(psycholoog.acceptingShare),
                  },
                )
              : t(
                  'wachttijden_stad_intro_thin',
                  'Voor {{city}} hebben we nog te weinig opgaven om een betrouwbare wachttijd te publiceren.',
                  { city: city.name },
                )}
          </p>

          <p className="text-body-sm text-muted-foreground">
            {t('wachttijden_stad_updated', 'Laatst bijgewerkt op {{date}}', {
              date: formatDate(city.updatedAt),
            })}
            {' · '}
            {t('wachttijden_stad_indicative', 'indicatief, geen meting')}
          </p>
        </header>

        {/* Per discipline -------------------------------------------------- */}
        <section aria-labelledby="stad-disciplines" className="space-y-4">
          <h2
            id="stad-disciplines"
            className="text-title font-semibold text-foreground"
          >
            {t('wachttijden_stad_disc_title', 'Per discipline in {{city}}', {
              city: city.name,
            })}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {DISCIPLINES.map((d) => {
              const row = city.disciplines.find((r) => r.disciplineId === d.id);
              if (!row) return null;
              return <DisciplineCard key={d.id} row={row} />;
            })}
          </div>
        </section>

        {/* Wie neemt aan --------------------------------------------------- */}
        <section aria-labelledby="stad-aanname" className="space-y-4">
          <div>
            <h2
              id="stad-aanname"
              className="text-title font-semibold text-foreground"
            >
              {t(
                'wachttijden_stad_open_title',
                'Wie neemt vandaag nieuwe cliënten aan in {{city}}',
                { city: city.name },
              )}
            </h2>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {t(
                'wachttijden_stad_open_sub',
                'Dit zijn echte profielen op Bondable, geen schatting. De volgorde is alfabetisch — betaling speelt hier nergens mee.',
              )}
            </p>
          </div>

          {providers.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {providers.map((provider) => {
                const badge = providerBadge(
                  {
                    providerType: provider.providerType,
                    verificationStatus: provider.verificationStatus,
                    isRegulated: provider.isRegulated,
                  },
                  t,
                );
                return (
                  <li key={provider.id}>
                    <Link
                      to={`/find/${provider.id}`}
                      className="flex h-full flex-col rounded-card border border-border bg-card p-5 transition-shadow hover:shadow-raise"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-body font-semibold text-foreground">
                          {provider.fullName}
                        </p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="mt-1 text-body-sm text-muted-foreground">
                        {providerLabel(provider.providerType, t, {
                          capitalize: true,
                        })}
                        {provider.city ? ` · ${provider.city}` : ''}
                      </p>
                      {provider.headline && (
                        <p className="mt-2 flex-1 text-body-sm text-muted-foreground">
                          {provider.headline}
                        </p>
                      )}
                      <span className="mt-3 inline-flex items-center gap-1 text-body-sm font-medium text-primary">
                        {t('wachttijden_stad_open_view', 'Bekijk profiel')}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-card border border-dashed border-border bg-card p-6">
              <p className="text-body font-semibold text-foreground">
                {t(
                  'wachttijden_stad_none_title',
                  'Op dit moment staat er niemand open in {{city}}',
                  { city: city.name },
                )}
              </p>
              <p className="mt-1 max-w-xl text-body-sm text-muted-foreground">
                {t(
                  'wachttijden_stad_none_body',
                  'Dat verandert regelmatig. Laat je e-mailadres achter, dan laten we het weten zodra er een plek vrijkomt.',
                )}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/find">
                {t('wachttijden_stad_to_find', 'Bekijk alle hulpverleners')}
              </Link>
            </Button>
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link to="/find/match">
                {t('wachttijden_stad_to_match', 'Help me kiezen')}
              </Link>
            </Button>
          </div>
        </section>

        {/* Wachtlijst-opvang ------------------------------------------------ */}
        <WaitlistCapture source="wachttijden_stad" cityName={city.name} />

        {/* Wachtruimte-CTA -------------------------------------------------- */}
        <section className="rounded-card border border-border bg-card p-6 sm:p-8">
          <h2 className="text-title font-semibold text-foreground">
            {t(
              'wachttijden_stad_cta_title',
              'Je hoeft niet te wachten om te beginnen',
            )}
          </h2>
          <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
            {t(
              'wachttijden_stad_cta_body',
              'Zet je op een wachtlijst én gebruik die maanden. In De Wachtruimte praat je vandaag met The Coach, vul je je intake alvast in, doe je een nulmeting en noteer je wat je wil bespreken. Je eerste gesprek is daarmee meteen drie gesprekken waard.',
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="gap-1.5">
              <Link to={`/wachtruimte?stad=${city.slug}`}>
                {t('wachttijden_stad_cta_go', 'Ga naar De Wachtruimte')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/wachttijden">
                {t('wachttijden_stad_cta_index', 'Vergelijk met andere steden')}
              </Link>
            </Button>
          </div>
          <p className="mt-5 inline-flex items-center gap-2 text-body-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {t(
              'wachttijden_stad_neutral',
              'Onafhankelijk en neutraal: geen gesponsorde plaatsing, nergens.',
            )}
          </p>
        </section>

        <WachtruimteCrisis compact />
      </article>
    </FinderLayout>
  );
};

/* -------------------------------------------------------------------------- */

const DisciplineCard = ({ row }: { row: DisciplineWait }) => {
  const { t } = useTranslation();
  const meta = disciplineMeta(row.disciplineId);
  const band = bandMeta(row.band);

  return (
    <div className="rounded-card border border-border bg-card p-5">
      <p className="text-body font-semibold text-foreground">{meta.plural}</p>

      {row.lowConfidence ? (
        <p className="mt-3 text-body-sm text-muted-foreground">
          {t(
            'wachttijden_stad_thin',
            'Te weinig opgaven om een band te publiceren.',
          )}
        </p>
      ) : (
        <>
          <div className="mt-3">
            <Badge variant={band.tone}>{band.short}</Badge>
          </div>
          <p className="mt-2 text-body-sm text-muted-foreground">{band.label}</p>
        </>
      )}

      <dl className="mt-4 space-y-1.5 border-t border-border pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-body-sm text-muted-foreground">
            {t('wachttijden_stad_accepting', 'Neemt nieuwe cliënten aan')}
          </dt>
          <dd className="tabular text-body-sm font-medium text-foreground">
            {pct(row.acceptingShare)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-body-sm text-muted-foreground">
            {t('wachttijden_stad_declared', 'Opgegeven wachttijden')}
          </dt>
          <dd className="tabular text-body-sm font-medium text-foreground">
            {row.declaredCount}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-body-sm text-muted-foreground">
            {t('wachttijden_stad_profiles', 'Profielen in het panel')}
          </dt>
          <dd className="tabular text-body-sm font-medium text-foreground">
            {row.profileCount}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-body-sm text-muted-foreground">
        {t(
          'wachttijden_stad_basis',
          'Indicatief, op basis van {{n}} profielen.',
          { n: row.profileCount },
        )}
        {row.demandAdjusted
          ? ` ${t(
              'wachttijden_stad_adjusted',
              'Eén stap verlengd door de hoge vraagdruk hier; de mediaan zelf was {{median}}.',
              { median: WAIT_BAND_META[row.medianBand].short },
            )}`
          : ''}
      </p>
    </div>
  );
};

export default WachttijdenStad;

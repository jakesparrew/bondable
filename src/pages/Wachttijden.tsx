/**
 * Wachttijden — de publieke Bondable Wachtlijstradar (/wachttijden).
 *
 * WAAROM DEZE PAGINA BESTAAT: "wachttijd psycholoog Gent" is exact wat mensen
 * in Vlaanderen googelen, en er is geen enkele plek die daar een eerlijk,
 * citeerbaar antwoord op geeft. Deze pagina is dus drie dingen tegelijk:
 * een dienst aan wie zoekt, een bron die een journalist kan citeren (en
 * daarmee de enige backlinks die een nieuw domein niet kan kopen), en de reden
 * waarom een hulpverlener zijn profiel komt claimen.
 *
 * REDACTIONEEL, NIET COMMERCIEEL. De cijfers staan voorop, de methode staat er
 * in gewone taal bij inclusief wat we NIET weten, en de licentie laat overnemen
 * met bronvermelding expliciet toe. Wie iets verzwijgt, wordt niet geciteerd.
 *
 * DICHOTOMIEVERBOD: betaling speelt hier nergens mee. Een stad of een profiel
 * staat nooit hoger omdat er betaald is; de enige sorteringen zijn alfabetisch,
 * op wachttijd of op het aandeel dat nog aanneemt.
 *
 * ANTI-SLOP: precies één Fraunces-niveau (de h1), geen gradients, geen emoji,
 * border-first, semantische kleuren. Alle strings via t('key','NL default').
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ArrowUpDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

import FinderLayout from '@/components/finder/FinderLayout';
import Seo from '@/components/seo/Seo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import WachtruimteCrisis from '@/features/wachtruimte/WachtruimteCrisis';
import {
  DISCIPLINES,
  MIN_DECLARED,
  WAIT_BAND_META,
  bandMeta,
  getCityIndex,
  getLastUpdated,
  getNationalSummary,
  type CityWait,
  type DisciplineId,
  type NationalSummary,
  type WaitBand,
} from '@/services/api/waitTimeService';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type BadgeVariant = 'success' | 'info' | 'warning' | 'destructive';

const toneToVariant = (band: WaitBand): BadgeVariant =>
  WAIT_BAND_META[band].tone;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const pct = (share: number): string => `${Math.round(share * 100)}%`;

type SortKey = 'stad' | DisciplineId | 'aanname';

interface BandCellProps {
  city: CityWait;
  disciplineId: DisciplineId;
}

/** Eén bandcel: de band, plus een sterretje wanneer de vraagdruk meespeelde. */
const BandCell = ({ city, disciplineId }: BandCellProps) => {
  const { t } = useTranslation();
  const row = city.disciplines.find((d) => d.disciplineId === disciplineId);
  if (!row) return <span className="text-muted-foreground">—</span>;

  if (row.lowConfidence) {
    return (
      <span className="text-body-sm text-muted-foreground">
        {t('wachttijden_too_thin', 'Te weinig opgaven')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant={toneToVariant(row.band)}>{bandMeta(row.band).short}</Badge>
      {row.demandAdjusted && (
        <span
          className="text-body-sm text-muted-foreground"
          title={t(
            'wachttijden_adjusted_tip',
            'Eén stap verlengd door de hoge vraagdruk in deze stad. De mediaan zelf lag één band korter.',
          )}
        >
          *
        </span>
      )}
    </span>
  );
};

/* -------------------------------------------------------------------------- */

const Wachttijden = () => {
  const { t } = useTranslation();

  const [cities, setCities] = useState<CityWait[]>([]);
  const [summary, setSummary] = useState<NationalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('stad');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getCityIndex(), getNationalSummary()])
      .then(([list, national]) => {
        if (!active) return;
        setCities(list);
        setSummary(national);
      })
      .catch(() => {
        if (!active) return;
        setCities([]);
        setSummary(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updatedAt = summary?.updatedAt ?? getLastUpdated();

  const sorted = useMemo(() => {
    const bandOrder = (city: CityWait, id: DisciplineId): number => {
      const row = city.disciplines.find((d) => d.disciplineId === id);
      return row ? WAIT_BAND_META[row.band].order : -1;
    };
    const copy = [...cities];
    copy.sort((a, b) => {
      let delta = 0;
      if (sortKey === 'stad') delta = a.name.localeCompare(b.name);
      else if (sortKey === 'aanname') delta = a.acceptingShare - b.acceptingShare;
      else delta = bandOrder(a, sortKey) - bandOrder(b, sortKey);
      if (delta === 0) delta = a.name.localeCompare(b.name);
      return sortAsc ? delta : -delta;
    });
    return copy;
  }, [cities, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  /* JSON-LD: een Dataset, want dat is dit ook echt. Vrij te citeren met bron. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Wachttijden voor psychologische hulp in België',
    description:
      'Indicatieve wachttijden voor psychologen, psychotherapeuten en coaches per Belgische stad, met het aandeel hulpverleners dat nieuwe cliënten aanneemt.',
    url: 'https://bondable.be/wachttijden',
    inLanguage: 'nl-BE',
    isAccessibleForFree: true,
    dateModified: updatedAt,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: {
      '@type': 'Organization',
      name: 'Bondable',
      url: 'https://bondable.be',
    },
    spatialCoverage: cities.map((c) => ({
      '@type': 'Place',
      name: c.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: c.name,
        addressRegion: c.province,
        addressCountry: 'BE',
      },
    })),
    variableMeasured: [
      {
        '@type': 'PropertyValue',
        name: 'Indicatieve wachttijdband',
        description:
          'Mediaan van de door hulpverleners opgegeven wachttijd, in banden: direct, 2-4 weken, 1-2 maanden, 3 maanden of langer, wachtlijst gesloten.',
      },
      {
        '@type': 'PropertyValue',
        name: 'Aandeel dat nieuwe cliënten aanneemt',
        description:
          'Deel van de profielen in een stad dat op het moment van bijwerken nieuwe cliënten aanvaardt.',
      },
    ],
  };

  return (
    <FinderLayout>
      <Seo
        path="/wachttijden"
        title="Wachttijden psycholoog en therapeut in België"
        description="Hoe lang wacht je op een psycholoog in Gent, Antwerpen, Leuven of Brussel? Indicatieve wachttijden per stad en per discipline, plus wie er vandaag nog nieuwe cliënten aanneemt. Wekelijks bijgewerkt."
        jsonLd={jsonLd}
      />

      <article className="mx-auto w-full max-w-5xl space-y-12">
        {/* Kop ----------------------------------------------------------- */}
        <header className="max-w-3xl space-y-4">
          <Badge variant="outline">
            {t('wachttijden_eyebrow', 'Wachtlijstradar')}
          </Badge>
          <h1 className="font-display text-display-lg text-foreground">
            {t(
              'wachttijden_title',
              'Hoe lang wacht je op psychologische hulp in België',
            )}
          </h1>
          <p className="text-muted-foreground">
            {t(
              'wachttijden_intro',
              'Drie tot zes maanden wachten op een psycholoog is in Vlaanderen geen uitzondering, en niemand publiceert daar cijfers over. Wij wel — indicatief, met de methode erbij, en met de eerlijke vermelding van wat we niet weten.',
            )}
          </p>
          <p className="text-body-sm text-muted-foreground">
            {t('wachttijden_updated', 'Laatst bijgewerkt op {{date}}', {
              date: formatDate(updatedAt),
            })}
            {' · '}
            {t('wachttijden_cadence', 'we verversen wekelijks')}
          </p>
        </header>

        {/* Landelijke samenvatting --------------------------------------- */}
        <section aria-labelledby="wachttijden-nationaal" className="space-y-4">
          <h2
            id="wachttijden-nationaal"
            className="text-title font-semibold text-foreground"
          >
            {t('wachttijden_national_title', 'Het landelijke beeld')}
          </h2>

          {loading || !summary ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-card border border-border bg-card p-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-7 w-20" />
                  <Skeleton className="mt-2 h-3 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid animate-enter grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t('wachttijden_stat_psy', 'Psycholoog, landelijk')}
                value={bandMeta(summary.bandByDiscipline.psycholoog).short}
                note={t(
                  'wachttijden_stat_psy_note',
                  'Mediaan over {{n}} opgegeven wachttijden van psychologen.',
                  { n: summary.declaredByDiscipline.psycholoog },
                )}
              />
              <StatCard
                label={t('wachttijden_stat_cities', 'Steden op 3+ maanden')}
                value={`${summary.citiesAtThreeMonths}/${summary.cityCount}`}
                note={t(
                  'wachttijden_stat_cities_note',
                  'Steden waar je voor een psycholoog drie maanden of langer wacht.',
                )}
              />
              <StatCard
                label={t('wachttijden_stat_accepting', 'Neemt nieuwe cliënten aan')}
                value={pct(summary.acceptingShare)}
                note={t(
                  'wachttijden_stat_accepting_note',
                  'Van de {{n}} profielen in ons panel.',
                  { n: summary.profileCount },
                )}
              />
              <StatCard
                label={t('wachttijden_stat_coach', 'Coach, landelijk')}
                value={bandMeta(summary.bandByDiscipline.coach).short}
                note={t(
                  'wachttijden_stat_coach_note',
                  'Coaching is geen erkende zorg, maar de deur staat er sneller open. Mediaan over {{n}} opgaven.',
                  { n: summary.declaredByDiscipline.coach },
                )}
              />
            </div>
          )}
        </section>

        {/* Tabel ---------------------------------------------------------- */}
        <section aria-labelledby="wachttijden-steden" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="wachttijden-steden"
                className="text-title font-semibold text-foreground"
              >
                {t('wachttijden_table_title', 'Wachttijd per stad')}
              </h2>
              <p className="mt-1 text-body-sm text-muted-foreground">
                {t(
                  'wachttijden_table_sub',
                  'Klik op een kolomkop om te sorteren. Klik op een stad voor het volledige beeld.',
                )}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-card" />
              ))}
            </div>
          ) : (
            <>
              {/* Tabel vanaf md; daaronder kaarten (360px-veilig) */}
              <div className="hidden overflow-x-auto rounded-card border border-border bg-card md:block">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <SortableHeader
                        label={t('wachttijden_col_city', 'Stad')}
                        active={sortKey === 'stad'}
                        asc={sortAsc}
                        onClick={() => toggleSort('stad')}
                      />
                      {DISCIPLINES.map((d) => (
                        <SortableHeader
                          key={d.id}
                          label={d.label}
                          active={sortKey === d.id}
                          asc={sortAsc}
                          onClick={() => toggleSort(d.id)}
                        />
                      ))}
                      <SortableHeader
                        label={t('wachttijden_col_accepting', 'Neemt aan')}
                        active={sortKey === 'aanname'}
                        asc={sortAsc}
                        onClick={() => toggleSort('aanname')}
                      />
                      <th className="px-4 py-3 text-label uppercase tracking-wide text-muted-foreground">
                        {t('wachttijden_col_profiles', 'Profielen')}
                      </th>
                      <th className="px-4 py-3">
                        <span className="sr-only">
                          {t('wachttijden_col_open', 'Open stad')}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((city) => (
                      <tr
                        key={city.slug}
                        className="border-b border-border last:border-0 hover:bg-muted/40"
                      >
                        <th scope="row" className="px-4 py-3 font-medium text-foreground">
                          <Link
                            to={`/wachttijden/${city.slug}`}
                            className="hover:text-primary hover:underline underline-offset-4"
                          >
                            {city.name}
                          </Link>
                          <span className="block text-body-sm font-normal text-muted-foreground">
                            {city.province}
                          </span>
                        </th>
                        {DISCIPLINES.map((d) => (
                          <td key={d.id} className="px-4 py-3">
                            <BandCell city={city} disciplineId={d.id} />
                          </td>
                        ))}
                        <td className="px-4 py-3 tabular text-foreground">
                          {pct(city.acceptingShare)}
                        </td>
                        <td className="px-4 py-3 tabular text-muted-foreground">
                          {city.profileCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/wachttijden/${city.slug}`}
                            aria-label={t('wachttijden_open_city', 'Open {{city}}', {
                              city: city.name,
                            })}
                            className="inline-flex text-muted-foreground hover:text-primary"
                          >
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Kaarten onder md */}
              <ul className="space-y-3 md:hidden">
                {sorted.map((city) => (
                  <li key={city.slug}>
                    <Link
                      to={`/wachttijden/${city.slug}`}
                      className="block rounded-card border border-border bg-card p-4 transition-shadow hover:shadow-raise"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-body font-semibold text-foreground">
                            {city.name}
                          </p>
                          <p className="text-body-sm text-muted-foreground">
                            {city.province}
                          </p>
                        </div>
                        <ChevronRight
                          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </div>
                      <dl className="mt-3 space-y-1.5">
                        {DISCIPLINES.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <dt className="text-body-sm text-muted-foreground">
                              {d.label}
                            </dt>
                            <dd>
                              <BandCell city={city} disciplineId={d.id} />
                            </dd>
                          </div>
                        ))}
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-body-sm text-muted-foreground">
                            {t('wachttijden_col_accepting', 'Neemt aan')}
                          </dt>
                          <dd className="tabular text-body-sm text-foreground">
                            {pct(city.acceptingShare)}
                            {' · '}
                            {t('wachttijden_profiles_n', '{{n}} profielen', {
                              n: city.profileCount,
                            })}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="text-body-sm text-muted-foreground">
                {t(
                  'wachttijden_table_footnote',
                  '* Deze band is één stap verlengd omdat de vraagdruk in die stad hoog is en minder dan negen op de tien profielen nog nieuwe cliënten aanneemt.',
                )}
              </p>
            </>
          )}
        </section>

        {/* Wat betekent een band ----------------------------------------- */}
        <section aria-labelledby="wachttijden-legenda" className="space-y-4">
          <h2
            id="wachttijden-legenda"
            className="text-title font-semibold text-foreground"
          >
            {t('wachttijden_legend_title', 'Wat de banden betekenen')}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(WAIT_BAND_META).map((meta) => (
              <li
                key={meta.id}
                className="rounded-card border border-border bg-card p-4"
              >
                <Badge variant={meta.tone}>{meta.short}</Badge>
                <p className="mt-2 text-body-sm text-muted-foreground">
                  {meta.label}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Methode -------------------------------------------------------- */}
        <section
          aria-labelledby="wachttijden-methode"
          className="rounded-card border border-border bg-card p-6 sm:p-8"
        >
          <h2
            id="wachttijden-methode"
            className="text-title font-semibold text-foreground"
          >
            {t('wachttijden_method_title', 'Hoe we dit berekenen')}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-3 text-body-sm text-muted-foreground">
              <p className="text-body font-semibold text-foreground">
                {t('wachttijden_method_how', 'De rekenregel, in gewone taal')}
              </p>
              <p>
                {t(
                  'wachttijden_method_1',
                  'Hulpverleners geven zelf op hoe lang je bij hen wacht. Wij nemen per stad en per discipline de mediaan van die opgaven. Bij een even aantal nemen we de kortste van de twee middelste banden — we schatten liever te kort dan te alarmerend.',
                )}
              </p>
              <p>
                {t(
                  'wachttijden_method_2',
                  'Profielen die géén wachttijd opgeven tellen wel mee voor "neemt nieuwe cliënten aan", maar niet voor de band. Daarom staat er altijd bij op hoeveel profielen een cijfer steunt.',
                )}
              </p>
              <p>
                {t(
                  'wachttijden_method_3',
                  'Gaat het om erkende zorg, is de vraagdruk in die stad hoog en neemt minder dan negen op de tien profielen nog aan, dan verlengen we de band met één stap. Dat markeren we met een sterretje. Bij coaching doen we dat niet — daar is geen wachtlijstcrisis. En zo\'n correctie kan een band nooit op "gesloten" zetten: gesloten is iets dat een praktijk zelf verklaart.',
                )}
              </p>
              <p>
                {t(
                  'wachttijden_method_4',
                  'Onder de {{n}} opgaven noemen we een cijfer te dun en tonen we geen band.',
                  { n: MIN_DECLARED },
                )}
              </p>
            </div>

            <div className="space-y-3 text-body-sm text-muted-foreground">
              <p className="text-body font-semibold text-foreground">
                {t('wachttijden_method_limits', 'Wat dit niet is')}
              </p>
              <p>
                {t(
                  'wachttijden_method_limit_1',
                  'Dit is een indicatie, geen meting. We bellen geen praktijken na en we hebben geen zicht op de wachtlijsten van CGG\'s, ziekenhuizen of huisartsenpraktijken.',
                )}
              </p>
              <p>
                {t(
                  'wachttijden_method_limit_2',
                  'Een wachttijd zegt niets over de kwaliteit van een hulpverlener, en een korte wachttijd is geen aanbeveling. Een stad met een lange wachttijd kan uitstekende zorg hebben.',
                )}
              </p>
              <p>
                {t(
                  'wachttijden_method_limit_3',
                  'Betaling speelt hier nergens mee. Geen enkele stad, discipline of hulpverlener staat hoger omdat er betaald is — dat is bij ons niet te koop.',
                )}
              </p>
              <p>
                {t(
                  'wachttijden_method_limit_4',
                  'Zie je een cijfer dat niet klopt met wat jij in de praktijk ziet? Laat het weten, dan corrigeren we het bij de volgende update.',
                )}
              </p>
              <p className="text-foreground">
                {t(
                  'wachttijden_method_reuse',
                  'Overnemen mag, ook door pers en onderzoek, met bronvermelding en een link naar deze pagina (CC BY 4.0).',
                )}
              </p>
            </div>
          </div>

          <p className="mt-6 inline-flex items-center gap-2 text-body-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {t(
              'wachttijden_method_neutral',
              'Onafhankelijk en neutraal: geen gesponsorde plaatsing, nergens.',
            )}
          </p>
        </section>

        {/* CTA ------------------------------------------------------------ */}
        <section className="rounded-card border border-border bg-card p-6 sm:p-8">
          <h2 className="text-title font-semibold text-foreground">
            {t('wachttijden_cta_title', 'Je hoeft niet te wachten om te beginnen')}
          </h2>
          <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
            {t(
              'wachttijden_cta_body',
              'Sta je op een wachtlijst, dan kan je die maanden gebruiken. In De Wachtruimte praat je vandaag met The Coach, vul je je intake alvast in, doe je een nulmeting en noteer je wat je wil bespreken. Je eerste gesprek is daarmee meteen drie gesprekken waard.',
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="gap-1.5">
              <Link to="/wachtruimte">
                {t('wachttijden_cta_wachtruimte', 'Ga naar De Wachtruimte')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/find">
                {t('wachttijden_cta_find', 'Zoek een hulpverlener')}
              </Link>
            </Button>
          </div>
        </section>

        <WachtruimteCrisis compact />
      </article>
    </FinderLayout>
  );
};

/* -------------------------------------------------------------------------- */

interface StatCardProps {
  label: string;
  value: string;
  note: string;
}

const StatCard = ({ label, value, note }: StatCardProps) => (
  <div className="rounded-card border border-border bg-card p-5">
    <p className="text-label uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-2 text-2xl font-semibold tabular text-foreground">{value}</p>
    <p className="mt-1 text-body-sm text-muted-foreground">{note}</p>
  </div>
);

interface SortableHeaderProps {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}

const SortableHeader = ({ label, active, asc, onClick }: SortableHeaderProps) => (
  <th
    scope="col"
    className="px-4 py-3"
    aria-sort={active ? (asc ? 'ascending' : 'descending') : 'none'}
  >
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-ctl text-label uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  </th>
);

export default Wachttijden;

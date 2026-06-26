/**
 * Find — public Finder marketplace directory.
 *
 * A searchable, trustworthy healthcare-marketplace directory for visitors and
 * prospective clients: a search box + FIT-based filters and a responsive grid
 * of ProviderCards. Data via finderService.listProviders.
 *
 * REFERRAL-NEUTRAL BY DESIGN (EU P2B + Belgian dichotomieverbod): results are
 * ranked PURELY on fit (the service sorts neutrally by name); price/payment is
 * never an input, and there is NO "promoted"/"sponsored" placement — every card
 * renders identically. The regulated-clinician-vs-coach badge is a transparency
 * signal, not a ranking. A "why this match" line on the hero links to the
 * guided matcher (/find/match) for a transparent, explainable recommendation.
 *
 * Light deep-teal brand tokens only on this page (mint is reserved for AI
 * surfaces such as the matcher / Bond). New strings via t('key','default').
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Sparkles, ShieldCheck, X, SlidersHorizontal } from 'lucide-react';

import FinderLayout from '@/components/finder/FinderLayout';
import ProviderCard from '@/components/finder/ProviderCard';
import FinderFilters from '@/components/finder/FinderFilters';
import RequestProviderDialog from '@/components/finder/RequestProviderDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  finderService,
  type Provider,
  type FinderFilters as Filters,
} from '@/services/api/finderService';

/** Build the distinct dropdown option sets from a list of providers. */
function deriveOptions(providers: Provider[]) {
  const specs = new Set<string>();
  const langs = new Set<string>();
  const cities = new Set<string>();
  for (const p of providers) {
    p.specializations.forEach((s) => s && specs.add(s));
    p.languages.forEach((l) => l && langs.add(l));
    if (p.city) cities.add(p.city);
  }
  const sort = (arr: Set<string>) => Array.from(arr).sort((a, b) => a.localeCompare(b));
  return { specializations: sort(specs), languages: sort(langs), cities: sort(cities) };
}

const EMPTY_FILTERS: Filters = {};

const Find = () => {
  const { t } = useTranslation();

  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const [requestTarget, setRequestTarget] = useState<Provider | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  // Load the full, unfiltered set once — used to populate filter dropdowns so
  // the option lists stay stable as the user narrows the results.
  useEffect(() => {
    let active = true;
    finderService
      .listProviders()
      .then((data) => {
        if (active) setAllProviders(data);
      })
      .catch(() => {
        if (active) setAllProviders([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Re-query whenever filters or the (debounced) search term change.
  useEffect(() => {
    let active = true;
    setLoading(true);
    const handle = window.setTimeout(() => {
      finderService
        .listProviders({ ...filters, search: search.trim() || undefined })
        .then((data) => {
          if (active) setProviders(data);
        })
        .catch(() => {
          if (active) setProviders([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [filters, search]);

  const options = useMemo(() => deriveOptions(allProviders), [allProviders]);

  const hasActiveFilters =
    !!search.trim() ||
    Object.values(filters).some((v) => v !== undefined && v !== '' && v !== false);

  const handleResetAll = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
  };

  const openRequest = (provider: Provider) => {
    setRequestTarget(provider);
    setRequestOpen(true);
  };

  return (
    <FinderLayout>
      {/* Hero */}
      <section className="mb-8">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t('finder_find_title', 'Vind een hulpverlener die bij je past')}
              </h1>
              <p className="text-muted-foreground">
                {t(
                  'finder_find_subtitle',
                  'Doorzoek erkende hulpverleners en coaches. We rangschikken op fit — specialisatie, taal en beschikbaarheid — nooit op betaling.',
                )}
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {t(
                  'finder_find_neutrality',
                  'Onafhankelijk en neutraal: geen gesponsorde plaatsing.',
                )}
              </p>
            </div>

            {/* Help me kiezen / Match me CTA — links to the AI matcher */}
            <div className="shrink-0">
              <Button asChild size="lg" className="w-full lg:w-auto">
                <Link to="/find/match">
                  <Sparkles className="h-4 w-4" />
                  {t('finder_find_match_cta', 'Help me kiezen / Match me')}
                </Link>
              </Button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'finder_find_search_ph',
                'Zoek op naam, specialisatie of stad…',
              )}
              className="h-12 pl-10 pr-10 text-base"
              aria-label={t('finder_find_search_aria', 'Zoek hulpverleners')}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={t('finder_find_search_clear', 'Zoekopdracht wissen')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Mobile filter toggle */}
      <div className="mb-4 lg:hidden">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowFiltersMobile((s) => !s)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showFiltersMobile
            ? t('finder_filters_hide', 'Verberg filters')
            : t('finder_filters_show', 'Toon filters')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Filters rail */}
        <div className={showFiltersMobile ? 'block' : 'hidden lg:block'}>
          <div className="lg:sticky lg:top-20">
            <FinderFilters
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(EMPTY_FILTERS)}
              options={options}
            />
          </div>
        </div>

        {/* Results */}
        <div>
          {/* Result count / status row */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {loading
                ? t('finder_results_loading', 'Hulpverleners laden…')
                : t('finder_results_count', '{{count}} hulpverleners gevonden', {
                    count: providers.length,
                  })}
            </p>
            {hasActiveFilters && !loading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAll}
                className="h-8 text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                {t('finder_results_reset', 'Alles wissen')}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-5 w-32 rounded-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-4/5" />
                  <div className="mt-4 flex gap-1.5">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <EmptyState onReset={handleResetAll} hasFilters={hasActiveFilters} />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {providers.map((p) => (
                <ProviderCard key={p.id} provider={p} onRequest={openRequest} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact / request dialog */}
      {requestTarget && (
        <RequestProviderDialog
          provider={requestTarget}
          open={requestOpen}
          onOpenChange={setRequestOpen}
        />
      )}
    </FinderLayout>
  );
};

/* -------------------------------------------------------------------------- */

interface EmptyStateProps {
  hasFilters: boolean;
  onReset: () => void;
}

const EmptyState = ({ hasFilters, onReset }: EmptyStateProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">
        {hasFilters
          ? t('finder_empty_filtered_title', 'Geen hulpverleners gevonden')
          : t('finder_empty_title', 'Nog geen hulpverleners beschikbaar')}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? t(
              'finder_empty_filtered_desc',
              'Pas je zoekopdracht of filters aan om meer resultaten te zien.',
            )
          : t(
              'finder_empty_desc',
              'Er zijn op dit moment geen profielen om te tonen. Kom binnenkort terug.',
            )}
      </p>
      {hasFilters && (
        <Button variant="outline" className="mt-5" onClick={onReset}>
          {t('finder_empty_reset', 'Filters wissen')}
        </Button>
      )}
    </div>
  );
};

export default Find;

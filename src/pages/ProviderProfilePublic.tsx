/**
 * ProviderProfilePublic — public provider profile + contact request.
 *
 * Route /find/:providerId, rendered inside FinderLayout (no RouteProtection, so
 * prospective clients can browse without an account). Fetches a single provider
 * via finderService.getProvider and renders a full profile: hero (photo, name,
 * headline, regulated/coach badge, city, languages, rating), about/bio,
 * specializations, approach, modalities, credentials, years of experience,
 * accepting-new-clients status, and a prominent "Aanvraag / Contact" CTA that
 * opens RequestProviderDialog.
 *
 * REFERRAL-NEUTRAL BY DESIGN (EU P2B + Belgian dichotomieverbod): nothing here
 * ranks or frames a provider by price/payment, and there is NO "promoted"/
 * "sponsored" treatment. hourly_rate (if present) is shown only for
 * transparency, never as a selling point. The is_regulated indicator
 * distinguishes a regulated clinician (therapist/psychologist) from a coach.
 *
 * LOCATION IS OPT-IN AND MAP-FREE. A provider either publishes their full
 * practice address or only their city (many work from home) — finderService
 * already strips street/postcode from the payload in the latter case, so this
 * page renders whatever it is given. There is deliberately NO embedded map:
 * an iframe would set third-party cookies and leak the visitor's IP on load,
 * on a page where someone is looking for a psychologist (special-category
 * context under GDPR/ePrivacy). Instead we link out to OpenStreetMap in a new
 * tab, which costs the visitor nothing until they choose to click.
 *
 * Brand tokens only: bg-background/card/muted, text-foreground/muted-foreground,
 * border-border, bg-primary. The mint token is reserved for AI/matching surfaces
 * (not used here); destructive red is reserved for emergencies (not used here).
 * New strings via t('key', 'English/Dutch default') — locale files untouched.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BadgeCheck,
  Award,
  ShieldCheck,
  MapPin,
  Languages as LanguagesIcon,
  Star,
  Video,
  Users,
  Briefcase,
  Sparkles,
  CheckCircle2,
  CircleDashed,
  Info,
  GraduationCap,
  ExternalLink,
  Lock,
  Footprints,
} from 'lucide-react';

import FinderLayout from '@/components/finder/FinderLayout';
import Seo from '@/components/seo/Seo';
import RequestProviderDialog from '@/components/finder/RequestProviderDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { finderService, type Modality, type Provider } from '@/services/api/finderService';
import { providerBadge, providerLabel } from '@/lib/providerTypes';

/* -------------------------------------------------------------------------- */
/* Small presentational helpers                                                */
/* -------------------------------------------------------------------------- */

const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'B';

/** A labelled section card used for About / Specializations / Approach / etc. */
const SectionCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) => (
  <Card className="rounded-card border-border shadow-none">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
  </Card>
);

/**
 * Build a search URL for OpenStreetMap from the parts we are allowed to show.
 * A LINK, never an embed — nothing is requested until the visitor clicks.
 */
const osmSearchUrl = (parts: (string | null | undefined)[]): string =>
  `https://www.openstreetmap.org/search?query=${encodeURIComponent(
    parts.filter(Boolean).join(', '),
  )}`;

/**
 * Decorative stand-in where a map would sit. Pure CSS gradients — no tiles, no
 * script, no request. aria-hidden: it carries no information.
 */
const MapPlaceholder = () => (
  <div
    aria-hidden="true"
    className="relative h-20 overflow-hidden rounded-md border border-border bg-muted/40"
    style={{
      backgroundImage:
        'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
      backgroundSize: '18px 18px',
    }}
  >
    <span className="absolute inset-0 flex items-center justify-center">
      <MapPin className="h-5 w-5 text-primary/60" strokeWidth={1.5} />
    </span>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Loading + Not-found states                                                  */
/* -------------------------------------------------------------------------- */

const ProfileSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-5 w-32" />
    <Card className="rounded-card border-border shadow-none">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-72" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-24 rounded-ctl" />
              <Skeleton className="h-6 w-20 rounded-ctl" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
      <Skeleton className="h-64 w-full rounded-card" />
    </div>
  </div>
);

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Info className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="mt-4 font-display text-display-md text-foreground">
        {t('finder_provider_notfound_title', 'Profiel niet gevonden')}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          'finder_provider_notfound_body',
          'Dit profiel bestaat niet (meer) of is niet langer beschikbaar.',
        )}
      </p>
      <Button asChild className="mt-6">
        <Link to="/find">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('finder_provider_back', 'Terug naar zoeken')}
        </Link>
      </Button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const ProviderProfilePublic = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const { t } = useTranslation();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProvider(null);

    finderService
      .getProvider(providerId ?? '')
      .then((p) => {
        if (active) setProvider(p);
      })
      .catch(() => {
        if (active) setProvider(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [providerId]);

  const modalityLabel = (m: Modality): string =>
    m === 'online'
      ? t('finder_modality_online', 'Online')
      : m === 'in_person'
        ? t('finder_modality_in_person', 'Op locatie')
        : m;

  const modalityIcon = (m: Modality) => (m === 'online' ? Video : Users);

  // Trust badge + type label — reuse the same taxonomy grammar as ProviderCard.
  const badge = provider
    ? providerBadge(
        {
          providerType: provider.providerType,
          verificationStatus: provider.verificationStatus,
          isRegulated: provider.isRegulated,
        },
        t,
      )
    : null;
  const typeLabel = provider
    ? providerLabel(provider.providerType, t, { capitalize: true })
    : '';

  // The service only ships street/postcode when the provider opted in, so their
  // mere presence IS the permission — no second UI-level guard to keep in sync.
  const addressIsPublic =
    provider?.addressVisibility === 'full' &&
    Boolean(provider.street || provider.postalCode);

  return (
    <FinderLayout>
      {/* Per-provider head. Without this every profile inherits the homepage
          title/canonical and none of them can ever rank or be shared. */}
      {provider && (
        <Seo
          path={`/find/${provider.id}`}
          title={`${provider.fullName} — ${providerLabel(provider.providerType, t, { capitalize: true })}${provider.city ? ` in ${provider.city}` : ''}`}
          description={
            provider.headline ||
            `${provider.fullName} is ${providerLabel(provider.providerType, t)}${provider.city ? ` in ${provider.city}` : ''} op Bondable.${provider.acceptingNewClients ? ' Neemt momenteel nieuwe cliënten aan.' : ''}`
          }
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: provider.fullName,
            jobTitle: providerLabel(provider.providerType, t, { capitalize: true }),
            url: `https://bondable.be/find/${provider.id}`,
            ...(provider.city
              ? {
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: provider.city,
                    addressCountry: 'BE',
                    // Street/postcode only when the provider published them.
                    ...(addressIsPublic && provider.street
                      ? { streetAddress: provider.street }
                      : {}),
                    ...(addressIsPublic && provider.postalCode
                      ? { postalCode: provider.postalCode }
                      : {}),
                  },
                }
              : {}),
            ...(provider.languages?.length ? { knowsLanguage: provider.languages } : {}),
          }}
        />
      )}
      {loading ? (
        <ProfileSkeleton />
      ) : !provider ? (
        <NotFound />
      ) : (
        <div className="space-y-6">
          {/* Back link */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
          >
            <Link to="/find">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('finder_provider_back', 'Terug naar zoeken')}
            </Link>
          </Button>

          {/* Hero — flat, typography-led header (border-first, no rest shadow) */}
          <Card className="rounded-card border-border shadow-none">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Initials avatar in teal — no photos on the finder */}
                  <Avatar className="h-20 w-20 shrink-0 border border-border">
                    <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                      {initialsOf(provider.fullName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 space-y-2">
                    <h1 className="font-display text-display-lg text-foreground">
                      {provider.fullName}
                    </h1>

                    {/* Type label + trust badge — transparency signal, not a ranking */}
                    {badge && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body-sm text-muted-foreground">
                        {typeLabel}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Badge variant={badge.variant} className="gap-1">
                              {badge.kind === 'regulated' && (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              )}
                              {badge.kind === 'verified_coach' && (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              {badge.label}
                            </Badge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {badge.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    )}

                    {/* Meta: city · availability dot · rating */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-sm text-muted-foreground">
                      {provider.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {provider.city}
                        </span>
                      )}

                      {provider.acceptingNewClients && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-success">
                          <span className="h-2 w-2 rounded-full bg-success" />
                          {t(
                            'finder_provider_accepting',
                            'Neemt nieuwe cliënten aan',
                          )}
                        </span>
                      )}

                      {provider.rating != null && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                          <span className="tabular font-medium text-foreground">
                            {provider.rating.toFixed(1)}
                          </span>
                          {provider.reviewCount != null && (
                            <span>
                              {t(
                                'finder_provider_reviews',
                                '({{count}} beoordelingen)',
                                { count: provider.reviewCount },
                              )}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Headline in body */}
                    {provider.headline && (
                      <p className="max-w-prose text-sm text-foreground/90">
                        {provider.headline}
                      </p>
                    )}
                  </div>
                </div>

                {/* Primary CTA (desktop) */}
                <div className="hidden shrink-0 sm:block">
                  <Button size="lg" onClick={() => setRequestOpen(true)}>
                    {t('finder_request_title', 'Aanvraag / Contact')}
                  </Button>
                </div>
              </div>

              {/* Languages — hairline divider */}
              {provider.languages.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <LanguagesIcon className="h-3.5 w-3.5" />
                    {t('finder_provider_languages', 'Talen')}
                  </span>
                  {provider.languages.map((lang) => (
                    <Badge key={lang} variant="outline" className="font-normal">
                      {lang}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Body: details (left) + sidebar (right) */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* About / bio */}
              {provider.bio && (
                <SectionCard
                  icon={Info}
                  title={t('finder_provider_about', 'Over')}
                >
                  <p className="whitespace-pre-line leading-relaxed">{provider.bio}</p>
                </SectionCard>
              )}

              {/* Specializations */}
              {provider.specializations.length > 0 && (
                <SectionCard
                  icon={Sparkles}
                  title={t('finder_provider_specializations', 'Specialisaties')}
                >
                  <div className="flex flex-wrap gap-2">
                    {provider.specializations.map((spec) => (
                      <Badge key={spec} variant="secondary" className="font-normal">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Approach */}
              {provider.approach && (
                <SectionCard
                  icon={Briefcase}
                  title={t('finder_provider_approach', 'Werkwijze')}
                >
                  <p className="whitespace-pre-line leading-relaxed">
                    {provider.approach}
                  </p>
                </SectionCard>
              )}

              {/* Empty-state fallback when a profile has no descriptive content */}
              {!provider.bio &&
                provider.specializations.length === 0 &&
                !provider.approach && (
                  <Card className="rounded-card border-dashed border-border shadow-none">
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      {t(
                        'finder_provider_empty',
                        'Deze hulpverlener heeft nog geen uitgebreid profiel ingevuld. Neem gerust contact op met je vraag.',
                      )}
                    </CardContent>
                  </Card>
                )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Waar — practice location. The full address only ever renders
                  when the provider chose to publish it; finderService already
                  withheld street/postcode otherwise, so there is nothing here
                  to leak. No map embed by design (see file header). */}
              {(provider.city || addressIsPublic || provider.reachability) && (
                <Card className="rounded-card border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      {t('finder_provider_location', 'Waar')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {addressIsPublic ? (
                      <>
                        <address className="not-italic leading-relaxed text-foreground">
                          {provider.street && <div>{provider.street}</div>}
                          <div>
                            {[provider.postalCode, provider.city]
                              .filter(Boolean)
                              .join(' ')}
                          </div>
                        </address>
                        <MapPlaceholder />
                      </>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="font-medium text-foreground">
                          {provider.city ??
                            t('finder_provider_location_unknown', 'Op afspraak')}
                        </p>
                        <p className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            {t(
                              'finder_provider_address_private',
                              'Het adres wordt gedeeld na je eerste contact. Veel hulpverleners werken vanuit huis.',
                            )}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Reachability — always safe to show: it says how to get
                        there, not where someone lives. */}
                    {provider.reachability && (
                      <>
                        <div className="border-t border-border" />
                        <p className="flex items-start gap-2.5 text-muted-foreground">
                          <Footprints className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="leading-relaxed">
                            {provider.reachability}
                          </span>
                        </p>
                      </>
                    )}

                    {/* A LINK, not an embed: nothing is loaded from a third
                        party until you decide to open it. */}
                    {addressIsPublic && (
                      <div className="space-y-1.5">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5"
                        >
                          <a
                            href={osmSearchUrl([
                              provider.street,
                              provider.postalCode,
                              provider.city,
                              provider.country,
                            ])}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t('finder_provider_show_on_map', 'Toon op kaart')}
                          </a>
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                          {t(
                            'finder_provider_map_privacy',
                            'Opent OpenStreetMap in een nieuw tabblad. We laden geen kaart mee op deze pagina, zodat je bezoek privé blijft.',
                          )}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* At-a-glance practical info */}
              <Card className="rounded-card border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground">
                    {t('finder_provider_at_a_glance', 'In het kort')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {/* Accepting new clients status */}
                  <div className="flex items-start gap-2.5">
                    {provider.acceptingNewClients ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {provider.acceptingNewClients
                          ? t('finder_provider_accepting', 'Neemt nieuwe cliënten aan')
                          : t(
                              'finder_provider_waitlist',
                              'Momenteel geen nieuwe cliënten',
                            )}
                      </p>
                      {!provider.acceptingNewClients && (
                        <p className="text-xs text-muted-foreground">
                          {t(
                            'finder_provider_waitlist_hint',
                            'Je kunt nog steeds een bericht sturen.',
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Modalities */}
                  {provider.modalities.length > 0 && (
                    <>
                      <div className="border-t border-border" />
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t('finder_provider_modalities', 'Sessievorm')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {provider.modalities.map((m) => {
                            const Icon = modalityIcon(m);
                            return (
                              <span
                                key={m}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground"
                              >
                                <Icon className="h-3.5 w-3.5 text-primary" />
                                {modalityLabel(m)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Years of experience */}
                  {provider.yearsExperience != null && (
                    <>
                      <div className="border-t border-border" />
                      <div className="flex items-start gap-2.5">
                        <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">
                            {t(
                              'finder_provider_experience',
                              '{{count}} jaar ervaring',
                              { count: provider.yearsExperience },
                            )}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Credentials — license for regulated, ICF/EMCC for coaches */}
                  {provider.credentials && (
                    <>
                      <div className="border-t border-border" />
                      <div className="flex items-start gap-2.5">
                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div>
                          <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {provider.isRegulated
                              ? t('finder_provider_license', 'Erkenning / licentie')
                              : t('finder_provider_certification', 'Certificering')}
                          </p>
                          <p className="text-foreground">{provider.credentials}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Hourly rate — TRANSPARENCY ONLY, never a ranking signal */}
                  {provider.hourlyRate != null && (
                    <>
                      <div className="border-t border-border" />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t('finder_provider_rate', 'Tarief (indicatief)')}
                        </p>
                        <p className="tabular mt-0.5 text-foreground">
                          {t('finder_provider_rate_value', '€{{rate}} per sessie', {
                            rate: provider.hourlyRate,
                          })}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Regulated/coach explainer — keeps the distinction transparent */}
              <Card className="rounded-card border-border bg-muted/30 shadow-none">
                <CardContent className="flex items-start gap-2.5 py-4 text-xs text-muted-foreground">
                  {provider.isRegulated ? (
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <p>
                    {provider.isRegulated
                      ? t(
                          'finder_provider_regulated_explainer',
                          'Een erkende hulpverlener (zoals een psycholoog of therapeut) valt onder wettelijk toezicht en beroepsregels.',
                        )
                      : t(
                          'finder_provider_coach_explainer',
                          'Een coach is geen gereguleerde zorgverlener. Bij een zorgvraag of klachten is een erkende hulpverlener aangewezen.',
                        )}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sticky mobile CTA — overlay elevation is sanctioned here */}
          <div className="sticky bottom-4 z-30 sm:hidden">
            <Button
              size="lg"
              className="w-full shadow-overlay"
              onClick={() => setRequestOpen(true)}
            >
              {t('finder_request_title', 'Aanvraag / Contact')}
            </Button>
          </div>

          {/* Lead form dialog */}
          <RequestProviderDialog
            provider={provider}
            open={requestOpen}
            onOpenChange={setRequestOpen}
          />
        </div>
      )}
    </FinderLayout>
  );
};

export default ProviderProfilePublic;

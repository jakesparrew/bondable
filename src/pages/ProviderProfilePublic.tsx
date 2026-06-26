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
} from 'lucide-react';

import FinderLayout from '@/components/finder/FinderLayout';
import RequestProviderDialog from '@/components/finder/RequestProviderDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { finderService, type Modality, type Provider } from '@/services/api/finderService';

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
  <Card className="border-border">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
  </Card>
);

/* -------------------------------------------------------------------------- */
/* Loading + Not-found states                                                  */
/* -------------------------------------------------------------------------- */

const ProfileSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-5 w-32" />
    <Card className="border-border overflow-hidden">
      <div className="h-20 bg-muted sm:h-24" />
      <CardContent className="-mt-10 space-y-4 sm:-mt-12">
        <Skeleton className="h-24 w-24 rounded-full border-4 border-card" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  </div>
);

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Info className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">
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

  return (
    <FinderLayout>
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

          {/* Hero */}
          <Card className="overflow-hidden border-border">
            {/* Neutral brand banner — no "promoted"/featured treatment. */}
            <div className="h-20 bg-primary/10 sm:h-24" />
            <CardContent className="-mt-10 sm:-mt-12">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <Avatar className="h-24 w-24 border-4 border-card shadow-sm">
                    {provider.photoUrl && (
                      <AvatarImage src={provider.photoUrl} alt={provider.fullName} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                      {initialsOf(provider.fullName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1.5 sm:pb-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                      {provider.fullName}
                    </h1>
                    {provider.headline && (
                      <p className="text-sm text-muted-foreground">
                        {provider.headline}
                      </p>
                    )}

                    {/* Regulated-clinician vs coach indicator */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {provider.isRegulated ? (
                        <Badge className="gap-1">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {t('finder_badge_regulated', 'Erkende hulpverlener')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Award className="h-3.5 w-3.5" />
                          {t('finder_badge_coach', 'Coach')}
                        </Badge>
                      )}

                      {provider.city && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {provider.city}
                        </span>
                      )}

                      {provider.rating != null && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                          <span className="font-medium text-foreground">
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
                  </div>
                </div>

                {/* Primary CTA (desktop) */}
                <div className="hidden sm:block sm:pb-1">
                  <Button size="lg" onClick={() => setRequestOpen(true)}>
                    {t('finder_request_title', 'Aanvraag / Contact')}
                  </Button>
                </div>
              </div>

              {/* Languages */}
              {provider.languages.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
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
                  <Card className="border-border border-dashed">
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
              {/* At-a-glance practical info */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground">
                    {t('finder_provider_at_a_glance', 'In het kort')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {/* Accepting new clients status */}
                  <div className="flex items-start gap-2.5">
                    {provider.acceptingNewClients ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
                      <Separator />
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
                      <Separator />
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
                      <Separator />
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
                      <Separator />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t('finder_provider_rate', 'Tarief (indicatief)')}
                        </p>
                        <p className="mt-0.5 text-foreground">
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
              <Card className="border-border bg-muted/30">
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

          {/* Sticky mobile CTA */}
          <div className="sticky bottom-4 z-30 sm:hidden">
            <Button
              size="lg"
              className="w-full shadow-lg"
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

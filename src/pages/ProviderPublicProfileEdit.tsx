/**
 * ProviderPublicProfileEdit — a therapist/coach edits their OWN Finder profile.
 *
 * Route: /dashboard/therapist/public-profile (RouteProtection
 * requiredUserType="therapist"). Rendered inside DashboardLayout. Loads the
 * signed-in provider's provider_profiles row via finderService.getProvider and
 * lets them edit the fields that make them findable + rank on FIT: headline,
 * bio, specializations, languages, modalities, approach, rate, city,
 * accepting-new-clients, credentials, photo and is_published. Saves via
 * finderService.updateProvider (graceful mock save → toast).
 *
 * REFERRAL-NEUTRAL BY DESIGN (EU P2B + Belgian dichotomieverbod): the Finder
 * ranks PURELY on fit (specialization, language, modality, availability), never
 * on price/payment, and there is no "promoted"/"sponsored" placement. The rate
 * field is shown for transparency only and is clearly labelled as such.
 *
 * Brand tokens only: bg-background/card/muted, text-foreground/
 * muted-foreground, border-border, bg-primary. The mint token is reserved for
 * AI/matching surfaces; destructive red only for emergencies (not used here).
 * New copy via t('key','Dutch default') — locale files untouched.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BadgeCheck,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthManager } from '@/hooks/api/useAuthManager';
import {
  finderService,
  type Provider,
  type UpdateProviderPayload,
} from '@/services/api/finderService';

/* -------------------------------------------------------------------------- */
/* Local editable shape                                                        */
/* -------------------------------------------------------------------------- */

interface FormState {
  headline: string;
  bio: string;
  approach: string;
  specializations: string[];
  languages: string[];
  modalities: string[];
  hourlyRate: string; // kept as string for the input; coerced on save
  city: string;
  country: string;
  acceptingNewClients: boolean;
  credentials: string;
  photoUrl: string;
  isPublished: boolean;
}

const emptyForm: FormState = {
  headline: '',
  bio: '',
  approach: '',
  specializations: [],
  languages: [],
  modalities: [],
  hourlyRate: '',
  city: '',
  country: '',
  acceptingNewClients: true,
  credentials: '',
  photoUrl: '',
  isPublished: false,
};

const fromProvider = (p: Provider): FormState => ({
  headline: p.headline ?? '',
  bio: p.bio ?? '',
  approach: p.approach ?? '',
  specializations: [...p.specializations],
  languages: [...p.languages],
  modalities: [...p.modalities],
  hourlyRate: p.hourlyRate != null ? String(p.hourlyRate) : '',
  city: p.city ?? '',
  country: p.country ?? '',
  acceptingNewClients: p.acceptingNewClients,
  credentials: p.credentials ?? '',
  photoUrl: p.photoUrl ?? '',
  isPublished: p.isPublished,
});

const initialsOf = (name: string | null | undefined): string =>
  (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'B';

/* -------------------------------------------------------------------------- */
/* Tag (chip) editor — used for specializations & languages                    */
/* -------------------------------------------------------------------------- */

interface TagEditorProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
  emptyLabel: string;
  /** Optional suggestions rendered as quick-add chips. */
  suggestions?: string[];
  inputId?: string;
}

const TagEditor = ({
  values,
  onChange,
  placeholder,
  addLabel,
  emptyLabel,
  suggestions = [],
  inputId,
}: TagEditorProps) => {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, v]);
    setDraft('');
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  const openSuggestions = suggestions.filter(
    (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {values.length === 0 && (
          <span className="text-xs text-muted-foreground">{emptyLabel}</span>
        )}
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 pr-1">
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              aria-label={`${v} verwijderen`}
              className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => add(draft)}
          className="shrink-0 gap-1"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {addLabel}
        </Button>
      </div>

      {openSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {openSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Modality multi-toggle                                                       */
/* -------------------------------------------------------------------------- */

const MODALITY_OPTIONS: { value: string; labelKey: string; fallback: string }[] =
  [
    { value: 'in_person', labelKey: 'finder_modality_in_person', fallback: 'Op locatie' },
    { value: 'online', labelKey: 'finder_modality_online', fallback: 'Online' },
  ];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const ProviderPublicProfileEdit = () => {
  const { t } = useTranslation();
  const { user } = useAuthManager();
  const providerId = user?.id ?? '';
  const displayName =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
    null;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!providerId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setNotFound(false);
    try {
      const p = await finderService.getProvider(providerId);
      if (p) {
        setProvider(p);
        setForm(fromProvider(p));
      } else {
        // No row yet — start from a blank, publishable draft.
        setProvider(null);
        setForm(emptyForm);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleModality = (value: string) =>
    setForm((prev) => ({
      ...prev,
      modalities: prev.modalities.includes(value)
        ? prev.modalities.filter((m) => m !== value)
        : [...prev.modalities, value],
    }));

  const specSuggestions = useMemo(
    () => ['anxiety', 'burnout', 'depression', 'trauma', 'grief', 'couples', 'adhd', 'stress'],
    [],
  );
  const langSuggestions = useMemo(() => ['nl', 'fr', 'en', 'de'], []);

  const handleSave = useCallback(async () => {
    if (!providerId) return;
    setSaving(true);

    const rateNum = form.hourlyRate.trim() === '' ? null : Number(form.hourlyRate);
    const payload: UpdateProviderPayload = {
      headline: form.headline.trim() || null,
      bio: form.bio.trim() || null,
      approach: form.approach.trim() || null,
      specializations: form.specializations,
      languages: form.languages,
      modalities: form.modalities,
      hourlyRate: rateNum != null && Number.isFinite(rateNum) ? rateNum : null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      acceptingNewClients: form.acceptingNewClients,
      credentials: form.credentials.trim() || null,
      photoUrl: form.photoUrl.trim() || null,
      isPublished: form.isPublished,
    };

    try {
      const updated = await finderService.updateProvider(providerId, payload);
      if (updated) {
        setProvider(updated);
        setForm(fromProvider(updated));
      }
      toast.success(t('finder_profile_saved_toast', 'Profiel opgeslagen'), {
        description: form.isPublished
          ? t(
              'finder_profile_saved_published',
              'Je profiel is zichtbaar in de Bondable Finder.',
            )
          : t(
              'finder_profile_saved_draft',
              'Opgeslagen als concept. Publiceer om gevonden te worden.',
            ),
      });
    } catch {
      toast.error(t('finder_profile_save_error', 'Opslaan mislukt'), {
        description: t(
          'finder_profile_save_error_desc',
          'Kon je profiel niet opslaan. Probeer het opnieuw.',
        ),
      });
    } finally {
      setSaving(false);
    }
  }, [providerId, form, t]);

  /* ---- Loading ---- */
  if (loading) {
    return (
      <DashboardLayout userType="therapist">
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  /* ---- Hard error (no provider id) ---- */
  if (notFound) {
    return (
      <DashboardLayout userType="therapist">
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            {t('finder_profile_unavailable_title', 'Profiel niet beschikbaar')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              'finder_profile_unavailable_body',
              'We konden je profiel niet laden. Probeer het later opnieuw.',
            )}
          </p>
          <Button className="mt-6" onClick={() => void load()}>
            {t('finder_profile_retry', 'Opnieuw proberen')}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="therapist">
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {t('finder_profile_title', 'Mijn openbaar profiel')}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {t(
                'finder_profile_subtitle',
                'Zo zien cliënten je in de Bondable Finder. Matching gebeurt op fit — specialisatie, taal, werkvorm en beschikbaarheid — nooit op tarief.',
              )}
            </p>
          </div>
          {provider?.isPublished && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={`/find/${providerId}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t('finder_profile_view_public', 'Bekijk openbaar')}
              </Link>
            </Button>
          )}
        </div>

        {/* Publish state + regulated indicator */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  form.isPublished
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {form.isPublished ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {form.isPublished
                    ? t('finder_profile_published', 'Gepubliceerd')
                    : t('finder_profile_unpublished', 'Niet gepubliceerd')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {form.isPublished
                    ? t(
                        'finder_profile_published_hint',
                        'Zichtbaar voor cliënten die hulp zoeken.',
                      )
                    : t(
                        'finder_profile_unpublished_hint',
                        'Alleen jij ziet dit profiel.',
                      )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* is_regulated indicator — sourced from the profile, read-only
                  here (set during verification, not self-editable). */}
              <Badge
                variant={provider?.isRegulated ? 'default' : 'outline'}
                className="gap-1"
              >
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {provider?.isRegulated
                  ? t('finder_regulated_clinician', 'Erkende hulpverlener')
                  : t('finder_coach', 'Coach')}
              </Badge>
              <div className="flex items-center gap-2">
                <Switch
                  id="is-published"
                  checked={form.isPublished}
                  onCheckedChange={(v) => update('isPublished', v)}
                />
                <Label htmlFor="is-published" className="text-sm">
                  {t('finder_profile_publish_toggle', 'Publiceren')}
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity / basics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
              {t('finder_profile_basics', 'Basisgegevens')}
            </CardTitle>
            <CardDescription>
              {t(
                'finder_profile_basics_desc',
                'Je naam en erkenningsstatus komen uit je account.',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Photo (URL) + preview */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={form.photoUrl || undefined} alt="" />
                <AvatarFallback className="bg-secondary text-primary">
                  {initialsOf(provider?.fullName ?? displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="photo-url">
                  {t('finder_profile_photo', 'Profielfoto (URL)')}
                </Label>
                <Input
                  id="photo-url"
                  type="url"
                  inputMode="url"
                  value={form.photoUrl}
                  onChange={(e) => update('photoUrl', e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="headline">
                {t('finder_profile_headline', 'Kopregel')}
              </Label>
              <Input
                id="headline"
                value={form.headline}
                onChange={(e) => update('headline', e.target.value)}
                maxLength={120}
                placeholder={t(
                  'finder_profile_headline_ph',
                  'bv. Klinisch psycholoog — angst & burn-out',
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  'finder_profile_headline_hint',
                  'Eén krachtige zin die jouw focus samenvat.',
                )}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="city">
                  {t('finder_profile_city', 'Stad')}
                </Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder={t('finder_profile_city_ph', 'bv. Leuven')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">
                  {t('finder_profile_country', 'Land')}
                </Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  placeholder="BE"
                  maxLength={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('finder_profile_about', 'Over jou')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="bio">{t('finder_profile_bio', 'Bio')}</Label>
              <Textarea
                id="bio"
                rows={5}
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                placeholder={t(
                  'finder_profile_bio_ph',
                  'Vertel kort wie je helpt en hoe je werkt…',
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="approach">
                {t('finder_profile_approach', 'Aanpak / methodiek')}
              </Label>
              <Textarea
                id="approach"
                rows={3}
                value={form.approach}
                onChange={(e) => update('approach', e.target.value)}
                placeholder={t(
                  'finder_profile_approach_ph',
                  'bv. Cognitieve gedragstherapie (CGT), EMDR…',
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="credentials">
                {t('finder_profile_credentials', 'Diploma / erkenning')}
              </Label>
              <Input
                id="credentials"
                value={form.credentials}
                onChange={(e) => update('credentials', e.target.value)}
                placeholder={t(
                  'finder_profile_credentials_ph',
                  'bv. Master klinische psychologie (KU Leuven)',
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fit signals — what the Finder actually matches on */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              {t('finder_profile_fit', 'Matchcriteria')}
            </CardTitle>
            <CardDescription>
              {t(
                'finder_profile_fit_desc',
                'Cliënten worden op deze velden met je gematcht — niet op tarief.',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="spec-input">
                {t('finder_profile_specializations', 'Specialisaties')}
              </Label>
              <TagEditor
                inputId="spec-input"
                values={form.specializations}
                onChange={(next) => update('specializations', next)}
                placeholder={t(
                  'finder_profile_spec_ph',
                  'bv. angst, burn-out…',
                )}
                addLabel={t('finder_profile_add', 'Toevoegen')}
                emptyLabel={t(
                  'finder_profile_spec_empty',
                  'Nog geen specialisaties.',
                )}
                suggestions={specSuggestions}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="lang-input">
                {t('finder_profile_languages', 'Talen')}
              </Label>
              <TagEditor
                inputId="lang-input"
                values={form.languages}
                onChange={(next) => update('languages', next)}
                placeholder={t('finder_profile_lang_ph', 'bv. nl, fr, en…')}
                addLabel={t('finder_profile_add', 'Toevoegen')}
                emptyLabel={t(
                  'finder_profile_lang_empty',
                  'Nog geen talen.',
                )}
                suggestions={langSuggestions}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t('finder_profile_modalities', 'Werkvorm')}</Label>
              <div className="flex flex-wrap gap-2">
                {MODALITY_OPTIONS.map((opt) => {
                  const active = form.modalities.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleModality(opt.value)}
                      aria-pressed={active}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:border-primary'
                      }`}
                    >
                      {t(opt.labelKey, opt.fallback)}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="accepting" className="text-sm font-medium">
                  {t(
                    'finder_profile_accepting',
                    'Nieuwe cliënten aannemen',
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'finder_profile_accepting_hint',
                    'Beschikbaarheid telt mee in de match.',
                  )}
                </p>
              </div>
              <Switch
                id="accepting"
                checked={form.acceptingNewClients}
                onCheckedChange={(v) => update('acceptingNewClients', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rate — transparency only */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('finder_profile_rate', 'Tarief')}
            </CardTitle>
            <CardDescription>
              {t(
                'finder_profile_rate_desc',
                'Alleen ter transparantie getoond op je profiel — het beïnvloedt nooit je positie in de zoekresultaten.',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="rate">
                {t('finder_profile_rate_label', 'Uurtarief (EUR)')}
              </Label>
              <div className="relative max-w-[180px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
                <Input
                  id="rate"
                  type="number"
                  min={0}
                  step={5}
                  value={form.hourlyRate}
                  onChange={(e) => update('hourlyRate', e.target.value)}
                  className="pl-7"
                  placeholder="75"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
          <Button asChild variant="ghost">
            <Link to="/dashboard/therapist">
              {t('finder_profile_cancel', 'Annuleren')}
            </Link>
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving} className="gap-1.5">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {t('finder_profile_save', 'Opslaan')}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProviderPublicProfileEdit;

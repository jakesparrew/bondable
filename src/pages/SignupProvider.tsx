/**
 * SignupProvider — the provider self-signup page at `/signup/provider`.
 *
 * Track 1 (audit P0). Before this page existed, every €39 CTA on /pricing and the
 * "Word hulpverlener op Bondable" button on the homepage pointed at /login, which
 * created nothing and started no trial. This is the one door into the provider
 * funnel: a calm one-column form → `createProviderAccount` → /welcome/provider →
 * dashboard.
 *
 * Standalone PUBLIC page (own slim nav + footer, Pricing chrome) — NOT
 * DashboardLayout.
 *
 * ANTI-SLOP: no mint (mint is AI-only, and signup is not an AI surface), no
 * gradients, no emoji, border-first elevation, exactly ONE Fraunces level (the
 * h1), warm-professional Flemish je/jij, zero exclamation marks. New strings use
 * t('key','NL default') inline.
 *
 * HONESTY: the founding counter reports the real remaining places — no
 * manufactured scarcity, no countdown theatre. The verification note says plainly
 * that the badge is earned later, never bought at signup. And per the
 * dichotomieverbod, neither the founding badge nor any paid plan touches finder
 * ranking.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, LogIn, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import Seo from '@/components/seo/Seo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PROVIDER_TYPES, providerLabel, type ProviderType } from '@/lib/providerTypes';
import {
  beginProviderSignup,
  createProviderAccount,
  getFoundingState,
  TRIAL_DAYS,
} from '@/services/api/signupService';

type FieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'password'
  | 'providerType'
  | 'city';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

const SignupProvider = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  /* Read once on mount so the counter cannot flicker while the form is open. */
  const founding = useMemo(() => getFoundingState(), []);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [providerType, setProviderType] = useState<ProviderType | ''>('');
  const [city, setCity] = useState('');
  const [credentialRef, setCredentialRef] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  /* signup_started fires on first real edit — intent, not a page view. */
  const startedRef = useRef(false);
  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    beginProviderSignup();
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!firstName.trim()) {
      next.firstName = t('signup_err_firstname', 'Vul je voornaam in.');
    }
    if (!lastName.trim()) {
      next.lastName = t('signup_err_lastname', 'Vul je achternaam in.');
    }
    if (!EMAIL_RE.test(email.trim())) {
      next.email = t('signup_err_email', 'Vul een geldig e-mailadres in.');
    }
    if (password.length < MIN_PASSWORD) {
      next.password = t(
        'signup_err_password',
        'Kies een wachtwoord van minstens 8 tekens.',
      );
    }
    if (!providerType) {
      next.providerType = t('signup_err_type', 'Kies je discipline.');
    }
    if (!city.trim()) {
      next.city = t('signup_err_city', 'Vul de stad of gemeente in waar je werkt.');
    }
    return next;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    markStarted();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = document.querySelector<HTMLElement>('[data-invalid="true"]');
      first?.focus?.();
      return;
    }

    setSubmitting(true);
    try {
      createProviderAccount({
        firstName,
        lastName,
        email,
        password,
        providerType: providerType as ProviderType,
        city,
        credentialRef,
      });
      toast.success(
        t('signup_toast_done', 'Je account staat klaar. Je proefperiode loopt.'),
      );
      navigate('/welcome/provider');
    } catch {
      setSubmitting(false);
      toast.error(
        t(
          'signup_toast_error',
          'Er ging iets mis bij het aanmaken van je account. Probeer het opnieuw.',
        ),
      );
    }
  };

  const foundingOpen = founding.remaining > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Seo
        path="/signup/provider"
        noIndex={false}
        title="Word hulpverlener op Bondable"
        description="Maak je Bondable-account als psycholoog, psychotherapeut, orthopedagoog, coach of begeleider. 14 dagen volledig Pro, geen kaart nodig. Zichtbaarheid in de finder kun je nooit kopen."
      />

      {/* ── Slim top nav (Pricing chrome) ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/favicon.ico" alt="" className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight text-primary">Bondable</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
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
        <div className="mx-auto w-full max-w-[640px] px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
          {/* ── Hero — the ONLY Fraunces on the page ─────────────────────────── */}
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t('signup_eyebrow', 'Voor hulpverleners')}
          </span>
          <h1 className="mt-4 font-display text-display-lg text-foreground">
            {t('signup_title', 'Maak je Bondable-account')}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {t(
              'signup_subtitle',
              'Eén omgeving voor je praktijk: cliënten, sessies, agenda en een publiek profiel in de finder. Je kunt beginnen zonder betaalgegevens.',
            )}
          </p>
          <p className="mt-4 rounded-ctl border border-border bg-card px-4 py-3 text-sm text-foreground">
            {t('signup_trial_line', '{{days}} dagen volledig Pro, geen kaart nodig.', {
              days: TRIAL_DAYS,
            })}{' '}
            <span className="text-muted-foreground">
              {t(
                'signup_trial_after',
                'Daarna ga je automatisch verder op het gratis plan. Je gegevens blijven staan.',
              )}
            </span>
          </p>

          {/* ── Founding programme ───────────────────────────────────────────── */}
          <section
            aria-labelledby="founding-title"
            className="mt-8 rounded-card border border-primary/25 bg-secondary/40 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="founding-title"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                {t('signup_founding_title', 'Stichtend hulpverlener — de eerste 100')}
              </h2>
              {foundingOpen ? (
                <Badge variant="outline" className="bg-card tabular">
                  {t('signup_founding_counter', 'nog {{n}} plaatsen', {
                    n: founding.remaining,
                  })}
                </Badge>
              ) : (
                <Badge variant="outline">
                  {t('signup_founding_full', 'de 100 plaatsen zijn ingevuld')}
                </Badge>
              )}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t(
                'signup_founding_body',
                'Bondable is pre-launch. De eerste honderd hulpverleners bouwen mee aan wat er komt, en dat willen we eerlijk terugbetalen.',
              )}
            </p>

            <ul className="mt-4 space-y-2.5">
              <FoundingPerk
                text={t('signup_founding_perk_pro', 'Pro gratis het eerste jaar')}
              />
              <FoundingPerk
                text={t(
                  'signup_founding_perk_badge',
                  'Een Founding-badge op je profiel die nooit je ranking beïnvloedt',
                )}
              />
              <FoundingPerk
                text={t(
                  'signup_founding_perk_roadmap',
                  'Een directe lijn naar de roadmap: je feedback komt bij het team terecht',
                )}
              />
            </ul>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {t(
                'signup_founding_note',
                'De badge zegt wanneer je erbij kwam, niet hoe goed je bent. Ranking in de finder blijft enkel op fit — specialisatie, taal, plaats en beschikbaarheid.',
              )}{' '}
              <Link to="/how-ranking-works" className="underline underline-offset-2 hover:text-foreground">
                {t('signup_founding_ranking_link', 'Lees hoe ranking werkt')}
              </Link>
            </p>
          </section>

          {/* ── Form ─────────────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field
                id="firstName"
                label={t('signup_field_firstname', 'Voornaam')}
                error={errors.firstName}
              >
                <Input
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  value={firstName}
                  data-invalid={errors.firstName ? 'true' : undefined}
                  aria-invalid={Boolean(errors.firstName)}
                  onChange={(e) => {
                    markStarted();
                    setFirstName(e.target.value);
                  }}
                />
              </Field>

              <Field
                id="lastName"
                label={t('signup_field_lastname', 'Achternaam')}
                error={errors.lastName}
              >
                <Input
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  value={lastName}
                  data-invalid={errors.lastName ? 'true' : undefined}
                  aria-invalid={Boolean(errors.lastName)}
                  onChange={(e) => {
                    markStarted();
                    setLastName(e.target.value);
                  }}
                />
              </Field>
            </div>

            <Field
              id="email"
              label={t('signup_field_email', 'E-mailadres')}
              error={errors.email}
            >
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                data-invalid={errors.email ? 'true' : undefined}
                aria-invalid={Boolean(errors.email)}
                onChange={(e) => {
                  markStarted();
                  setEmail(e.target.value);
                }}
              />
            </Field>

            <Field
              id="password"
              label={t('signup_field_password', 'Wachtwoord')}
              hint={t('signup_hint_password', 'Minstens 8 tekens.')}
              error={errors.password}
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                data-invalid={errors.password ? 'true' : undefined}
                aria-invalid={Boolean(errors.password)}
                onChange={(e) => {
                  markStarted();
                  setPassword(e.target.value);
                }}
              />
            </Field>

            <Field
              id="providerType"
              label={t('signup_field_type', 'Discipline')}
              error={errors.providerType}
            >
              <Select
                value={providerType || undefined}
                onValueChange={(v) => {
                  markStarted();
                  setProviderType(v as ProviderType);
                }}
              >
                <SelectTrigger
                  id="providerType"
                  data-invalid={errors.providerType ? 'true' : undefined}
                  aria-invalid={Boolean(errors.providerType)}
                >
                  <SelectValue placeholder={t('signup_type_placeholder', 'Kies je discipline')} />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {providerLabel(type, t, { capitalize: true })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              id="city"
              label={t('signup_field_city', 'Stad of gemeente')}
              hint={t('signup_hint_city', 'Waar je cliënten ontvangt, bijvoorbeeld Gent of Leuven.')}
              error={errors.city}
            >
              <Input
                id="city"
                name="city"
                autoComplete="address-level2"
                value={city}
                data-invalid={errors.city ? 'true' : undefined}
                aria-invalid={Boolean(errors.city)}
                onChange={(e) => {
                  markStarted();
                  setCity(e.target.value);
                }}
              />
            </Field>

            <Field
              id="credentialRef"
              label={t('signup_field_credential', 'Visum-, erkennings- of certificaatnummer')}
              optional={t('signup_optional', 'optioneel')}
              hint={t(
                'signup_hint_credential',
                'Je kunt dit later ook toevoegen. Wij controleren het pas nadien: het badge-label verdien je met een geverifieerd document, je koopt het niet bij het aanmaken.',
              )}
            >
              <Input
                id="credentialRef"
                name="credentialRef"
                value={credentialRef}
                onChange={(e) => {
                  markStarted();
                  setCredentialRef(e.target.value);
                }}
              />
            </Field>

            <div className="pt-2">
              <Button type="submit" size="lg" className="w-full rounded-ctl" disabled={submitting}>
                {submitting
                  ? t('signup_submitting', 'Bezig met aanmaken')
                  : t('signup_submit', 'Account aanmaken')}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {t(
                  'signup_submit_note',
                  'Geen betaalgegevens nodig. Je kunt op elk moment stoppen en je gegevens exporteren.',
                )}
              </p>
            </div>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            {t('signup_login_prompt', 'Heb je al een account?')}{' '}
            <Link to="/login" className="underline underline-offset-2 hover:text-foreground">
              {t('home_nav_login', 'Inloggen')}
            </Link>
          </p>
        </div>
      </main>

      {/* ── Footer (Pricing chrome) ─────────────────────────────────────────── */}
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
              {t('home_nav_pricing', 'Prijzen')}
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

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  optional?: string;
  error?: string;
  children: React.ReactNode;
}

const Field = ({ id, label, hint, optional, error, children }: FieldProps) => (
  <div className="space-y-2">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      {optional && <span className="text-xs text-muted-foreground">{optional}</span>}
    </div>
    {children}
    {hint && !error && (
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    )}
    {error && (
      <p role="alert" className="text-xs text-destructive">
        {error}
      </p>
    )}
  </div>
);

const FoundingPerk = ({ text }: { text: string }) => (
  <li className="flex items-start gap-2.5 text-sm text-foreground">
    <span
      aria-hidden="true"
      className="mt-2 h-1 w-4 shrink-0 rounded-ctl bg-primary/50"
    />
    <span className="leading-relaxed">{text}</span>
  </li>
);

export default SignupProvider;

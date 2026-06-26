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
 * Light deep-teal brand tokens only; "mint" is reserved for AI surfaces — used
 * here on the standout "The Coach" button. New strings use t('key','default').
 */

import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Search,
  ShieldCheck,
  MessageCircleHeart,
  Stethoscope,
  ArrowRight,
  LogIn,
  Users,
  Lock,
  HeartHandshake,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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
      {/* Active-demo banner */}
      {activeRole && (
        <div className="bg-secondary/70 border-b border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-2 text-sm sm:flex-row sm:px-6">
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
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
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
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-70"
            style={{
              background:
                'radial-gradient(60% 50% at 50% 0%, hsl(var(--accent)) 0%, transparent 70%)',
            }}
          />
          <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {t('home_hero_eyebrow', 'België-first · gesuperviseerde AI-zorg')}
              </span>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {t('home_hero_title', 'Mentale steun die je verbindt — niet vervangt')}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                {t(
                  'home_hero_subtitle',
                  'Praat met The Coach, je AI-begeleider onder supervisie van een echte hulpverlener — en vind, wanneer je er klaar voor bent, een coach of therapeut die bij je past.',
                )}
              </p>

              {/* Primary CTAs */}
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={talkToCoach}
                  className="h-14 w-full rounded-2xl bg-mint px-8 text-base font-semibold text-mint-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-mint/90 sm:w-auto"
                >
                  <Sparkles className="h-5 w-5" />
                  {t('home_hero_coach_cta', 'Praat met The Coach')}
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 w-full rounded-2xl px-8 text-base sm:w-auto"
                >
                  <Link to="/find">
                    <Search className="h-5 w-5" />
                    {t('home_hero_find_cta', 'Vind een hulpverlener')}
                  </Link>
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {t(
                  'home_hero_disclaimer',
                  'Geen noodhulp. Bij crisis bel 112 of de Zelfmoordlijn 1813.',
                )}
              </p>
            </div>

            {/* Demo / inspect panel */}
            {bypass && (
              <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-dashed border-border bg-card p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
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
                    className="h-12 justify-start gap-3 rounded-xl"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
                      <Stethoscope className="h-4 w-4" />
                    </span>
                    {t('home_demo_therapist', 'Bekijk als hulpverlener')}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => enterAs('client')}
                    className="h-12 justify-start gap-3 rounded-xl"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
                      <Users className="h-4 w-4" />
                    </span>
                    {t('home_demo_client', 'Bekijk als cliënt')}
                  </Button>
                </div>
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => enterAs('admin')}
                    className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {t('home_demo_admin', 'Of bekijk de superadmin →')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Feature grid */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<MessageCircleHeart className="h-5 w-5" />}
              ai
              title={t('home_feat_coach_title', 'The Coach')}
              body={t(
                'home_feat_coach_body',
                'Een AI-begeleider die er altijd is, onder supervisie van een echte hulpverlener. Verwijst je door wanneer dat nodig is.',
              )}
            />
            <FeatureCard
              icon={<Search className="h-5 w-5" />}
              title={t('home_feat_finder_title', 'Hulpverlener-finder')}
              body={t(
                'home_feat_finder_body',
                'Vind coaches en erkende therapeuten op basis van fit — specialisatie, taal en locatie. Neutraal, nooit op betaling.',
              )}
            />
            <FeatureCard
              icon={<Stethoscope className="h-5 w-5" />}
              title={t('home_feat_practice_title', 'Praktijktools')}
              body={t(
                'home_feat_practice_body',
                'Voor hulpverleners: cliëntbeheer, sessies, taken, intake en berichten — alles op één plek.',
              )}
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title={t('home_feat_privacy_title', 'Privacy & compliance')}
              body={t(
                'home_feat_privacy_body',
                'Gebouwd rond GDPR en Belgische zorgregels. Jouw gegevens blijven van jou — porteerbaar en transparant.',
              )}
            />
          </div>
        </section>

        {/* For providers */}
        <section id="providers" className="border-t border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                  {t('home_providers_eyebrow', 'Voor hulpverleners')}
                </span>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {t('home_providers_title', 'Laat cliënten je vinden — en beheer je praktijk')}
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
                    <Link to="/login">
                      <Stethoscope className="h-4 w-4" />
                      {t('home_providers_cta', 'Word hulpverlener op Bondable')}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/favicon.ico" alt="" className="h-6 w-6" />
            <span className="text-sm font-semibold text-primary">Bondable</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              'home_footer_neutral',
              'Onafhankelijke matching op basis van fit — nooit op betaling. © Bondable',
            )}
          </p>
        </div>
      </footer>
    </div>
  );
};

/* -------------------------------------------------------------------------- */

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  /** Mint AI treatment — reserved for The Coach. */
  ai?: boolean;
}

const FeatureCard = ({ icon, title, body, ai }: FeatureCardProps) => (
  <div className="rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
    <span
      className={
        ai
          ? 'flex h-11 w-11 items-center justify-center rounded-full bg-mint text-mint-foreground'
          : 'flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary'
      }
    >
      {icon}
    </span>
    <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
    <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
  </div>
);

export default Home;

/**
 * WelcomeProvider — a brief, calm first-run for a solo provider (/welcome/
 * provider). Orients rather than forces a wizard, then drops them into the
 * dashboard where the persistent SetupChecklist lives. No mint (not AI).
 */

import { useTranslation } from 'react-i18next';
import { ArrowRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import LineBranch from '@/components/illustration/LineBranch';
import { setDemoRole, isBypassAvailable } from '@/hooks/api/useAuthManager';
import { PROVIDER_STEPS } from '@/features/onboarding/onboardingService';

const WelcomeProvider = () => {
  const { t } = useTranslation();

  const enter = () => {
    if (isBypassAvailable()) {
      setDemoRole('therapist');
      window.location.assign('/dashboard/therapist');
    } else {
      window.location.assign('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-2.5 px-4 sm:px-6">
          <img src="/favicon.ico" alt="" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-primary">Bondable</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <div className="flex justify-center">
          <LineBranch className="h-24 w-24 text-primary/50" />
        </div>
        <h1 className="mt-6 text-center font-display text-display-lg text-foreground">
          {t('wp_title', 'Welkom bij Bondable')}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-muted-foreground">
          {t(
            'wp_body',
            'Je hele praktijk op één plek. We zetten je in een paar stappen op weg — je vindt ze straks terug op je dashboard.',
          )}
        </p>

        <ul className="mx-auto mt-8 max-w-md space-y-2">
          {PROVIDER_STEPS.map((s) => (
            <li
              key={s.key}
              className="flex items-center gap-3 rounded-ctl border border-border bg-card px-4 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-foreground">{t(s.labelKey, s.labelDefault)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={enter}>
            {t('wp_cta', 'Aan de slag')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default WelcomeProvider;

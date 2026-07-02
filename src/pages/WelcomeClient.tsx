/**
 * WelcomeClient — the client warm-welcome (/welcome/client). Four calm screens:
 * welcome → goals → GDPR Art. 9 consent (non-skippable) → meet Bond. On finish
 * it records onboarding steps and enters the client demo. Mint appears ONLY on
 * the Bond screen (that is the AI surface); everything else is brand teal.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Sparkles, ArrowRight, ArrowLeft, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import LineLoop from '@/components/illustration/LineLoop';
import { setDemoRole, isBypassAvailable } from '@/hooks/api/useAuthManager';
import { onboardingService } from '@/features/onboarding/onboardingService';

const GOAL_CHIPS = [
  ['stress', 'Stress'],
  ['sleep', 'Slaap'],
  ['anxiety', 'Angst'],
  ['low_mood', 'Somberheid'],
  ['relationships', 'Relaties'],
  ['self_esteem', 'Zelfbeeld'],
  ['work', 'Werk & burn-out'],
  ['grief', 'Verlies & rouw'],
] as const;

const WelcomeClient = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState({ health: false, bond: false, share: false });

  const toggleGoal = (g: string) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const consentComplete = consent.health && consent.bond && consent.share;

  const finish = () => {
    onboardingService.setStep('client', 'goals', true);
    onboardingService.setStep('client', 'consent', true);
    onboardingService.setStep('client', 'met_bond', true);
    if (isBypassAvailable()) {
      setDemoRole('client');
      window.location.assign('/dashboard/client/bond');
    } else {
      window.location.assign('/login');
    }
  };

  const Progress = () => (
    <div className="mx-auto mb-8 flex w-full max-w-md items-center gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={
            i <= step
              ? 'h-1.5 flex-1 rounded-full bg-primary'
              : 'h-1.5 flex-1 rounded-full bg-secondary'
          }
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-2.5 px-4 sm:px-6">
          <img src="/favicon.ico" alt="" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-primary">Bondable</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <Progress />

        {step === 0 && (
          <section className="animate-enter text-center">
            <div className="flex justify-center">
              <LineLoop className="h-24 w-24 text-primary/50" />
            </div>
            <h1 className="mt-6 font-display text-display-lg text-foreground">
              {t('wc_welcome_title', 'Dag, fijn dat je er bent')}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              {t(
                'wc_welcome_body',
                'Dit is jouw plek. Alles wat je hier deelt, blijft tussen jou en je begeleider. We houden het rustig en op jouw tempo.',
              )}
            </p>
            <Button size="lg" className="mt-8" onClick={() => setStep(1)}>
              {t('wc_start', 'Beginnen')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </section>
        )}

        {step === 1 && (
          <section className="animate-enter">
            <h1 className="font-display text-display-lg text-foreground">
              {t('wc_goals_title', 'Waar wil je aan werken?')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('wc_goals_body', 'Kies wat past. Je kan dit later altijd aanpassen.')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {GOAL_CHIPS.map(([key, label]) => {
                const active = goals.includes(key);
                return (
                  <button key={key} type="button" onClick={() => toggleGoal(key)}>
                    <Badge
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1.5 text-sm"
                    >
                      {t(`wc_goal_${key}`, label)}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t('wc_goals_note_ph', 'Wil je er iets over kwijt? (optioneel)')}
              className="mt-4"
            />
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4" />
                {t('wc_back', 'Terug')}
              </Button>
              <Button onClick={() => setStep(2)}>
                {t('wc_next', 'Volgende')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="animate-enter">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t('wc_consent_eyebrow', 'Jouw toestemming')}
            </span>
            <h1 className="mt-3 font-display text-display-lg text-foreground">
              {t('wc_consent_title', 'Voor we starten')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t(
                'wc_consent_body',
                'Om veilig met je begeleider te kunnen werken, hebben we je toestemming nodig. Je kan die altijd intrekken.',
              )}
            </p>

            <div className="mt-5 space-y-3">
              {[
                ['health', t('wc_consent_health', 'Ik geef toestemming om mijn gezondheidsgegevens te verwerken om zorg mogelijk te maken.')],
                ['bond', t('wc_consent_bond', 'Ik begrijp dat Bond een AI-hulpmiddel is dat werkt onder supervisie van een echte hulpverlener.')],
                ['share', t('wc_consent_share', 'Ik ga ermee akkoord dat wat ik deel zichtbaar is voor mijn begeleider, zodat die me kan helpen.')],
              ].map(([key, label]) => (
                <label
                  key={key as string}
                  className="flex cursor-pointer items-start gap-3 rounded-ctl border border-border bg-card p-3"
                >
                  <Checkbox
                    checked={consent[key as keyof typeof consent]}
                    onCheckedChange={(c) =>
                      setConsent((prev) => ({ ...prev, [key as string]: !!c }))
                    }
                    className="mt-0.5"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>

            {/* Crisis disclosure — short imperatives, phone as the biggest element */}
            <div className="mt-4 rounded-ctl border border-border bg-secondary/50 p-3">
              <p className="text-body-sm text-muted-foreground">
                {t(
                  'wc_consent_crisis',
                  'Bondable is geen noodhulp. Bij acute nood, bel:',
                )}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-foreground">
                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />1813 (BE)</span>
                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />113 (NL)</span>
                <span className="inline-flex items-center gap-1 text-destructive"><Phone className="h-3.5 w-3.5" />112</span>
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" />
                {t('wc_back', 'Terug')}
              </Button>
              <Button disabled={!consentComplete} onClick={() => setStep(3)}>
                {t('wc_next', 'Volgende')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="animate-enter text-center">
            {/* Bond screen — the ONE place mint belongs in this flow. */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-hero bg-mint text-mint-foreground">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="mt-6 font-display text-display-lg text-foreground">
              {t('wc_bond_title', 'Maak kennis met Bond')}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              {t(
                'wc_bond_body',
                'Bond is je AI-begeleider tussen de sessies door: om even stil te staan, te oefenen of je dag te ordenen. Bond werkt onder supervisie van je hulpverlener en vervangt die nooit.',
              )}
            </p>
            <div className="mt-8 flex flex-col items-center gap-2">
              <Button size="lg" onClick={finish} className="bg-mint text-mint-foreground hover:bg-mint/90">
                <Sparkles className="h-4 w-4" />
                {t('wc_bond_cta', 'Praat met Bond')}
              </Button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-body-sm text-muted-foreground hover:text-foreground"
              >
                {t('wc_back', 'Terug')}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default WelcomeClient;

/**
 * WachtruimtePanel — De Wachtruimte: het product voor wie wacht.
 *
 * DE THESE: in Vlaanderen wacht je drie tot zes maanden op een psycholoog. Wie
 * niet binnengeraakt, botst vandaag op een doodlopend spoor. Dat hoeft niet.
 * Je kan op een wachtlijst staan én vandaag beginnen — en ondertussen zorgen
 * dat je eerste gesprek drie gesprekken waard is.
 *
 * Vier dingen die je nu al kan doen:
 *   1. praten met The Coach (de begeleide AI, onder supervisie);
 *   2. je intake alvast invullen;
 *   3. een nulmeting doen (PHQ-9 / GAD-7 uit outcomesService — hergebruikt,
 *      nooit gedupliceerd);
 *   4. noteren wat je wil bespreken.
 *
 * De opbrengst staat er expliciet bij: "wat je al klaar hebt staan voor je
 * eerste gesprek". Delen met een hulpverlener gebeurt ALLEEN na een expliciete
 * toestemming, en de belofte aan de hulpverlener staat er letterlijk bij zodat
 * niemand zich achteraf verrast voelt.
 *
 * Mint verschijnt hier op precies één plek: de Coach-knop (de Bond-ingang).
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Check,
  ClipboardList,
  LineChart,
  MessagesSquare,
  Target,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { isBypassAvailable, setDemoRole } from '@/hooks/api/useAuthManager';
import { latestResult } from '@/services/api/outcomesService';
import { analyticsService } from '@/services/api/analyticsService';
import { ANALYTICS_EVENTS } from '@/config/analyticsEvents';

import WachtruimteCrisis from './WachtruimteCrisis';
import WaitlistCapture from './WaitlistCapture';
import {
  readState,
  setGoals as persistGoals,
  setShareWithProvider as persistShare,
  setStepDone,
  type WachtruimteState,
  type WachtruimteStepId,
} from './wachtruimteStore';

export interface WachtruimtePanelProps {
  /**
   * 'page' rendert de Fraunces-kop (voor /wachtruimte); 'embedded' laat die weg
   * zodat er per view precies één display-niveau blijft.
   */
  variant?: 'page' | 'embedded';
  /** Stad waarvoor iemand wacht — maakt de tekst en het e-mailveld concreet. */
  cityName?: string | null;
  /** Facetlabel uit de finder, bv. "burnout". Nooit vrije tekst. */
  specialization?: string | null;
  /** Toon het e-mailveld voor de wachtlijst (uit op de client-dashboardversie). */
  showWaitlistCapture?: boolean;
}

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

const WachtruimtePanel = ({
  variant = 'page',
  cityName = null,
  specialization = null,
  showWaitlistCapture = true,
}: WachtruimtePanelProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [state, setState] = useState<WachtruimteState>(() => readState());
  const [goalsDraft, setGoalsDraft] = useState(() => readState().goals);

  /** De nulmeting is de enige stap die we ECHT kunnen aflezen. */
  const baseline = useMemo(() => {
    const phq = latestResult('phq9');
    const gad = latestResult('gad7');
    const newest = [phq, gad]
      .filter((r): r is NonNullable<typeof r> => !!r)
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
    return newest ?? null;
  }, []);

  // Doelen worden ontkoppeld bewaard zodat elke toetsaanslag geen write is.
  useEffect(() => {
    if (goalsDraft === state.goals) return;
    const handle = window.setTimeout(() => {
      setState(persistGoals(goalsDraft));
    }, 400);
    return () => window.clearTimeout(handle);
  }, [goalsDraft, state.goals]);

  /** Ga verder als cliënt in demo-modus; anders eerst inloggen. */
  const enterClient = (path: string) => {
    if (isBypassAvailable()) {
      setDemoRole('client');
      window.location.assign(path);
    } else {
      navigate('/login');
    }
  };

  const toggleStep = (step: WachtruimteStepId, done: boolean) => {
    setState(setStepDone(step, done));
    if (done) {
      analyticsService.track(ANALYTICS_EVENTS.onboarding_step_done, {
        step: `wachtruimte_${step}`,
        role: 'client',
      });
    }
  };

  const isDone = (step: WachtruimteStepId): boolean =>
    step === 'nulmeting' ? !!baseline : state.done.includes(step);

  const steps: {
    id: WachtruimteStepId;
    icon: typeof MessagesSquare;
    title: string;
    body: string;
    cta: string;
    onCta: () => void;
    /** Mint mag alleen op de Bond-ingang. */
    isBondEntry?: boolean;
    /** Stappen die we zelf kunnen aflezen krijgen geen handmatig vinkje. */
    autoDetected?: boolean;
  }[] = [
    {
      id: 'coach',
      icon: MessagesSquare,
      title: t('wachtruimte_step_coach_title', 'Praat vandaag met The Coach'),
      body: t(
        'wachtruimte_step_coach_body',
        'Een begeleid gesprek onder supervisie van een echte hulpverlener. Het vervangt je therapeut niet, het overbrugt de wachttijd.',
      ),
      cta: t('wachtruimte_step_coach_cta', 'Start een gesprek'),
      onCta: () => enterClient('/dashboard/client/bond'),
      isBondEntry: true,
    },
    {
      id: 'intake',
      icon: ClipboardList,
      title: t('wachtruimte_step_intake_title', 'Vul je intake alvast in'),
      body: t(
        'wachtruimte_step_intake_body',
        'Je achtergrond, je huisarts, wat je al probeerde. Zo hoef je dat in je eerste gesprek niet meer te vertellen.',
      ),
      cta: t('wachtruimte_step_intake_cta', 'Open je intake'),
      onCta: () => enterClient('/dashboard/client/intake'),
    },
    {
      id: 'nulmeting',
      icon: LineChart,
      title: t('wachtruimte_step_baseline_title', 'Doe een nulmeting'),
      body: t(
        'wachtruimte_step_baseline_body',
        'Een korte vragenlijst als startpunt. Over drie maanden zie je zwart op wit wat er veranderd is — en je hulpverlener ook.',
      ),
      cta: t('wachtruimte_step_baseline_cta', 'Naar je metingen'),
      onCta: () => enterClient('/dashboard/client/progress'),
      autoDetected: true,
    },
    {
      id: 'doelen',
      icon: Target,
      title: t('wachtruimte_step_goals_title', 'Noteer wat je wil bespreken'),
      body: t(
        'wachtruimte_step_goals_body',
        'Drie zinnen volstaan. Wat je noteert blijft op dit toestel tot je zelf beslist het te delen.',
      ),
      cta: t('wachtruimte_step_goals_cta', 'Schrijf hieronder'),
      onCta: () => {
        document.getElementById('wachtruimte-doelen')?.focus();
      },
      autoDetected: true,
    },
  ];

  const doneCount = steps.filter((s) => isDone(s.id)).length;
  const progressPct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-8">
      {/* Kop ------------------------------------------------------------- */}
      <header className="max-w-2xl space-y-3">
        <Badge variant="outline">
          {t('wachtruimte_eyebrow', 'De Wachtruimte')}
        </Badge>
        {variant === 'page' ? (
          <h1 className="font-display text-display-lg text-foreground">
            {t('wachtruimte_title', 'Je hoeft niet te wachten om te beginnen')}
          </h1>
        ) : (
          <h2 className="text-title font-semibold text-foreground">
            {t('wachtruimte_title', 'Je hoeft niet te wachten om te beginnen')}
          </h2>
        )}
        <p className="text-muted-foreground">
          {cityName
            ? t(
                'wachtruimte_sub_city',
                'Wachten op een plek {{city}} duurt in de praktijk maanden. Zet je op een wachtlijst én begin vandaag. Alles wat je hier klaarzet, maakt je eerste gesprek meteen drie gesprekken waard.',
                { city: `in ${cityName}` },
              )
            : t(
                'wachtruimte_sub',
                'Wachten op een plek duurt in de praktijk maanden. Zet je op een wachtlijst én begin vandaag. Alles wat je hier klaarzet, maakt je eerste gesprek meteen drie gesprekken waard.',
              )}
        </p>
      </header>

      {/* Voortgang ------------------------------------------------------- */}
      <section
        aria-label={t('wachtruimte_progress_aria', 'Je voorbereiding')}
        className="rounded-card border border-border bg-card p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-body font-semibold text-foreground">
              {t(
                'wachtruimte_progress_title',
                'Wat je al klaar hebt staan voor je eerste gesprek',
              )}
            </p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {t(
                'wachtruimte_progress_sub',
                'Hoe meer hiervan klaar is, hoe minder tijd je eerste gesprek aan formaliteiten gaat.',
              )}
            </p>
          </div>
          <p className="text-2xl font-semibold tabular text-foreground">
            {t('wachtruimte_progress_count', '{{done}} van {{total}}', {
              done: doneCount,
              total: steps.length,
            })}
          </p>
        </div>

        <Progress value={progressPct} className="mt-4 h-1.5" />

        <ul className="mt-4 space-y-2">
          {steps.map((step) => {
            const done = isDone(step.id);
            return (
              <li
                key={step.id}
                className="flex items-start gap-2.5 text-body-sm"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-ctl border',
                    done
                      ? 'border-transparent bg-success-soft text-success'
                      : 'border-border text-transparent',
                  )}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span
                  className={done ? 'text-foreground' : 'text-muted-foreground'}
                >
                  {step.title}
                  {step.id === 'nulmeting' && baseline && (
                    <span className="text-muted-foreground">
                      {' — '}
                      {t('wachtruimte_baseline_on', 'ingevuld op {{date}}', {
                        date: new Date(baseline.takenAt).toLocaleDateString(
                          'nl-BE',
                          DATE_FMT,
                        ),
                      })}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* De vier stappen ------------------------------------------------- */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const done = isDone(step.id);
          return (
            <article
              key={step.id}
              className="flex flex-col rounded-card border border-border bg-card p-5 transition-shadow hover:shadow-raise"
            >
              <div className="flex items-start justify-between gap-3">
                <Icon
                  className="h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {done && (
                  <Badge variant="success">
                    {t('wachtruimte_step_done', 'Klaar')}
                  </Badge>
                )}
              </div>

              <h3 className="mt-3 text-body font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-1 flex-1 text-body-sm text-muted-foreground">
                {step.body}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  onClick={step.onCta}
                  variant={step.isBondEntry ? 'default' : 'outline'}
                  className={cn(
                    'gap-1.5',
                    step.isBondEntry &&
                      'bg-mint text-mint-foreground hover:bg-mint/90 focus-visible:ring-mint',
                  )}
                >
                  {step.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>

                {!step.autoDetected && (
                  <span className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
                    <Switch
                      checked={done}
                      onCheckedChange={(v) => toggleStep(step.id, v)}
                      aria-label={t(
                        'wachtruimte_step_mark',
                        'Markeer als klaar',
                      )}
                    />
                    {t('wachtruimte_step_mark', 'Markeer als klaar')}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {/* Doelen ---------------------------------------------------------- */}
      <section className="rounded-card border border-border bg-card p-5 sm:p-6">
        <Label
          htmlFor="wachtruimte-doelen"
          className="text-body font-semibold text-foreground"
        >
          {t('wachtruimte_goals_label', 'Wat wil je bespreken in je eerste gesprek')}
        </Label>
        <p className="mt-1 text-body-sm text-muted-foreground">
          {t(
            'wachtruimte_goals_help',
            'Schrijf het zoals je het zou zeggen. Dit blijft op dit toestel staan tot je hieronder beslist het te delen.',
          )}
        </p>
        <Textarea
          id="wachtruimte-doelen"
          value={goalsDraft}
          onChange={(e) => setGoalsDraft(e.target.value)}
          rows={5}
          className="mt-3 rounded-ctl"
          placeholder={t(
            'wachtruimte_goals_ph',
            'Bijvoorbeeld: ik slaap al maanden slecht, ik pieker over mijn werk, en ik wil weten hoe ik terug grenzen leg.',
          )}
        />
      </section>

      {/* Toestemming ----------------------------------------------------- */}
      <section className="rounded-card border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-body font-semibold text-foreground">
              {t(
                'wachtruimte_consent_title',
                'Deel je voorbereiding bij je eerste gesprek',
              )}
            </p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {t(
                'wachtruimte_consent_body',
                'Staat dit aan, dan krijgt de hulpverlener bij wie je start je intake, je nulmeting en je doelen te zien voor het gesprek begint. Je gesprekken met The Coach blijven altijd van jou en worden nooit meegestuurd.',
              )}
            </p>
            <p className="mt-2 text-body-sm text-muted-foreground">
              {t(
                'wachtruimte_consent_revoke',
                'Je kan dit op elk moment weer uitzetten. Zolang het uit staat, verlaat er niets dit toestel.',
              )}
            </p>
          </div>
          <Switch
            checked={state.shareWithProvider}
            onCheckedChange={(v) => setState(persistShare(v))}
            aria-label={t(
              'wachtruimte_consent_aria',
              'Deel mijn voorbereiding met de hulpverlener bij wie ik start',
            )}
          />
        </div>
        {state.shareWithProvider && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-ctl border border-border px-3 py-2 text-body-sm text-foreground">
            <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            {t(
              'wachtruimte_consent_on',
              'Je voorbereiding wordt gedeeld zodra je bij een hulpverlener start. Tot dan gaat er niets weg.',
            )}
          </p>
        )}
      </section>

      {/* Wachtlijst ------------------------------------------------------ */}
      {showWaitlistCapture && (
        <WaitlistCapture
          source="wachtruimte"
          cityName={cityName}
          specialization={specialization}
        />
      )}

      <WachtruimteCrisis />
    </div>
  );
};

export default WachtruimtePanel;

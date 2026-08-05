/**
 * FindMatch — guided, FIT-based matching flow for prospective clients.
 *
 * A short, warm intake (topic → language → modality → optional location/
 * preference) feeds finderService.getMatches(intake), which returns a ranked
 * top-3 shortlist. Each result is a MatchResultCard with a TRANSPARENT
 * "waarom deze match" (fit signals only) plus a "Bekijk profiel" link and a
 * "Contact / Aanvraag" button (RequestProviderDialog).
 *
 * REFERRAL-NEUTRAL BY DESIGN (EU P2B + Belgian dichotomieverbod): ranking is
 * purely on fit (specialization, language, modality, availability) — never on
 * price/payment, and there is NO "promoted"/"sponsored" placement. We frame
 * this as Bondable HELPING you find the right fit and emphasise CHOICE: you
 * pick from the shortlist; nothing is assigned.
 *
 * Mint accent is allowed here because matching is Bondable's AI/matching
 * surface. Dev runs on a mock — empty/loading/error states are handled.
 * New strings via t('key', 'default') only.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Search,
  RotateCcw,
  Check,
  ShieldCheck,
} from 'lucide-react';

import FinderLayout from '@/components/finder/FinderLayout';
import MatchResultCard from '@/components/finder/MatchResultCard';
import RequestProviderDialog from '@/components/finder/RequestProviderDialog';
import FinderDeadEnd from '@/features/wachtruimte/FinderDeadEnd';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  finderService,
  type MatchIntake,
  type MatchResult,
  type Modality,
  type Provider,
} from '@/services/api/finderService';

/* -------------------------------------------------------------------------- */
/* Intake option model (friendly chips + free-text fallback)                   */
/* -------------------------------------------------------------------------- */

interface IntakeState {
  topic: string;
  language: string;
  modality: Modality | '';
  city: string;
  acceptingNewOnly: boolean;
}

const EMPTY_INTAKE: IntakeState = {
  topic: '',
  language: '',
  modality: '',
  city: '',
  acceptingNewOnly: true,
};

type Phase = 'intake' | 'loading' | 'results';

const FindMatch = () => {
  const { t } = useTranslation();

  const [phase, setPhase] = useState<Phase>('intake');
  const [step, setStep] = useState(0);
  const [intake, setIntake] = useState<IntakeState>(EMPTY_INTAKE);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [error, setError] = useState(false);

  // Contact dialog wiring (reuses the shared RequestProviderDialog).
  const [contactProvider, setContactProvider] = useState<Provider | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  /* ----- option sets (seed-aligned, but free-text always allowed) -------- */
  const topicOptions: { value: string; label: string }[] = [
    { value: 'anxiety', label: t('finder_topic_anxiety', 'Angst & piekeren') },
    { value: 'burnout', label: t('finder_topic_burnout', 'Stress & burn-out') },
    { value: 'depression', label: t('finder_topic_depression', 'Somberheid & depressie') },
    { value: 'couples', label: t('finder_topic_couples', 'Relatie & koppel') },
    { value: 'trauma', label: t('finder_topic_trauma', 'Trauma') },
    { value: 'grief', label: t('finder_topic_grief', 'Verlies & rouw') },
    { value: 'adhd', label: t('finder_topic_adhd', 'ADHD & focus') },
  ];

  const languageOptions: { value: string; label: string }[] = [
    { value: 'nl', label: t('finder_lang_nl', 'Nederlands') },
    { value: 'fr', label: t('finder_lang_fr', 'Frans') },
    { value: 'en', label: t('finder_lang_en', 'Engels') },
  ];

  const modalityOptions: { value: Modality; label: string; hint: string }[] = [
    {
      value: 'online',
      label: t('finder_modality_online', 'Online'),
      hint: t('finder_modality_online_hint', 'Vanuit huis, via videogesprek'),
    },
    {
      value: 'in_person',
      label: t('finder_modality_in_person', 'Op locatie'),
      hint: t('finder_modality_in_person_hint', 'In de praktijk, persoonlijk'),
    },
  ];

  /* ----- step config ------------------------------------------------------ */
  const steps = [
    {
      key: 'topic',
      title: t('finder_step_topic_title', 'Waar wil je aan werken?'),
      subtitle: t(
        'finder_step_topic_sub',
        'Kies wat het beste past — dit helpt ons de juiste fit te vinden. Je kunt het later altijd bijstellen.',
      ),
    },
    {
      key: 'language',
      title: t('finder_step_lang_title', 'In welke taal voel je je het meest op je gemak?'),
      subtitle: t(
        'finder_step_lang_sub',
        'We tonen hulpverleners die jouw taal spreken.',
      ),
    },
    {
      key: 'modality',
      title: t('finder_step_modality_title', 'Hoe wil je het liefst afspreken?'),
      subtitle: t(
        'finder_step_modality_sub',
        'Online, op locatie — wat voor jou prettig voelt.',
      ),
    },
    {
      key: 'preference',
      title: t('finder_step_pref_title', 'Nog een voorkeur?'),
      subtitle: t(
        'finder_step_pref_sub',
        'Optioneel. Laat leeg als je breed wilt zoeken.',
      ),
    },
  ];

  const totalSteps = steps.length;
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  /* ----- handlers --------------------------------------------------------- */
  const set = (patch: Partial<IntakeState>) =>
    setIntake((prev) => ({ ...prev, ...patch }));

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const runMatch = async () => {
    setPhase('loading');
    setError(false);
    const payload: MatchIntake = {
      topic: intake.topic.trim() || undefined,
      language: intake.language || undefined,
      modality: intake.modality || undefined,
      city: intake.city.trim() || undefined,
      acceptingNewOnly: intake.acceptingNewOnly,
    };
    try {
      const matches = await finderService.getMatches(payload);
      setResults(matches);
      setPhase('results');
    } catch {
      setError(true);
      setResults([]);
      setPhase('results');
    }
  };

  const restart = () => {
    setIntake(EMPTY_INTAKE);
    setResults([]);
    setError(false);
    setStep(0);
    setPhase('intake');
  };

  const openContact = (match: MatchResult) => {
    setContactProvider(match.provider);
    setDialogOpen(true);
  };

  /* ----- shared header ---------------------------------------------------- */
  const Hero = (
    <div className="space-y-3 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-medium text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-mint" aria-hidden="true" />
        {t('finder_match_badge', 'Matching op basis van fit')}
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {t('finder_match_title', 'Vind jouw match')}
      </h1>
      <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
        {t(
          'finder_match_intro',
          'Bondable helpt je de juiste hulpverlener te vinden — gerangschikt op fit, nooit op betaling. Jij kiest uit een korte shortlist.',
        )}
      </p>
    </div>
  );

  /* ----- step bodies ------------------------------------------------------ */
  const renderStepBody = () => {
    const current = steps[step].key;

    if (current === 'topic') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topicOptions.map((opt) => {
              const active = intake.topic === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set({ topic: active ? '' : opt.value })}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors',
                    active
                      ? 'border-mint bg-mint/10 text-foreground'
                      : 'border-border bg-card text-foreground hover:border-mint/50 hover:bg-accent',
                  )}
                >
                  <span>{opt.label}</span>
                  {active && (
                    <Check className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-other" className="text-xs text-muted-foreground">
              {t('finder_topic_other', 'Of beschrijf het in je eigen woorden')}
            </Label>
            <Input
              id="topic-other"
              value={
                topicOptions.some((o) => o.value === intake.topic) ? '' : intake.topic
              }
              onChange={(e) => set({ topic: e.target.value })}
              placeholder={t('finder_topic_other_ph', 'bv. slaapproblemen, zelfvertrouwen…')}
            />
          </div>
        </div>
      );
    }

    if (current === 'language') {
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {languageOptions.map((opt) => {
            const active = intake.language === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set({ language: active ? '' : opt.value })}
                aria-pressed={active}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-mint bg-mint/10 text-foreground'
                    : 'border-border bg-card text-foreground hover:border-mint/50 hover:bg-accent',
                )}
              >
                {active && <Check className="h-4 w-4 text-mint" aria-hidden="true" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (current === 'modality') {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modalityOptions.map((opt) => {
            const active = intake.modality === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set({ modality: active ? '' : opt.value })}
                aria-pressed={active}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-xl border px-4 py-4 text-left transition-colors',
                  active
                    ? 'border-mint bg-mint/10'
                    : 'border-border bg-card hover:border-mint/50 hover:bg-accent',
                )}
              >
                <span className="flex w-full items-center justify-between text-sm font-medium text-foreground">
                  {opt.label}
                  {active && <Check className="h-4 w-4 text-mint" aria-hidden="true" />}
                </span>
                <span className="text-xs text-muted-foreground">{opt.hint}</span>
              </button>
            );
          })}
        </div>
      );
    }

    // preference
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pref-city" className="text-sm text-foreground">
            {t('finder_pref_city', 'Stad of regio')}
            <span className="ml-1 font-normal text-muted-foreground">
              {t('finder_pref_optional', '(optioneel)')}
            </span>
          </Label>
          <Input
            id="pref-city"
            value={intake.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder={t('finder_pref_city_ph', 'bv. Gent, Antwerpen, Brussel')}
          />
          <p className="text-xs text-muted-foreground">
            {t(
              'finder_pref_city_hint',
              'Vooral handig als je liever op locatie afspreekt.',
            )}
          </p>
        </div>

        <label
          htmlFor="pref-accepting"
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <input
            id="pref-accepting"
            type="checkbox"
            checked={intake.acceptingNewOnly}
            onChange={(e) => set({ acceptingNewOnly: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-[hsl(var(--primary))]"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              {t('finder_pref_accepting', 'Toon alleen wie nieuwe cliënten aanneemt')}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t(
                'finder_pref_accepting_hint',
                'Zo kun je meteen aan de slag.',
              )}
            </span>
          </span>
        </label>
      </div>
    );
  };

  /* ----- render: intake wizard ------------------------------------------- */
  const renderIntake = () => (
    <div className="mx-auto max-w-2xl space-y-8">
      {Hero}

      <Card className="rounded-2xl border-border bg-card p-6 sm:p-8">
        {/* progress */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t('finder_step_counter', 'Stap {{n}} van {{total}}', {
                n: step + 1,
                total: totalSteps,
              })}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {steps[step].title}
          </h2>
          <p className="text-sm text-muted-foreground">{steps[step].subtitle}</p>
        </div>

        <div className="mt-6">{renderStepBody()}</div>

        {/* nav */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 0}
            className="gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('finder_step_back', 'Terug')}
          </Button>

          {step < totalSteps - 1 ? (
            <Button onClick={next} className="gap-1.5">
              {t('finder_step_next', 'Volgende')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={runMatch} className="gap-1.5">
              <Search className="h-4 w-4" aria-hidden="true" />
              {t('finder_step_find', 'Toon mijn matches')}
            </Button>
          )}
        </div>
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t(
          'finder_match_neutral_note',
          'We rangschikken op fit — specialisatie, taal, vorm en beschikbaarheid. Nooit op betaling, geen gesponsorde plaatsing.',
        )}
      </p>
    </div>
  );

  /* ----- render: loading -------------------------------------------------- */
  const renderLoading = () => (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint/10 text-mint">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">
          {t('finder_match_loading_title', 'We zoeken jouw beste matches…')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(
            'finder_match_loading_sub',
            'We vergelijken op fit: specialisatie, taal, vorm en beschikbaarheid.',
          )}
        </p>
      </div>
    </div>
  );

  /* ----- render: results -------------------------------------------------- */
  const renderResults = () => {
    const summaryParts = [
      topicOptions.find((o) => o.value === intake.topic)?.label ||
        intake.topic ||
        null,
      languageOptions.find((o) => o.value === intake.language)?.label || null,
      intake.modality
        ? modalityOptions.find((o) => o.value === intake.modality)?.label
        : null,
      intake.city || null,
    ].filter(Boolean) as string[];

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('finder_results_title', 'Jouw shortlist')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {results.length > 0
              ? t(
                  'finder_results_sub',
                  'Op basis van jouw antwoorden — gerangschikt op fit. Jij kiest met wie je contact opneemt.',
                )
              : t(
                  'finder_results_empty_sub',
                  'We vonden nog geen sterke match. Verbreed je voorkeuren of bekijk alle hulpverleners.',
                )}
          </p>

          {summaryParts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t('finder_results_your_answers', 'Jouw voorkeuren:')}
              </span>
              {summaryParts.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <Card className="rounded-2xl border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t(
                'finder_results_error',
                'Er ging iets mis bij het ophalen van matches. Probeer het opnieuw.',
              )}
            </p>
            <Button onClick={runMatch} variant="outline" className="mt-4 gap-1.5">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('finder_results_retry', 'Opnieuw proberen')}
            </Button>
          </Card>
        )}

        {!error && results.length > 0 && (
          <div className="space-y-4">
            {results.map((match, i) => (
              <MatchResultCard
                key={match.provider.id}
                match={match}
                rank={i + 1}
                onContact={openContact}
              />
            ))}
          </div>
        )}

        {!error && results.length === 0 && (
          /* Geen match is geen doodlopend spoor meer: The Coach, een
             e-mailopvang en de wachttijden in de buurt (track 5). We geven
             alleen het FACETLABEL door — vrije tekst blijft hier. */
          <div className="space-y-4">
            <FinderDeadEnd
              source="find_no_match"
              cityName={intake.city.trim() || null}
              specialization={
                topicOptions.find((o) => o.value === intake.topic)?.label ?? null
              }
              hasFilters
              onReset={restart}
              resetLabel={t('finder_results_adjust', 'Antwoorden aanpassen')}
            />
            <div className="flex justify-center">
              <Button asChild variant="outline">
                <Link to="/find">
                  {t('finder_results_browse_all', 'Bekijk alle hulpverleners')}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* footer actions */}
        <div className="flex flex-col items-center gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
          <Button onClick={restart} variant="ghost" className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t('finder_results_restart', 'Opnieuw matchen')}
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(
              'finder_results_neutral',
              'Gerangschikt op fit, nooit op betaling.',
            )}
          </p>
        </div>
      </div>
    );
  };

  return (
    <FinderLayout>
      {phase === 'intake' && renderIntake()}
      {phase === 'loading' && renderLoading()}
      {phase === 'results' && renderResults()}

      {contactProvider && (
        <RequestProviderDialog
          provider={contactProvider}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </FinderLayout>
  );
};

export default FindMatch;

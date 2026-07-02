import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft } from "lucide-react";

import { CrisisResources } from "@/components/safety/CrisisResources";
import { analyticsService } from "@/services/api/analyticsService";
import { ANALYTICS_EVENTS } from "@/config/analyticsEvents";
import {
  getInstrument,
  saveResult,
  scoreResult,
  type AssessmentResult,
  type InstrumentId,
} from "@/services/api/outcomesService";

/**
 * Questionnaire — the calm self-assessment runner for scored outcome
 * instruments (tickets T-CX-12/13).
 *
 * One item per screen with a slim progress bar, fixed tappable choices, and a
 * quiet review-and-save step. Deliberately not gamified: no confetti, no
 * green/red scoring, no streaks. The result is scored and persisted via
 * outcomesService (localStorage mock).
 *
 * SAFETY (non-negotiable) — PHQ-9 item 9 (self-harm) > 0 SYNCHRONOUSLY
 * interrupts the flow with the crisis panel (1813 BE / 113 NL / 112) before the
 * person can go any further, and logs `bond_crisis_triggered` with NO answer
 * text. The interrupt never blocks the person from finishing the numbers — it
 * surfaces help first, then offers to resume. Rendered from local, offline data;
 * no network, no gate, no delay stands between the trigger and the resources.
 */

interface QuestionnaireProps {
  instrumentId: InstrumentId;
  /** Called with the saved result once the person completes the flow. */
  onComplete?: (result: AssessmentResult) => void;
  /** Called when the person leaves without saving (e.g. Sheet close). */
  onCancel?: () => void;
}

const Questionnaire = ({
  instrumentId,
  onComplete,
  onCancel,
}: QuestionnaireProps) => {
  const { t } = useTranslation();
  const instrument = useMemo(
    () => getInstrument(instrumentId),
    [instrumentId],
  );

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  // When set, the crisis panel is shown over everything else. It carries the
  // item index that triggered it so we can resume there afterwards.
  const [crisisAt, setCrisisAt] = useState<number | null>(null);
  const [saved, setSaved] = useState<AssessmentResult | null>(null);

  const total = instrument.items.length;
  const isLast = index === total - 1;
  const currentItem = instrument.items[index];
  const currentAnswer = answers[index];
  const answeredCount = Object.keys(answers).length;

  const progressPct = Math.round(((index + (saved ? 1 : 0)) / total) * 100);

  const selectOption = (value: number) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));

    // SAFETY interrupt — item 9 on PHQ-9. Fire synchronously, before advancing.
    if (instrument.crisisItemIndex === index && value > 0) {
      try {
        analyticsService.track(ANALYTICS_EVENTS.bond_crisis_triggered, {
          surface: "assessment",
          guardrail: "phq9_item9",
        });
      } catch {
        /* analytics never blocks the safety path */
      }
      setCrisisAt(index);
      return;
    }
  };

  const goNext = () => {
    if (currentAnswer == null) return;
    if (isLast) {
      finish();
      return;
    }
    setIndex((i) => Math.min(i + 1, total - 1));
  };

  const goBack = () => {
    setIndex((i) => Math.max(i - 1, 0));
  };

  const finish = () => {
    const ordered = instrument.items.map((_, i) => answers[i] ?? 0);
    const result = saveResult({ instrument: instrumentId, answers: ordered });
    setSaved(result);
    onComplete?.(result);
  };

  // Live preview of the band while reviewing (not shown mid-flow).
  const preview = useMemo(() => {
    const ordered = instrument.items.map((_, i) => answers[i] ?? 0);
    return scoreResult(instrumentId, ordered);
  }, [answers, instrument.items, instrumentId]);

  /* ── Crisis interrupt — takes over the whole surface, synchronous ──────── */
  if (crisisAt != null) {
    return (
      <div className="animate-enter space-y-4">
        <div>
          <h2 className="font-display text-display-md text-foreground">
            {t("outcomes_crisis_title", "Je staat er niet alleen voor")}
          </h2>
          <p className="mt-2 text-body-sm text-muted-foreground">
            {t(
              "outcomes_crisis_body",
              "Je gaf net iets moeilijks aan. Bekijk dit even, dan mag je verder als je wil.",
            )}
          </p>
        </div>

        <CrisisResources />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="rounded-ctl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("outcomes_crisis_stop", "Stoppen voor nu")}
          </button>
          <button
            type="button"
            onClick={() => setCrisisAt(null)}
            className="rounded-ctl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("outcomes_crisis_resume", "Verdergaan met de vragenlijst")}
          </button>
        </div>
      </div>
    );
  }

  /* ── Done screen — calm acknowledgement, no confetti, no score judgment ── */
  if (saved) {
    return (
      <div className="animate-enter text-center">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success"
        >
          <Check className="h-6 w-6" />
        </span>
        <h2 className="font-display text-display-md text-foreground">
          {t("outcomes_done_title", "Bewaard. Dank je wel")}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-body-sm text-muted-foreground">
          {t(
            "outcomes_done_body",
            "Je vindt deze meting terug in je voortgang, naast je eerdere metingen.",
          )}
        </p>
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="mt-6 rounded-ctl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t("outcomes_done_close", "Naar mijn voortgang")}
        </button>
      </div>
    );
  }

  /* ── One item per screen ──────────────────────────────────────────────── */
  return (
    <div className="animate-enter">
      {/* Progress */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between text-label text-muted-foreground">
          <span>{instrument.name}</span>
          <span>
            {t("outcomes_step_of", "Vraag {{n}} van {{total}}", {
              n: index + 1,
              total,
            })}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.max(progressPct, 4)}%` }}
          />
        </div>
      </div>

      {/* Recall lead-in on the first item only */}
      {index === 0 && instrument.recallLine ? (
        <p className="mb-4 text-body-sm text-muted-foreground">
          {instrument.recallLine}
        </p>
      ) : null}

      {/* The item prompt */}
      <p className="mb-4 text-body text-foreground">{currentItem.prompt}</p>

      {/* Fixed choices */}
      <div
        className="space-y-2"
        role="radiogroup"
        aria-label={currentItem.prompt}
      >
        {instrument.options.map((opt) => {
          const selected = currentAnswer === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectOption(opt.value)}
              className={`flex w-full items-center justify-between gap-3 rounded-ctl border px-4 py-3 text-left text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                selected
                  ? "border-primary bg-accent text-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent/60"
              }`}
            >
              <span>{opt.label}</span>
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                }`}
              >
                {selected ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={index === 0 ? () => onCancel?.() : goBack}
          className="flex items-center gap-1 rounded-ctl px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {index === 0
            ? t("outcomes_cancel", "Annuleren")
            : t("outcomes_back", "Terug")}
        </button>

        <button
          type="button"
          disabled={currentAnswer == null}
          onClick={goNext}
          className="rounded-ctl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLast
            ? t("outcomes_finish", "Meting bewaren")
            : t("outcomes_next", "Verder")}
        </button>
      </div>

      {/* Quiet answered indicator (no gamification) */}
      <p className="mt-4 text-center text-label text-muted-foreground">
        {t("outcomes_answered", "{{n}} van {{total}} beantwoord", {
          n: answeredCount,
          total,
        })}
      </p>

      {/* Screen-reader only running preview (not visually shown mid-flow) */}
      <span className="sr-only">
        {preview.band?.label ?? ""}
      </span>
    </div>
  );
};

export default Questionnaire;

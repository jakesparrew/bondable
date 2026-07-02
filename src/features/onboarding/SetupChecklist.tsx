/**
 * SetupChecklist — a persistent, auto-detecting provider setup checklist (not a
 * forced wizard). Border-first card (no mint — this is not an AI surface). Hides
 * itself once the provider is "activated" (R21) or dismissed. In the mock, an
 * action link marks its step done optimistically so the flow is demoable.
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ArrowRight, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import LineBranch from '@/components/illustration/LineBranch';
import { useOnboarding } from './useOnboarding';

const SetupChecklist = () => {
  const { t } = useTranslation();
  const { progress, steps, doneCount, total, activated, setStep, dismiss } =
    useOnboarding('provider');

  if (activated || progress.dismissed) return null;

  const pct = Math.round((doneCount / total) * 100);

  return (
    <section className="mb-6 rounded-card border border-border bg-card p-5 sm:p-6 animate-enter">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <LineBranch className="hidden h-14 w-14 shrink-0 text-primary/40 sm:block" />
          <div>
            <h2 className="font-display text-display-md text-foreground">
              {t('ob_prov_title', 'Zet je praktijk op')}
            </h2>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {t(
                'ob_prov_subtitle',
                'Een paar stappen en je bent klaar om cliënten te begeleiden.',
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={dismiss}
          aria-label={t('ob_dismiss', 'Verberg')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress meter */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-body-sm tabular text-muted-foreground">
          {doneCount}/{total}
        </span>
      </div>

      {/* Steps */}
      <ul className="mt-4 divide-y divide-border">
        {steps.map((step) => {
          const done = !!progress.steps[step.key];
          return (
            <li key={step.key} className="flex items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => setStep(step.key, !done)}
                aria-label={done ? t('ob_mark_undone', 'Markeer als niet gedaan') : t('ob_mark_done', 'Markeer als gedaan')}
                className={
                  done
                    ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-primary-foreground'
                    : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-transparent hover:border-primary'
                }
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    done
                      ? 'text-sm font-medium text-muted-foreground line-through'
                      : 'text-sm font-medium text-foreground'
                  }
                >
                  {t(step.labelKey, step.labelDefault)}
                </p>
                {!done && (
                  <p className="text-body-sm text-muted-foreground">
                    {t(step.hintKey, step.hintDefault)}
                  </p>
                )}
              </div>
              {!done && step.to && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-primary"
                  onClick={() => setStep(step.key, true)}
                >
                  <Link to={step.to}>
                    {t('ob_step_go', 'Ga')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default SetupChecklist;

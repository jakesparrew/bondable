import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Check } from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import EmptyState from "@/components/ui/empty-state";
import LineSteps from "@/components/illustration/LineSteps";
import { CrisisHelpButton } from "@/components/safety/CrisisResources";
import { cn } from "@/lib/utils";
import { analyticsService } from "@/services/api/analyticsService";
import { ANALYTICS_EVENTS } from "@/config/analyticsEvents";
import {
  carePlanService,
  type CarePlan,
  type CarePlanTask,
  type FeltScore,
} from "@/services/api/carePlanService";

/**
 * ClientCarePlan — the client Care Plan view (ticket T-CX-10).
 *
 * This is the client render path for homework, reframed as a *care plan* built
 * together with the provider rather than a to-do list. Tasks are grouped under
 * goal headers (Fraunces, one display level for this view); each task is a calm
 * row with a check, a "waarom deze oefening" rationale, and — where present — a
 * quiet provider reaction ("Wout zag dit"). Completing a task opens a gentle
 * bottom sheet inviting an optional reflection ("hoe voelde dit?"), never gated
 * and dismissible in one tap.
 *
 * The provider-facing sortable table in `src/pages/Tasks.tsx` is untouched;
 * this page reads its own mock/localStorage store via carePlanService.
 *
 * NB: these are client care surfaces — NO mint here (mint is Bond-only).
 */

/** The 1–5 "hoe ging het?" labels for the completion sheet. */
const FELT_OPTIONS: { value: FeltScore; label: string }[] = [
  { value: 1, label: "Zwaar" },
  { value: 2, label: "Lastig" },
  { value: 3, label: "Ging wel" },
  { value: 4, label: "Goed" },
  { value: 5, label: "Fijn" },
];

interface CompletionState {
  task: CarePlanTask;
  felt: FeltScore | null;
  reflection: string;
}

const ClientCarePlan = () => {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<CarePlan>(() =>
    carePlanService.getCarePlan(),
  );
  const [completion, setCompletion] = useState<CompletionState | null>(null);

  const isEmpty = useMemo(() => plan.goals.length === 0, [plan]);

  const openCompletion = (task: CarePlanTask) => {
    setCompletion({ task, felt: null, reflection: "" });
  };

  const closeCompletion = () => setCompletion(null);

  const confirmCompletion = () => {
    if (!completion) return;
    const next = carePlanService.completeTask(completion.task.id, {
      felt: completion.felt ?? undefined,
      reflection: completion.reflection,
    });
    setPlan(next);
    try {
      analyticsService.track(ANALYTICS_EVENTS.first_task_completed, {
        client_ref: "care_plan",
      });
    } catch {
      /* analytics is best-effort; never block the client loop */
    }
    setCompletion(null);
  };

  const handleReopen = (task: CarePlanTask) => {
    setPlan(carePlanService.reopenTask(task.id));
  };

  return (
    <DashboardLayout userType="client">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        {/* Page heading — the single Fraunces display level for this view */}
        <header className="animate-enter">
          <h1 className="font-display text-display-lg text-foreground">
            {t("care_plan.title", "Jullie zorgplan")}
          </h1>
          <p className="mt-2 max-w-xl text-body-sm text-muted-foreground">
            {t(
              "care_plan.subtitle",
              "Dit bouw je samen met je begeleider op. Geen afvinklijst — kleine oefeningen die aansluiten bij waar je aan werkt.",
            )}
          </p>
        </header>

        {isEmpty ? (
          <div className="mt-12">
            <EmptyState
              bordered
              motif={<LineSteps />}
              title={t("care_plan.empty_title", "Nog geen plan")}
              description={t(
                "care_plan.empty_body",
                "Je begeleider stelt hier jullie plan samen. Zodra er oefeningen zijn, verschijnen ze hier per doel.",
              )}
            />
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {plan.goals.map((group) => (
              <section key={group.goal.id} className="animate-enter">
                {/* Goal header */}
                <div className="mb-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="font-display text-display-md text-foreground">
                      {group.goal.title}
                    </h2>
                    <span className="text-label text-muted-foreground">
                      {t("care_plan.goal_progress", {
                        defaultValue: "{{done}} van {{total}} gedaan",
                        done: group.doneCount,
                        total: group.totalCount,
                      })}
                    </span>
                  </div>
                  <p className="mt-1 max-w-xl text-body-sm text-muted-foreground">
                    {group.goal.subtitle}
                  </p>
                </div>

                {/* Task rows */}
                <ul className="space-y-3">
                  {group.tasks.map((task) => (
                    <li key={task.id}>
                      <CarePlanRow
                        task={task}
                        t={t}
                        onComplete={() => openCompletion(task)}
                        onReopen={() => handleReopen(task)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* Persistent, calm safety affordance */}
        <footer className="mt-16 flex items-center justify-center border-t border-border pt-6">
          <CrisisHelpButton />
        </footer>
      </div>

      <CompletionSheet
        state={completion}
        t={t}
        onOpenChange={(open) => (open ? null : closeCompletion())}
        onFelt={(felt) =>
          setCompletion((c) => (c ? { ...c, felt } : c))
        }
        onReflection={(reflection) =>
          setCompletion((c) => (c ? { ...c, reflection } : c))
        }
        onConfirm={confirmCompletion}
      />
    </DashboardLayout>
  );
};

/** ---- a single calm task row -------------------------------------------- */

interface CarePlanRowProps {
  task: CarePlanTask;
  t: TFunction;
  onComplete: () => void;
  onReopen: () => void;
}

const CarePlanRow = ({ task, t, onComplete, onReopen }: CarePlanRowProps) => {
  const done = task.status === "done";
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-card p-4 transition-shadow",
        !done && "hover:shadow-raise",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Check control */}
        <button
          type="button"
          onClick={done ? onReopen : onComplete}
          aria-label={
            done
              ? t("care_plan.mark_open", "Terug naar open")
              : t("care_plan.mark_done", "Markeer als gedaan")
          }
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-ctl border transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            done
              ? "border-transparent bg-success text-background"
              : "border-border bg-background hover:border-primary",
          )}
        >
          {done ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cn(
                "text-body font-medium text-foreground",
                done && "text-muted-foreground line-through decoration-border",
              )}
            >
              {task.title}
            </h3>
            {!done && task.overdue ? (
              <Badge variant="outline">
                {t("care_plan.still_open", "Nog open")}
              </Badge>
            ) : null}
          </div>

          {/* Why-this-helps rationale */}
          <p className="mt-1 text-body-sm text-muted-foreground">
            <span className="font-medium text-foreground/70">
              {t("care_plan.why_label", "Waarom deze oefening")}
              {": "}
            </span>
            {task.rationale}
          </p>

          {/* Due window — never a red badge, always calm */}
          <p className="mt-2 text-label text-muted-foreground">
            {done
              ? t("care_plan.done_note", "Gedaan — mooi werk")
              : task.overdue
                ? t(
                    "care_plan.overdue_note",
                    "Nog open — geen stress, pak het op wanneer het past",
                  )
                : task.dueWindow}
          </p>

          {/* Completion reflection echoed back */}
          {done && task.completionReflection ? (
            <blockquote className="mt-3 rounded-ctl border border-border bg-background px-3 py-2 text-body-sm text-foreground/80">
              {task.completionReflection}
            </blockquote>
          ) : null}

          {/* Provider reaction — "Wout zag dit" */}
          {task.reaction ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {task.reaction.kind === "seen" ? (
                <Badge variant="info">
                  {t("care_plan.reaction_seen", {
                    defaultValue: "{{name}} zag dit",
                    name: task.reaction.providerName,
                  })}
                </Badge>
              ) : (
                <p className="text-body-sm text-foreground">
                  <span className="font-medium">
                    {task.reaction.providerName}
                    {": "}
                  </span>
                  {task.reaction.note}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/** ---- gentle completion sheet ------------------------------------------- */

interface CompletionSheetProps {
  state: CompletionState | null;
  t: TFunction;
  onOpenChange: (open: boolean) => void;
  onFelt: (felt: FeltScore) => void;
  onReflection: (reflection: string) => void;
  onConfirm: () => void;
}

const CompletionSheet = ({
  state,
  t,
  onOpenChange,
  onFelt,
  onReflection,
  onConfirm,
}: CompletionSheetProps) => {
  return (
    <Sheet open={state !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-hero">
        <div className="mx-auto w-full max-w-md">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-display-md">
              {t("care_plan.completion_title", "Hoe ging het?")}
            </SheetTitle>
            <SheetDescription>
              {t(
                "care_plan.completion_desc",
                "Even stilstaan mag, maar het hoeft niet. Je kunt dit ook gewoon overslaan.",
              )}
            </SheetDescription>
          </SheetHeader>

          {/* 1–5 felt scale — neutral, no red/green judgment */}
          <div className="mt-6">
            <div className="grid grid-cols-5 gap-2">
              {FELT_OPTIONS.map((opt) => {
                const active = state?.felt === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onFelt(opt.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-ctl border px-2 py-3 text-label transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      active
                        ? "border-primary bg-accent text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    <span
                      className={cn(
                        "text-body font-medium",
                        active ? "text-primary" : "text-foreground/70",
                      )}
                    >
                      {opt.value}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional one line */}
          <div className="mt-5">
            <label
              htmlFor="care-plan-reflection"
              className="text-label text-muted-foreground"
            >
              {t("care_plan.reflection_label", "Wil je er iets bij zeggen?")}
            </label>
            <Textarea
              id="care-plan-reflection"
              value={state?.reflection ?? ""}
              onChange={(e) => onReflection(e.target.value)}
              placeholder={t(
                "care_plan.reflection_placeholder",
                "Eén zin is genoeg",
              )}
              rows={3}
              className="mt-2 resize-none"
            />
          </div>

          <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
            <Button type="button" className="w-full" onClick={onConfirm}>
              {t("care_plan.completion_save", "Klaar")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              {t("care_plan.completion_skip", "Overslaan")}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClientCarePlan;

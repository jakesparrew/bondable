import console from "@/lib/production-console";

/**
 * carePlanService — the client-side "care plan" model (ticket T-CX-10).
 *
 * The provider side of homework lives in `src/pages/Tasks.tsx` (a sortable
 * table over the `tasks` entity) and MUST NOT be disturbed. This service backs
 * the NEW client Care Plan view, which reframes those same exercises as a plan
 * the client and their provider build *together*: grouped by goal/theme, each
 * task carrying a "waarom deze oefening" rationale, an optional completion
 * reflection ("hoe voelde dit?"), and a provider reaction ("Wout zag dit").
 *
 * It is deliberately self-contained and mock/localStorage-backed so demo mode
 * works with zero backend. It seeds a warm, concrete plan (Flemish names, real
 * relative dates) on first read and then persists mutations (completion,
 * reflection) locally. Nothing here touches the existing Tasks flow or the
 * shared `tasks` mock table — the client plan is its own store.
 *
 * When the real backend lands (04-platform), the read/mutate methods keep their
 * signatures and swap their bodies to hit goals + tasks + task_reactions.
 */

export const CARE_PLAN_STORAGE_KEY = "bondable_care_plan_v1";

export type CarePlanTaskStatus = "open" | "done";

/** How the client felt doing the exercise — 1 (zwaar) … 5 (goed). Optional. */
export type FeltScore = 1 | 2 | 3 | 4 | 5;

export interface ProviderReaction {
  /** "seen" renders as a quiet chip; "encourage" carries a short line. */
  kind: "seen" | "encourage";
  /** Provider display name, e.g. "Wout". */
  providerName: string;
  /** Optional short line for kind==="encourage". Never an emoji. */
  note?: string;
  /** ISO 8601. */
  createdAt: string;
}

export interface CarePlanTask {
  id: string;
  goalId: string;
  title: string;
  /** "waarom deze oefening" — provider-authored rationale, always present. */
  rationale: string;
  status: CarePlanTaskStatus;
  /** Human due-window label, calm and non-urgent. e.g. "deze week". */
  dueWindow: string;
  /** True when the due window has passed — surfaced gently, never as a red badge. */
  overdue: boolean;
  /** ISO timestamp of completion, if done. */
  completedAt?: string;
  /** "hoe voelde dit?" — optional free line captured on completion. */
  completionReflection?: string;
  /** Optional 1–5 felt score captured on completion. */
  completedFelt?: FeltScore;
  /** Provider reaction to a completion, if any. */
  reaction?: ProviderReaction;
}

export interface CarePlanGoal {
  id: string;
  /** Theme header, e.g. "Beter slapen". */
  title: string;
  /** One calm sentence of context under the header. */
  subtitle: string;
}

export interface CarePlanGoalGroup {
  goal: CarePlanGoal;
  tasks: CarePlanTask[];
  /** Convenience counts for the "2 van 3 gedaan" header line. */
  doneCount: number;
  totalCount: number;
}

export interface CarePlan {
  goals: CarePlanGoalGroup[];
}

/** ---- seed --------------------------------------------------------------- */

/**
 * A demo plan for the seeded client (Lotte Vermeulen), authored by her provider
 * Wout. Two goals, calm rationales, one already-completed task carrying a
 * provider reaction so the "witnessed, not assigned" loop is visible on load.
 * Dates are relative so the plan never reads stale.
 */
function nowISO(): string {
  return new Date().toISOString();
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function seedPlan(): CarePlanTask[] {
  return [
    {
      id: "cp-task-1",
      goalId: "goal-piekeren",
      title: "Piekermoment van 15 minuten",
      rationale:
        "Door je zorgen een vast plekje te geven, hoeven ze niet de hele dag mee. Je oefent zo dat piekeren iets is wat je doet, niet iets wat jou overkomt.",
      status: "open",
      dueWindow: "deze week",
      overdue: false,
    },
    {
      id: "cp-task-2",
      goalId: "goal-piekeren",
      title: "Gedachten opschrijven voor het slapengaan",
      rationale:
        "Wat op papier staat, hoeft je hoofd 's nachts niet meer vast te houden. Kort is genoeg, het gaat om het loslaten.",
      status: "done",
      dueWindow: "vorige week",
      overdue: false,
      completedAt: daysAgoISO(3),
      completionReflection: "Voelde rustiger dan ik dacht. Sliep sneller in.",
      completedFelt: 4,
      reaction: {
        kind: "encourage",
        providerName: "Wout",
        note: "Fijn dat het rustiger voelde. Dit bouwen we verder uit.",
        createdAt: daysAgoISO(2),
      },
    },
    {
      id: "cp-task-3",
      goalId: "goal-slapen",
      title: "Vaste tijd om naar bed te gaan",
      rationale:
        "Je lichaam houdt van voorspelbaarheid. Eenzelfde tijd aanhouden helpt je slaap vanzelf dieper worden, ook al merk je dat pas na een paar dagen.",
      status: "open",
      dueWindow: "elke avond deze week",
      overdue: false,
    },
    {
      id: "cp-task-4",
      goalId: "goal-slapen",
      title: "Scherm weg een half uur voor het slapen",
      rationale:
        "Minder prikkels vlak voor bed geeft je hoofd de kans om af te bouwen. Leg je telefoon bewust op een andere plek dan je nachtkastje.",
      status: "open",
      dueWindow: "deze week",
      overdue: true,
    },
  ];
}

/** The two seeded goals. Kept separate from tasks so headers stay stable. */
const SEED_GOALS: CarePlanGoal[] = [
  {
    id: "goal-piekeren",
    title: "Minder piekeren",
    subtitle: "Zorgen een plek geven, zodat ze niet de hele dag meegaan.",
  },
  {
    id: "goal-slapen",
    title: "Beter slapen",
    subtitle: "Rustiger de avond afsluiten en makkelijker in slaap vallen.",
  },
];

/** ---- persistence -------------------------------------------------------- */

function readTasks(): CarePlanTask[] {
  if (typeof window === "undefined") return seedPlan();
  try {
    const raw = window.localStorage.getItem(CARE_PLAN_STORAGE_KEY);
    if (!raw) {
      const seeded = seedPlan();
      window.localStorage.setItem(CARE_PLAN_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as CarePlanTask[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedPlan();
    return parsed;
  } catch (err) {
    console.error("carePlanService: failed to read plan", err);
    return seedPlan();
  }
}

function writeTasks(tasks: CarePlanTask[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CARE_PLAN_STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error("carePlanService: failed to persist plan", err);
  }
}

/** ---- public API --------------------------------------------------------- */

/** Group the stored tasks under their goals, dropping empty goals. */
function group(tasks: CarePlanTask[]): CarePlanGoalGroup[] {
  return SEED_GOALS.map((goal) => {
    const goalTasks = tasks.filter((t) => t.goalId === goal.id);
    return {
      goal,
      tasks: goalTasks,
      doneCount: goalTasks.filter((t) => t.status === "done").length,
      totalCount: goalTasks.length,
    };
  }).filter((g) => g.totalCount > 0);
}

export const carePlanService = {
  /**
   * Read the client's care plan, grouped by goal. Seeds on first call.
   * `_clientId` is accepted for forward-compatibility with the real backend;
   * the mock returns the single demo client's plan regardless.
   */
  getCarePlan(_clientId?: string): CarePlan {
    const tasks = readTasks();
    return { goals: group(tasks) };
  },

  /** True when the plan has no goals/tasks yet (empty-state trigger). */
  isEmpty(_clientId?: string): boolean {
    return readTasks().length === 0;
  },

  /**
   * Mark a task done, optionally attaching a felt score (1–5) and a short
   * reflection. Reflection is invited, never required — both may be omitted.
   * Returns the freshly grouped plan.
   */
  completeTask(
    taskId: string,
    opts: { felt?: FeltScore; reflection?: string } = {},
  ): CarePlan {
    const tasks = readTasks().map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: "done" as const,
            completedAt: nowISO(),
            completedFelt: opts.felt,
            completionReflection: opts.reflection?.trim() || undefined,
          }
        : t,
    );
    writeTasks(tasks);
    return { goals: group(tasks) };
  },

  /** Move a task back to open (undo a completion). Returns the grouped plan. */
  reopenTask(taskId: string): CarePlan {
    const tasks = readTasks().map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: "open" as const,
            completedAt: undefined,
            completedFelt: undefined,
            completionReflection: undefined,
          }
        : t,
    );
    writeTasks(tasks);
    return { goals: group(tasks) };
  },

  /** Reset the plan to its seed (handy for demos). */
  reset(): CarePlan {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(CARE_PLAN_STORAGE_KEY);
      } catch (err) {
        console.error("carePlanService: failed to reset plan", err);
      }
    }
    return { goals: group(readTasks()) };
  },
};

export default carePlanService;

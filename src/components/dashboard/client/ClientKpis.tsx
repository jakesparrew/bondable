import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, ListTodo, BookOpen, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useOptimizedSessions } from "@/hooks/api/useOptimizedSessions";
import { useOptimizedTasks } from "@/hooks/api/useOptimizedTasks";
import { useOptimizedJournalEntries } from "@/hooks/api/useOptimizedJournal";
import { useConnectedTherapists } from "@/hooks/api/useOptimizedTherapists";
import { getNextSession, formatSessionDateTime } from "./clientSessionUtils";

const OPEN_TASK_STATES = new Set(["assigned", "in_progress"]);

/**
 * Client status/KPI strip: Next session, Open tasks, Journal entries (this
 * month), and My therapist. All values are wired to the real client hooks so
 * they populate from the seeded mock data and degrade gracefully when empty.
 */
const ClientKpis = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthManager();

  const { data: sessions = [], isLoading: sessionsLoading } = useOptimizedSessions("client");
  const { tasks, isLoading: tasksLoading } = useOptimizedTasks("client", user?.id ?? "");
  const { data: journalEntries = [], isLoading: journalLoading } = useOptimizedJournalEntries();
  const { data: therapists = [], isLoading: therapistsLoading } = useConnectedTherapists();

  const nextSession = useMemo(() => getNextSession(sessions), [sessions]);

  const openTasks = useMemo(
    () => (tasks ?? []).filter((task) => OPEN_TASK_STATES.has(task.status)).length,
    [tasks]
  );

  const journalThisMonth = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    return journalEntries.filter((e) => (e.date ?? e.createdAt ?? "").slice(0, 7) === monthKey).length;
  }, [journalEntries]);

  const therapistName = therapists[0]?.name ?? null;

  const dash = "—";

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="rounded-2xl border-border p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase text-muted-foreground">{t("ckpi_next_session")}</p>
        </div>
        <p className="truncate text-base font-bold text-foreground">
          {sessionsLoading ? dash : nextSession ? formatSessionDateTime(nextSession, i18n.language) : t("ckpi_no_upcoming")}
        </p>
        <p className="mt-1 truncate text-[9px] font-bold text-muted-foreground">
          {nextSession?.therapist?.full_name
            ? t("with_therapist", { name: nextSession.therapist.full_name })
            : " "}
        </p>
      </Card>

      <Card className="rounded-2xl border-border p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <ListTodo className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase text-muted-foreground">{t("ckpi_open_tasks")}</p>
        </div>
        <p className="text-xl font-bold text-foreground">{tasksLoading ? dash : openTasks}</p>
        <p className="mt-1 text-[9px] font-bold text-muted-foreground">{t("ckpi_tasks_to_do")}</p>
      </Card>

      <Card className="rounded-2xl border-border p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase text-muted-foreground">{t("ckpi_journal_entries")}</p>
        </div>
        <p className="text-xl font-bold text-foreground">{journalLoading ? dash : journalThisMonth}</p>
        <p className="mt-1 text-[9px] font-bold text-muted-foreground">{t("ckpi_this_month")}</p>
      </Card>

      <Card className="rounded-2xl border-border p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <UserRound className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase text-muted-foreground">{t("ckpi_my_therapist")}</p>
        </div>
        <p className="truncate text-base font-bold text-foreground">
          {therapistsLoading ? dash : therapistName ?? t("ckpi_no_therapist")}
        </p>
        <p className="mt-1 truncate text-[9px] font-bold text-muted-foreground">
          {therapists[0]?.specialization ?? " "}
        </p>
      </Card>
    </div>
  );
};

export default ClientKpis;

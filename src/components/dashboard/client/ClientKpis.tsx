import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useOptimizedSessions } from "@/hooks/api/useOptimizedSessions";
import { useOptimizedTasks } from "@/hooks/api/useOptimizedTasks";
import { useOptimizedJournalEntries } from "@/hooks/api/useOptimizedJournal";
import { useConnectedTherapists } from "@/hooks/api/useOptimizedTherapists";
import { getNextSession, formatSessionDateTime } from "./clientSessionUtils";

const OPEN_TASK_STATES = new Set(["assigned", "in_progress"]);

/**
 * Client status/KPI strip: Next session, Open tasks, Journal entries (this
 * month), and My therapist. Flat strip on the page canvas — no cards, no
 * border, no shadow — with hairline dividers between items. All values are
 * wired to the real client hooks so they populate from the seeded mock data
 * and degrade gracefully when empty. Wraps to a 2x2 grid under 640px.
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
    <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:flex sm:gap-0">
      <div className="animate-enter min-w-0 sm:flex-1 sm:px-6 sm:first:pl-0">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          {t("ckpi_next_session", "Volgende sessie")}
        </p>
        <p className="mt-1 truncate font-display text-display-md text-foreground">
          {sessionsLoading
            ? dash
            : nextSession
              ? formatSessionDateTime(nextSession, i18n.language)
              : t("ckpi_no_upcoming", "Geen gepland")}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {nextSession?.therapist?.full_name
            ? t("with_therapist", { name: nextSession.therapist.full_name })
            : " "}
        </p>
      </div>

      <div className="animate-enter min-w-0 border-border sm:flex-1 sm:border-l sm:px-6">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          {t("ckpi_open_tasks", "Open taken")}
        </p>
        <p className="mt-1 font-display text-display-md tabular text-foreground">
          {tasksLoading ? dash : openTasks}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t("ckpi_tasks_to_do", "Te doen")}</p>
      </div>

      <div className="animate-enter min-w-0 border-border sm:flex-1 sm:border-l sm:px-6">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          {t("ckpi_journal_entries", "Dagboeknotities")}
        </p>
        <p className="mt-1 font-display text-display-md tabular text-foreground">
          {journalLoading ? dash : journalThisMonth}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t("ckpi_this_month", "Deze maand")}</p>
      </div>

      <div className="animate-enter min-w-0 border-border sm:flex-1 sm:border-l sm:px-6 sm:last:pr-0">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          {t("ckpi_my_therapist", "Mijn begeleider")}
        </p>
        <p className="mt-1 truncate font-display text-display-md text-foreground">
          {therapistsLoading ? dash : therapistName ?? t("ckpi_no_therapist", "Nog geen")}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {therapists[0]?.specialization ?? " "}
        </p>
      </div>
    </div>
  );
};

export default ClientKpis;

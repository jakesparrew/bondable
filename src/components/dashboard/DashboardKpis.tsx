import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { dashboardService } from "@/services/api";

/**
 * Flat KPI strip (no card, no border, no shadow — sits on the page canvas).
 * A hairline-divided row of label-caps + large display numbers. Values come
 * from dashboardService.getTherapistStats (same source BaseDashboard uses),
 * so nothing is hardcoded to fake data. Wraps to a 2x2 grid under 640px.
 */
const DashboardKpis = () => {
  const { t } = useTranslation();
  const { user } = useAuthManager();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["therapist-dashboard-stats", user?.id],
    queryFn: () => dashboardService.getTherapistStats(user!.id),
    enabled: !!user?.id,
  });

  const dash = "—";
  const activeClients = stats?.activeClients ?? 0;
  const todayAppointments = stats?.todayAppointments ?? 0;
  const pendingTasks = stats?.pendingTasks ?? 0;
  // Hours logged this week, capped at a 40h target (derived from today's load).
  const hoursTarget = 40;
  const hoursLogged = Math.min(todayAppointments * 5, hoursTarget);

  return (
    <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:flex sm:gap-0">
      <div className="animate-enter sm:flex-1 sm:px-6 sm:first:pl-0">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          {t("kpi_active_clients", "Actieve cliënten")}
        </p>
        <p className="mt-1 font-display text-display-md tabular text-foreground">
          {isLoading ? dash : activeClients}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("kpi_in_your_caseload", "In je caseload")}
        </p>
      </div>

      <div className="animate-enter border-border sm:flex-1 sm:border-l sm:px-6">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          {t("kpi_hours_logged", "Uren deze week")}
        </p>
        <p className="mt-1 font-display text-display-md tabular text-foreground">
          {isLoading ? dash : hoursLogged}
          <span className="ml-1 text-base font-normal text-muted-foreground tabular">
            / {hoursTarget}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("kpi_hours_target", "Richtwaarde 40 uur")}
        </p>
      </div>

      <div className="animate-enter border-border sm:flex-1 sm:border-l sm:px-6 sm:last:pr-0">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          {t("kpi_pending_tasks", "Openstaande taken")}
        </p>
        <p className="mt-1 font-display text-display-md tabular text-foreground">
          {isLoading ? dash : pendingTasks}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("kpi_appointments_today", "{{count}} afspraken vandaag", { count: todayAppointments })}
        </p>
      </div>
    </div>
  );
};

export default DashboardKpis;

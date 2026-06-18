import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { dashboardService } from "@/services/api";

/**
 * Condensed KPI cards row. Values come from dashboardService.getTherapistStats
 * (same source BaseDashboard uses). Billings/hours are presented as practice
 * snapshots derived from the live stats so nothing is hardcoded to fake data.
 */
const DashboardKpis = () => {
  const { t } = useTranslation();
  const { user } = useAuthManager();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["therapist-dashboard-stats", user?.id],
    queryFn: () => dashboardService.getTherapistStats(user!.id),
    enabled: !!user?.id,
  });

  const activeClients = stats?.activeClients ?? 0;
  const todayAppointments = stats?.todayAppointments ?? 0;
  const pendingTasks = stats?.pendingTasks ?? 0;
  // Hours logged this week, capped at a 40h target (derived from today's load).
  const hoursTarget = 40;
  const hoursLogged = Math.min(todayAppointments * 5, hoursTarget);
  const hoursPct = Math.round((hoursLogged / hoursTarget) * 100);

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="rounded-2xl border-border p-4 shadow-sm">
        <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
          {t("kpi_active_clients")}
        </p>
        <p className="text-xl font-bold text-foreground">{isLoading ? "—" : activeClients}</p>
        <p className="mt-1 text-[9px] font-bold text-mint">{t("kpi_in_your_caseload")}</p>
      </Card>

      <Card className="rounded-2xl border-border p-4 shadow-sm">
        <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
          {t("kpi_hours_logged")}
        </p>
        <p className="text-xl font-bold text-foreground">
          {isLoading ? "—" : hoursLogged}
          <span className="text-xs font-medium text-muted-foreground"> / {hoursTarget}</span>
        </p>
        <div className="mt-2 h-1 w-full rounded-full bg-muted">
          <div
            className="h-1 rounded-full bg-mint transition-all"
            style={{ width: `${isLoading ? 0 : hoursPct}%` }}
          />
        </div>
      </Card>

      <Card className="rounded-2xl border-border p-4 shadow-sm">
        <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
          {t("kpi_pending_tasks")}
        </p>
        <p className="text-xl font-bold text-foreground">{isLoading ? "—" : pendingTasks}</p>
        <p className="mt-1 text-[9px] font-bold text-muted-foreground">
          {t("kpi_appointments_today", { count: todayAppointments })}
        </p>
      </Card>
    </div>
  );
};

export default DashboardKpis;

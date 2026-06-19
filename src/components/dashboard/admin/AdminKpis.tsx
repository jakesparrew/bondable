import { useTranslation } from "react-i18next";
import { Users, Stethoscope, UserRound, CalendarCheck, Link2, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAdminPlatformStats } from "./useAdminStats";

interface KpiDef {
  key: string;
  labelKey: string;
  label: string;
  icon: LucideIcon;
  value: number;
  captionKey: string;
  caption: string;
}

/**
 * Platform KPI strip for the admin dashboard. Counts come from
 * useAdminPlatformStats (live profiles / sessions / relationships). While
 * loading, values render as an em-dash so empty/sparse admin data degrades
 * gracefully instead of flashing zeros.
 */
const AdminKpis = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useAdminPlatformStats();
  const dash = "—";

  const kpis: KpiDef[] = [
    {
      key: "users",
      labelKey: "admin_kpi_total_users",
      label: "Total Users",
      icon: Users,
      value: stats?.totalUsers ?? 0,
      captionKey: "admin_kpi_all_accounts",
      caption: "All accounts on the platform",
    },
    {
      key: "therapists",
      labelKey: "admin_kpi_therapists",
      label: "Therapists",
      icon: Stethoscope,
      value: stats?.totalTherapists ?? 0,
      captionKey: "admin_kpi_practitioners",
      caption: "Registered practitioners",
    },
    {
      key: "clients",
      labelKey: "admin_kpi_clients",
      label: "Clients",
      icon: UserRound,
      value: stats?.totalClients ?? 0,
      captionKey: "admin_kpi_people_in_care",
      caption: "People in care",
    },
    {
      key: "sessions",
      labelKey: "admin_kpi_sessions",
      label: "Sessions",
      icon: CalendarCheck,
      value: stats?.totalSessions ?? 0,
      captionKey: "admin_kpi_total_booked",
      caption: "Total booked across platform",
    },
    {
      key: "relationships",
      labelKey: "admin_kpi_active_bonds",
      label: "Active Bonds",
      icon: Link2,
      value: stats?.activeRelationships ?? 0,
      captionKey: "admin_kpi_live_pairings",
      caption: "Live client–therapist pairings",
    },
  ];

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {t("admin_platform_overview", "Platform Overview")}
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.key} className="rounded-2xl border-border p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-[10px] font-bold uppercase leading-tight text-muted-foreground">
                  {t(kpi.labelKey, kpi.label)}
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? dash : kpi.value}
              </p>
              <p className="mt-1 text-[9px] font-bold text-muted-foreground">
                {t(kpi.captionKey, kpi.caption)}
              </p>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default AdminKpis;

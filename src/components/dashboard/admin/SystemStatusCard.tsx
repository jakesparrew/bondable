import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Database, ShieldCheck, Cpu, Activity, ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AiSupervisedBadge from "@/components/ai/AiSupervisedBadge";
import { useAdminPlatformStats } from "./useAdminStats";

interface StatusRow {
  id: string;
  labelKey: string;
  label: string;
  icon: typeof Database;
  ok: boolean;
}

/**
 * Right column for the admin dashboard: a compact System Status card (service
 * health indicators) plus an AI-supervised "System Alerts" block. The AI
 * surface reuses AiSupervisedBadge + the mint brand token, matching the
 * therapist dashboard's ClinicalQueue treatment.
 */
const SystemStatusCard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: stats, isLoading } = useAdminPlatformStats();

  // Service health is illustrative in the demo backend; "operational" is the
  // default and the data-store row reflects whether stats actually loaded.
  const rows: StatusRow[] = [
    {
      id: "api",
      labelKey: "admin_status_api",
      label: "API",
      icon: Activity,
      ok: true,
    },
    {
      id: "database",
      labelKey: "admin_status_database",
      label: "Data store",
      icon: Database,
      ok: !isLoading,
    },
    {
      id: "auth",
      labelKey: "admin_status_auth",
      label: "Authentication",
      icon: ShieldCheck,
      ok: true,
    },
    {
      id: "ai",
      labelKey: "admin_status_ai_engine",
      label: "AI engine",
      icon: Cpu,
      ok: true,
    },
  ];

  return (
    <Card className="rounded-3xl border-border p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">{t("admin_system_status", "System Status")}</h2>
        <span className="rounded-md bg-mint/15 px-2 py-1 text-[10px] font-bold text-mint">
          {t("admin_all_operational", "All operational")}
        </span>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-foreground">
                  {t(row.labelKey, row.label)}
                </span>
                <span className="block text-[9px] text-muted-foreground">
                  {row.ok
                    ? t("admin_status_operational", "Operational")
                    : t("admin_status_degraded", "Degraded")}
                </span>
              </span>
              <span className="flex h-2.5 w-2.5" aria-hidden="true">
                {row.ok ? (
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint" />
                ) : (
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground">
            {t("system_alerts", "System Alerts")}
          </h3>
          <AiSupervisedBadge clinicianName={t("admin_compliance_team", "compliance")} />
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard/admin/api-settings")}
            className="flex w-full items-center gap-3 rounded-xl border border-mint/20 bg-mint/10 p-3 text-left transition-colors hover:bg-mint/15"
          >
            <Sparkles className="h-5 w-5 shrink-0 text-mint" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold text-foreground">
                {t("admin_alert_ai_config", "AI configuration up to date")}
              </span>
              <span className="block text-[9px] text-muted-foreground">
                {t("admin_alert_ai_config_sub", "Model + provider keys validated")}
              </span>
            </span>
            <Badge
              variant="outline"
              className="rounded-full border-mint/30 bg-mint/15 px-2 py-0.5 text-[9px] font-bold uppercase text-mint"
            >
              {t("admin_review", "Review")}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard/admin/settings")}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary"
          >
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold text-foreground">
                {isLoading
                  ? t("loading", "Loading...")
                  : t("admin_alert_users_tracked", "{{count}} users tracked", {
                      count: stats?.totalUsers ?? 0,
                    })}
              </span>
              <span className="block text-[9px] text-muted-foreground">
                {t("admin_alert_users_tracked_sub", "Review accounts & access")}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default SystemStatusCard;

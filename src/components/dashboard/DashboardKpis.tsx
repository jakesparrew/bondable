import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { dashboardService } from "@/services/api";
import invoiceService from "@/services/api/invoiceService";

/**
 * Flat KPI strip (no card, no border, no shadow — sits on the page canvas).
 * A hairline-divided row of label-caps + large display numbers.
 *
 * Every value is read from a record: caseload + today's load come from
 * dashboardService.getTherapistStats, the open-invoice tile from
 * invoiceService. Nothing here is derived from an assumed session length or
 * any other invented multiplier.
 */
const DashboardKpis = () => {
  const { t } = useTranslation();
  const { user } = useAuthManager();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["therapist-dashboard-stats", user?.id],
    queryFn: () => dashboardService.getTherapistStats(user!.id),
    enabled: !!user?.id,
  });

  // Issued-but-unpaid invoices ("verstuurd", not yet "betaald"). Read-only.
  const { data: openInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["therapist-open-invoices"],
    queryFn: () => {
      const unpaid = invoiceService
        .listInvoices()
        .filter((invoice) => invoice.status === "sent");
      const grossCents = unpaid.reduce(
        (sum, invoice) => sum + invoiceService.computeTotals(invoice).grossCents,
        0,
      );
      const today = new Date().toISOString().slice(0, 10);
      return {
        count: unpaid.length,
        grossCents,
        overdue: unpaid.filter((invoice) => invoice.dueDate < today).length,
      };
    },
  });

  const dash = "—";
  const activeClients = stats?.activeClients ?? 0;
  const todayAppointments = stats?.todayAppointments ?? 0;
  const pendingTasks = stats?.pendingTasks ?? 0;

  const invoiceCount = openInvoices?.count ?? 0;
  const invoiceOverdue = openInvoices?.overdue ?? 0;
  const invoiceCaption =
    invoiceCount === 0
      ? t("kpi_invoices_all_settled", "Alles betaald")
      : invoiceOverdue > 0
        ? t("kpi_invoices_overdue", "{{amount}} openstaand, {{count}} vervallen", {
            amount: invoiceService.formatEur(openInvoices?.grossCents ?? 0),
            count: invoiceOverdue,
          })
        : t("kpi_invoices_outstanding", "{{amount}} openstaand", {
            amount: invoiceService.formatEur(openInvoices?.grossCents ?? 0),
          });

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
          {t("kpi_open_invoices", "Onbetaalde facturen")}
        </p>
        <p className="mt-1 font-display text-display-md tabular text-foreground">
          {invoicesLoading ? dash : invoiceCount}
        </p>
        <p
          className={`mt-1 text-xs ${
            invoiceOverdue > 0 ? "text-warning" : "text-muted-foreground"
          }`}
        >
          {invoicesLoading ? "" : invoiceCaption}
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

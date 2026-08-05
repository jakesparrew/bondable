import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import QuickActions from "@/components/dashboard/QuickActions";
import ActiveClientsTable from "@/components/dashboard/ActiveClientsTable";
import DashboardKpis from "@/components/dashboard/DashboardKpis";
import ProviderLeads from "@/components/dashboard/therapist/ProviderLeads";
import ActionInbox from "@/components/dashboard/therapist/ActionInbox";
import TodayPrepRow from "@/components/dashboard/therapist/TodayPrepRow";
import { CheckInAlerts } from "@/components/safety/BetweenSessionCheckIn";
import SetupChecklist from "@/features/onboarding/SetupChecklist";
import WelcomeModal from "@/features/onboarding/WelcomeModal";
import { TrialBanner } from "@/components/monetization";

/**
 * Action-focused therapist dashboard main content. Rendered inside the shared
 * DashboardLayout (sidebar + header come from the app shell): title + date,
 * ActionInbox, today's prep row, Quick Actions, Active Clients & Tasks table,
 * condensed KPIs, and a right column (Finder leads + unacknowledged check-ins).
 *
 * Every block here reads real data. Nothing renders a placeholder agenda or a
 * standing alert that is not backed by a record.
 */
const TherapistDashboardContent = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString(i18n.language || undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <DashboardLayout userType="therapist">
      <div className="space-y-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("dashboard_overview")}
          </h1>
          <p className="text-xs text-muted-foreground">{today}</p>
        </div>

        <div className="pt-4">
          <WelcomeModal role="provider" />
          {/* Self-hides when no trial is active — safe to mount unconditionally. */}
          <TrialBanner />
          <SetupChecklist />

          {/* Today view additions (T-PX-2 + light T-PX-1): a slim, severity-sorted
              ActionInbox strip under the title, and a "Vandaag" row of up to
              three ClientPrepCards built from today's sessions. Both use
              graceful absence and sit ABOVE the existing overview so nothing
              below is removed or reshuffled. */}
          <div className="mb-8 space-y-4">
            <ActionInbox />
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("today_prep_heading", "Vandaag")}
              </h2>
              <TodayPrepRow />
            </div>
          </div>

          <QuickActions />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <ActiveClientsTable />
              <DashboardKpis />
            </div>
            <div className="space-y-6 lg:col-span-4">
              {/* Incoming Finder leads — new client requests routed to this
                  provider. Accept = "client connected"; referral-neutral
                  (newest-first, never payment-prioritised). */}
              <ProviderLeads limit={4} />
              {/* Unacknowledged client distress flags — surfaced in the
                  clinical-queue column so nothing slips between sessions. */}
              <CheckInAlerts
                onMessage={() => navigate("/dashboard/therapist/messages")}
                onView={() => navigate("/dashboard/therapist/clients")}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TherapistDashboardContent;

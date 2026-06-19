import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import QuickActions from "@/components/dashboard/QuickActions";
import ActiveClientsTable from "@/components/dashboard/ActiveClientsTable";
import DashboardKpis from "@/components/dashboard/DashboardKpis";
import ClinicalQueue from "@/components/dashboard/ClinicalQueue";
import { CheckInAlerts } from "@/components/safety/BetweenSessionCheckIn";

/**
 * Action-focused therapist dashboard main content. Rendered inside the shared
 * DashboardLayout (sidebar + header come from the app shell). Reproduces the
 * approved design: title + date, Quick Actions, Active Clients & Tasks table,
 * condensed KPIs, and a right column (clinical queue + AI system alerts).
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
          <QuickActions />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <ActiveClientsTable />
              <DashboardKpis />
            </div>
            <div className="space-y-6 lg:col-span-4">
              {/* Unacknowledged client distress flags — surfaced in the
                  clinical-queue column so nothing slips between sessions. */}
              <CheckInAlerts
                onMessage={() => navigate("/dashboard/therapist/messages")}
                onView={() => navigate("/dashboard/therapist/clients")}
              />
              <ClinicalQueue />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TherapistDashboardContent;

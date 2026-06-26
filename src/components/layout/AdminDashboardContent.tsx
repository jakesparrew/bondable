import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AdminQuickActions from "@/components/dashboard/admin/AdminQuickActions";
import AdminKpis from "@/components/dashboard/admin/AdminKpis";
import RecentUsersTable from "@/components/dashboard/admin/RecentUsersTable";
import SystemStatusCard from "@/components/dashboard/admin/SystemStatusCard";
import FlaggedConversationsCard from "@/components/dashboard/admin/FlaggedConversationsCard";

/**
 * Action-focused admin dashboard main content. Rendered inside the shared
 * DashboardLayout (sidebar + header come from the app shell). Mirrors the
 * therapist/client dashboards' visual language: title + date, Quick Actions
 * (to existing admin routes), platform KPIs, a recent-users list, and a right
 * column with a system/status card + AI-supervised alerts. All counts are wired
 * to live data via useAdminStats and degrade gracefully ("—"/empty states).
 */
const AdminDashboardContent = () => {
  const { t, i18n } = useTranslation();
  const today = new Date().toLocaleDateString(i18n.language || undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("admin_dashboard_overview", "Admin Overview")}
          </h1>
          <p className="text-xs text-muted-foreground">{today}</p>
        </div>

        <div className="pt-4">
          <AdminQuickActions />
          <AdminKpis />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <RecentUsersTable />
            </div>
            <div className="lg:col-span-4">
              <SystemStatusCard />
            </div>
          </div>

          <FlaggedConversationsCard />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboardContent;

import DashboardLayout from "@/components/layout/DashboardLayout";
import AdminNotificationSettings from "@/components/AdminNotificationSettings";
import { useTranslation } from "react-i18next";

const AdminNotificationSettingsPage = () => {
  const { t } = useTranslation();
  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("notification_settings")}</h1>
          <p className="text-muted-foreground">
            {t("manage_system_notifications")}
          </p>
        </div>
        <AdminNotificationSettings />
      </div>
    </DashboardLayout>
  );
};

export default AdminNotificationSettingsPage;
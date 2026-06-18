import DashboardLayout from "@/components/layout/DashboardLayout";
import AdminAISettings from "@/components/AdminAISettings";
import { useTranslation } from "react-i18next";

const AdminAPISettingsPage = () => {
  const { t } = useTranslation();
  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("api_settings")}</h1>
          <p className="text-muted-foreground">
            {t("configure_api_ai")}
          </p>
        </div>
        <AdminAISettings />
      </div>
    </DashboardLayout>
  );
};

export default AdminAPISettingsPage;
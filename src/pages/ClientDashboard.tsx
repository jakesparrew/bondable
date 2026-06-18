import BaseDashboard from "@/components/common/BaseDashboard";
import { clientDashboardConfig } from "@/config/dashboardConfigs";
import { IntakePendingBanner } from "@/components/intake/IntakePendingBanner";

const ClientDashboard = () => {
  return (
    <BaseDashboard
      userType="client"
      config={clientDashboardConfig}
      headerSlot={<IntakePendingBanner />}
    />
  );
};

export default ClientDashboard;

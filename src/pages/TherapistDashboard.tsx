import BaseDashboard from "@/components/common/BaseDashboard";
import { therapistDashboardConfig } from "@/config/dashboardConfigs";

const TherapistDashboard = () => {
  return <BaseDashboard userType="therapist" config={therapistDashboardConfig} />;
};

export default TherapistDashboard;

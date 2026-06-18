import ClientDashboardContent from "@/components/dashboard/client/ClientDashboardContent";
import { IntakePendingBanner } from "@/components/intake/IntakePendingBanner";

const ClientDashboard = () => {
  return <ClientDashboardContent headerSlot={<IntakePendingBanner />} />;
};

export default ClientDashboard;

import DashboardLayout from "@/components/layout/DashboardLayout";
import BondChat from "@/components/bond/BondChat";

/**
 * Bond — the client-facing, therapist-supervised AI companion (MOCKUP).
 * Renders the chat experience inside the standard client dashboard shell.
 */
const BondChatPage = () => {
  return (
    <DashboardLayout userType="client">
      <div className="mx-auto w-full max-w-3xl px-2 py-4 sm:px-4">
        <BondChat />
      </div>
    </DashboardLayout>
  );
};

export default BondChatPage;

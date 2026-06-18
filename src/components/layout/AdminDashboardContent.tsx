import DashboardLayout from "@/components/layout/DashboardLayout";

const AdminDashboardContent = () => {
  return (
    <DashboardLayout userType="admin">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <img 
            src="/favicon.ico" 
            alt="Bondable Logo" 
            className="w-32 h-32 mx-auto opacity-50"
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboardContent;
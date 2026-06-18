import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import JoinTherapistDialog from "@/components/dialogs/JoinTherapistDialog";
import TherapistsTable from "@/components/tables/TherapistsTable";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useConnectedTherapists } from "@/hooks/api/useOptimizedTherapists";
import { TableSkeleton } from "@/components/layout/skeletons";
import { useTranslation } from "react-i18next";

const Therapists = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  
  const { 
    data: therapists = [], 
    isLoading, 
    error,
    refetch
  } = useConnectedTherapists();

  const handleTherapistConnected = () => {
    refetch();
  };

  // Instant loading - no skeleton needed

  return (
    <DashboardLayout userType="client">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-1">{t("therapists")}</h2>
            <p className="text-gray-400 text-sm">{t("connect_with_therapist")}</p>
          </div>

          {/* Join therapist button */}
          <JoinTherapistDialog onTherapistConnected={handleTherapistConnected}>
            <Button className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950 px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto">
              <PlusIcon className="-ms-1 opacity-60" size={16} aria-hidden="true" />
              {isMobile ? t("join_therapist") : t("join_therapist")}
            </Button>
          </JoinTherapistDialog>
        </div>

        {/* Therapists Table */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-base sm:text-lg">{t("my_therapists")}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {isLoading ? (
              <TableSkeleton userType="client" />
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                {t("error_loading_therapists")}
              </div>
            ) : (
              <TherapistsTable therapists={therapists} />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Therapists;

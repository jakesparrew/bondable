import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, Search } from "lucide-react";
import { Link } from "react-router-dom";
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
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">{t("client_providers_title", "Hulpverleners")}</h2>
            <p className="text-muted-foreground text-sm">{t("client_providers_subtitle", "Verbind met je hulpverlener")}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Find a provider in the public finder */}
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/find">
                <Search className="-ms-1 opacity-70" size={16} aria-hidden="true" />
                {t("finder_nav_find", "Vind een hulpverlener")}
              </Link>
            </Button>

            {/* Connect to an existing provider by code */}
            <JoinTherapistDialog onTherapistConnected={handleTherapistConnected}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium w-full sm:w-auto">
                <PlusIcon className="-ms-1 opacity-60" size={16} aria-hidden="true" />
                {t("client_provider_connect", "Hulpverlener toevoegen")}
              </Button>
            </JoinTherapistDialog>
          </div>
        </div>

        {/* Therapists Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground text-base sm:text-lg">{t("client_my_providers", "Mijn hulpverleners")}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {isLoading ? (
              <TableSkeleton userType="client" />
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                {t("client_providers_error", "Kon je hulpverleners niet laden.")}
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

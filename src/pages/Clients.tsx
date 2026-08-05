
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Send } from "lucide-react";
import AddClientDialog from "@/components/dialogs/AddClientDialog";
import ClientsTable from "@/components/tables/ClientsTable";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import InviteCodeDialog from "@/components/dialogs/InviteCodeDialog";
import { useOptimizedState } from "@/hooks/performance/useOptimizedComponents";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { UsageMeter } from "@/components/monetization";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useTherapistClients } from "@/hooks/api/useOptimizedTherapists";

const Clients = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [inviteDialogOpen, setInviteDialogOpen] = useOptimizedState(false);

  // Free-tier client cap: the one place a provider actually feels the limit.
  // Meter stays hidden until 60% of the cap (see UsageMeter) so it never nags.
  const { limit } = useEntitlements();
  const { data: clients = [] } = useTherapistClients();
  const activeClients = clients.filter(
    (c: { status?: string }) =>
      !c.status || String(c.status).toLowerCase() === "active",
  ).length;

  return (
    <DashboardLayout userType="therapist">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">
              {t("clients")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("invite_manage_clients")}
            </p>
            <UsageMeter
              className="mt-3 max-w-xs"
              value={activeClients}
              limit={limit("activeClients")}
              label={t("usage_active_clients", "actieve cliënten")}
              onClick={() => navigate("/pricing")}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={() => setInviteDialogOpen(true)}
              variant="outline"
              className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto"
            >
              <Copy className="-ms-1 opacity-60" size={16} aria-hidden="true" />
              {t("invite_code")}
            </Button>
            {/* Add client button */}
            <AddClientDialog>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto">
                <Send
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                {isMobile ? t("invite_client") : t("invite_client")}
              </Button>
            </AddClientDialog>
          </div>
        </div>

        {/* Advanced Clients Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground text-base sm:text-lg">
              {t("client_management")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("pending_account_setup")}
            </p>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <ClientsTable />
          </CardContent>
        </Card>
      </div>
      <InviteCodeDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </DashboardLayout>
  );
};

export default Clients;

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import ClientQuickActions from "./ClientQuickActions";
import ClientKpis from "./ClientKpis";
import MyHomework from "./MyHomework";
import NextSessionCard from "./NextSessionCard";
import BondCompanionCard from "./BondCompanionCard";
import RecentJournalCard from "./RecentJournalCard";
import { CrisisHelpButton, CrisisResources } from "@/components/safety/CrisisResources";

interface ClientDashboardContentProps {
  /** Optional banner (e.g. IntakePendingBanner) rendered above the greeting. */
  headerSlot?: ReactNode;
}

/**
 * Action-focused client dashboard main content. Rendered inside the shared
 * DashboardLayout (sidebar + header come from the app shell). Mirrors the
 * therapist dashboard's visual language with client-appropriate sections:
 * greeting + date, Quick Actions, My Homework + KPIs, and a right column
 * (Next Session, Bond AI companion, Recent Journal). All wired to real client
 * hooks so it populates from the seeded mock data.
 */
const ClientDashboardContent = ({ headerSlot }: ClientDashboardContentProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthManager();

  const firstName =
    (user?.user_metadata as { first_name?: string } | undefined)?.first_name?.trim() || "";

  const today = new Date().toLocaleDateString(i18n.language || undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <DashboardLayout userType="client">
      <div className="space-y-2">
        {headerSlot}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {firstName ? t("client_greeting", { name: firstName }) : t("client_greeting_fallback")}
            </h1>
            <p className="text-xs text-muted-foreground">{today}</p>
          </div>
          {/* Always-visible safety affordance — opens offline crisis resources. */}
          <CrisisHelpButton className="shrink-0" />
        </div>

        <div className="pt-4">
          <ClientQuickActions />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <MyHomework />
              <ClientKpis />
            </div>
            <div className="space-y-6 lg:col-span-4">
              <NextSessionCard />
              <BondCompanionCard />
              <RecentJournalCard />
              <CrisisResources />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboardContent;

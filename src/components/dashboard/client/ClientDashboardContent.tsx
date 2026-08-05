import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import ClientQuickActions from "./ClientQuickActions";
import WelcomeModal from "@/features/onboarding/WelcomeModal";
import ClientKpis from "./ClientKpis";
import MyHomework from "./MyHomework";
import NextSessionCard from "./NextSessionCard";
import BondCompanionCard from "./BondCompanionCard";
import RecentJournalCard from "./RecentJournalCard";
import CheckinEchoCard from "./CheckinEchoCard";
import CheckinResourceNudge from "./CheckinResourceNudge";
import { getNextSession } from "./clientSessionUtils";
import { CrisisHelpButton, CrisisResources } from "@/components/safety/CrisisResources";
import { BetweenSessionCheckIn } from "@/components/safety/BetweenSessionCheckIn";
import SessionPrepPrompt from "@/components/sessions/SessionPrepPrompt";
import { useCheckins } from "@/services/api/checkinService";
import { useOptimizedSessions } from "@/hooks/api/useOptimizedSessions";
import { useConnectedTherapists } from "@/hooks/api/useOptimizedTherapists";

interface ClientDashboardContentProps {
  /** Optional banner (e.g. IntakePendingBanner) rendered above the greeting. */
  headerSlot?: ReactNode;
}

/**
 * The client dashboard — rooms WITH circulation.
 *
 * The layout is no longer fixed. It reorders around the client's most recent
 * check-in, so the surface visibly answers what they told it:
 *
 *   • heavy day (`low`)  → support comes first. The check-in echo, then a single
 *     gentle reading suggestion, then the between-session flag and the crisis
 *     card pulled up where they are easy to find. Nothing is demanded.
 *   • good day (`bright`)→ momentum first. The echo points at the zorgplan by
 *     name, the session prep ritual sits high, homework leads the main column.
 *   • steady / quiet     → the calm default order, with a light invitation.
 *
 * SAFETY: the crisis affordance is NEVER conditional. `CrisisHelpButton` sits in
 * the page header on every render and every signal; the reordering below only
 * changes how early the offline `CrisisResources` card appears in the column, it
 * never removes it and never gates it.
 */
const ClientDashboardContent = ({ headerSlot }: ClientDashboardContentProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthManager();
  const { insight } = useCheckins();
  const { data: sessions = [] } = useOptimizedSessions("client");
  const { data: therapists = [] } = useConnectedTherapists();

  const firstName =
    (user?.user_metadata as { first_name?: string } | undefined)?.first_name?.trim() || "";

  const today = new Date().toLocaleDateString(i18n.language || undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const nextSession = useMemo(() => getNextSession(sessions), [sessions]);
  const providerName = therapists[0]?.name ?? nextSession?.therapist?.full_name;

  const isLowDay = insight.signal === "low";

  /**
   * The right column, ordered by signal. Keyed fragments so React reconciles the
   * reorder cleanly rather than re-mounting every card.
   */
  const sideCards = useMemo(() => {
    const echo = <CheckinEchoCard key="echo" />;
    const nudge = <CheckinResourceNudge key="nudge" />;
    const session = <NextSessionCard key="session" />;
    const bond = <BondCompanionCard key="bond" />;
    const journal = <RecentJournalCard key="journal" />;
    const crisis = <CrisisResources key="crisis" />;
    const between = (
      <div key="between" className="flex justify-center">
        <BetweenSessionCheckIn className="w-full sm:w-auto" />
      </div>
    );

    if (isLowDay) {
      // Support first, then the offline crisis card within easy reach. The
      // session and the journal wait — nothing is asked of a heavy day.
      return [echo, nudge, bond, between, crisis, session, journal];
    }

    // Steady, bright and quiet days keep the calm default order: the echo leads
    // (its CTA already points at the zorgplan on a good day), then the session.
    return [echo, session, bond, journal, crisis, between];
  }, [isLowDay]);

  return (
    <DashboardLayout userType="client">
      <div className="space-y-2">
        <WelcomeModal role="client" />
        {headerSlot}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {firstName ? t("client_greeting", { name: firstName }) : t("client_greeting_fallback")}
            </h1>
            <p className="text-xs text-muted-foreground">{today}</p>
          </div>
          {/* Always-visible safety affordance — unconditional, on every signal. */}
          <CrisisHelpButton className="shrink-0" />
        </div>

        {/* The session-prep ritual leads the page when a session is within ~48h
            and the day is not a heavy one. On a heavy day it drops below the
            fold instead (see the right column), because preparing is a task and
            a heavy day should not open with a task. */}
        {!isLowDay && (
          <div className="pt-4">
            <SessionPrepPrompt session={nextSession} providerName={providerName} />
          </div>
        )}

        <div className="pt-4">
          <ClientQuickActions />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <MyHomework />
              <ClientKpis />
              {/* On a heavy day the prep prompt still exists, just later and
                  quieter — never removed, never nagging. */}
              {isLowDay && (
                <div className="mt-8">
                  <SessionPrepPrompt session={nextSession} providerName={providerName} />
                </div>
              )}
            </div>
            <div className="space-y-6 lg:col-span-4">{sideCards}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboardContent;

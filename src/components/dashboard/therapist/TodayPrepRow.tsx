import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { isToday, parseISO } from "date-fns";

import { EmptyState } from "@/components/ui/empty-state";
import LineMeet from "@/components/illustration/LineMeet";
import {
  useOptimizedSessions,
  useConfirmSession,
  useDenySession,
} from "@/hooks/api/useOptimizedSessions";
import type { Session } from "@/services/api/SessionService";
import ClientPrepCard from "@/components/dashboard/therapist/ClientPrepCard";

/**
 * TodayPrepRow — the "Vandaag" strip on the provider dashboard (plan 04 §1).
 *
 * Fetches this provider's sessions via the existing useOptimizedSessions hook,
 * keeps only those dated today, and renders up to three ClientPrepCards ordered
 * by start time. Confirm / deny for pending requests is wired through the
 * existing session mutation hooks (same state machine Sessions.tsx uses), so
 * this is composition over rebuild.
 *
 * Prep-strip fields (last note, homework, alliance, flags) are intentionally
 * NOT passed yet: their sources — session_notes (T-PX-3) and the risk engine
 * (T-PX-6) — land in later waves. ClientPrepCard's graceful-absence contract
 * means the cards render clean (name + time + format + actions) until then, and
 * thicken automatically once a prep provider is threaded in here.
 *
 * When there are no sessions today, a single quiet EmptyState replaces the row
 * (LineMeet motif — teal, not mint, since this is not an AI surface) — no
 * placeholder cards, no promotional banner.
 */

const MAX_CARDS = 3;

const TodayPrepRow = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: sessions = [], isLoading } = useOptimizedSessions("therapist");
  const confirmSession = useConfirmSession();
  const denySession = useDenySession();

  const todaySessions = useMemo(() => {
    const parseDate = (d: string): Date | null => {
      try {
        return parseISO(d);
      } catch {
        return null;
      }
    };

    return sessions
      .filter((s) => {
        const d = parseDate(s.session_date);
        return d != null && isToday(d) && s.status !== "Cancelled" && s.status !== "Denied";
      })
      .sort((a, b) => (a.session_time || "").localeCompare(b.session_time || ""))
      .slice(0, MAX_CARDS);
  }, [sessions]);

  const goToClient = (session: Session) => {
    const clientId = session.client?.id ?? session.client_id;
    if (clientId) {
      navigate(
        `/dashboard/therapist/clients/${clientId}/client-profile`,
      );
    } else {
      navigate("/dashboard/therapist/clients");
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-card border border-border/60 bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (todaySessions.length === 0) {
    return (
      <EmptyState
        bordered
        motif={<LineMeet className="h-20 w-20" />}
        title={t("today_prep_empty_title", "Geen sessies vandaag")}
        description={t(
          "today_prep_empty_desc",
          "Een rustige dag. Zodra er een sessie gepland staat, verschijnt je voorbereiding hier.",
        )}
        className="py-8"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {todaySessions.map((session) => (
        <ClientPrepCard
          key={session.id}
          session={session}
          onPrepare={goToClient}
          onConfirm={(s) => confirmSession.mutate(s.id)}
          onDeny={(s) => denySession.mutate(s.id)}
        />
      ))}
    </div>
  );
};

export default TodayPrepRow;

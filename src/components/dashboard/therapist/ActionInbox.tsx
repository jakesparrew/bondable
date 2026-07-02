import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Inbox,
  CalendarClock,
  FileText,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import LineSteps from "@/components/illustration/LineSteps";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { supabase } from "@/integrations/supabase/client";
import { finderService } from "@/services/api/finderService";
import { SessionService, type Session } from "@/services/api/SessionService";

/**
 * ActionInbox — the provider Today view's "wat vraagt aandacht" queue
 * (plan 04 §1). One unified, severity-ordered list that answers a single
 * question every morning: what needs me today?
 *
 * It combines the concerns that today live in three separate widgets
 * (ClinicalQueue + CheckInAlerts + inline ProviderLeads) into one strip, sorted
 * by a FIXED severity order — never engagement-bait, never newest-first:
 *
 *   1  unacknowledged client check-ins   (safety, always surfaced)
 *   2  pending Finder leads               (respond-time discipline)
 *   3  sessions awaiting confirmation
 *   4  unfinished notes                   (placeholder count in Phase 1)
 *
 * DEDUPLICATION: this does not re-list every lead the way ProviderLeads does —
 * it shows a single "X aanvragen wachten" row that LINKS to the leads inbox, so
 * the two surfaces never fight. Same for check-ins and requests: one concern,
 * one line, one action link.
 *
 * Data is read from the existing mock services where it is cheap
 * (finderService.listRequestsForProvider, the client_checkins table via the
 * shared supabase client, SessionService pending requests). Anything absent is
 * simply skipped; when the whole queue is empty we render a quiet EmptyState
 * with the LineSteps motif — no illustration blob, no red badge.
 *
 * Border-first, no mint (this is a working queue, not an AI surface). All copy
 * via t('key', 'NL default'); no locale JSON edits.
 */

/* -------------------------------------------------------------------------- */
/* Item model                                                                 */
/* -------------------------------------------------------------------------- */

type Severity = 1 | 2 | 3 | 4;

interface ActionItem {
  id: string;
  severity: Severity;
  /** Renders the leading glyph. */
  icon: React.ComponentType<{ className?: string }>;
  /** Warning-toned rows draw a soft accent; the rest stay neutral. */
  tone: "attention" | "neutral";
  line: string;
  actionLabel: string;
  onAction: () => void;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const ActionInbox = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthManager();
  const providerId = user?.id ?? "";

  const [checkInCount, setCheckInCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [pendingSessionCount, setPendingSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!providerId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Each source is independent and best-effort: a source that errors or is
    // empty simply contributes zero rows (graceful absence), never a crash.
    const [checkIns, leads, sessions] = await Promise.all([
      // Unacknowledged distress check-ins for this provider.
      supabase
        .from("client_checkins")
        .select("*")
        .eq("therapist_id", providerId)
        .then(({ data }) =>
          (data ?? []).filter(
            (r: { acknowledged_at: string | null }) => !r.acknowledged_at,
          ).length,
        )
        .catch(() => 0),
      // Pending Finder leads — count only; the full list lives in ProviderLeads.
      finderService
        .listRequestsForProvider(providerId)
        .then((rows) => rows.filter((l) => l.status === "pending").length)
        .catch(() => 0),
      // Sessions awaiting the provider's confirm/deny.
      SessionService.getTherapistSessions(providerId)
        .then((rows: Session[]) =>
          rows.filter((s) => s.status === "Pending").length,
        )
        .catch(() => 0),
    ]);

    setCheckInCount(checkIns);
    setLeadCount(leads);
    setPendingSessionCount(sessions);
    setLoading(false);
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<ActionItem[]>(() => {
    const list: ActionItem[] = [];

    // 1 — unacknowledged check-ins (highest severity: safety).
    if (checkInCount > 0) {
      list.push({
        id: "checkins",
        severity: 1,
        icon: AlertTriangle,
        tone: "attention",
        line: t(
          "inbox_checkins",
          "{{count}} cliënt liet weten dat het even moeilijk gaat",
          { count: checkInCount },
        ),
        actionLabel: t("inbox_checkins_action", "Bekijken"),
        onAction: () => navigate("/dashboard/therapist/clients"),
      });
    }

    // 2 — pending leads (dedup: one row that links to the full inbox).
    if (leadCount > 0) {
      list.push({
        id: "leads",
        severity: 2,
        icon: Inbox,
        tone: "neutral",
        line: t(
          "inbox_leads",
          "{{count}} nieuwe aanvraag wacht op antwoord",
          { count: leadCount },
        ),
        actionLabel: t("inbox_leads_action", "Naar aanvragen"),
        onAction: () => navigate("/dashboard/therapist"),
      });
    }

    // 3 — sessions awaiting confirmation.
    if (pendingSessionCount > 0) {
      list.push({
        id: "sessions",
        severity: 3,
        icon: CalendarClock,
        tone: "neutral",
        line: t(
          "inbox_sessions",
          "{{count}} sessie wacht op bevestiging",
          { count: pendingSessionCount },
        ),
        actionLabel: t("inbox_sessions_action", "Bevestigen"),
        onAction: () => navigate("/dashboard/therapist/sessions"),
      });
    }

    // 4 — unfinished notes. Placeholder count until session_notes (T-PX-3/4)
    //     lands; rendered as graceful absence for now (no source → no row).
    //     Left here as the wired severity slot so the ordering is stable.

    return list.sort((a, b) => a.severity - b.severity);
  }, [checkInCount, leadCount, pendingSessionCount, navigate, t]);

  const totalCount = items.length;

  return (
    <section
      className="rounded-card border border-border bg-card"
      aria-label={t("inbox_title", "Wat vraagt aandacht")}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
        <h2 className="text-body font-semibold text-foreground">
          {t("inbox_title", "Wat vraagt aandacht")}
        </h2>
        {loading ? (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : totalCount > 0 ? (
          <Badge variant="warning">{totalCount}</Badge>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2 p-4" aria-busy="true">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-ctl border border-border/60 bg-muted/40"
            />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <EmptyState
          motif={<LineSteps className="h-20 w-20" />}
          title={t("inbox_empty_title", "Alles bij")}
          description={t(
            "inbox_empty_desc",
            "Geen openstaande acties. Tijd voor koffie.",
          )}
          className="py-8"
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={item.onAction}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-ctl",
                      item.tone === "attention"
                        ? "bg-warning-soft text-warning"
                        : "bg-secondary text-primary",
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-body-sm text-foreground">
                    {item.line}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-body-sm font-medium text-primary">
                    {item.actionLabel}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default ActionInbox;

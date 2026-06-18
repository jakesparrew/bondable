import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Sparkles, ArrowRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AiSupervisedBadge from "@/components/ai/AiSupervisedBadge";
import { useTherapistClients } from "@/hooks/api/useOptimizedTherapists";

/**
 * Right column: today's clinical queue (agenda built from active clients) plus
 * a System Alerts block whose AI surface reuses AiSupervisedBadge + the mint token.
 */
const ClinicalQueue = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: clients = [] } = useTherapistClients();

  // Build a simple "today" agenda from the first few active clients. Time slots
  // are illustrative; the names/data are real (from useTherapistClients).
  const agenda = useMemo(() => {
    const slots = ["10:30", "12:00", "14:15"];
    return clients
      .filter((c) => c.status === "Active")
      .slice(0, slots.length)
      .map((client, i) => ({
        time: slots[i],
        name: client.name,
        id: client.id,
        live: i === 0,
      }));
  }, [clients]);

  return (
    <Card className="rounded-3xl border-border p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">{t("clinical_queue")}</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
          {t("today")}
        </span>
      </div>

      <div className="space-y-3">
        {agenda.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
            {t("no_sessions_today")}
          </p>
        ) : (
          agenda.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => navigate("/dashboard/therapist/sessions")}
              className={
                slot.live
                  ? "relative flex w-full items-center gap-3 rounded-2xl border border-mint/30 bg-mint/10 p-3 text-left transition-colors hover:bg-mint/15"
                  : "relative flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary"
              }
            >
              <span className="text-xs font-bold text-foreground">{slot.time}</span>
              <span className="h-6 w-px bg-border" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-foreground">{slot.name}</span>
                <span className="block text-[9px] text-muted-foreground">{t("telehealth_session")}</span>
              </span>
              {slot.live ? (
                <span className="absolute right-3 top-3 flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => navigate("/dashboard/therapist/sessions")}
        className="mt-4 h-auto w-full rounded-2xl border-2 border-dashed border-border py-3 text-[11px] font-bold text-muted-foreground hover:bg-secondary"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {t("quick_slot")}
      </Button>

      <div className="mt-8 border-t border-border pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground">
            {t("system_alerts")}
          </h3>
          <AiSupervisedBadge />
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard/therapist/payments")}
            className="flex w-full items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-left transition-colors hover:bg-destructive/15"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold text-foreground">{t("alert_unsent_invoices")}</span>
              <span className="block text-[9px] text-muted-foreground">{t("alert_due_eod")}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-destructive" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard/therapist/sessions")}
            className="flex w-full items-center gap-3 rounded-xl border border-mint/20 bg-mint/10 p-3 text-left transition-colors hover:bg-mint/15"
          >
            <Sparkles className="h-5 w-5 shrink-0 text-mint" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold text-foreground">{t("alert_ai_summaries_ready")}</span>
              <span className="block text-[9px] text-muted-foreground">{t("alert_sessions_processed")}</span>
            </span>
            <Badge
              variant="outline"
              className="rounded-full border-mint/30 bg-mint/15 px-2 py-0.5 text-[9px] font-bold uppercase text-mint"
            >
              {t("review")}
            </Badge>
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ClinicalQueue;

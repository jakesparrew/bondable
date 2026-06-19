import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { useAssignmentsForSelf } from "@/hooks/api/useIntakeAssignments";

export function IntakePendingBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: assignments = [] } = useAssignmentsForSelf();
  const pending = assignments.filter((a) => a.status !== "completed");
  if (pending.length === 0) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-accent bg-accent/40 p-3">
      <div className="flex items-center gap-2 text-sm text-foreground">
        <ClipboardList className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {t("intake:pending_banner", { count: pending.length })}
      </div>
      <button
        className="shrink-0 rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => navigate("/dashboard/client/intake")}
      >
        {t("intake:open")} →
      </button>
    </div>
  );
}

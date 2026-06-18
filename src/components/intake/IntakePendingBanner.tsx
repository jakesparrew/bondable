import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAssignmentsForSelf } from "@/hooks/api/useIntakeAssignments";

export function IntakePendingBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: assignments = [] } = useAssignmentsForSelf();
  const pending = assignments.filter((a) => a.status !== "completed");
  if (pending.length === 0) return null;
  return (
    <div className="rounded-md border border-yellow-700/40 bg-yellow-900/10 p-3 mb-4 flex items-center justify-between">
      <div className="text-sm text-yellow-300">📋 {t("intake:pending_banner", { count: pending.length })}</div>
      <button className="text-sm text-yellow-200 underline" onClick={() => navigate("/dashboard/client/intake")}>
        {t("intake:open")} →
      </button>
    </div>
  );
}

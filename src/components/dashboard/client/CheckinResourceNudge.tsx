import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCheckins } from "@/services/api/checkinService";
import { resourceService, type Resource } from "@/services/api/resourceService";

/**
 * CheckinResourceNudge — ONE article, only after a dip, always dismissible.
 *
 * This is the third echo of a check-in. It appears only when the derived signal
 * is "low", it offers exactly one piece from the Bronnen library matched to the
 * theme the client themselves picked, and it explains WHY it is here in one line.
 *
 * Hard limits, on purpose:
 *   • never diagnostic — it suggests reading, never a condition or a treatment;
 *   • never a list — one article, so it reads as a hand, not a prescription;
 *   • one tap to make it go away for good (`dismissSuggestion`);
 *   • it is not a crisis path and must never be mistaken for one — the crisis
 *     button in the page header remains the unconditional route to help.
 *
 * Renders nothing when there is no suggestion. Silence is the default.
 */
const CheckinResourceNudge = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { suggestion, dismissSuggestion } = useCheckins();

  const [resource, setResource] = useState<Resource | null>(null);

  useEffect(() => {
    let active = true;
    if (!suggestion) {
      setResource(null);
      return () => {
        active = false;
      };
    }
    void resourceService.getById(suggestion.resourceId).then((found) => {
      if (active) setResource(found);
    });
    return () => {
      active = false;
    };
  }, [suggestion]);

  if (!suggestion || !resource) return null;

  return (
    <Card className="animate-enter rounded-card border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <BookOpen aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <button
          type="button"
          onClick={() => dismissSuggestion(suggestion.resourceId)}
          aria-label={t("nudge_res_dismiss", "Niet tonen")}
          className="-mr-1 -mt-1 rounded-ctl p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <h2 className="mt-3 text-sm font-semibold text-foreground">{resource.title}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {t(suggestion.reasonKey, suggestion.reasonDefault)}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t("nudge_res_readtime", "{{count}} minuten lezen", { count: resource.readTimeMin })}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/dashboard/client/resources")}
          className="h-auto rounded-ctl px-3.5 py-2 text-xs font-medium"
        >
          {t("nudge_res_open", "Lees het stuk")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => dismissSuggestion(suggestion.resourceId)}
          className="h-auto rounded-ctl px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          {t("nudge_res_not_now", "Nu even niet")}
        </Button>
      </div>
    </Card>
  );
};

export default CheckinResourceNudge;

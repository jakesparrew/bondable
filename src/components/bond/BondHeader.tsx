import { useTranslation } from "react-i18next";
import { MessageCircleHeart } from "lucide-react";

import AiSupervisedBadge from "@/components/ai/AiSupervisedBadge";
import { CrisisHelpButton } from "@/components/safety/CrisisResources";

interface BondHeaderProps {
  /** Connected therapist's display name (for the supervised-by framing). */
  therapistName?: string;
}

/**
 * Bond chat header: friendly mint identity, the "AI · supervised by {therapist}"
 * badge (EU AI Act Art. 50 transparency), and an always-visible crisis
 * affordance. Mint is the reserved AI-surface color.
 */
const BondHeader = ({ therapistName }: BondHeaderProps) => {
  const { t } = useTranslation();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-mint text-mint-foreground shadow-sm"
        >
          <MessageCircleHeart className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-base font-bold text-foreground">
            {t("bond_name", "Bond")}
            <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
              {t("bond_tagline", "your AI companion")}
            </span>
          </h1>
          <div className="mt-1">
            <AiSupervisedBadge clinicianName={therapistName} />
          </div>
        </div>
      </div>

      <CrisisHelpButton
        label={t("bond_crisis_button", "In crisis? Get help")}
        className="shrink-0"
      />
    </header>
  );
};

export default BondHeader;

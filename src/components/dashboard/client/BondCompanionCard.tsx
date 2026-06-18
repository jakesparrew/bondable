import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AiSupervisedBadge from "@/components/ai/AiSupervisedBadge";
import { useToast } from "@/hooks/ui/use-toast";
import { useConnectedTherapists } from "@/hooks/api/useOptimizedTherapists";

/**
 * "Bond — your AI companion" card. Mint surface (mint is reserved for AI), with
 * the AiSupervisedBadge showing the connected therapist's name. The CTA is a
 * placeholder until the Bond companion is wired.
 */
const BondCompanionCard = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: therapists = [] } = useConnectedTherapists();
  const therapistName = therapists[0]?.name;

  const handleChat = () => {
    toast({
      title: t("cqa_talk_to_bond"),
      description: t("cqa_bond_placeholder"),
    });
  };

  return (
    <Card className="rounded-3xl border-mint/30 bg-mint/10 p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint text-mint-foreground">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <AiSupervisedBadge clinicianName={therapistName} />
      </div>

      <h2 className="text-sm font-bold text-foreground">{t("bond_companion_title")}</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {t("bond_companion_body")}
      </p>

      <Button
        type="button"
        onClick={handleChat}
        className="mt-4 h-auto w-full gap-2 rounded-2xl bg-mint py-2.5 text-[11px] font-bold text-mint-foreground hover:bg-mint/90"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {t("bond_chat_cta")}
      </Button>
    </Card>
  );
};

export default BondCompanionCard;

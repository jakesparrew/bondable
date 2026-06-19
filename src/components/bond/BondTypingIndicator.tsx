import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

/**
 * Animated "Bond is typing" indicator — three pulsing dots on a mint bubble,
 * matching the Bond message style. Shown while a (simulated) reply is pending.
 */
const BondTypingIndicator = () => {
  const { t } = useTranslation();

  return (
    <div
      className="flex w-full justify-start gap-2"
      role="status"
      aria-live="polite"
      aria-label={t("bond_typing", "Bond is typing")}
    >
      <span
        aria-hidden="true"
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-mint-foreground"
      >
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-mint/30 bg-mint/15 px-4 py-3 shadow-sm">
        <span className="h-2 w-2 animate-bounce rounded-full bg-mint [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-mint [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-mint" />
      </div>
    </div>
  );
};

export default BondTypingIndicator;

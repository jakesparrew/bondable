import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { CrisisResources } from "@/components/safety/CrisisResources";
import type { BondMessage } from "./bondEngine";

interface BondMessageBubbleProps {
  message: BondMessage;
}

/**
 * A single chat bubble. Bond messages sit LEFT on a mint-tinted surface (mint is
 * the reserved AI color); user messages sit RIGHT in primary deep-teal. Crisis
 * replies render the static CrisisResources card inline, beneath the bubble.
 */
const BondMessageBubble = ({ message }: BondMessageBubbleProps) => {
  const { t, i18n } = useTranslation();
  const isBond = message.role === "bond";

  const time = new Date(message.createdAt).toLocaleTimeString(i18n.language || "nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn("flex w-full gap-2", isBond ? "justify-start" : "justify-end")}
    >
      {isBond && (
        <span
          aria-hidden="true"
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-mint-foreground"
        >
          <Sparkles className="h-4 w-4" />
        </span>
      )}

      <div className={cn("flex max-w-[80%] flex-col gap-1", !isBond && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            isBond
              ? "rounded-tl-sm border border-mint/30 bg-mint/15 text-foreground"
              : "rounded-tr-sm bg-primary text-primary-foreground",
          )}
        >
          {message.text}
        </div>

        {message.crisis && (
          <CrisisResources
            className="mt-1 w-full max-w-md"
            // Render the full card so help is unmissable in a crisis turn.
          />
        )}

        <span
          className={cn(
            "px-1 text-[10px] text-muted-foreground",
            isBond ? "text-left" : "text-right",
          )}
        >
          <span className="sr-only">
            {isBond ? t("bond_sender", "Bond") : t("bond_you", "Jij")}
            {", "}
          </span>
          {time}
        </span>
      </div>
    </div>
  );
};

export default BondMessageBubble;

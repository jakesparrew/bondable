import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LifeBuoy, Phone, PhoneCall, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Crisis Resources — an always-accessible, fully OFFLINE safety feature.
 *
 * All data is static (no network calls), so it works even with no connection.
 * Tone is intentionally calm: a soft mint/accent surface for the listening &
 * prevention lines, with strong destructive red reserved ONLY for the 112
 * emergency row so it reads as distinct without alarming the whole card.
 *
 * Covers Belgium + Netherlands crisis lines. Each entry is a real `tel:` link
 * with an accessible label (name + number + one-line context).
 *
 * No user-facing strings are added to the shared locale JSON files: every
 * string uses t('key', 'English default') so the JSON stays untouched while
 * still being translatable later.
 */

interface CrisisLine {
  /** Stable id (used for keys + i18n key suffix). */
  id: string;
  /** Display name of the line/service. */
  name: string;
  /** Human-readable number as shown to the user. */
  display: string;
  /** Digits-only value for the tel: href. */
  tel: string;
  /** One-line context (who/when/language). */
  context: string;
  /** Emergency line gets the strong-red treatment. */
  emergency?: boolean;
}

/** Static list — defined at module scope so it is never re-created or fetched. */
const CRISIS_LINES: CrisisLine[] = [
  {
    id: "zelfmoordlijn",
    name: "Zelfmoordlijn 1813",
    display: "1813",
    tel: "1813",
    context: "België · Nederlandstalig · 24/7",
  },
  {
    id: "tele-onthaal",
    name: "Tele-Onthaal 106",
    display: "106",
    tel: "106",
    context: "België · luisterlijn",
  },
  {
    id: "cps",
    name: "Centre de Prévention du Suicide",
    display: "0800 32 123",
    tel: "080032123",
    context: "Belgique · Français",
  },
  {
    id: "nl-113",
    name: "113 Zelfmoordpreventie",
    display: "113",
    tel: "113",
    context: "Nederland · 24/7",
  },
  {
    id: "emergency-112",
    name: "Noodgevallen / Emergency",
    display: "112",
    tel: "112",
    context: "België & Nederland · life-threatening emergencies",
    emergency: true,
  },
];

interface CrisisLineRowProps {
  line: CrisisLine;
}

/** A single tappable crisis line, rendered as a real `tel:` anchor. */
const CrisisLineRow = ({ line }: CrisisLineRowProps) => {
  const { t } = useTranslation();

  const name = t(`crisis.line.${line.id}.name`, line.name);
  const context = t(`crisis.line.${line.id}.context`, line.context);
  const Icon = line.emergency ? ShieldAlert : PhoneCall;

  return (
    <a
      href={`tel:${line.tel}`}
      aria-label={t(
        `crisis.line.${line.id}.aria`,
        `Call ${name}, ${line.display}. ${context}`,
      )}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        line.emergency
          ? "border-destructive/40 bg-destructive/10 hover:bg-destructive/15"
          : "border-border bg-background hover:bg-accent",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          line.emergency
            ? "bg-destructive text-destructive-foreground"
            : "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{name}</span>
          <span
            className={cn(
              "shrink-0 text-sm font-bold tabular-nums",
              line.emergency ? "text-destructive" : "text-primary",
            )}
          >
            {line.display}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-muted-foreground">
          {context}
        </span>
      </span>

      <Phone
        aria-hidden="true"
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          line.emergency
            ? "text-destructive"
            : "text-muted-foreground group-hover:text-primary",
        )}
      />
    </a>
  );
};

export interface CrisisResourcesProps {
  /** When true, renders without the outer Card chrome (e.g. inside a Dialog). */
  bare?: boolean;
  className?: string;
}

/**
 * The full list of Belgium + Netherlands crisis lines. Use directly to embed
 * the card in a page, or pass `bare` to drop the Card chrome (e.g. in a Dialog).
 */
export const CrisisResources = ({ bare = false, className }: CrisisResourcesProps) => {
  const { t } = useTranslation();

  const heading = t("crisis.title", "You are not alone");
  const intro = t(
    "crisis.intro",
    "If you are struggling, reaching out helps. These lines are free, confidential, and answered by people who want to listen.",
  );

  const body = (
    <div className="space-y-3">
      <div className={cn(bare && "space-y-1")}>
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <LifeBuoy className="h-5 w-5" />
          </span>
          <h2 className="text-sm font-bold text-foreground">{heading}</h2>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{intro}</p>
      </div>

      <ul className="space-y-2" aria-label={t("crisis.list_label", "Crisis support phone lines")}>
        {CRISIS_LINES.map((line) => (
          <li key={line.id}>
            <CrisisLineRow line={line} />
          </li>
        ))}
      </ul>
    </div>
  );

  if (bare) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Card
      role="region"
      aria-label={heading}
      className={cn("rounded-3xl border-accent bg-accent/30 p-6 shadow-sm", className)}
    >
      {body}
    </Card>
  );
};

export interface CrisisHelpButtonProps {
  /** Override the trigger label. */
  label?: string;
  className?: string;
  /** Passed to the trigger Button (e.g. "sm", "default"). */
  size?: React.ComponentProps<typeof Button>["size"];
  /** Passed to the trigger Button. Defaults to a calm outline. */
  variant?: React.ComponentProps<typeof Button>["variant"];
}

/**
 * Compact, always-visible "Need help now?" button that opens the crisis
 * resources in a Dialog. Calm by default (soft outline, not red), accessible,
 * and works offline since the dialog content is static.
 */
export const CrisisHelpButton = ({
  label,
  className,
  size = "sm",
  variant = "outline",
}: CrisisHelpButtonProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const triggerLabel = label ?? t("crisis.button", "Need help now?");
  const dialogTitle = t("crisis.title", "You are not alone");
  const dialogDescription = t(
    "crisis.dialog_description",
    "Free and confidential crisis lines in Belgium and the Netherlands. In a life-threatening emergency, call 112.",
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          aria-label={t("crisis.button_aria", "Open crisis support resources")}
          className={cn(
            "gap-2 rounded-full border-accent text-primary hover:bg-accent hover:text-accent-foreground",
            className,
          )}
        >
          <LifeBuoy className="h-4 w-4" aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <CrisisResources bare />
      </DialogContent>
    </Dialog>
  );
};

export default CrisisResources;

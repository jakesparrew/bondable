import { ShieldCheck } from "lucide-react";

interface AiSupervisedBadgeProps {
  clinicianName?: string;
  className?: string;
}

/**
 * Small "pill" badge marking an AI surface that is clinically supervised.
 * Uses the MINT brand token (reserved for AI surfaces) via inline style so it
 * visually stands apart from regular UI chrome.
 */
const AiSupervisedBadge = ({
  clinicianName = "your therapist",
  className,
}: AiSupervisedBadgeProps) => {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className ?? "",
      ]
        .join(" ")
        .trim()}
      style={{
        backgroundColor: "hsl(var(--mint))",
        color: "hsl(var(--mint-foreground))",
      }}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{`AI · supervised by ${clinicianName}`}</span>
    </span>
  );
};

export default AiSupervisedBadge;

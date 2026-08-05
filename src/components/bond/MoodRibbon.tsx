import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useCheckins, type CheckinTrendDay } from "@/services/api/checkinService";

/**
 * MoodRibbon — a gentle 7-day continuity ribbon.
 *
 * Seven dots, nothing else. A day with a check-in shows an ink-tint dot (deeper =
 * higher on the 1–5 scale, matching BondCheckIn); a day without one renders
 * NEUTRAL — never broken, never shamed.
 *
 * Deliberately absent: any counter, any "X van 7", any streak, any loss framing.
 * Missing a day costs nothing. Reads straight from `checkinService`, so it fills
 * in the moment a check-in is saved anywhere in the app.
 *
 * Reduced-motion safe — it uses no animation of its own.
 */

interface MoodRibbonProps {
  /** Optional pre-read trend (e.g. when the parent already has one). */
  days?: CheckinTrendDay[];
  className?: string;
}

const MoodRibbon = ({ days, className = "" }: MoodRibbonProps) => {
  const { t, i18n } = useTranslation();
  const { trend } = useCheckins(7);

  const source = days ?? trend;

  const cells = useMemo(() => {
    const weekdayFmt = new Intl.DateTimeFormat(i18n.language || "nl", { weekday: "short" });
    return source.map((day) => ({
      key: String(day.dayKey),
      label: weekdayFmt.format(new Date(day.dayKey)).replace(/\.$/, ""),
      mood: day.mood,
      isToday: day.isToday,
    }));
  }, [source, i18n.language]);

  const hasAny = source.some((d) => d.mood != null);

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      aria-label={t("ribbon_label", "Je afgelopen zeven dagen")}
    >
      <div className="flex items-center justify-between gap-2">
        {cells.map((cell) => {
          const filled = cell.mood != null;
          // Same ink-tint scale as the check-in dots, so the ribbon reads as
          // continuity, not a scorecard. Empty days are a soft neutral outline.
          const tint = filled ? 0.12 + ((cell.mood as number) - 1) * 0.16 : 0;
          return (
            <div key={cell.key} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`h-4 w-4 rounded-full border ${
                  filled
                    ? "border-foreground/20"
                    : "border-dashed border-foreground/20 bg-card"
                } ${
                  cell.isToday ? "ring-2 ring-mint ring-offset-1 ring-offset-background" : ""
                }`}
                style={
                  filled ? { backgroundColor: `hsl(var(--foreground) / ${tint})` } : undefined
                }
              />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {cell.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        {hasAny
          ? t("ribbon_note", "Alleen ter herinnering, geen doel om te halen")
          : t("ribbon_empty", "Nog geen check-ins. Er is geen haast bij")}
      </p>
    </div>
  );
};

export default MoodRibbon;

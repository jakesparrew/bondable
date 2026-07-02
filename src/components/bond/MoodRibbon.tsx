import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { readCheckIns, type BondCheckInRecord } from "./BondCheckIn";

/**
 * MoodRibbon — a gentle 7-day continuity ribbon (ticket T-CX-8).
 *
 * Renders the last seven calendar days as small dots. A day with a check-in shows
 * an ink-tint dot (deeper = higher mood on the 1–5 scale, matching BondCheckIn);
 * a day without one renders NEUTRAL, never broken or shamed.
 *
 * Deliberately absent: any streak counter, any "X days in a row", any loss framing.
 * Missing a day costs nothing. Copy frames a return as welcome, never as a lapse.
 * Reduced-motion safe — it uses no animation of its own.
 */

interface MoodRibbonProps {
  /** Optional pre-read records (e.g. when the parent already has them). */
  records?: BondCheckInRecord[];
  className?: string;
}

interface DayCell {
  key: string;
  /** Short weekday label (e.g. "ma"). */
  label: string;
  /** Highest mood recorded that day, or null when there was no check-in. */
  mood: number | null;
  isToday: boolean;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const MoodRibbon = ({ records, className = "" }: MoodRibbonProps) => {
  const { t, i18n } = useTranslation();

  const checkIns = useMemo(() => records ?? readCheckIns(), [records]);

  const days = useMemo<DayCell[]>(() => {
    const now = new Date();
    const todayStart = startOfDay(now);

    // Bucket the highest mood per calendar day (a day can hold >1 check-in).
    const byDay = new Map<number, number>();
    for (const c of checkIns) {
      const dayKey = startOfDay(new Date(c.createdAt));
      const existing = byDay.get(dayKey);
      byDay.set(dayKey, existing == null ? c.mood : Math.max(existing, c.mood));
    }

    const weekdayFmt = new Intl.DateTimeFormat(i18n.language || "nl", {
      weekday: "short",
    });

    // Oldest → newest, ending on today.
    const out: DayCell[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const d = new Date(todayStart - offset * 24 * 60 * 60 * 1000);
      const key = startOfDay(d);
      out.push({
        key: String(key),
        label: weekdayFmt.format(d).replace(/\.$/, ""),
        mood: byDay.get(key) ?? null,
        isToday: key === todayStart,
      });
    }
    return out;
  }, [checkIns, i18n.language]);

  const hasAny = checkIns.length > 0;

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      aria-label={t("ribbon_label", "Je afgelopen zeven dagen")}
    >
      <div className="flex items-center justify-between gap-2">
        {days.map((day) => {
          const filled = day.mood != null;
          // Same ink-tint scale as the check-in dots, so the ribbon reads as
          // continuity, not a scorecard. Empty days are a soft neutral outline.
          const tint = filled ? 0.12 + ((day.mood as number) - 1) * 0.16 : 0;
          return (
            <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`h-4 w-4 rounded-full border ${
                  filled ? "border-foreground/20" : "border-dashed border-foreground/20 bg-card"
                } ${day.isToday ? "ring-2 ring-mint ring-offset-1 ring-offset-background" : ""}`}
                style={filled ? { backgroundColor: `hsl(var(--foreground) / ${tint})` } : undefined}
              />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {day.label}
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

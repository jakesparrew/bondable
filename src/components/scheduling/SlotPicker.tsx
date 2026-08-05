import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format as formatDate, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import LineSteps from "@/components/illustration/LineSteps";
import { scheduleService } from "@/services/api/scheduleService";
import type {
  BusyBlock,
  OpenSlot,
  OpenSlotDay,
  SessionFormat,
} from "@/services/api/scheduleService";

/**
 * SlotPicker — the bridge between a painted availability grid and a real
 * booking. It reads scheduleService.getOpenSlots (weekly rules MINUS verlof
 * MINUS what is already booked) and renders the result as a calm, day-grouped
 * list of time chips.
 *
 * Used on both sides of the loop:
 *   • provider — inside ScheduleSessionDialog, replacing free time entry
 *   • client   — inside RequestSessionDialog, to ask for a moment
 *
 * Presentational + a single pure derivation; it never writes. The parent owns
 * the chosen slot and what happens next.
 *
 * Border-first (no shadow at rest, hover:shadow-raise on the chips), no mint
 * (this is not an AI surface), 360px-safe: chips wrap, nothing scrolls sideways.
 * NL-first copy via t('key','NL default').
 */

export interface SlotPickerProps {
  /** Whose availability to read (= profiles.id of the provider). */
  providerId: string;
  /** Currently chosen moment, if any. */
  value?: { date: string; time: string } | null;
  onSelect: (slot: OpenSlot) => void;
  /** Session length in minutes. Default 50. */
  durationMinutes?: number;
  /** Only offer slots that fit this format. Default "both". */
  format?: SessionFormat;
  /** ISO date to start scanning from. Default today. */
  fromDate?: string;
  /** How many days to show at once. Default 14; "toon meer" adds another week. */
  days?: number;
  /** Time that is already taken (build with scheduleService.busyFromSessions). */
  busy?: BusyBlock[];
  /**
   * Rendered inside the empty state — e.g. a waitlist CTA or the manual
   * "ander moment" escape hatch, so a full week is never a dead end.
   */
  emptyAction?: React.ReactNode;
  /** Fired whenever the open/empty status flips, so a parent can adapt copy. */
  onAvailabilityChange?: (hasSlots: boolean) => void;
  /** Seed a plausible practice week when the provider never painted one. */
  seedWhenEmpty?: boolean;
  className?: string;
}

const todayIso = () => scheduleService.localTodayIso();

/** "maandag 10 augustus" — capitalised, Belgian NL. */
const dayLabel = (iso: string, isNl: boolean): string => {
  try {
    const d = parseISO(iso);
    const label = isNl
      ? formatDate(d, "EEEE d MMMM", { locale: nl })
      : formatDate(d, "EEEE d MMMM");
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return iso;
  }
};

const SlotPicker: React.FC<SlotPickerProps> = ({
  providerId,
  value,
  onSelect,
  durationMinutes = 50,
  format = "both",
  fromDate,
  days = 14,
  busy,
  emptyAction,
  onAvailabilityChange,
  seedWhenEmpty = true,
  className,
}) => {
  const { t, i18n } = useTranslation();
  const isNl = i18n.language !== "en";

  const [horizon, setHorizon] = useState(days);
  const [seedTick, setSeedTick] = useState(0);

  useEffect(() => setHorizon(days), [days]);

  // Demo-mode safety net: a provider who never painted a grid would otherwise
  // show a permanently empty picker. Seeds once, never overwrites a real grid.
  useEffect(() => {
    if (!providerId || !seedWhenEmpty) return;
    if (scheduleService.listRules(providerId).length === 0) {
      scheduleService.seedDemoAvailability(providerId);
      setSeedTick((n) => n + 1);
    }
  }, [providerId, seedWhenEmpty]);

  const from = fromDate ?? todayIso();

  const openDays: OpenSlotDay[] = useMemo(() => {
    if (!providerId) return [];
    return scheduleService.getOpenSlots(providerId, from, horizon, {
      durationMinutes,
      format,
      busy,
      notBefore: scheduleService.localNowIso(),
    });
    // seedTick forces a recompute right after the demo seed lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, from, horizon, durationMinutes, format, busy, seedTick]);

  const hasSlots = openDays.length > 0;

  useEffect(() => {
    onAvailabilityChange?.(hasSlots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSlots]);

  if (!hasSlots) {
    return (
      <div className={className}>
        <EmptyState
          bordered
          motif={<LineSteps className="w-28 text-muted-foreground" />}
          title={t("slot_empty_title", "Deze weken zitten vol")}
          description={t(
            "slot_empty_desc",
            "Er staan tot {{days}} dagen vooruit geen vrije momenten open. Zet je naam op de wachtlijst, of vraag een ander moment aan.",
          ).replace("{{days}}", String(horizon))}
          action={
            emptyAction ?? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHorizon((w) => w + 14)}
              >
                {t("slot_look_further", "Kijk verder vooruit")}
              </Button>
            )
          }
        />
        {emptyAction ? (
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-label text-muted-foreground hover:text-foreground"
              onClick={() => setHorizon((w) => w + 14)}
            >
              {t("slot_look_further", "Kijk verder vooruit")}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-label text-muted-foreground">
        {t("slot_hint", "Vrije momenten van {{min}} minuten. Kies er een.").replace(
          "{{min}}",
          String(durationMinutes),
        )}
      </p>

      <ul className="mt-3 space-y-4">
        {openDays.map((day) => (
          <li key={day.date}>
            <p className="text-body-sm font-medium text-foreground">
              {dayLabel(day.date, isNl)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {day.slots.map((slot) => {
                const selected =
                  !!value &&
                  value.date === slot.date &&
                  value.time.slice(0, 5) === slot.time;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(slot)}
                    className={`tabular rounded-ctl border px-3 py-1.5 text-body-sm transition-shadow hover:shadow-raise focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setHorizon((w) => w + 14)}
        >
          {t("slot_more_days", "Toon meer dagen")}
        </Button>
        {emptyAction}
      </div>
    </div>
  );
};

export default SlotPicker;

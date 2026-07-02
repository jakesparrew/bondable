import React from "react";
import { useTranslation } from "react-i18next";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { RecurrenceFreq } from "@/services/api/scheduleService";
import { scheduleService } from "@/services/api/scheduleService";

/**
 * RecurrenceFields — the rrule-subset UI a create-session dialog embeds so a
 * provider can turn a single appointment into a recurring series (T-PX-11).
 *
 * Scope is deliberately the mock's supported subset: cadence wekelijks /
 * tweewekelijks, bounded by a count OR an end date (never both). It is a
 * controlled component — the parent owns `value` and gets changes via onChange,
 * so the dialog can preview occurrences and pass the definition to
 * scheduleService.createSeries on submit.
 *
 * Border-first, no mint (this is a provider surface), 360px-safe. NL-first copy
 * via t('key','NL default'); the je/jij voice, no exclamation marks.
 */

export type RecurrenceEnd = "count" | "until";

export interface RecurrenceValue {
  /** When false, the whole block is inert — a single (non-recurring) session. */
  enabled: boolean;
  freq: RecurrenceFreq;
  /** How the series is bounded. */
  endMode: RecurrenceEnd;
  /** Used when endMode = 'count'. */
  count: number;
  /** ISO date; used when endMode = 'until'. */
  until: string;
}

export const defaultRecurrence = (startDate?: string): RecurrenceValue => ({
  enabled: false,
  freq: "weekly",
  endMode: "count",
  count: 8,
  until: startDate ?? "",
});

interface RecurrenceFieldsProps {
  value: RecurrenceValue;
  onChange: (next: RecurrenceValue) => void;
  /** ISO date of the first session — drives the occurrence preview. */
  startDate: string;
  className?: string;
}

const RecurrenceFields: React.FC<RecurrenceFieldsProps> = ({
  value,
  onChange,
  startDate,
  className,
}) => {
  const { t } = useTranslation();

  const set = (patch: Partial<RecurrenceValue>) =>
    onChange({ ...value, ...patch });

  // Live preview of the first few generated dates (fit-for-mock, not persisted).
  const preview = value.enabled
    ? scheduleService.nextOccurrences(
        {
          freq: value.freq,
          startDate: startDate || value.until || new Date().toISOString().slice(0, 10),
          count: value.endMode === "count" ? value.count : null,
          until: value.endMode === "until" ? value.until : null,
        },
        4,
      )
    : [];

  return (
    <div className={className}>
      {/* Toggle row — plain checkbox-styled control, no switch flourish. */}
      <label className="flex items-start gap-3 rounded-ctl border border-border bg-card p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
        />
        <span className="min-w-0">
          <span className="block text-body-sm font-medium text-foreground">
            {t("recur_repeat_label", "Herhaal deze afspraak")}
          </span>
          <span className="block text-label text-muted-foreground">
            {t(
              "recur_repeat_hint",
              "Maak een reeks aan. Je kan later één afspraak los aanpassen zonder de hele reeks te wijzigen.",
            )}
          </span>
        </span>
      </label>

      {value.enabled && (
        <div className="mt-3 space-y-4 animate-enter">
          {/* Cadence */}
          <fieldset>
            <legend className="text-label font-medium text-foreground mb-2">
              {t("recur_cadence", "Ritme")}
            </legend>
            <RadioGroup
              value={value.freq}
              onValueChange={(v) => set({ freq: v as RecurrenceFreq })}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <label
                htmlFor="recur-weekly"
                className="flex items-center gap-2 rounded-ctl border border-border bg-card px-3 py-2 cursor-pointer hover:shadow-raise transition-shadow"
              >
                <RadioGroupItem value="weekly" id="recur-weekly" />
                <span className="text-body-sm text-foreground">
                  {t("recur_weekly", "Wekelijks")}
                </span>
              </label>
              <label
                htmlFor="recur-biweekly"
                className="flex items-center gap-2 rounded-ctl border border-border bg-card px-3 py-2 cursor-pointer hover:shadow-raise transition-shadow"
              >
                <RadioGroupItem value="biweekly" id="recur-biweekly" />
                <span className="text-body-sm text-foreground">
                  {t("recur_biweekly", "Om de twee weken")}
                </span>
              </label>
            </RadioGroup>
          </fieldset>

          {/* End condition */}
          <fieldset>
            <legend className="text-label font-medium text-foreground mb-2">
              {t("recur_ends", "Loopt tot")}
            </legend>
            <RadioGroup
              value={value.endMode}
              onValueChange={(v) => set({ endMode: v as RecurrenceEnd })}
              className="space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <RadioGroupItem value="count" id="recur-count" />
                <Label
                  htmlFor="recur-count"
                  className="text-body-sm text-foreground"
                >
                  {t("recur_after", "Na")}
                </Label>
                <Input
                  type="number"
                  min={2}
                  max={52}
                  value={value.count}
                  disabled={value.endMode !== "count"}
                  onChange={(e) =>
                    set({ count: Math.max(2, Number(e.target.value) || 2) })
                  }
                  className="h-9 w-20"
                  aria-label={t("recur_count_aria", "Aantal afspraken")}
                />
                <span className="text-body-sm text-muted-foreground">
                  {t("recur_sessions", "afspraken")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <RadioGroupItem value="until" id="recur-until" />
                <Label
                  htmlFor="recur-until"
                  className="text-body-sm text-foreground"
                >
                  {t("recur_on_date", "Op datum")}
                </Label>
                <Input
                  type="date"
                  value={value.until}
                  min={startDate}
                  disabled={value.endMode !== "until"}
                  onChange={(e) => set({ until: e.target.value })}
                  className="h-9 w-44"
                  aria-label={t("recur_until_aria", "Einddatum")}
                />
              </div>
            </RadioGroup>
          </fieldset>

          {/* Occurrence preview — quiet, informational. */}
          {preview.length > 0 && (
            <div className="rounded-ctl border border-border bg-muted/40 p-3">
              <p className="text-label text-muted-foreground">
                {t("recur_preview_label", "Eerste afspraken")}
              </p>
              <p className="mt-1 text-body-sm text-foreground">
                {preview.join(" · ")}
                {value.endMode === "count" && value.count > preview.length
                  ? ` … (${value.count} in totaal)`
                  : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecurrenceFields;

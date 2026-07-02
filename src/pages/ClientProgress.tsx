import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import DashboardLayout from "@/components/layout/DashboardLayout";
import EmptyState from "@/components/ui/empty-state";
import LineSteps from "@/components/illustration/LineSteps";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CrisisHelpButton } from "@/components/safety/CrisisResources";
import Questionnaire from "@/components/outcomes/Questionnaire";
import {
  getInstrument,
  isInstrumentShared,
  latestResult,
  listInstruments,
  listResults,
  setInstrumentShared,
  type AssessmentResult,
  type BandTone,
  type Instrument,
  type InstrumentId,
} from "@/services/api/outcomesService";

/**
 * ClientProgress (T-CX-14) — the client-owned outcomes surface at
 * /dashboard/client/progress.
 *
 * For each instrument: a neutral ink/teal recharts line over time with calm
 * band shading, the current score + severity chip (success/warning tokens —
 * never alarmist red for moderate), a GAS ladder, and a per-chart "Deel met
 * begeleider" consent toggle (mock, mirrors the Consent Center). "Start meting"
 * launches the Questionnaire in a Sheet. EmptyState when there is no data.
 *
 * Nothing here is gamified: no confetti, no green-up/red-down arrows on scores.
 * A lower PHQ-9 line simply trends down with a neutral "−4 sinds vorige meting".
 */

/* Resolve an HSL token to a concrete color string recharts can paint with. */
function tokenColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return raw ? `hsl(${raw})` : fallback;
  } catch {
    return fallback;
  }
}

function toneToBadge(
  tone: BandTone,
): "success" | "warning" | "info" | "outline" {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default:
      return "outline";
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("nl-BE", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

interface ChartColors {
  line: string;
  grid: string;
  band: string;
  muted: string;
}

/* ── Score line chart for a clinical instrument ─────────────────────────── */
function ScoreChart({
  instrument,
  results,
  colors,
}: {
  instrument: Instrument;
  results: AssessmentResult[];
  colors: ChartColors;
}) {
  const { t } = useTranslation();

  const data = results.map((r) => ({
    date: formatDate(r.takenAt),
    score: r.score,
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 4, left: -16 }}
        >
          {/* Calm band shading — one soft zone per severity band. */}
          {instrument.bands.map((b) => (
            <ReferenceArea
              key={`${b.min}-${b.max}`}
              y1={b.min}
              y2={b.max}
              fill={colors.band}
              fillOpacity={b.tone === "warning" ? 0.14 : 0.06}
              stroke="none"
            />
          ))}
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: colors.muted }}
            tickLine={false}
            axisLine={{ stroke: colors.grid }}
          />
          <YAxis
            domain={[0, instrument.maxScore]}
            tick={{ fontSize: 11, fill: colors.muted }}
            tickLine={false}
            axisLine={{ stroke: colors.grid }}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: colors.grid }}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${colors.grid}`,
              fontSize: 12,
              background: tokenColor("--card", "#fff"),
              color: tokenColor("--foreground", "#0f403c"),
            }}
            labelStyle={{ color: colors.muted }}
            formatter={(value: number) => [
              `${value} / ${instrument.maxScore}`,
              t("progress_score", "Score"),
            ]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={colors.line}
            strokeWidth={2}
            dot={{ r: 3, fill: colors.line, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── GAS ladder — a simple 0–10 climb, rendered as rungs, not a chart ────── */
function GasLadder({ results }: { results: AssessmentResult[] }) {
  const { t } = useTranslation();
  const current = results.length ? results[results.length - 1].score : 0;
  const rungs = Array.from({ length: 11 }, (_, i) => 10 - i); // 10 → 0

  return (
    <div>
      <div className="flex flex-col gap-1">
        {rungs.map((level) => {
          const reached = level <= current;
          const isCurrent = level === current;
          return (
            <div key={level} className="flex items-center gap-3">
              <span className="w-5 text-right text-label text-muted-foreground">
                {level}
              </span>
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  reached ? "bg-primary" : "bg-muted"
                }`}
              />
              {isCurrent ? (
                <span className="text-label font-medium text-primary">
                  {t("progress_gas_here", "hier sta je")}
                </span>
              ) : (
                <span className="w-16" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Delta annotation — neutral, never colored green/red ─────────────────── */
function DeltaLine({ results }: { results: AssessmentResult[] }) {
  const { t } = useTranslation();
  if (results.length < 2) return null;
  const last = results[results.length - 1].score;
  const prev = results[results.length - 2].score;
  const delta = last - prev;
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-label text-muted-foreground">
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        {t("progress_delta_same", "gelijk gebleven")}
      </span>
    );
  }
  const Icon = delta < 0 ? TrendingDown : TrendingUp;
  const sign = delta > 0 ? "+" : "";
  return (
    <span className="inline-flex items-center gap-1 text-label text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t("progress_delta", "{{sign}}{{delta}} sinds vorige meting", {
        sign,
        delta,
      })}
    </span>
  );
}

/* ── One instrument card ─────────────────────────────────────────────────── */
function InstrumentCard({
  instrument,
  colors,
  onStart,
  refreshKey,
}: {
  instrument: Instrument;
  colors: ChartColors;
  onStart: (id: InstrumentId) => void;
  refreshKey: number;
}) {
  const { t } = useTranslation();
  const results = useMemo(
    () => listResults(instrument.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [instrument.id, refreshKey],
  );
  const latest = useMemo(
    () => latestResult(instrument.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [instrument.id, refreshKey],
  );
  const [shared, setShared] = useState(false);

  useEffect(() => {
    setShared(isInstrumentShared(instrument.id));
  }, [instrument.id, refreshKey]);

  const onToggleShare = (next: boolean) => {
    setShared(next);
    setInstrumentShared(instrument.id, next);
  };

  const isGas = instrument.id === "gas";

  return (
    <section className="rounded-card border border-border bg-card p-5 transition-shadow hover:shadow-raise sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {instrument.name}
            </h2>
            {instrument.isClinical ? (
              <Badge variant="outline">
                {t("progress_clinical", "Klinisch")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 max-w-md text-body-sm text-muted-foreground">
            {instrument.blurb}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onStart(instrument.id)}
          className="shrink-0 rounded-ctl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t("progress_start", "Start meting")}
        </button>
      </div>

      {results.length === 0 ? (
        <div className="mt-4 rounded-ctl border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
          <p className="text-body-sm text-muted-foreground">
            {t(
              "progress_instrument_empty",
              "Nog geen metingen. Doe je eerste meting wanneer het je past.",
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Current score + band chip + delta */}
          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <p className="text-label text-muted-foreground">
                {t("progress_current", "Huidige score")}
              </p>
              <p className="mt-0.5 flex items-baseline gap-1 text-foreground">
                <span className="text-2xl font-semibold tabular-nums">
                  {latest?.score ?? 0}
                </span>
                <span className="text-body-sm text-muted-foreground">
                  / {instrument.maxScore}
                </span>
              </p>
            </div>
            {latest?.bandLabel ? (
              <div>
                <Badge variant={toneToBadge(latest.bandTone)}>
                  {latest.bandLabel}
                </Badge>
              </div>
            ) : null}
            <div className="pb-0.5">
              <DeltaLine results={results} />
            </div>
          </div>

          {/* Chart / ladder */}
          <div className="mt-5">
            {isGas ? (
              <GasLadder results={results} />
            ) : (
              <ScoreChart
                instrument={instrument}
                results={results}
                colors={colors}
              />
            )}
          </div>
        </>
      )}

      {/* Per-chart consent toggle */}
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-foreground">
            {t("progress_share_title", "Deel met begeleider")}
          </p>
          <p className="mt-0.5 text-label text-muted-foreground">
            {shared
              ? t(
                  "progress_share_on",
                  "Je begeleider kan deze metingen zien. Je kan dit altijd terugdraaien.",
                )
              : t(
                  "progress_share_off",
                  "Deze metingen blijven privé tot je ze deelt.",
                )}
          </p>
        </div>
        <Switch
          checked={shared}
          onCheckedChange={onToggleShare}
          aria-label={t(
            "progress_share_aria",
            "Deze metingen delen met je begeleider",
          )}
        />
      </div>
    </section>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
const ClientProgress = () => {
  const { t } = useTranslation();
  const instruments = useMemo(() => listInstruments(), []);
  const [activeInstrument, setActiveInstrument] =
    useState<InstrumentId | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [colors, setColors] = useState<ChartColors>({
    line: "hsl(174 62% 16%)",
    grid: "hsl(165 24% 89%)",
    band: "hsl(174 62% 16%)",
    muted: "hsl(176 13% 40%)",
  });

  useEffect(() => {
    setColors({
      line: tokenColor("--primary", "hsl(174 62% 16%)"),
      grid: tokenColor("--border", "hsl(165 24% 89%)"),
      band: tokenColor("--primary", "hsl(174 62% 16%)"),
      muted: tokenColor("--muted-foreground", "hsl(176 13% 40%)"),
    });
  }, []);

  const hasAnyData = useMemo(
    () => instruments.some((i) => listResults(i.id).length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [instruments, refreshKey],
  );

  const handleComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setActiveInstrument(null);
  }, []);

  const activeDef = activeInstrument ? getInstrument(activeInstrument) : null;

  return (
    <DashboardLayout userType="client">
      <div className="mx-auto w-full max-w-3xl animate-enter space-y-6 pb-16">
        {/* Page header */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-display-lg text-foreground">
              {t("progress_page_title", "Voortgang")}
            </h1>
            <p className="mt-1 max-w-xl text-body-sm text-muted-foreground">
              {t(
                "progress_page_intro",
                "Je metingen over tijd. Deze cijfers zijn van jou — je beslist zelf wat je deelt.",
              )}
            </p>
          </div>
          <CrisisHelpButton />
        </header>

        {!hasAnyData ? (
          <EmptyState
            bordered
            motif={<LineSteps />}
            title={t("progress_empty_title", "Nog geen metingen")}
            description={t(
              "progress_empty_body",
              "Zodra je een meting doet, zie je hier je verloop rustig in beeld gebracht.",
            )}
          />
        ) : null}

        {/* Instrument cards — always shown so a person can start any meting. */}
        <div className="space-y-5">
          {instruments.map((instrument) => (
            <InstrumentCard
              key={instrument.id}
              instrument={instrument}
              colors={colors}
              onStart={setActiveInstrument}
              refreshKey={refreshKey}
            />
          ))}
        </div>
      </div>

      {/* Questionnaire runner in a Sheet */}
      <Sheet
        open={activeInstrument != null}
        onOpenChange={(open) => {
          if (!open) setActiveInstrument(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader className="text-left">
            <SheetTitle>
              {t("progress_sheet_title", "Meting")}
              {activeDef ? ` — ${activeDef.name}` : ""}
            </SheetTitle>
            <SheetDescription>
              {t(
                "progress_sheet_desc",
                "Neem de tijd. Er zijn geen goede of foute antwoorden.",
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {activeInstrument ? (
              <Questionnaire
                instrumentId={activeInstrument}
                onComplete={handleComplete}
                onCancel={() => setActiveInstrument(null)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default ClientProgress;

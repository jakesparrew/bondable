import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Euro, Gauge, ShieldAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
} from "recharts";
import { opsService, type LlmUsageSummary } from "@/services/api/opsService";

/**
 * LlmCostMeter — compact Bond LLM-cost widget for the owner cockpit
 * (plan 07 §7 / ticket T-OC-16). Surfaces the four numbers that decide whether
 * an AI companion is affordable on the Free tier: € this month, € per DAU, p95
 * latency, and the guardrail trigger rate — plus a 14-day € sparkline.
 *
 * The meter is DARK until Bond flips to live-LLM (feature flag `bond_live_llm`).
 * Until then it shows a labelled "not lit up yet" state instead of fake spend,
 * because a cost meter reading €0 while scripted would be a lie the owner might
 * trust. This is ADMIN chrome: ink/teal only, no mint (mint is reserved for Bond
 * transcripts in the safety queue).
 *
 * Presentational + self-fetching from opsService; the parent may mount it on the
 * command area or the health page. Default export.
 */

function eur(cents: number): string {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

const Stat = ({
  icon: Icon,
  label,
  value,
  dim,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  dim: boolean;
}) => (
  <div className="flex items-start gap-2.5">
    <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p
        className={`text-body-sm font-semibold tabular-nums ${
          dim ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-label text-muted-foreground">{label}</p>
    </div>
  </div>
);

export interface LlmCostMeterProps {
  className?: string;
}

const LlmCostMeter = ({ className }: LlmCostMeterProps) => {
  const { t } = useTranslation();
  const usage: LlmUsageSummary = useMemo(() => opsService.llmUsage(), []);
  const dark = !usage.live;

  const chartData = usage.days.map((d) => ({
    date: d.date.slice(5), // MM-DD
    eur: d.costCents / 100,
  }));

  return (
    <section
      className={`rounded-card border bg-card p-4 ${className ?? ""}`}
      aria-label={t("ops_llm_meter_title", "Bond-kosten")}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-body-sm font-semibold text-foreground">
          {t("ops_llm_meter_title", "Bond-kosten")}
        </h3>
        {dark ? (
          <span className="text-label text-muted-foreground">
            {t("ops_llm_meter_dark", "Licht op zodra Bond live-LLM draait")}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Stat
          icon={Euro}
          label={t("ops_llm_month", "Deze maand")}
          value={eur(usage.monthCostCents)}
          dim={dark}
        />
        <Stat
          icon={Activity}
          label={t("ops_llm_per_dau", "Per actieve gebruiker")}
          value={eur(usage.costPerDauCents)}
          dim={dark}
        />
        <Stat
          icon={Gauge}
          label={t("ops_llm_p95", "p95-latency")}
          value={`${usage.p95LatencyMs} ms`}
          dim={dark}
        />
        <Stat
          icon={ShieldAlert}
          label={t("ops_llm_guardrail", "Guardrail-rate")}
          value={`${(usage.guardrailRate * 100).toFixed(1)} %`}
          dim={dark}
        />
      </div>

      <div className={`mt-4 h-16 ${dark ? "opacity-40" : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="llmFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <RechartsTooltip
              cursor={{ stroke: "hsl(var(--border))" }}
              contentStyle={{
                borderRadius: "var(--radius)",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                fontSize: 12,
              }}
              formatter={(v: number) => [eur(Math.round(v * 100)), t("ops_llm_day", "Kosten")]}
              labelFormatter={(l) => `${l}`}
            />
            <Area
              type="monotone"
              dataKey="eur"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              fill="url(#llmFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-label text-muted-foreground">
        {t(
          "ops_llm_meter_note",
          "Elke Bond-oproep logt tokens, model en kost — fire-and-forget, zonder extra wachttijd voor de cliënt.",
        )}
      </p>
    </section>
  );
};

export default LlmCostMeter;

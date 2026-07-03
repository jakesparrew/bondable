import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import LineWave from "@/components/illustration/LineWave";
import { cn } from "@/lib/utils";
import {
  ownerMetricsService,
  type OwnerMetrics,
  type MetricCard as MetricCardData,
  type TrendPoint,
} from "@/services/api/ownerMetricsService";

/* -------------------------------------------------------------------------- */
/* Number formatting (Flemish, tabular)                                        */
/* -------------------------------------------------------------------------- */

function fmt(n: number): string {
  return new Intl.NumberFormat("nl-BE").format(n);
}

function formatValue(value: number, unit: "€" | "%" | "", position: "prefix" | "suffix"): string {
  const body = fmt(value);
  if (unit === "€") return position === "prefix" ? `€${body}` : `${body}€`;
  if (unit === "%") return `${body}%`;
  return body;
}

/* -------------------------------------------------------------------------- */
/* Sparkline (ink, no axes, no rainbow)                                        */
/* -------------------------------------------------------------------------- */

function Sparkline({ data, ariaLabel }: { data: TrendPoint[]; ariaLabel: string }) {
  const gradId = useMemo(
    () => `spark-${Math.abs(data.reduce((a, d) => a + d.value, 0)).toString(36)}`,
    [data],
  );
  return (
    <div className="h-10 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.14} />
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--foreground))"
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Delta pill                                                                  */
/* -------------------------------------------------------------------------- */

function Delta({ value, suffix }: { value: number; suffix?: string }) {
  const { t } = useTranslation();
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-label text-muted-foreground">
        <Minus className="h-3 w-3" aria-hidden />
        {t("owner_delta_flat", "stabiel")}
      </span>
    );
  }
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-label tabular-nums",
        up ? "text-success" : "text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {up ? "+" : ""}
      {fmt(value)}
      {suffix ? <span className="ml-0.5 text-muted-foreground">{suffix}</span> : null}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Metric card                                                                 */
/* -------------------------------------------------------------------------- */

function MetricCard({ card, mint }: { card: MetricCardData; mint?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-card p-4 transition-shadow hover:shadow-raise animate-enter",
        mint && "bg-mint-soft/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-label font-medium text-muted-foreground">
          {t(card.labelKey, card.labelDefault)}
        </p>
        <Delta value={card.delta} suffix={card.unit === "%" ? "pt" : undefined} />
      </div>
      <p className="mt-2 font-display text-display-md tabular-nums text-foreground">
        {formatValue(card.value, card.unit, card.unitPosition)}
      </p>
      <div className="mt-2">
        <Sparkline data={card.trend30} ariaLabel={t(card.labelKey, card.labelDefault)} />
      </div>
      <p className="mt-2 text-label leading-snug text-muted-foreground">
        {t(card.defKey, card.defDefault)}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Finder liquidity funnel                                                     */
/* -------------------------------------------------------------------------- */

function FinderFunnel({ finder }: { finder: OwnerMetrics["finder"] }) {
  const { t } = useTranslation();
  const max = Math.max(...finder.steps.map((s) => s.count), 1);
  return (
    <section className="rounded-card border border-border bg-card p-5 animate-enter">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-display-md text-foreground">
          {t("owner_finder_title", "Finder-liquiditeit")}
        </h2>
        <p className="text-body-sm text-muted-foreground">
          {t(finder.windowKey, finder.windowDefault)} ·{" "}
          <span className="tabular-nums text-foreground">{finder.overallConv}%</span>{" "}
          {t("owner_finder_overall", "van zoekopdracht tot match")}
        </p>
      </div>
      <div className="mt-5 space-y-3">
        {finder.steps.map((step) => {
          const width = Math.max(6, Math.round((step.count / max) * 100));
          return (
            <div key={step.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body-sm text-foreground">
                  {t(step.labelKey, step.labelDefault)}
                </span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  <span className="text-body-sm font-medium text-foreground">
                    {fmt(step.count)}
                  </span>
                  {step.convFromPrev !== null ? (
                    <span className="text-label text-muted-foreground">
                      {step.convFromPrev}%
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-ctl bg-muted">
                <div
                  className="h-full rounded-ctl bg-primary/70"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Daily ops strip                                                             */
/* -------------------------------------------------------------------------- */

function DailyOpsStrip({ ops }: { ops: OwnerMetrics["ops"] }) {
  const { t } = useTranslation();
  const breaches = ops.filter((o) => o.state === "attention").length;
  return (
    <section className="rounded-card border border-border bg-card p-4 animate-enter">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-body-sm font-medium text-foreground">
          {t("owner_ops_title", "Dagelijkse ops-check")}
        </h2>
        <span className="text-label tabular-nums text-muted-foreground">
          {breaches === 0
            ? t("owner_ops_all_clear", "alles in orde")
            : t("owner_ops_breaches", "{{n}} vragen aandacht", { n: breaches })}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ops.map((o) => {
          const attention = o.state === "attention";
          return (
            <Link
              key={o.key}
              to={o.href}
              className="flex items-center gap-3 rounded-ctl border border-border bg-background px-3 py-2.5 transition-shadow hover:shadow-raise focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-[2px]",
                  attention ? "bg-destructive" : "bg-success",
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-body-sm text-foreground">
                {t(o.labelKey, o.labelDefault)}
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums text-body-sm font-medium",
                  attention ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {o.count}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading skeleton                                                            */
/* -------------------------------------------------------------------------- */

function CommandSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full rounded-card" />
      <Skeleton className="h-28 w-full rounded-card" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function OwnerCommand() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<OwnerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    ownerMetricsService
      .getMetrics()
      .then((m) => {
        if (alive) setMetrics(m);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <DashboardLayout userType="admin">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6">
          <p className="text-label font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {t("owner_command_eyebrow", "Owner")}
          </p>
          <h1 className="mt-1 font-display text-display-lg text-foreground">
            {t("owner_command_title", "Command")}
          </h1>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">
            {t(
              "owner_command_subtitle",
              "Is de business gezond in zestig seconden — omzet, marktplaats en zorg op één plek",
            )}
          </p>
        </header>

        {loading ? (
          <CommandSkeleton />
        ) : failed || !metrics ? (
          <EmptyState
            motif={<LineWave className="text-muted-foreground" />}
            title={t("owner_command_empty_title", "Nog geen cijfers")}
            description={t(
              "owner_command_empty_body",
              "Zodra er activiteit binnenkomt, verschijnen je command-cijfers hier",
            )}
            bordered
          />
        ) : (
          <div className="space-y-6">
            {/* North-star + daily ops above the fold */}
            <section className="rounded-card border border-border bg-card p-5 animate-enter">
              <p className="text-label font-medium text-muted-foreground">
                {t(metrics.northStar.labelKey, metrics.northStar.labelDefault)}
              </p>
              <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-1">
                <span className="font-display text-display-lg tabular-nums text-foreground">
                  {fmt(metrics.northStar.value)}
                </span>
                <span className="pb-1.5">
                  <Delta value={metrics.northStar.delta} suffix={t("owner_delta_wow", "wk/wk")} />
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">
                {t(metrics.northStar.defKey, metrics.northStar.defDefault)}
              </p>
              <div className="mt-3">
                <Sparkline
                  data={metrics.northStar.trend30}
                  ariaLabel={t(metrics.northStar.labelKey, metrics.northStar.labelDefault)}
                />
              </div>
            </section>

            <DailyOpsStrip ops={metrics.ops} />

            {/* Money & growth */}
            <div>
              <h2 className="mb-3 text-body-sm font-medium text-muted-foreground">
                {t("owner_section_money", "Geld & groei")}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.cards
                  .filter((c) =>
                    ["mrr", "arr", "trials", "trial_conv", "activation_provider", "activation_client", "llm_cost"].includes(
                      c.key,
                    ),
                  )
                  .map((c) => (
                    <MetricCard key={c.key} card={c} />
                  ))}
              </div>
            </div>

            {/* Marketplace & care */}
            <div>
              <h2 className="mb-3 text-body-sm font-medium text-muted-foreground">
                {t("owner_section_care", "Marktplaats & zorg")}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.cards
                  .filter((c) =>
                    ["wau_client", "wau_provider", "provider_supply", "crisis", "verification_depth"].includes(
                      c.key,
                    ),
                  )
                  .map((c) => (
                    <MetricCard key={c.key} card={c} />
                  ))}
                {/* Bond engagement — the ONLY mint widget on this page */}
                <MetricCard card={metrics.bond} mint />
              </div>
            </div>

            <FinderFunnel finder={metrics.finder} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

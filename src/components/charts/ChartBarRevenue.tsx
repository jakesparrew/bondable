"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslation } from "react-i18next";

interface ChartBarRevenueProps {
  period?: string;
}

const getChartData = (period: string) => {
  const data = {
    week: [
      { period: "Mon", revenue: 640 },
      { period: "Tue", revenue: 920 },
      { period: "Wed", revenue: 760 },
      { period: "Thu", revenue: 1080 },
      { period: "Fri", revenue: 840 },
      { period: "Sat", revenue: 480 },
      { period: "Sun", revenue: 240 },
    ],
    month: [
      { period: "Week 1", revenue: 4680 },
      { period: "Week 2", revenue: 4360 },
      { period: "Week 3", revenue: 5040 },
      { period: "Week 4", revenue: 4560 },
    ],
    quarter: [
      { period: "Jan", revenue: 18640 },
      { period: "Feb", revenue: 20520 },
      { period: "Mar", revenue: 23880 },
    ],
    year: [
      { period: "Q1", revenue: 63040 },
      { period: "Q2", revenue: 74280 },
      { period: "Q3", revenue: 85640 },
      { period: "Q4", revenue: 62880 },
    ],
  };
  return data[period as keyof typeof data] || data.month;
};

export function ChartBarRevenue({ period = "month" }: ChartBarRevenueProps) {
  const { t } = useTranslation();
  
  const chartConfig = {
    revenue: {
      label: t("revenue"),
      color: "#22c55e",
    },
  } satisfies ChartConfig;

  const chartData = getChartData(period);

  const getPeriodLabels = (period: string) => {
    const labels = {
      week: {
        title: t("revenue_trends"),
        description: t("daily_revenue_breakdown"),
        footer: t("monday_sunday"),
        change: "18.2%",
      },
      month: {
        title: t("revenue_trends"),
        description: t("weekly_revenue_breakdown"),
        footer: t("week_1_week_4"),
        change: "23.5%",
      },
      quarter: {
        title: t("revenue_trends"),
        description: t("monthly_revenue_breakdown"),
        footer: t("january_march"),
        change: "28.1%",
      },
      year: {
        title: t("revenue_trends"),
        description: t("quarterly_revenue_breakdown"),
        footer: t("q1_q4"),
        change: "25.3%",
      },
    };
    return labels[period as keyof typeof labels] || labels.month;
  };

  const labels = getPeriodLabels(period);

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-foreground">{labels.title}</CardTitle>
        <CardDescription className="text-muted-foreground">{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full max-h-[200px]">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="period"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  className="bg-card border-border text-foreground"
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, ` ${t("revenue")}`]}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
                formatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium text-foreground">
          {t("trending_up_by", { change: labels.change })} <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <div className="text-muted-foreground leading-none">
          {labels.footer}
        </div>
      </CardFooter>
    </Card>
  );
}
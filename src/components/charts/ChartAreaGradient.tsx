
"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useTranslation } from "react-i18next";

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

interface ChartAreaGradientProps {
  period?: string;
}

const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "#3b82f6",
  },
  clients: {
    label: "Clients",
    color: "#8b5cf6",
  },
} satisfies ChartConfig;

const getChartData = (period: string) => {
  const data = {
    week: [
      { day: "Monday", sessions: 8, clients: 6 },
      { day: "Tuesday", sessions: 12, clients: 8 },
      { day: "Wednesday", sessions: 10, clients: 7 },
      { day: "Thursday", sessions: 14, clients: 9 },
      { day: "Friday", sessions: 11, clients: 8 },
      { day: "Saturday", sessions: 6, clients: 4 },
      { day: "Sunday", sessions: 3, clients: 2 },
    ],
    month: [
      { day: "Week 1", sessions: 62, clients: 28 },
      { day: "Week 2", sessions: 58, clients: 26 },
      { day: "Week 3", sessions: 67, clients: 30 },
      { day: "Week 4", sessions: 60, clients: 27 },
    ],
    quarter: [
      { day: "January", sessions: 186, clients: 98 },
      { day: "February", sessions: 205, clients: 112 },
      { day: "March", sessions: 238, clients: 128 },
    ],
    year: [
      { day: "Q1", sessions: 629, clients: 338 },
      { day: "Q2", sessions: 742, clients: 398 },
      { day: "Q3", sessions: 856, clients: 445 },
      { day: "Q4", sessions: 629, clients: 298 },
    ],
  };
  return data[period as keyof typeof data] || data.month;
};

export function ChartAreaGradient({ period = "month" }: ChartAreaGradientProps) {
  const { t } = useTranslation();
  const chartData = getChartData(period);

  const getPeriodLabels = (period: string) => {
    const labels = {
      week: {
        title: t("practice_activity"),
        description: t("daily_sessions_and_clients"),
        footer: t("monday_sunday"),
        change: "12.5%",
      },
      month: {
        title: t("practice_activity"),
        description: t("weekly_sessions_and_clients"),
        footer: t("week_1_week_4"),
        change: "15.2%",
      },
      quarter: {
        title: t("practice_activity"),
        description: t("monthly_sessions_and_clients"),
        footer: t("january_march"),
        change: "18.3%",
      },
      year: {
        title: t("practice_activity"),
        description: t("quarterly_sessions_and_clients"),
        footer: t("q1_q4"),
        change: "14.7%",
      },
    };
    return labels[period as keyof typeof labels] || labels.month;
  };

  const labels = getPeriodLabels(period);

  return (
    <Card className="bg-[#111111] border-[#1f1f23]">
      <CardHeader>
        <CardTitle className="text-white">{labels.title}</CardTitle>
        <CardDescription className="text-gray-400">
          {labels.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-[300px] w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip 
              cursor={false} 
              content={
                <ChartTooltipContent
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                  labelClassName="text-gray-300"
                />
              } 
            />
            <defs>
              <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-sessions)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-sessions)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillClients" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-clients)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-clients)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="clients"
              type="natural"
              fill="url(#fillClients)"
              fillOpacity={0.4}
              stroke="var(--color-clients)"
              stackId="a"
            />
            <Area
              dataKey="sessions"
              type="natural"
              fill="url(#fillSessions)"
              fillOpacity={0.4}
              stroke="var(--color-sessions)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium text-white">
              {t("trending_up_by")} {labels.change} {t("this_period")} <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-gray-400 flex items-center gap-2 leading-none">
              {t("showing_data_for")} {labels.footer}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

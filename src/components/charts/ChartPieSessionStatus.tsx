"use client";

import * as React from "react";
import { useOptimizedState, useOptimizedMemo } from '@/hooks/performance/useOptimizedComponents';
import { Label, Pie, PieChart, Sector } from "recharts";
import { PieSectorDataItem } from "recharts/types/polar/Pie";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface ChartPieSessionStatusProps {
  period?: string;
}

const getSessionData = (period: string) => {
  const data = {
    week: [
      { status: "completed", sessions: 52, fill: "var(--color-completed)" },
      { status: "cancelled", sessions: 4, fill: "var(--color-cancelled)" },
      { status: "noshow", sessions: 2, fill: "var(--color-noshow)" },
      { status: "rescheduled", sessions: 6, fill: "var(--color-rescheduled)" },
    ],
    month: [
      { status: "completed", sessions: 215, fill: "var(--color-completed)" },
      { status: "cancelled", sessions: 18, fill: "var(--color-cancelled)" },
      { status: "noshow", sessions: 8, fill: "var(--color-noshow)" },
      { status: "rescheduled", sessions: 25, fill: "var(--color-rescheduled)" },
    ],
    quarter: [
      { status: "completed", sessions: 647, fill: "var(--color-completed)" },
      { status: "cancelled", sessions: 54, fill: "var(--color-cancelled)" },
      { status: "noshow", sessions: 24, fill: "var(--color-noshow)" },
      { status: "rescheduled", sessions: 75, fill: "var(--color-rescheduled)" },
    ],
    year: [
      { status: "completed", sessions: 2488, fill: "var(--color-completed)" },
      { status: "cancelled", sessions: 208, fill: "var(--color-cancelled)" },
      { status: "noshow", sessions: 92, fill: "var(--color-noshow)" },
      { status: "rescheduled", sessions: 288, fill: "var(--color-rescheduled)" },
    ],
  };
  return data[period as keyof typeof data] || data.month;
};

export function ChartPieSessionStatus({ period = "month" }: ChartPieSessionStatusProps) {
  const { t } = useTranslation();
  
  const chartConfig = {
    sessions: {
      label: t("sessions"),
    },
    completed: {
      label: t("completed"),
      color: "#22c55e",
    },
    cancelled: {
      label: t("cancelled"),
      color: "#f59e0b",
    },
    noshow: {
      label: t("no_show"),
      color: "#ef4444",
    },
    rescheduled: {
      label: t("rescheduled"),
      color: "#8b5cf6",
    },
  } satisfies ChartConfig;

  const sessionData = getSessionData(period);
  const id = "pie-session-status";
  const [activeStatus, setActiveStatus] = useOptimizedState(sessionData[0].status);

  const activeIndex = useOptimizedMemo(
    () => sessionData.findIndex((item) => item.status === activeStatus),
    [activeStatus, sessionData]
  );

  const statuses = useOptimizedMemo(() => sessionData.map((item) => item.status), [sessionData]);
  const totalSessions = sessionData.reduce((sum, item) => sum + item.sessions, 0);

  return (
    <Card data-chart={id} className="flex flex-col bg-[#111111] border-[#1f1f23] h-full">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle className="text-white">{t("session_status")}</CardTitle>
          <CardDescription className="text-gray-400">{t("session_completion_breakdown")}</CardDescription>
        </div>
        <Select value={activeStatus} onValueChange={setActiveStatus}>
          <SelectTrigger
            className="ml-auto h-7 w-[130px] rounded-lg pl-2.5 bg-[#1a1a1a] border-[#1f1f23] text-white"
            aria-label={t("select_a_status")}
          >
            <SelectValue placeholder={t("select_status")} />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl bg-[#1a1a1a] border-[#1f1f23]">
            {statuses.map((key) => {
              const config = chartConfig[key as keyof typeof chartConfig];

              if (!config) {
                return null;
              }

              return (
                <SelectItem
                  key={key}
                  value={key}
                  className="rounded-lg [&_span]:flex text-white hover:bg-[#2a2a2a]"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="flex h-3 w-3 shrink-0 rounded-xs"
                      style={{
                        backgroundColor: `var(--color-${key})`,
                      }}
                    />
                    {config?.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0 items-center">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-h-[200px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent 
                  hideLabel 
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                  formatter={(value, name) => [
                    `${value} sessions (${(((value as number) / totalSessions) * 100).toFixed(1)}%)`,
                    name,
                  ]}
                />
              }
            />
            <Pie
              data={sessionData}
              dataKey="sessions"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-white text-3xl font-bold"
                        >
                          {sessionData[activeIndex].sessions.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-gray-400"
                        >
                          {t("sessions")}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
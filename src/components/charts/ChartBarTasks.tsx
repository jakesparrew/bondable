
"use client";

import { Bar, BarChart, XAxis, CartesianGrid } from "recharts";

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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslation } from "react-i18next";

interface ChartBarTasksProps {
  period?: string;
}

export function ChartBarTasks({ period = "month" }: ChartBarTasksProps) {
  const { t } = useTranslation();
  
  const chartConfig = {
    completed: {
      label: t("completed"),
      color: "#22c55e",
    },
    inProgress: {
      label: t("in_progress"),
      color: "#f59e0b",
    },
    denied: {
      label: t("denied"),
      color: "#ef4444",
    },
  } satisfies ChartConfig;

  const getTasksData = (period: string) => {
    const data = {
      week: [
        { date: "Mon", completed: 12, inProgress: 8, denied: 2 },
        { date: "Tue", completed: 15, inProgress: 6, denied: 1 },
        { date: "Wed", completed: 18, inProgress: 4, denied: 3 },
        { date: "Thu", completed: 14, inProgress: 9, denied: 1 },
        { date: "Fri", completed: 16, inProgress: 7, denied: 2 },
        { date: "Sat", completed: 8, inProgress: 3, denied: 1 },
        { date: "Sun", completed: 6, inProgress: 2, denied: 0 },
      ],
      month: [
        { date: "Week 1", completed: 89, inProgress: 39, denied: 10 },
        { date: "Week 2", completed: 92, inProgress: 35, denied: 8 },
        { date: "Week 3", completed: 96, inProgress: 42, denied: 12 },
        { date: "Week 4", completed: 88, inProgress: 38, denied: 9 },
      ],
      quarter: [
        { date: "Jan", completed: 365, inProgress: 154, denied: 39 },
        { date: "Feb", completed: 378, inProgress: 148, denied: 32 },
        { date: "Mar", completed: 392, inProgress: 162, denied: 45 },
      ],
      year: [
        { date: "Q1", completed: 1135, inProgress: 464, denied: 116 },
        { date: "Q2", completed: 1248, inProgress: 512, denied: 128 },
        { date: "Q3", completed: 1356, inProgress: 548, denied: 132 },
        { date: "Q4", completed: 1198, inProgress: 486, denied: 118 },
      ],
    };
    return data[period as keyof typeof data] || data.month;
  };
  const chartData = getTasksData(period);

  const getPeriodLabels = (period: string) => {
    const labels = {
      week: {
        title: t("task_status_overview"),
        description: t("daily_task_completion"),
      },
      month: {
        title: t("task_status_overview"),
        description: t("weekly_task_completion"),
      },
      quarter: {
        title: t("task_status_overview"),
        description: t("monthly_task_completion"),
      },
      year: {
        title: t("task_status_overview"),
        description: t("quarterly_task_completion"),
      },
    };
    return labels[period as keyof typeof labels] || labels.month;
  };

  const labels = getPeriodLabels(period);

  return (
    <Card className="bg-[#111111] border-[#1f1f23] h-full">
      <CardHeader>
        <CardTitle className="text-white">{labels.title}</CardTitle>
        <CardDescription className="text-gray-400">
          {labels.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <Bar
              dataKey="completed"
              stackId="a"
              fill="var(--color-completed)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="inProgress"
              stackId="a"
              fill="var(--color-inProgress)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="denied"
              stackId="a"
              fill="var(--color-denied)"
              radius={[4, 4, 0, 0]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  className="w-[180px] bg-[#1a1a1a] border-[#2a2a2a] text-white"
                  formatter={(value, name, item, index) => (
                    <>
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={
                          {
                            backgroundColor: `var(--color-${name})`,
                          } as React.CSSProperties
                        }
                      />
                      {chartConfig[name as keyof typeof chartConfig]?.label || name}
                      <div className="text-white ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
                        {value}
                        <span className="text-gray-400 font-normal">{t("tasks")}</span>
                      </div>
                      {/* Add total after the last item */}
                      {index === 2 && (
                        <div className="text-white mt-1.5 flex basis-full items-center border-t border-[#2a2a2a] pt-1.5 text-xs font-medium">
                          {t("total")}
                          <div className="text-white ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
                            {item.payload.completed + item.payload.inProgress + item.payload.denied}
                            <span className="text-gray-400 font-normal">{t("tasks")}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                />
              }
              cursor={false}
              defaultIndex={1}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

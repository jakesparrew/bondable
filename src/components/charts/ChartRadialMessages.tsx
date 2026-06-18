
"use client";

import { TrendingUp } from "lucide-react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
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

interface ChartRadialMessagesProps {
  period?: string;
}

const chartConfig = {
  appMessage: {
    label: "App Messages",
    color: "#3b82f6",
  },
  sms: {
    label: "SMS",
    color: "#22c55e",
  },
  whatsapp: {
    label: "WhatsApp",
    color: "#10b981",
  },
} satisfies ChartConfig;

const getMessagesData = (period: string) => {
  const data = {
    week: [{ period: "week", appMessage: 120, sms: 45, whatsapp: 78 }],
    month: [{ period: "month", appMessage: 485, sms: 180, whatsapp: 312 }],
    quarter: [{ period: "quarter", appMessage: 1456, sms: 540, whatsapp: 936 }],
    year: [{ period: "year", appMessage: 5824, sms: 2160, whatsapp: 3744 }],
  };
  return data[period as keyof typeof data] || data.month;
};

export function ChartRadialMessages({ period = "month" }: ChartRadialMessagesProps) {
  const { t } = useTranslation();
  const chartData = getMessagesData(period);
  const totalMessages = chartData[0].appMessage + chartData[0].sms + chartData[0].whatsapp;

  const getPeriodLabels = (period: string) => {
    const labels = {
      week: {
        title: t("messages_overview"),
        description: t("weekly_message_breakdown"),
        footer: t("messages_sent_this_week"),
        change: "12.3%",
      },
      month: {
        title: t("messages_overview"),
        description: t("monthly_message_breakdown"),
        footer: t("messages_sent_this_month"),
        change: "18.7%",
      },
      quarter: {
        title: t("messages_overview"),
        description: t("quarterly_message_breakdown"),
        footer: t("messages_sent_this_quarter"),
        change: "25.1%",
      },
      year: {
        title: t("messages_overview"),
        description: t("yearly_message_breakdown"),
        footer: t("messages_sent_this_year"),
        change: "31.2%",
      },
    };
    return labels[period as keyof typeof labels] || labels.month;
  };

  const labels = getPeriodLabels(period);

  return (
    <Card className="flex flex-col bg-[#111111] border-[#1f1f23] h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-white">{labels.title}</CardTitle>
        <CardDescription className="text-gray-400">{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center ">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-h-[200px] relative top-10"
        >
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={80}
            outerRadius={130}
          >
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent 
                  hideLabel 
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                  formatter={(value, name) => [
                    `${value} messages`,
                    chartConfig[name as keyof typeof chartConfig]?.label || name,
                  ]}
                />
              }
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 16}
                          className="fill-white text-2xl font-bold"
                        >
                          {totalMessages.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 4}
                          className="fill-gray-400"
                        >
                          {t("messages")}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
            <RadialBar
              dataKey="appMessage"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-appMessage)"
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="sms"
              fill="var(--color-sms)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="whatsapp"
              fill="var(--color-whatsapp)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm -mt-5">
        <div className="flex items-center gap-2 leading-none font-medium text-white">
          {t("trending_up_by")} {labels.change} {t("this_period")} <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <div className="text-gray-400 leading-none">
          {labels.footer}
        </div>
      </CardFooter>
    </Card>
  );
}

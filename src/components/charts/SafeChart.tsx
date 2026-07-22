import type { ReactNode } from "react";
import { ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useTranslation } from "react-i18next";

export const CHART_MIN_HEIGHT = 320;

export const chartTooltipStyle = {
  background: "oklch(0.255 0.035 260)",
  border: "1px solid oklch(1 0 0 / 0.1)",
  borderRadius: 8,
  color: "#f8fafc",
  fontSize: 12,
};

export const chartAxisColor = "oklch(0.72 0.02 255)";
export const chartGridColor = "oklch(1 0 0 / 0.08)";

export function SafeTooltip(props: React.ComponentProps<typeof Tooltip>) {
  return (
    <Tooltip
      contentStyle={chartTooltipStyle}
      itemStyle={{ color: "#f8fafc" }}
      labelStyle={{ color: "#f8fafc", fontWeight: 500 }}
      cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
      {...props}
    />
  );
}

export function SafeLegend(props: React.ComponentProps<typeof Legend>) {
  return (
    <Legend
      wrapperStyle={{ fontSize: 12, color: "#f8fafc", paddingTop: 8 }}
      iconType="circle"
      {...props}
    />
  );
}

type Props = {
  hasData: boolean;
  children: ReactNode;
  minHeight?: number;
  emptyLabel?: string;
  className?: string;
};

export function ChartFrame({ hasData, children, minHeight = CHART_MIN_HEIGHT, emptyLabel, className }: Props) {
  const { t } = useTranslation();
  const label = emptyLabel ?? t("charts.noData");
  return (
    <div className={className} style={{ minHeight, width: "100%" }}>
      {hasData ? (
        <ResponsiveContainer width="100%" height={minHeight}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      ) : (
        <div
          className="flex items-center justify-center text-sm text-muted-foreground rounded-md border border-dashed border-border"
          style={{ height: minHeight }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

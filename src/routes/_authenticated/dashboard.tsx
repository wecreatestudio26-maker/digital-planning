import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { ChartFrame, SafeTooltip, SafeLegend, chartAxisColor, chartGridColor } from "@/components/charts/SafeChart";
import { ChartFilters, defaultFilterState, type ChartFilterConfig, type ChartFilterState } from "@/components/charts/ChartFilters";
import { addDays, format, isWithinInterval, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivities } from "@/lib/activities-store";
import { STATUS_LABEL, type Status } from "@/lib/types";
import { CheckCircle2, Clock, ListChecks, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Planeador de Actividades" },
      { name: "description", content: "Resumen de tus actividades, métricas y próximos vencimientos." },
    ],
  }),
  component: Dashboard,
});

const STATUS_COLORS: Record<Status, string> = {
  pendiente: "#64748b",
  en_progreso: "#eab308",
  completado: "#22c55e",
};

function Dashboard() {
  const { t } = useTranslation();
  const activities = useActivities((s) => s.activities);

  const allCategories = useMemo(
    () => Array.from(new Set(activities.map((a) => a.category))).sort(),
    [activities],
  );
  const statusOptions = (["pendiente", "en_progreso", "completado"] as Status[]).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
  }));

  const filterConfig: ChartFilterConfig = useMemo(
    () => ({ categories: allCategories, statuses: statusOptions, dateRange: true }),
    [allCategories],
  );
  const [filters, setFilters] = useState<ChartFilterState>(() => defaultFilterState(filterConfig));

  // Reset filter selections if the pool changes.
  useMemo(() => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => allCategories.includes(c)),
    }));
  }, [allCategories]);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filterConfig.categories && !filters.categories.includes(a.category)) return false;
      if (filterConfig.statuses && !filters.statuses.includes(a.status)) return false;
      if (filters.dateFrom && a.endDate < filters.dateFrom) return false;
      if (filters.dateTo && a.startDate > filters.dateTo) return false;
      return true;
    });
  }, [activities, filters, filterConfig]);

  const total = filtered.length;
  const completados = filtered.filter((a) => a.status === "completado").length;
  const enProgreso = filtered.filter((a) => a.status === "en_progreso").length;
  const pendientes = filtered.filter((a) => a.status === "pendiente").length;

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((a) => m.set(a.category, (m.get(a.category) ?? 0) + 1));
    return Array.from(m, ([category, total]) => ({ category, total }));
  }, [filtered]);

  const byStatus = useMemo(
    () =>
      (["pendiente", "en_progreso", "completado"] as Status[])
        .map((s) => ({
          name: STATUS_LABEL[s],
          value: filtered.filter((a) => a.status === s).length,
          key: s,
        }))
        .filter((d) => d.value > 0),
    [filtered],
  );

  const today = new Date();
  const weekEnd = addDays(today, 7);
  const upcoming = filtered
    .filter((a) => {
      try {
        return isWithinInterval(parseISO(a.endDate), { start: today, end: weekEnd })
          && a.status !== "completado";
      } catch { return false; }
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  const metrics = [
    { label: t("dashboard.totalActivities"), value: total, icon: ListChecks, color: "text-foreground" },
    { label: t("dashboard.completedActivities"), value: completados, icon: CheckCircle2, color: "text-primary" },
    { label: t("dashboard.inProgressActivities"), value: enProgreso, icon: Loader2, color: "text-[oklch(0.86_0.17_85)]" },
    { label: t("dashboard.pendingActivities"), value: pendientes, icon: Clock, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <ChartFilters config={filterConfig} value={filters} onChange={setFilters} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{m.label}</span>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <div className="mt-2 text-3xl font-semibold">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("dashboard.byCategory")}</CardTitle></CardHeader>
          <CardContent>
            <ChartFrame hasData={byCategory.some((d) => d.total > 0)}>
              <BarChart data={byCategory.filter((d) => d.total > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="category" stroke={chartAxisColor} fontSize={12} />
                <YAxis allowDecimals={false} stroke={chartAxisColor} fontSize={12} />
                <SafeTooltip />
                <Bar dataKey="total" name={t("dashboard.totalActivities")} fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartFrame>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("dashboard.byStatus")}</CardTitle></CardHeader>
          <CardContent>
            <ChartFrame hasData={byStatus.length > 0}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                  {byStatus.map((s) => (
                    <Cell key={s.key} fill={STATUS_COLORS[s.key]} stroke="transparent" />
                  ))}
                </Pie>
                <SafeLegend />
                <SafeTooltip />
              </PieChart>
            </ChartFrame>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("dashboard.upcoming")}</CardTitle></CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.noUpcoming")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.assignee} · {t("dashboard.due")} {format(parseISO(a.endDate), "dd MMM")}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

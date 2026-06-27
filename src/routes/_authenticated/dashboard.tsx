import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { addDays, format, isWithinInterval, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivities } from "@/lib/activities-store";
import { STATUS_LABEL, type Status } from "@/lib/types";
import { CheckCircle2, Clock, ListChecks, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

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
  const activities = useActivities((s) => s.activities);

  const total = activities.length;
  const completados = activities.filter((a) => a.status === "completado").length;
  const enProgreso = activities.filter((a) => a.status === "en_progreso").length;
  const pendientes = activities.filter((a) => a.status === "pendiente").length;

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    activities.forEach((a) => m.set(a.category, (m.get(a.category) ?? 0) + 1));
    return Array.from(m, ([category, total]) => ({ category, total }));
  }, [activities]);

  const byStatus = useMemo(
    () =>
      (["pendiente", "en_progreso", "completado"] as Status[]).map((s) => ({
        name: STATUS_LABEL[s],
        value: activities.filter((a) => a.status === s).length,
        key: s,
      })),
    [activities],
  );

  const today = new Date();
  const weekEnd = addDays(today, 7);
  const upcoming = activities
    .filter((a) => {
      try {
        return isWithinInterval(parseISO(a.endDate), { start: today, end: weekEnd })
          && a.status !== "completado";
      } catch { return false; }
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  const metrics = [
    { label: "Total Actividades", value: total, icon: ListChecks, color: "text-foreground" },
    { label: "Completadas", value: completados, icon: CheckCircle2, color: "text-primary" },
    { label: "En progreso", value: enProgreso, icon: Loader2, color: "text-[oklch(0.86_0.17_85)]" },
    { label: "Pendientes", value: pendientes, icon: Clock, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Resumen de tu planeación</p>
      </div>

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
          <CardHeader><CardTitle className="text-base">Actividades por categoría</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                <XAxis dataKey="category" stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.255 0.035 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }}
                />
                <Bar dataKey="total" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribución por estado</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {byStatus.map((s) => (
                    <Cell key={s.key} fill={STATUS_COLORS[s.key]} stroke="transparent" />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{ background: "oklch(0.255 0.035 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Próximas a vencer (7 días)</CardTitle></CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay actividades por vencer esta semana.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.assignee} · vence {format(parseISO(a.endDate), "dd MMM")}
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

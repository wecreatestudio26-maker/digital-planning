import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { useActivities } from "@/lib/activities-store";

export const Route = createFileRoute("/velocidad")({
  head: () => ({ meta: [{ title: "Velocidad del Equipo — Planeador" }, { name: "description", content: "Tareas completadas por semana." }] }),
  component: VelPage,
});

function VelPage() {
  const { activities } = useActivities();
  const [project, setProject] = useState("__all");
  const [member, setMember] = useState("__all");
  const projects = Array.from(new Set(activities.map((a) => a.category)));
  const members = Array.from(new Set(activities.map((a) => a.assignee)));

  const data = useMemo(() => {
    const weeks = Array.from({ length: 8 }, (_, i) => startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 }));
    return weeks.map((w) => {
      const next = addWeeks(w, 1);
      const count = activities.filter((a) => {
        if (a.status !== "completado") return false;
        if (project !== "__all" && a.category !== project) return false;
        if (member !== "__all" && a.assignee !== member) return false;
        const d = new Date(a.endDate);
        return d >= w && d < next;
      }).length;
      return { week: format(w, "dd MMM"), completadas: count };
    });
  }, [activities, project, member]);

  const trend = data.length >= 2 ? data[data.length - 1].completadas - data[0].completadas : 0;
  const avg = data.reduce((s, d) => s + d.completadas, 0) / Math.max(1, data.length);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Velocidad del equipo</h2>
        <p className="text-sm text-muted-foreground">Tareas completadas en las últimas 8 semanas.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="w-48">
          <Label>Proyecto</Label>
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              {projects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Label>Miembro</Label>
          <Select value={member} onValueChange={setMember}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              {members.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Promedio</div><div className="text-3xl font-semibold mt-1">{avg.toFixed(1)}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Tendencia</div><div className={`text-3xl font-semibold mt-1 ${trend >= 0 ? "text-primary" : "text-red-400"}`}>{trend >= 0 ? "+" : ""}{trend}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Total 8 sem.</div><div className="text-3xl font-semibold mt-1">{data.reduce((s, d) => s + d.completadas, 0)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Tareas por semana</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
              <XAxis dataKey="week" stroke="oklch(0.72 0.02 255)" fontSize={12} />
              <YAxis stroke="oklch(0.72 0.02 255)" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(0.255 0.035 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="completadas" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

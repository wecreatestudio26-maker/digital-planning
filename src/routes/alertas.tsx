import { createFileRoute } from "@tanstack/react-router";
import { differenceInDays, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, UserX } from "lucide-react";
import { useActivities } from "@/lib/activities-store";
import { useProductivity } from "@/lib/productivity-store";

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Alertas — Planeador" }, { name: "description", content: "Alertas de inactividad." }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const { activities } = useActivities();
  const { members, timeEntries } = useProductivity();
  const today = new Date();

  const criticalStale = activities.filter((a) => a.priority === "alta" && a.status !== "completado" && differenceInDays(today, new Date(a.startDate)) >= 3);
  const byProject: Record<string, Date> = {};
  activities.forEach((a) => {
    const d = new Date(a.endDate);
    if (!byProject[a.category] || d > byProject[a.category]) byProject[a.category] = d;
  });
  const staleProjects = Object.entries(byProject).filter(([, d]) => differenceInDays(today, d) >= 7);

  const inactiveMembers = members.filter((m) => {
    const last = [...timeEntries].filter((t) => t.taskName.toLowerCase().includes(m.name.toLowerCase().split(" ")[0])).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!last) return true;
    return differenceInDays(today, new Date(last.date)) >= 5;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Alertas de inactividad</h2>
        <p className="text-sm text-muted-foreground">Tareas, proyectos y miembros sin actividad reciente.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-400" /> Tareas críticas sin actualización (3+ días)</CardTitle></CardHeader>
        <CardContent>
          {criticalStale.length === 0 ? <p className="text-sm text-muted-foreground">Sin alertas.</p> : (
            <ul className="space-y-2">
              {criticalStale.map((a) => (
                <li key={a.id} className="flex justify-between text-sm border-b border-border/50 pb-2">
                  <span><span className="font-medium">{a.name}</span> · {a.assignee}</span>
                  <span className="text-orange-400">{differenceInDays(today, new Date(a.startDate))} días</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-red-400" /> Proyectos sin actividad (7+ días)</CardTitle></CardHeader>
        <CardContent>
          {staleProjects.length === 0 ? <p className="text-sm text-muted-foreground">Todos los proyectos están activos.</p> : (
            <ul className="space-y-2">
              {staleProjects.map(([k, d]) => (
                <li key={k} className="flex justify-between text-sm border-b border-border/50 pb-2">
                  <span className="font-medium">{k}</span>
                  <span className="text-red-400">Última: {format(d, "yyyy-MM-dd")} ({differenceInDays(today, d)} días)</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserX className="h-4 w-4 text-yellow-400" /> Miembros sin registrar tiempo (5+ días)</CardTitle></CardHeader>
        <CardContent>
          {inactiveMembers.length === 0 ? <p className="text-sm text-muted-foreground">Todo el equipo está registrando tiempo.</p> : (
            <ul className="space-y-2">
              {inactiveMembers.map((m) => (
                <li key={m.id} className="flex justify-between text-sm border-b border-border/50 pb-2">
                  <span><span className="font-medium">{m.name}</span> · {m.email}</span>
                  <span className="text-yellow-400">Sin registros recientes</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, Plus, Trash2 } from "lucide-react";
import { useProductivity } from "@/lib/productivity-store";

export const Route = createFileRoute("/tiempo")({
  head: () => ({ meta: [{ title: "Registro de Tiempo — Planeador" }, { name: "description", content: "Temporizador y registro de horas por tarea." }] }),
  component: TimePage,
});

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function TimePage() {
  const { activeTimer, startTimer, pauseTimer, resumeTimer, stopTimer, timeEntries, addTimeEntry, removeTimeEntry } = useProductivity();
  const [taskName, setTaskName] = useState("");
  const [project, setProject] = useState("");
  const [tick, setTick] = useState(0);
  const [manual, setManual] = useState({ task: "", project: "", minutes: 30, date: format(new Date(), "yyyy-MM-dd") });

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = activeTimer
    ? activeTimer.accumulated + (activeTimer.pausedAt ? 0 : Date.now() - activeTimer.startedAt)
    : 0;

  const today = format(new Date(), "yyyy-MM-dd");
  const todayTotal = timeEntries.filter((e) => e.date === today).reduce((s, e) => s + e.minutes, 0);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEntries = timeEntries.filter((e) => new Date(e.date) >= weekStart);
  const byProject: Record<string, number> = {};
  weekEntries.forEach((e) => { byProject[e.project] = (byProject[e.project] || 0) + e.minutes; });
  void tick;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Registro de tiempo</h2>
        <p className="text-sm text-muted-foreground">Temporizador y resúmenes por proyecto.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Temporizador</CardTitle></CardHeader>
        <CardContent>
          {activeTimer ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-3xl font-mono font-semibold tabular-nums">{fmt(elapsed)}</div>
                <div className="text-sm text-muted-foreground mt-1">{activeTimer.taskName} · {activeTimer.project}</div>
              </div>
              <div className="flex gap-2">
                {activeTimer.pausedAt
                  ? <Button onClick={resumeTimer}><Play className="h-4 w-4" /> Reanudar</Button>
                  : <Button variant="secondary" onClick={pauseTimer}><Pause className="h-4 w-4" /> Pausar</Button>}
                <Button variant="destructive" onClick={stopTimer}><Square className="h-4 w-4" /> Detener</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div><Label>Tarea</Label><Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="¿En qué trabajas?" /></div>
              <div><Label>Proyecto</Label><Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Proyecto" /></div>
              <Button onClick={() => { if (taskName && project) { startTimer(taskName, project); setTaskName(""); setProject(""); } }}>
                <Play className="h-4 w-4" /> Iniciar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Hoy</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{Math.floor(todayTotal / 60)}h {todayTotal % 60}m</div>
            <p className="text-sm text-muted-foreground mt-1">Tiempo total registrado hoy.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Semana por proyecto</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(byProject).length === 0 && <p className="text-sm text-muted-foreground">Sin registros esta semana.</p>}
            {Object.entries(byProject).map(([p, m]) => (
              <div key={p} className="flex justify-between text-sm">
                <span>{p}</span><span className="font-medium tabular-nums">{Math.floor(m / 60)}h {m % 60}m</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Entrada manual</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div><Label>Tarea</Label><Input value={manual.task} onChange={(e) => setManual({ ...manual, task: e.target.value })} /></div>
            <div><Label>Proyecto</Label><Input value={manual.project} onChange={(e) => setManual({ ...manual, project: e.target.value })} /></div>
            <div><Label>Minutos</Label><Input type="number" value={manual.minutes} onChange={(e) => setManual({ ...manual, minutes: Number(e.target.value) })} /></div>
            <div><Label>Fecha</Label><Input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} /></div>
            <Button onClick={() => { if (manual.task) { addTimeEntry({ taskName: manual.task, project: manual.project, minutes: manual.minutes, date: manual.date }); setManual({ ...manual, task: "" }); } }}>
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left py-2 font-normal">Fecha</th>
              <th className="text-left font-normal">Tarea</th>
              <th className="text-left font-normal">Proyecto</th>
              <th className="text-right font-normal">Duración</th>
              <th></th>
            </tr></thead>
            <tbody>
              {[...timeEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map((e) => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="py-2">{e.date}</td>
                  <td>{e.taskName}</td>
                  <td className="text-muted-foreground">{e.project}</td>
                  <td className="text-right tabular-nums">{Math.floor(e.minutes / 60)}h {e.minutes % 60}m</td>
                  <td><Button variant="ghost" size="icon" onClick={() => removeTimeEntry(e.id)}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

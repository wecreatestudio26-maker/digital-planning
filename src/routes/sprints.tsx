import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend } from "recharts";
import { Plus, ChevronRight, Trash2 } from "lucide-react";
import { useProductivity } from "@/lib/productivity-store";

export const Route = createFileRoute("/sprints")({
  head: () => ({ meta: [{ title: "Sprints — Planeador" }, { name: "description", content: "Planificación de sprints con burndown." }] }),
  component: SprintsPage,
});

function SprintsPage() {
  const { sprints, addSprint, removeSprint, addBacklog, moveToSprint, toggleSprintTask, closeSprint } = useProductivity();
  const active = sprints.find((s) => s.active && !s.closed) ?? sprints[0];
  const [newSprintOpen, setNewSprintOpen] = useState(false);
  const [sf, setSf] = useState({ name: "", startDate: format(new Date(), "yyyy-MM-dd"), endDate: format(addDays(new Date(), 14), "yyyy-MM-dd") });
  const [retro, setRetro] = useState({ good: "", bad: "", actions: "" });
  const [newTask, setNewTask] = useState({ name: "", estimate: 3 });

  const burndown = useMemo(() => {
    if (!active) return [];
    const start = parseISO(active.startDate);
    const days = differenceInDays(parseISO(active.endDate), start) + 1;
    const total = active.tasks.reduce((s, t) => s + t.estimate, 0);
    const idealStep = total / Math.max(1, days - 1);
    const completed = active.tasks.filter((t) => t.done).reduce((s, t) => s + t.estimate, 0);
    const today = differenceInDays(new Date(), start);
    return Array.from({ length: days }, (_, i) => ({
      day: format(addDays(start, i), "dd"),
      ideal: Math.max(0, total - idealStep * i),
      real: i <= today ? Math.max(0, total - (completed * (i / Math.max(1, today)))) : null,
    }));
  }, [active]);

  if (!active) return <div className="text-sm text-muted-foreground">Sin sprints activos.</div>;

  const totalPoints = active.tasks.reduce((s, t) => s + t.estimate, 0);
  const donePoints = active.tasks.filter((t) => t.done).reduce((s, t) => s + t.estimate, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{active.name}</h2>
          <p className="text-sm text-muted-foreground">{active.startDate} → {active.endDate} · {donePoints}/{totalPoints} pts</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={newSprintOpen} onOpenChange={setNewSprintOpen}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4" /> Nuevo sprint</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo sprint</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nombre</Label><Input value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Inicio</Label><Input type="date" value={sf.startDate} onChange={(e) => setSf({ ...sf, startDate: e.target.value })} /></div>
                  <div><Label>Fin</Label><Input type="date" value={sf.endDate} onChange={(e) => setSf({ ...sf, endDate: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { if (sf.name) { addSprint({ ...sf, active: true }); setNewSprintOpen(false); } }}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Burndown</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={burndown}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
              <XAxis dataKey="day" stroke="oklch(0.72 0.02 255)" fontSize={12} />
              <YAxis stroke="oklch(0.72 0.02 255)" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(0.255 0.035 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="ideal" stroke="oklch(0.72 0.02 255)" strokeDasharray="4 4" dot={false} name="Ideal" />
              <Line type="monotone" dataKey="real" stroke="#22c55e" strokeWidth={2} name="Real" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Sprint activo</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {active.tasks.map((t) => (
              <label key={t.id} className="flex items-center gap-3 text-sm py-1">
                <Checkbox checked={t.done} onCheckedChange={() => toggleSprintTask(active.id, t.id)} />
                <span className={`flex-1 ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.estimate} pts</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Backlog</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {active.backlog.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm py-1">
                <span className="flex-1">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.estimate} pts</span>
                <Button size="sm" variant="ghost" onClick={() => moveToSprint(active.id, t.id)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            <div className="flex gap-2 pt-2 border-t border-border">
              <Input value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} placeholder="Nueva historia" className="h-8" />
              <Input type="number" value={newTask.estimate} onChange={(e) => setNewTask({ ...newTask, estimate: Number(e.target.value) })} className="h-8 w-16" />
              <Button size="sm" onClick={() => { if (newTask.name) { addBacklog(active.id, newTask); setNewTask({ name: "", estimate: 3 }); } }}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Retrospectiva (al cerrar)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Qué salió bien</Label><Textarea value={retro.good} onChange={(e) => setRetro({ ...retro, good: e.target.value })} rows={2} /></div>
          <div><Label>Qué salió mal</Label><Textarea value={retro.bad} onChange={(e) => setRetro({ ...retro, bad: e.target.value })} rows={2} /></div>
          <div><Label>Acciones</Label><Textarea value={retro.actions} onChange={(e) => setRetro({ ...retro, actions: e.target.value })} rows={2} /></div>
          <Button variant="destructive" onClick={() => closeSprint(active.id, retro)}>Cerrar sprint</Button>
        </CardContent>
      </Card>

      {sprints.filter((s) => s.closed).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Sprints cerrados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {sprints.filter((s) => s.closed).map((s) => (
              <div key={s.id} className="border-b border-border pb-3 last:border-0 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{s.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeSprint(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                {s.retro && (
                  <div className="mt-1 text-muted-foreground text-xs space-y-0.5">
                    <div>+ {s.retro.good}</div>
                    <div>- {s.retro.bad}</div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

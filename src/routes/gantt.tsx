import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { differenceInDays, format, max, min, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GitBranch } from "lucide-react";
import { computeCriticalPath, useExtra, type GanttTask } from "@/lib/extra-store";

export const Route = createFileRoute("/gantt")({
  head: () => ({
    meta: [
      { title: "Gantt — Planeador" },
      { name: "description", content: "Diagrama de Gantt con dependencias, ruta crítica y avance." },
    ],
  }),
  component: GanttPage,
});

function GanttPage() {
  const { gantt, addGantt, updateGantt, removeGantt } = useExtra();
  const [open, setOpen] = useState(false);

  const critical = useMemo(() => computeCriticalPath(gantt), [gantt]);

  const dates = gantt.map((t) => parseISO(t.startDate)).concat(gantt.map((t) => parseISO(t.endDate)));
  const start = dates.length ? min(dates) : new Date();
  const end = dates.length ? max(dates) : new Date();
  const totalDays = Math.max(1, differenceInDays(end, start) + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Diagrama de Gantt</h2>
          <p className="text-sm text-muted-foreground">Tareas, dependencias y ruta crítica resaltada.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nueva tarea</Button>
          </DialogTrigger>
          <TaskDialog onClose={() => setOpen(false)} tasks={gantt} onSave={(t) => { addGantt(t); setOpen(false); }} />
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Cronograma</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-primary/40"/> Normal</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-destructive/70"/> Ruta crítica</span>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[260px_1fr] gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
              <div>Tarea</div>
              <div className="flex justify-between"><span>{format(start, "dd MMM")}</span><span>{format(end, "dd MMM")}</span></div>
            </div>
            <div className="mt-2 space-y-1.5">
              {gantt.map((t) => {
                const isSub = !!t.parentId;
                const offset = (differenceInDays(parseISO(t.startDate), start) / totalDays) * 100;
                const width = ((differenceInDays(parseISO(t.endDate), parseISO(t.startDate)) + 1) / totalDays) * 100;
                const isCritical = critical.has(t.id);
                const isParent = gantt.some((x) => x.parentId === t.id);
                return (
                  <div key={t.id} className="grid grid-cols-[260px_1fr] gap-2 items-center group">
                    <div className={`flex items-center gap-2 text-sm ${isSub ? "pl-6 text-muted-foreground" : "font-medium"}`}>
                      <span className="truncate flex-1">{t.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{t.progress}%</span>
                      <button
                        onClick={() => removeGantt(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="relative h-7 rounded-md bg-muted/40">
                      <div
                        className={`absolute top-0 h-full rounded-md ${
                          isParent ? "bg-accent" : isCritical ? "bg-destructive/30 border border-destructive" : "bg-primary/25 border border-primary/40"
                        }`}
                        style={{ left: `${offset}%`, width: `${width}%` }}
                        title={`${t.name} · ${t.startDate} → ${t.endDate}`}
                      >
                        <div
                          className={`h-full rounded-md ${isCritical ? "bg-destructive/70" : "bg-primary/70"}`}
                          style={{ width: `${t.progress}%` }}
                        />
                        {t.dependencies.length > 0 && (
                          <GitBranch className="absolute -left-4 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {gantt.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">Sin tareas. Agrega la primera.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalle de tareas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {gantt.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                <span className="font-medium flex-1">{t.name}</span>
                <span className="text-muted-foreground">{t.startDate} → {t.endDate}</span>
                <span>Avance</span>
                <Input
                  type="number" min={0} max={100} value={t.progress}
                  onChange={(e) => updateGantt(t.id, { progress: Math.max(0, Math.min(100, Number(e.target.value))) })}
                  className="h-8 w-20"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskDialog({ tasks, onSave, onClose }: { tasks: GanttTask[]; onSave: (t: Omit<GanttTask, "id">) => void; onClose: () => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState<Omit<GanttTask, "id">>({
    name: "", startDate: today, endDate: today, progress: 0, dependencies: [], parentId: null,
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Inicio</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div><Label>Fin</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tarea padre</Label>
            <Select value={form.parentId ?? "none"} onValueChange={(v) => setForm({ ...form, parentId: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguna</SelectItem>
                {tasks.filter((t) => !t.parentId).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Avance %</Label><Input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} /></div>
        </div>
        <div>
          <Label>Depende de (Ctrl+clic para varias)</Label>
          <select
            multiple
            value={form.dependencies}
            onChange={(e) => setForm({ ...form, dependencies: Array.from(e.target.selectedOptions).map((o) => o.value) })}
            className="w-full h-24 rounded-md border border-input bg-background p-2 text-sm"
          >
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => form.name && onSave(form)}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

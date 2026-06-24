import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { differenceInDays, format, max, min, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GitBranch, Pencil, FilePlus } from "lucide-react";
import { toast } from "sonner";
import { computeCriticalPath, hasCycle, useExtra, type GanttTask } from "@/lib/extra-store";

export const Route = createFileRoute("/_authenticated/gantt")({
  head: () => ({
    meta: [
      { title: "Gantt — Planeador" },
      { name: "description", content: "Diagramas de Gantt múltiples con dependencias, ruta crítica y avance." },
    ],
  }),
  component: GanttPage,
});

function GanttPage() {
  const {
    ganttCharts, activeChartId, setActiveChart, addChart, renameChart, removeChart,
    addGantt, updateGantt, removeGantt,
  } = useExtra();

  const [taskDialog, setTaskDialog] = useState<{ mode: "create" | "edit"; task?: GanttTask } | null>(null);
  const [chartDialog, setChartDialog] = useState<{ mode: "create" | "rename" } | null>(null);
  const [chartName, setChartName] = useState("");

  const chart = ganttCharts.find((c) => c.id === activeChartId) ?? ganttCharts[0];
  const tasks = chart?.tasks ?? [];

  const critical = useMemo(() => computeCriticalPath(tasks), [tasks]);

  const dates = tasks.map((t) => parseISO(t.startDate)).concat(tasks.map((t) => parseISO(t.endDate)));
  const start = dates.length ? min(dates) : new Date();
  const end = dates.length ? max(dates) : new Date();
  const totalDays = Math.max(1, differenceInDays(end, start) + 1);

  if (!chart) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Diagramas de Gantt</h2>
          <p className="text-sm text-muted-foreground">Crea tu primer diagrama para comenzar.</p>
        </div>
        <Button onClick={() => { setChartName(""); setChartDialog({ mode: "create" }); }}>
          <FilePlus className="h-4 w-4" /> Nuevo diagrama
        </Button>
        <ChartDialog
          open={!!chartDialog} mode={chartDialog?.mode ?? "create"}
          name={chartName} setName={setChartName}
          onClose={() => setChartDialog(null)}
          onSave={() => {
            if (chartName.trim()) { addChart(chartName.trim()); setChartDialog(null); }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Diagrama de Gantt</h2>
          <p className="text-sm text-muted-foreground">Tareas, dependencias y ruta crítica resaltada.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={chart.id} onValueChange={setActiveChart}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ganttCharts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { setChartName(""); setChartDialog({ mode: "create" }); }}>
            <FilePlus className="h-4 w-4" /> Nuevo
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setChartName(chart.name); setChartDialog({ mode: "rename" }); }}>
            <Pencil className="h-4 w-4" /> Renombrar
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            if (ganttCharts.length <= 1) { toast.error("Debe quedar al menos un diagrama"); return; }
            if (confirm(`¿Eliminar diagrama "${chart.name}"?`)) removeChart(chart.id);
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={() => setTaskDialog({ mode: "create" })}><Plus className="h-4 w-4" /> Nueva tarea</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Cronograma — {chart.name}</CardTitle>
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
              {tasks.map((t) => {
                const isSub = !!t.parentId;
                const offset = (differenceInDays(parseISO(t.startDate), start) / totalDays) * 100;
                const width = ((differenceInDays(parseISO(t.endDate), parseISO(t.startDate)) + 1) / totalDays) * 100;
                const isCritical = critical.has(t.id);
                const isParent = tasks.some((x) => x.parentId === t.id);
                return (
                  <div key={t.id} className="grid grid-cols-[260px_1fr] gap-2 items-center group">
                    <div className={`flex items-center gap-2 text-sm ${isSub ? "pl-6 text-muted-foreground" : "font-medium"}`}>
                      <span className="truncate flex-1">{t.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{t.progress}%</span>
                      <button onClick={() => setTaskDialog({ mode: "edit", task: t })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeGantt(chart.id, t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition" aria-label="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => setTaskDialog({ mode: "edit", task: t })}
                      className="relative h-7 rounded-md bg-muted/40 text-left cursor-pointer"
                      title="Clic para editar"
                    >
                      <div
                        className={`absolute top-0 h-full rounded-md ${
                          isParent ? "bg-accent" : isCritical ? "bg-destructive/30 border border-destructive" : "bg-primary/25 border border-primary/40"
                        }`}
                        style={{ left: `${offset}%`, width: `${width}%` }}
                      >
                        <div className={`h-full rounded-md ${isCritical ? "bg-destructive/70" : "bg-primary/70"}`} style={{ width: `${t.progress}%` }} />
                        {t.dependencies.length > 0 && (
                          <GitBranch className="absolute -left-4 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
              {tasks.length === 0 && (
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
            {tasks.map((t) => {
              const parent = tasks.find((x) => x.id === t.parentId);
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.startDate} → {t.endDate}
                      {parent && ` · padre: ${parent.name}`}
                      {t.dependencies.length > 0 && ` · depende de: ${t.dependencies.map((d) => tasks.find((x) => x.id === d)?.name).filter(Boolean).join(", ")}`}
                    </div>
                  </div>
                  <Label className="text-xs">Avance</Label>
                  <Input
                    type="number" min={0} max={100} value={t.progress}
                    onChange={(e) => updateGantt(chart.id, t.id, { progress: Math.max(0, Math.min(100, Number(e.target.value))) })}
                    className="h-8 w-20"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setTaskDialog({ mode: "edit", task: t })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeGantt(chart.id, t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {taskDialog && (
        <TaskDialog
          tasks={tasks}
          task={taskDialog.task}
          onClose={() => setTaskDialog(null)}
          onSave={(t) => {
            if (taskDialog.mode === "edit" && taskDialog.task) {
              if (hasCycle(tasks.map((x) => x.id === taskDialog.task!.id ? { ...x, dependencies: t.dependencies } : x), taskDialog.task.id, t.dependencies)) {
                toast.error("Dependencia circular detectada");
                return;
              }
              updateGantt(chart.id, taskDialog.task.id, t);
            } else {
              addGantt(chart.id, t);
            }
            setTaskDialog(null);
          }}
        />
      )}

      <ChartDialog
        open={!!chartDialog} mode={chartDialog?.mode ?? "create"}
        name={chartName} setName={setChartName}
        onClose={() => setChartDialog(null)}
        onSave={() => {
          if (!chartName.trim()) return;
          if (chartDialog?.mode === "create") addChart(chartName.trim());
          else renameChart(chart.id, chartName.trim());
          setChartDialog(null);
        }}
      />
    </div>
  );
}

function ChartDialog({ open, mode, name, setName, onClose, onSave }: {
  open: boolean; mode: "create" | "rename"; name: string;
  setName: (s: string) => void; onClose: () => void; onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "create" ? "Nuevo diagrama" : "Renombrar diagrama"}</DialogTitle></DialogHeader>
        <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave}>{mode === "create" ? "Crear" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({ tasks, task, onSave, onClose }: {
  tasks: GanttTask[]; task?: GanttTask;
  onSave: (t: Omit<GanttTask, "id">) => void; onClose: () => void;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState<Omit<GanttTask, "id">>(
    task
      ? { name: task.name, startDate: task.startDate, endDate: task.endDate, progress: task.progress, dependencies: task.dependencies, parentId: task.parentId ?? null }
      : { name: "", startDate: today, endDate: today, progress: 0, dependencies: [], parentId: null }
  );

  // Possible parents: top-level only, not self, not descendants
  const isDescendant = (candId: string, ofId: string): boolean => {
    const ch = tasks.find((t) => t.id === candId);
    if (!ch) return false;
    if (ch.parentId === ofId) return true;
    if (ch.parentId) return isDescendant(ch.parentId, ofId);
    return false;
  };
  const parentOptions = tasks.filter((t) => !t.parentId && t.id !== task?.id && !(task && isDescendant(t.id, task.id)));
  const depOptions = tasks.filter((t) => t.id !== task?.id);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{task ? "Editar tarea" : "Nueva tarea"}</DialogTitle></DialogHeader>
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
                  <SelectItem value="none">Ninguna (independiente)</SelectItem>
                  {parentOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Crea jerarquía padre-hija.</p>
            </div>
            <div><Label>Avance %</Label><Input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} /></div>
          </div>
          <div>
            <Label>Depende de</Label>
            <div className="rounded-md border border-input bg-background p-2 max-h-40 overflow-y-auto space-y-1">
              {depOptions.length === 0 && <p className="text-xs text-muted-foreground p-1">No hay otras tareas.</p>}
              {depOptions.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-1.5 py-1">
                  <input
                    type="checkbox"
                    checked={form.dependencies.includes(t.id)}
                    onChange={(e) => setForm({
                      ...form,
                      dependencies: e.target.checked
                        ? [...form.dependencies, t.id]
                        : form.dependencies.filter((x) => x !== t.id),
                    })}
                  />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tareas que deben terminar antes que esta.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => form.name && onSave(form)}>{task ? "Guardar cambios" : "Crear tarea"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

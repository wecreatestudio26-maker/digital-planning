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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
          <h2 className="text-2xl font-semibold tracking-tight">{t("gantt.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("gantt.subtitle_empty")}</p>
        </div>
        <Button onClick={() => { setChartName(""); setChartDialog({ mode: "create" }); }}>
          <FilePlus className="h-4 w-4" /> {t("gantt.new_diagram")}
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
          <h2 className="text-2xl font-semibold tracking-tight">{t("gantt.title_single")}</h2>
          <p className="text-sm text-muted-foreground">{t("gantt.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={chart.id} onValueChange={setActiveChart}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ganttCharts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { setChartName(""); setChartDialog({ mode: "create" }); }}>
            <FilePlus className="h-4 w-4" /> {t("gantt.new")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setChartName(chart.name); setChartDialog({ mode: "rename" }); }}>
            <Pencil className="h-4 w-4" /> {t("gantt.rename")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            if (ganttCharts.length <= 1) { toast.error(t("gantt.at_least_one")); return; }
            if (confirm(t("gantt.delete_confirm", { name: chart.name }))) removeChart(chart.id);
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={() => setTaskDialog({ mode: "create" })}><Plus className="h-4 w-4" /> {t("gantt.new_task")}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("gantt.schedule", { name: chart.name })}</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-primary/40"/> {t("gantt.normal")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-destructive/70"/> {t("gantt.critical_path")}</span>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[260px_1fr] gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
              <div>{t("gantt.task_col")}</div>
              <div className="flex justify-between"><span>{format(start, "dd MMM")}</span><span>{format(end, "dd MMM")}</span></div>
            </div>
            <div className="mt-2 space-y-1.5">
              {tasks.map((t2) => {
                const isSub = !!t2.parentId;
                const offset = (differenceInDays(parseISO(t2.startDate), start) / totalDays) * 100;
                const width = ((differenceInDays(parseISO(t2.endDate), parseISO(t2.startDate)) + 1) / totalDays) * 100;
                const isCritical = critical.has(t2.id);
                const isParent = tasks.some((x) => x.parentId === t2.id);
                return (
                  <div key={t2.id} className="grid grid-cols-[260px_1fr] gap-2 items-center group">
                    <div className={`flex items-center gap-2 text-sm ${isSub ? "pl-6 text-muted-foreground" : "font-medium"}`}>
                      <span className="truncate flex-1">{t2.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{t2.progress}%</span>
                      <button onClick={() => setTaskDialog({ mode: "edit", task: t2 })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition" aria-label={t("gantt.edit_aria")}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeGantt(chart.id, t2.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition" aria-label={t("gantt.delete_aria")}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => setTaskDialog({ mode: "edit", task: t2 })}
                      className="relative h-7 rounded-md bg-muted/40 text-left cursor-pointer"
                      title={t("gantt.click_to_edit")}
                    >
                      <div
                        className={`absolute top-0 h-full rounded-md ${
                          isParent ? "bg-accent" : isCritical ? "bg-destructive/30 border border-destructive" : "bg-primary/25 border border-primary/40"
                        }`}
                        style={{ left: `${offset}%`, width: `${width}%` }}
                      >
                        <div className={`h-full rounded-md ${isCritical ? "bg-destructive/70" : "bg-primary/70"}`} style={{ width: `${t2.progress}%` }} />
                        {t2.dependencies.length > 0 && (
                          <GitBranch className="absolute -left-4 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
              {tasks.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">{t("gantt.no_tasks")}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("gantt.task_detail")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tasks.map((t2) => {
              const parent = tasks.find((x) => x.id === t2.parentId);
              return (
                <div key={t2.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t2.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t2.startDate} → {t2.endDate}
                      {parent && ` · ${t("gantt.parent")}: ${parent.name}`}
                      {t2.dependencies.length > 0 && ` · ${t("gantt.depends_on")}: ${t2.dependencies.map((d) => tasks.find((x) => x.id === d)?.name).filter(Boolean).join(", ")}`}
                    </div>
                  </div>
                  <Label className="text-xs">{t("gantt.progress")}</Label>
                  <Input
                    type="number" min={0} max={100} value={t2.progress}
                    onChange={(e) => updateGantt(chart.id, t2.id, { progress: Math.max(0, Math.min(100, Number(e.target.value))) })}
                    className="h-8 w-20"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setTaskDialog({ mode: "edit", task: t2 })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeGantt(chart.id, t2.id)}>
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
          onSave={(t2) => {
            if (taskDialog.mode === "edit" && taskDialog.task) {
              if (hasCycle(tasks.map((x) => x.id === taskDialog.task!.id ? { ...x, dependencies: t2.dependencies } : x), taskDialog.task.id, t2.dependencies)) {
                toast.error(t("gantt.circular_dep"));
                return;
              }
              updateGantt(chart.id, taskDialog.task.id, t2);
            } else {
              addGantt(chart.id, t2);
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
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "create" ? t("gantt.chart_dialog_create") : t("gantt.chart_dialog_rename")}</DialogTitle></DialogHeader>
        <div><Label>{t("gantt.name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("gantt.cancel")}</Button>
          <Button onClick={onSave}>{mode === "create" ? t("gantt.create") : t("gantt.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({ tasks, task, onSave, onClose }: {
  tasks: GanttTask[]; task?: GanttTask;
  onSave: (t: Omit<GanttTask, "id">) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState<Omit<GanttTask, "id">>(
    task
      ? { name: task.name, startDate: task.startDate, endDate: task.endDate, progress: task.progress, dependencies: task.dependencies, parentId: task.parentId ?? null }
      : { name: "", startDate: today, endDate: today, progress: 0, dependencies: [], parentId: null }
  );

  // Possible parents: top-level only, not self, not descendants
  const isDescendant = (candId: string, ofId: string): boolean => {
    const ch = tasks.find((t2) => t2.id === candId);
    if (!ch) return false;
    if (ch.parentId === ofId) return true;
    if (ch.parentId) return isDescendant(ch.parentId, ofId);
    return false;
  };
  const parentOptions = tasks.filter((t2) => !t2.parentId && t2.id !== task?.id && !(task && isDescendant(t2.id, task.id)));
  const depOptions = tasks.filter((t2) => t2.id !== task?.id);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{task ? t("gantt.task_dialog_edit") : t("gantt.task_dialog_new")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("gantt.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("gantt.start")}</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><Label>{t("gantt.end")}</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("gantt.parent_task")}</Label>
              <Select value={form.parentId ?? "none"} onValueChange={(v) => setForm({ ...form, parentId: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("gantt.none_independent")}</SelectItem>
                  {parentOptions.map((t2) => <SelectItem key={t2.id} value={t2.id}>{t2.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{t("gantt.parent_hint")}</p>
            </div>
            <div><Label>{t("gantt.progress_pct")}</Label><Input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} /></div>
          </div>
          <div>
            <Label>{t("gantt.depends_on_label")}</Label>
            <div className="rounded-md border border-input bg-background p-2 max-h-40 overflow-y-auto space-y-1">
              {depOptions.length === 0 && <p className="text-xs text-muted-foreground p-1">{t("gantt.no_other_tasks")}</p>}
              {depOptions.map((t2) => (
                <label key={t2.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-1.5 py-1">
                  <input
                    type="checkbox"
                    checked={form.dependencies.includes(t2.id)}
                    onChange={(e) => setForm({
                      ...form,
                      dependencies: e.target.checked
                        ? [...form.dependencies, t2.id]
                        : form.dependencies.filter((x) => x !== t2.id),
                    })}
                  />
                  <span>{t2.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("gantt.depends_hint")}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("gantt.cancel")}</Button>
          <Button onClick={() => form.name && onSave(form)}>{task ? t("gantt.save_changes") : t("gantt.create_task")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

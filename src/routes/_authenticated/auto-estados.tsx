import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useProductivity, type AutoStateRule } from "@/lib/productivity-store";
import { useActivities } from "@/lib/activities-store";

export const Route = createFileRoute("/_authenticated/auto-estados")({
  head: () => ({ meta: [{ title: "Auto-estados — Planeador" }, { name: "description", content: "Cambio automático de estados de tareas." }] }),
  component: AutoStatesPage,
});

const TRIGGER_LABEL: Record<AutoStateRule["trigger"], string> = {
  overdue: "Tarea vencida",
  all_subtasks_done: "Todas las subtareas completas",
  time_logged: "Tiempo registrado",
};
const ACTION_LABEL: Record<AutoStateRule["action"], string> = {
  set_in_progress: "Marcar en progreso",
  set_completed: "Marcar completada",
  notify: "Notificar",
};

function AutoStatesPage() {
  const { autoStates, setAutoStates, autoRules, addAutoRule, updateAutoRule, removeAutoRule, changeLog, addLog } = useProductivity();
  const { activities, update } = useActivities();
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; rule?: AutoStateRule } | null>(null);

  const runNow = () => {
    let count = 0;
    const today = format(new Date(), "yyyy-MM-dd");
    activities.forEach((a) => {
      if (autoStates.overdueAuto && a.status !== "completado" && a.endDate < today) {
        update(a.id, { status: "en_progreso" });
        addLog(a.name, "Marcado en progreso (estaba vencido)");
        count++;
      }
    });
    autoRules.filter((r) => r.enabled && r.trigger === "overdue").forEach((rule) => {
      activities.forEach((a) => {
        if (a.status !== "completado" && a.endDate < today) {
          if (rule.action === "set_completed") update(a.id, { status: "completado" });
          else if (rule.action === "set_in_progress") update(a.id, { status: "en_progreso" });
          addLog(a.name, `Regla "${rule.name}" aplicada`);
          count++;
        }
      });
    });
    toast.success(`${count} cambios aplicados`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cambio automático de estados</h2>
        <p className="text-sm text-muted-foreground">Reglas predefinidas y personalizadas que aplican cambios a tus tareas.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Reglas predefinidas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Subtareas completadas → tarea padre completa</Label><p className="text-xs text-muted-foreground">Marca el padre cuando todos los hijos están listos.</p></div>
            <Switch checked={autoStates.subtaskToParent} onCheckedChange={(v) => setAutoStates({ ...autoStates, subtaskToParent: v })} />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div><Label>Fecha vencida → estado "en progreso"</Label><p className="text-xs text-muted-foreground">Marca las tareas con fecha pasada y sin completar.</p></div>
            <Switch checked={autoStates.overdueAuto} onCheckedChange={(v) => setAutoStates({ ...autoStates, overdueAuto: v })} />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div><Label>Horas registradas → en progreso</Label><p className="text-xs text-muted-foreground">Cambia a "en progreso" al registrar tiempo.</p></div>
            <Switch checked={autoStates.hoursToProgress} onCheckedChange={(v) => setAutoStates({ ...autoStates, hoursToProgress: v })} />
          </div>
          <Button onClick={runNow}>Ejecutar ahora</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Reglas personalizadas</CardTitle>
          <Button size="sm" onClick={() => setEditing({ mode: "create" })}><Plus className="h-4 w-4" /> Nueva regla</Button>
        </CardHeader>
        <CardContent>
          {autoRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay reglas personalizadas. Crea la primera para automatizar más cambios.</p>
          ) : (
            <div className="space-y-2">
              {autoRules.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                  <Switch checked={r.enabled} onCheckedChange={(v) => updateAutoRule(r.id, { enabled: v })} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">Si: {TRIGGER_LABEL[r.trigger]}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{ACTION_LABEL[r.action]}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditing({ mode: "edit", rule: r })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`¿Eliminar regla "${r.name}"?`)) removeAutoRule(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Log de cambios</CardTitle></CardHeader>
        <CardContent>
          {changeLog.length === 0 ? <p className="text-sm text-muted-foreground">Sin cambios registrados.</p> : (
            <ul className="space-y-2 text-sm">
              {changeLog.map((l) => (
                <li key={l.id} className="flex gap-3 border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground tabular-nums">{l.ts.slice(0, 16).replace("T", " ")}</span>
                  <span className="font-medium">{l.entity}</span>
                  <span className="text-muted-foreground flex-1">{l.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {editing && (
        <AutoRuleDialog
          rule={editing.rule}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            if (editing.mode === "edit" && editing.rule) updateAutoRule(editing.rule.id, r);
            else addAutoRule(r);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function AutoRuleDialog({ rule, onSave, onClose }: {
  rule?: AutoStateRule;
  onSave: (r: Omit<AutoStateRule, "id">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<AutoStateRule, "id">>({
    name: rule?.name ?? "",
    trigger: rule?.trigger ?? "overdue",
    action: rule?.action ?? "set_in_progress",
    enabled: rule?.enabled ?? true,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{rule ? "Editar regla" : "Nueva regla"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Si (disparador)</Label>
            <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v as AutoStateRule["trigger"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Entonces (acción)</Label>
            <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v as AutoStateRule["action"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            <Label>Activa</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => form.name && onSave(form)}>{rule ? "Guardar" : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

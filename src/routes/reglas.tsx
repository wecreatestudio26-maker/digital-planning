import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowRight, Pencil } from "lucide-react";
import { useProductivity, type Rule } from "@/lib/productivity-store";

export const Route = createFileRoute("/reglas")({
  head: () => ({ meta: [{ title: "Motor de Reglas — Planeador" }, { name: "description", content: "Reglas si esto, entonces esto." }] }),
  component: RulesPage,
});

const WHEN: Record<Rule["when"], string> = {
  task_overdue: "Tarea vencida",
  budget_over: "Presupuesto superado",
  risk_high: "Riesgo alto detectado",
  no_activity: "Sin actividad reciente",
};
const THEN: Record<Rule["then"], string> = {
  notify: "Enviar notificación",
  change_status: "Cambiar estado",
  create_followup: "Crear tarea de seguimiento",
};

function RulesPage() {
  const { rules, addRule, updateRule, toggleRule, removeRule } = useProductivity();
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; rule?: Rule } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Motor de reglas</h2>
          <p className="text-sm text-muted-foreground">"Si esto → entonces esto" para automatizar flujos.</p>
        </div>
        <Button onClick={() => setEditing({ mode: "create" })}><Plus className="h-4 w-4" /> Nueva regla</Button>
      </div>

      <div className="grid gap-3">
        {rules.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <Switch checked={r.enabled} onCheckedChange={() => toggleRule(r.id)} />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.name}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-xs">Si: {WHEN[r.when]}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">Entonces: {THEN[r.then]}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditing({ mode: "edit", rule: r })}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`¿Eliminar regla "${r.name}"?`)) removeRule(r.id); }}><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <RuleDialog
          rule={editing.rule}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            if (editing.mode === "edit" && editing.rule) updateRule(editing.rule.id, r);
            else addRule(r);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function RuleDialog({ rule, onSave, onClose }: {
  rule?: Rule;
  onSave: (r: Omit<Rule, "id">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Rule, "id">>({
    name: rule?.name ?? "",
    when: rule?.when ?? "task_overdue",
    then: rule?.then ?? "notify",
    enabled: rule?.enabled ?? true,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{rule ? "Editar regla" : "Nueva regla"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Si</Label>
            <Select value={form.when} onValueChange={(v) => setForm({ ...form, when: v as Rule["when"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(WHEN).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Entonces</Label>
            <Select value={form.then} onValueChange={(v) => setForm({ ...form, then: v as Rule["then"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(THEN).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
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

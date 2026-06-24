import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Wand2, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useProductivity, type Template } from "@/lib/productivity-store";
import { useActivities } from "@/lib/activities-store";

export const Route = createFileRoute("/_authenticated/plantillas")({
  head: () => ({ meta: [{ title: "Plantillas — Planeador" }, { name: "description", content: "Plantillas reutilizables de proyectos." }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { templates, addTemplate, updateTemplate, removeTemplate } = useProductivity();
  const { add } = useActivities();
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; tpl?: Template } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const apply = (tplId: string) => {
    const t = templates.find((x) => x.id === tplId);
    if (!t) return;
    let cursor = new Date();
    t.tasks.forEach((tk) => {
      const start = format(cursor, "yyyy-MM-dd");
      const end = format(addDays(cursor, tk.days - 1), "yyyy-MM-dd");
      add({ name: tk.name, category: "Proyecto", startDate: start, endDate: end, assignee: "Sin asignar", priority: "media", status: "pendiente" });
      cursor = addDays(cursor, tk.days);
    });
    toast.success(`Plantilla "${t.name}" aplicada: ${t.tasks.length} tareas creadas`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Plantillas</h2>
          <p className="text-sm text-muted-foreground">Plantillas reutilizables. La columna de la derecha indica la duración (días) de cada tarea.</p>
        </div>
        <Button onClick={() => setEditing({ mode: "create" })}><Plus className="h-4 w-4" /> Nueva plantilla</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const isOpen = expanded[t.id];
          return (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{t.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{t.tasks.length} tareas · {t.tasks.reduce((s, x) => s + x.days, 0)} días totales</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditing({ mode: "edit", tpl: t })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`¿Eliminar plantilla "${t.name}"?`)) removeTemplate(t.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="w-full justify-start mb-2 -ml-2" onClick={() => setExpanded({ ...expanded, [t.id]: !isOpen })}>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {isOpen ? "Ocultar tareas" : "Mostrar tareas"}
                </Button>
                {isOpen && (
                  <ul className="space-y-1 text-sm mb-4 border-l-2 border-border pl-3">
                    {t.tasks.map((tk, i) => (
                      <li key={i} className="flex justify-between text-muted-foreground">
                        <span className="truncate">· {tk.name}</span>
                        <span className="text-xs tabular-nums shrink-0 ml-2">{tk.days}d</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button className="w-full" onClick={() => apply(t.id)}><Wand2 className="h-4 w-4" /> Aplicar plantilla</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editing && (
        <TemplateDialog
          tpl={editing.tpl}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            if (editing.mode === "edit" && editing.tpl) updateTemplate(editing.tpl.id, t);
            else addTemplate({ ...t, type: "proyecto" });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TemplateDialog({ tpl, onSave, onClose }: {
  tpl?: Template;
  onSave: (t: Omit<Template, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(tpl?.name ?? "");
  const [tasks, setTasks] = useState<{ name: string; days: number }[]>(
    tpl?.tasks.length ? tpl.tasks : [{ name: "", days: 1 }]
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{tpl ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tareas</Label>
              <span className="text-xs text-muted-foreground">Nombre · Duración (días)</span>
            </div>
            {tasks.map((t, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={t.name}
                  onChange={(e) => setTasks(tasks.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  placeholder="Nombre de la tarea"
                />
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    value={t.days}
                    onChange={(e) => setTasks(tasks.map((x, j) => j === i ? { ...x, days: Math.max(1, Number(e.target.value)) } : x))}
                    className="w-24 pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">días</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setTasks(tasks.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setTasks([...tasks, { name: "", days: 1 }])}>
              <Plus className="h-3.5 w-3.5" /> Agregar tarea
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            const clean = tasks.filter((t) => t.name.trim());
            if (name.trim() && clean.length) onSave({ name: name.trim(), type: tpl?.type ?? "proyecto", tasks: clean });
          }}>{tpl ? "Guardar cambios" : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

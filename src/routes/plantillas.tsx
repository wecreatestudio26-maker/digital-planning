import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useProductivity } from "@/lib/productivity-store";
import { useActivities } from "@/lib/activities-store";

export const Route = createFileRoute("/plantillas")({
  head: () => ({ meta: [{ title: "Plantillas — Planeador" }, { name: "description", content: "Plantillas reutilizables de proyectos." }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { templates, addTemplate, removeTemplate } = useProductivity();
  const { add } = useActivities();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tasks, setTasks] = useState<{ name: string; days: number }[]>([{ name: "", days: 1 }]);

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
          <p className="text-sm text-muted-foreground">Plantillas reutilizables para proyectos y tareas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nueva plantilla</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva plantilla</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Tareas</Label>
                {tasks.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={t.name} onChange={(e) => setTasks(tasks.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Nombre" />
                    <Input type="number" value={t.days} onChange={(e) => setTasks(tasks.map((x, j) => j === i ? { ...x, days: Number(e.target.value) } : x))} className="w-20" />
                    <Button variant="ghost" size="icon" onClick={() => setTasks(tasks.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setTasks([...tasks, { name: "", days: 1 }])}><Plus className="h-3.5 w-3.5" /> Agregar tarea</Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { if (name) { addTemplate({ name, type: "proyecto", tasks: tasks.filter((t) => t.name) }); setName(""); setTasks([{ name: "", days: 1 }]); setOpen(false); } }}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{t.tasks.length} tareas · {t.tasks.reduce((s, x) => s + x.days, 0)} días</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeTemplate(t.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm mb-4">
                {t.tasks.slice(0, 4).map((tk, i) => (
                  <li key={i} className="flex justify-between text-muted-foreground">
                    <span>· {tk.name}</span><span className="text-xs">{tk.days}d</span>
                  </li>
                ))}
                {t.tasks.length > 4 && <li className="text-xs text-muted-foreground">+ {t.tasks.length - 4} más</li>}
              </ul>
              <Button className="w-full" onClick={() => apply(t.id)}><Wand2 className="h-4 w-4" /> Aplicar plantilla</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { templates, addTemplate, updateTemplate, removeTemplate } = useProductivity();
  const { add } = useActivities();
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; tpl?: Template } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const apply = (tplId: string) => {
    const tpl = templates.find((x) => x.id === tplId);
    if (!tpl) return;
    let cursor = new Date();
    tpl.tasks.forEach((tk) => {
      const start = format(cursor, "yyyy-MM-dd");
      const end = format(addDays(cursor, tk.days - 1), "yyyy-MM-dd");
      add({ name: tk.name, category: "Proyecto", startDate: start, endDate: end, assignee: "Sin asignar", priority: "media", status: "pendiente" });
      cursor = addDays(cursor, tk.days);
    });
    toast.success(t("templates.applied", { name: tpl.name, count: tpl.tasks.length }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("templates.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("templates.subtitle")}</p>
        </div>
        <Button onClick={() => setEditing({ mode: "create" })}><Plus className="h-4 w-4" /> {t("templates.newTemplate")}</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => {
          const isOpen = expanded[tpl.id];
          return (
            <Card key={tpl.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{tpl.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("templates.tasksSummary", { tasks: tpl.tasks.length, days: tpl.tasks.reduce((s, x) => s + x.days, 0) })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditing({ mode: "edit", tpl })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(t("templates.confirmDelete", { name: tpl.name }))) removeTemplate(tpl.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="w-full justify-start mb-2 -ml-2" onClick={() => setExpanded({ ...expanded, [tpl.id]: !isOpen })}>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {isOpen ? t("templates.hideTasks") : t("templates.showTasks")}
                </Button>
                {isOpen && (
                  <ul className="space-y-1 text-sm mb-4 border-l-2 border-border pl-3">
                    {tpl.tasks.map((tk, i) => (
                      <li key={i} className="flex justify-between text-muted-foreground">
                        <span className="truncate">· {tk.name}</span>
                        <span className="text-xs tabular-nums shrink-0 ml-2">{tk.days}d</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button className="w-full" onClick={() => apply(tpl.id)}><Wand2 className="h-4 w-4" /> {t("templates.apply")}</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editing && (
        <TemplateDialog
          tpl={editing.tpl}
          onClose={() => setEditing(null)}
          onSave={(tpl) => {
            if (editing.mode === "edit" && editing.tpl) updateTemplate(editing.tpl.id, tpl);
            else addTemplate({ ...tpl, type: "proyecto" });
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
  const { t } = useTranslation();
  const [name, setName] = useState(tpl?.name ?? "");
  const [tasks, setTasks] = useState<{ name: string; days: number }[]>(
    tpl?.tasks.length ? tpl.tasks : [{ name: "", days: 1 }]
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{tpl ? t("templates.editTitle") : t("templates.newTemplate")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("templates.name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("templates.tasks")}</Label>
              <span className="text-xs text-muted-foreground">{t("templates.tasksDurationHint")}</span>
            </div>
            {tasks.map((tk, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={tk.name}
                  onChange={(e) => setTasks(tasks.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  placeholder={t("templates.taskNamePlaceholder")}
                />
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    value={tk.days}
                    onChange={(e) => setTasks(tasks.map((x, j) => j === i ? { ...x, days: Math.max(1, Number(e.target.value)) } : x))}
                    className="w-24 pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("templates.days")}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setTasks(tasks.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setTasks([...tasks, { name: "", days: 1 }])}>
              <Plus className="h-3.5 w-3.5" /> {t("templates.addTask")}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={() => {
            const clean = tasks.filter((tk) => tk.name.trim());
            if (name.trim() && clean.length) onSave({ name: name.trim(), type: tpl?.type ?? "proyecto", tasks: clean });
          }}>{tpl ? t("common.saveChanges") : t("common.create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

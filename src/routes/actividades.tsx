import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActivities } from "@/lib/activities-store";
import { CATEGORIES, type Activity, type Status } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { ActivityForm } from "@/components/ActivityForm";
import { exportToPDF, exportToExcel } from "@/lib/export";

export const Route = createFileRoute("/actividades")({
  head: () => ({
    meta: [
      { title: "Actividades — Planeador" },
      { name: "description", content: "Lista completa, filtros y edición de actividades." },
    ],
  }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { activities, remove } = useActivities();
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [categoryF, setCategoryF] = useState<string>("all");
  const [assigneeF, setAssigneeF] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const assignees = useMemo(
    () => Array.from(new Set(activities.map((a) => a.assignee))).filter(Boolean),
    [activities],
  );

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (statusF !== "all" && a.status !== statusF) return false;
      if (categoryF !== "all" && a.category !== categoryF) return false;
      if (assigneeF !== "all" && a.assignee !== assigneeF) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [activities, search, statusF, categoryF, assigneeF]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Actividades</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} de {activities.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportToPDF(filtered)}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={() => exportToExcel(filtered)}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Nueva actividad
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar actividad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_progreso">En progreso</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryF} onValueChange={setCategoryF}>
            <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={assigneeF} onValueChange={setAssigneeF}>
            <SelectTrigger><SelectValue placeholder="Responsable" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los responsables</SelectItem>
              {assignees.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : filtered.map((a, i) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.category}</TableCell>
                  <TableCell>{a.startDate}</TableCell>
                  <TableCell>{a.endDate}</TableCell>
                  <TableCell>{a.assignee}</TableCell>
                  <TableCell><PriorityBadge priority={a.priority} /></TableCell>
                  <TableCell><StatusBadge status={a.status as Status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ActivityForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) remove(deleteId); setDeleteId(null); }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

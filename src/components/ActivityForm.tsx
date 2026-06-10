import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, type Activity } from "@/lib/types";
import { useActivities } from "@/lib/activities-store";
import { toast } from "sonner";

const schema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
    description: z.string().max(500).optional(),
    category: z.string().min(1, "Categoría obligatoria"),
    startDate: z.string().min(1, "Fecha inicio obligatoria"),
    endDate: z.string().min(1, "Fecha fin obligatoria"),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    assignee: z.string().trim().min(1, "Responsable obligatorio").max(80),
    priority: z.enum(["alta", "media", "baja"]),
    status: z.enum(["pendiente", "en_progreso", "completado"]),
    notes: z.string().max(1000).optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    path: ["endDate"],
    message: "La fecha fin debe ser igual o posterior",
  });

const empty: Omit<Activity, "id"> = {
  name: "",
  description: "",
  category: "Trabajo",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  startTime: "",
  endTime: "",
  assignee: "",
  priority: "media",
  status: "pendiente",
  notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Activity | null;
}

export function ActivityForm({ open, onOpenChange, editing }: Props) {
  const { add, update } = useActivities();
  const [form, setForm] = useState<Omit<Activity, "id">>(empty);

  useEffect(() => {
    if (open) {
      if (editing) {
        const { id: _id, ...rest } = editing;
        setForm(rest);
      } else {
        setForm(empty);
      }
    }
  }, [open, editing]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (editing) {
      update(editing.id, parsed.data);
      toast.success("Actividad actualizada");
    } else {
      add(parsed.data);
      toast.success("Actividad creada");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar actividad" : "Nueva actividad"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Nombre de la actividad *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Descripción</Label>
            <Textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categoría *</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Responsable *</Label>
              <Input value={form.assignee} onChange={(e) => set("assignee", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Fecha inicio *</Label>
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Fecha fin *</Label>
              <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Hora inicio</Label>
              <Input type="time" value={form.startTime ?? ""} onChange={(e) => set("startTime", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Hora fin</Label>
              <Input type="time" value={form.endTime ?? ""} onChange={(e) => set("endTime", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Prioridad</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v as Activity["priority"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as Activity["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_progreso">En progreso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notas adicionales</Label>
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

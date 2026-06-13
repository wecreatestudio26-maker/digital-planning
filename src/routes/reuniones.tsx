import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ListPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { useProductivity } from "@/lib/productivity-store";
import { useActivities } from "@/lib/activities-store";

export const Route = createFileRoute("/reuniones")({
  head: () => ({ meta: [{ title: "Reuniones — Planeador" }, { name: "description", content: "Agenda, actas y acuerdos." }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { meetings, addMeeting, updateMeeting, removeMeeting, addAgreement, convertAgreement } = useProductivity();
  const { add: addActivity } = useActivities();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: format(new Date(), "yyyy-MM-dd"), agenda: "", minutes: "" });
  const [newAgr, setNewAgr] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Reuniones</h2>
          <p className="text-sm text-muted-foreground">Agenda, actas y acuerdos convertibles en tareas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nueva reunión</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva reunión</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Fecha</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Agenda</Label><Textarea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => { if (form.title) { addMeeting({ ...form }); setForm({ title: "", date: format(new Date(), "yyyy-MM-dd"), agenda: "", minutes: "" }); setOpen(false); } }}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {meetings.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{m.date}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeMeeting(m.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Agenda</Label>
                <Textarea value={m.agenda} onChange={(e) => updateMeeting(m.id, { agenda: e.target.value })} rows={2} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Acta</Label>
                <Textarea value={m.minutes} onChange={(e) => updateMeeting(m.id, { minutes: e.target.value })} rows={3} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Acuerdos</Label>
                <ul className="space-y-1.5 mt-1">
                  {m.agreements.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      {a.convertedTaskId ? <Check className="h-4 w-4 text-primary" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />}
                      <span className={`flex-1 ${a.convertedTaskId ? "line-through text-muted-foreground" : ""}`}>{a.text}</span>
                      {!a.convertedTaskId && (
                        <Button size="sm" variant="ghost" onClick={() => {
                          const id = crypto.randomUUID();
                          addActivity({
                            name: a.text,
                            category: "Reuniones",
                            startDate: m.date,
                            endDate: format(addDays(new Date(m.date), 7), "yyyy-MM-dd"),
                            assignee: a.assignee ?? "Sin asignar",
                            priority: "media",
                            status: "pendiente",
                            description: `Acuerdo de la reunión: ${m.title}`,
                          });
                          convertAgreement(m.id, a.id, id);
                          toast.success("Acuerdo convertido en tarea");
                        }}><ListPlus className="h-3.5 w-3.5" /> Tarea</Button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 mt-2">
                  <Input value={newAgr[m.id] ?? ""} onChange={(e) => setNewAgr({ ...newAgr, [m.id]: e.target.value })} placeholder="Nuevo acuerdo" className="h-8" />
                  <Button size="sm" onClick={() => { const v = newAgr[m.id]; if (v) { addAgreement(m.id, v); setNewAgr({ ...newAgr, [m.id]: "" }); } }}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useProductivity, type RoadmapItem } from "@/lib/productivity-store";

export const Route = createFileRoute("/roadmap")({
  head: () => ({ meta: [{ title: "Roadmap — Planeador" }, { name: "description", content: "Roadmap visual por trimestre y año." }] }),
  component: RoadmapPage,
});

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const STATUS_COLOR: Record<RoadmapItem["status"], string> = {
  planeado: "border-l-blue-500 bg-blue-500/10",
  en_curso: "border-l-yellow-500 bg-yellow-500/10",
  completado: "border-l-primary bg-primary/10",
  bloqueado: "border-l-red-500 bg-red-500/10",
};

function RoadmapPage() {
  const { roadmap, addRoadmap, updateRoadmap, removeRoadmap } = useProductivity();
  const [year, setYear] = useState(new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<RoadmapItem, "id">>({ name: "", quarter: "Q1", year, progress: 0, status: "planeado" });

  const onDrop = (e: React.DragEvent, q: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    updateRoadmap(id, { quarter: q });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Roadmap</h2>
          <p className="text-sm text-muted-foreground">Visualización por trimestre. Arrastra para reorganizar.</p>
        </div>
        <div className="flex gap-2 items-end">
          <div><Label>Año</Label><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24" /></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Iniciativa</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva iniciativa</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Trimestre</Label>
                    <Select value={form.quarter} onValueChange={(v) => setForm({ ...form, quarter: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{QUARTERS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Estado</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RoadmapItem["status"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planeado">Planeado</SelectItem>
                        <SelectItem value="en_curso">En curso</SelectItem>
                        <SelectItem value="completado">Completado</SelectItem>
                        <SelectItem value="bloqueado">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => { if (form.name) { addRoadmap({ ...form, year }); setForm({ name: "", quarter: "Q1", year, progress: 0, status: "planeado" }); setOpen(false); } }}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUARTERS.map((q) => (
          <Card key={q} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, q)} className="min-h-[300px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{q} <span className="text-muted-foreground font-normal text-xs">· {year}</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {roadmap.filter((r) => r.quarter === q && r.year === year).map((r) => (
                <div
                  key={r.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", r.id)}
                  className={`border-l-4 rounded p-3 cursor-grab ${STATUS_COLOR[r.status]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm flex-1">{r.name}</div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRoadmap(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground capitalize">{r.status.replace("_", " ")}</span>
                      <span>{r.progress}%</span>
                    </div>
                    <Progress value={r.progress} className="h-1.5" />
                    <Input type="range" min={0} max={100} value={r.progress} onChange={(e) => updateRoadmap(r.id, { progress: Number(e.target.value) })} className="h-1 mt-1" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

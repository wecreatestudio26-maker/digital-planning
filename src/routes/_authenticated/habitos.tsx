import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Flame } from "lucide-react";
import { useProductivity, computeStreak } from "@/lib/productivity-store";

export const Route = createFileRoute("/habitos")({
  head: () => ({ meta: [{ title: "Hábitos — Planeador" }, { name: "description", content: "Rastreador de hábitos diario con heatmap y rachas." }] }),
  component: HabitsPage,
});

function HabitsPage() {
  const { habits, toggleHabit, addHabit, removeHabit } = useProductivity();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
  const month = eachDayOfInterval({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Hábitos</h2>
          <p className="text-sm text-muted-foreground">Registro diario, racha y heatmap mensual.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo hábito</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo hábito</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => { if (name) { addHabit({ name }); setName(""); setOpen(false); } }}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Registro últimos 7 días</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left font-normal py-2">Hábito</th>
                {days.map((d) => <th key={d.toISOString()} className="font-normal w-12 py-2">{format(d, "EEE d")}</th>)}
                <th className="font-normal py-2">Racha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => {
                const streak = computeStreak(h.log);
                return (
                  <tr key={h.id} className="border-t border-border">
                    <td className="py-2.5"><div className="font-medium">{h.name}</div></td>
                    {days.map((d) => {
                      const ds = format(d, "yyyy-MM-dd");
                      const done = h.log[ds];
                      return (
                        <td key={ds} className="text-center">
                          <button onClick={() => toggleHabit(h.id, ds)} className={`h-7 w-7 rounded-md border ${done ? "bg-primary border-primary" : "border-border hover:bg-muted"}`} />
                        </td>
                      );
                    })}
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm"><Flame className="h-3.5 w-3.5 text-orange-400" /> {streak}</span>
                    </td>
                    <td>
                      <Button variant="ghost" size="icon" onClick={() => removeHabit(h.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Heatmap de consistencia — {format(new Date(), "MMMM yyyy")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {habits.map((h) => (
            <div key={h.id}>
              <div className="text-xs text-muted-foreground mb-1.5">{h.name}</div>
              <div className="grid grid-cols-[repeat(31,minmax(0,1fr))] gap-1">
                {month.map((d) => {
                  const ds = format(d, "yyyy-MM-dd");
                  const done = h.log[ds];
                  return <div key={ds} title={ds} className={`h-5 rounded ${done ? "bg-primary" : "bg-muted"}`} />;
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

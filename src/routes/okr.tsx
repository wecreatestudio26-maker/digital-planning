import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Target, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { useExtra, type Objective, type KeyResult } from "@/lib/extra-store";

export const Route = createFileRoute("/okr")({
  head: () => ({
    meta: [
      { title: "OKR — Planeador" },
      { name: "description", content: "Objetivos y resultados clave con barras de progreso." },
    ],
  }),
  component: OkrPage,
});

function krPct(k: KeyResult) {
  return Math.max(0, Math.min(100, (k.current / Math.max(1, k.target)) * 100));
}
function objPct(o: Objective) {
  if (!o.keyResults.length) return 0;
  return o.keyResults.reduce((s, k) => s + krPct(k), 0) / o.keyResults.length;
}

function OkrPage() {
  const { okrs, addOkr, removeOkr, addKR, updateKR, removeKR } = useExtra();
  const [open, setOpen] = useState(false);

  const overall = okrs.length ? okrs.reduce((s, o) => s + objPct(o), 0) / okrs.length : 0;
  const chart = okrs.map((o) => ({
    name: o.name.length > 22 ? o.name.slice(0, 22) + "…" : o.name,
    progreso: Math.round(objPct(o)),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">OKR</h2>
          <p className="text-sm text-muted-foreground">Objetivos y resultados clave.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo objetivo</Button></DialogTrigger>
          <ObjDialog onClose={() => setOpen(false)} onSave={(o) => { addOkr(o); setOpen(false); }} />
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Objetivos</span>
              <Target className="h-4 w-4" />
            </div>
            <div className="mt-2 text-3xl font-semibold">{okrs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Resultados Clave</span>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="mt-2 text-3xl font-semibold">{okrs.reduce((s, o) => s + o.keyResults.length, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progreso global</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-3xl font-semibold text-primary">{overall.toFixed(0)}%</div>
            <Progress value={overall} className="mt-3" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Progreso por objetivo</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
              <XAxis type="number" domain={[0, 100]} stroke="oklch(0.72 0.02 255)" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="oklch(0.72 0.02 255)" fontSize={12} width={180} />
              <Tooltip contentStyle={{ background: "oklch(0.255 0.035 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
              <Bar dataKey="progreso" radius={[0, 6, 6, 0]}>
                {chart.map((c) => (
                  <Cell key={c.name} fill={c.progreso >= 70 ? "#22c55e" : c.progreso >= 40 ? "#eab308" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {okrs.map((o) => {
          const pct = objPct(o);
          return (
            <Card key={o.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{o.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{o.owner} · {o.quarter}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeOkr(o.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium">{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {o.keyResults.map((k) => {
                  const p = krPct(k);
                  return (
                    <div key={k.id} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">{k.name}</span>
                        <Input
                          type="number"
                          value={k.current}
                          onChange={(e) => updateKR(o.id, k.id, { current: Number(e.target.value) })}
                          className="h-7 w-20 text-right"
                        />
                        <span className="text-muted-foreground text-xs">/ {k.target}{k.unit}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeKR(o.id, k.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Progress value={p} />
                    </div>
                  );
                })}
                <KRForm onAdd={(kr) => addKR(o.id, kr)} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function KRForm({ onAdd }: { onAdd: (kr: Omit<KeyResult, "id">) => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState(100);
  const [unit, setUnit] = useState("");
  return (
    <div className="flex gap-2 pt-2 border-t border-border">
      <Input placeholder="Nuevo resultado clave" value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
      <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} className="h-8 w-20" />
      <Input placeholder="ud" value={unit} onChange={(e) => setUnit(e.target.value)} className="h-8 w-16" />
      <Button size="sm" onClick={() => { if (name) { onAdd({ name, current: 0, target, unit }); setName(""); } }}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ObjDialog({ onSave, onClose }: { onSave: (o: Omit<Objective, "id">) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", owner: "", quarter: "Q1", description: "" });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo objetivo</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Objetivo</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Responsable</Label><Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></div>
          <div><Label>Trimestre</Label><Input value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => form.name && onSave({ ...form, keyResults: [] })}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

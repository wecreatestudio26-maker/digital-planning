import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { riskLevel, useExtra, type Risk, type RiskStatus } from "@/lib/extra-store";

export const Route = createFileRoute("/riesgos")({
  head: () => ({
    meta: [
      { title: "Riesgos — Planeador" },
      { name: "description", content: "Matriz de riesgos con probabilidad, impacto y mitigación." },
    ],
  }),
  component: RisksPage,
});

const STATUS_LABEL: Record<RiskStatus, string> = { abierto: "Abierto", mitigado: "Mitigado", cerrado: "Cerrado" };

function RisksPage() {
  const { risks, addRisk, updateRisk, removeRisk } = useExtra();
  const [open, setOpen] = useState(false);

  const matrix: Risk[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
  risks.forEach((r) => matrix[5 - r.impact][r.probability - 1].push(r));

  const summary = ["Bajo", "Medio", "Alto", "Crítico"].map((lvl) => ({
    name: lvl,
    value: risks.filter((r) => riskLevel(r.probability, r.impact).label === lvl).length,
    color: lvl === "Crítico" ? "#ef4444" : lvl === "Alto" ? "#f97316" : lvl === "Medio" ? "#eab308" : "#22c55e",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Matriz de Riesgos</h2>
          <p className="text-sm text-muted-foreground">Probabilidad × Impacto, nivel automático y mitigación.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo riesgo</Button></DialogTrigger>
          <RiskDialog onClose={() => setOpen(false)} onSave={(r) => { addRisk(r); setOpen(false); }} />
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Matriz 5×5</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex flex-col justify-between text-xs text-muted-foreground py-2">
                <span className="-rotate-90 origin-bottom-left h-0 whitespace-nowrap translate-y-20 font-medium">Impacto →</span>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-5 gap-1.5">
                  {matrix.map((row, ri) =>
                    row.map((cell, ci) => {
                      const impact = 5 - ri;
                      const prob = ci + 1;
                      const lvl = riskLevel(prob, impact);
                      return (
                        <div
                          key={`${ri}-${ci}`}
                          className="aspect-square rounded-md p-1.5 text-[10px] flex flex-col"
                          style={{ background: `${lvl.color}22`, border: `1px solid ${lvl.color}55` }}
                        >
                          <span className="text-muted-foreground">{prob}×{impact}</span>
                          <div className="flex-1 flex flex-wrap gap-0.5 mt-1 content-start">
                            {cell.map((r) => (
                              <span
                                key={r.id}
                                title={r.name}
                                className="rounded px-1 py-0.5 text-[10px] font-medium truncate max-w-full"
                                style={{ background: lvl.color, color: "#0f172a" }}
                              >
                                {r.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }),
                  )}
                </div>
                <div className="text-center text-xs text-muted-foreground mt-2">Probabilidad →</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resumen por nivel</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                <XAxis dataKey="name" stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.255 0.035 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {summary.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Listado de riesgos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Riesgo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>P</TableHead>
                <TableHead>I</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Mitigación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map((r) => {
                const lvl = riskLevel(r.probability, r.impact);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category}</TableCell>
                    <TableCell>{r.probability}</TableCell>
                    <TableCell>{r.impact}</TableCell>
                    <TableCell>
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `${lvl.color}33`, color: lvl.color }}>
                        {lvl.label} ({lvl.score})
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[260px] truncate">{r.mitigation}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v: RiskStatus) => updateRisk(r.id, { status: v })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["abierto", "mitigado", "cerrado"] as RiskStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeRisk(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskDialog({ onSave, onClose }: { onSave: (r: Omit<Risk, "id">) => void; onClose: () => void }) {
  const [form, setForm] = useState<Omit<Risk, "id">>({
    name: "", category: "Operativo", probability: 3, impact: 3, mitigation: "", status: "abierto",
  });
  const lvl = riskLevel(form.probability, form.impact);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo riesgo</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Categoría</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div>
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v: RiskStatus) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["abierto", "mitigado", "cerrado"] as RiskStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Probabilidad (1-5)</Label><Input type="number" min={1} max={5} value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} /></div>
          <div><Label>Impacto (1-5)</Label><Input type="number" min={1} max={5} value={form.impact} onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })} /></div>
        </div>
        <div className="text-sm">Nivel: <span className="font-medium" style={{ color: lvl.color }}>{lvl.label} ({lvl.score})</span></div>
        <div><Label>Mitigación</Label><Textarea value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => form.name && onSave(form)}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

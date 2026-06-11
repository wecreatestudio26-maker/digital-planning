import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, AlertTriangle, TrendingUp, Wallet, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from "recharts";
import { useExtra, type BudgetItem } from "@/lib/extra-store";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/presupuesto")({
  head: () => ({
    meta: [
      { title: "Presupuesto — Planeador" },
      { name: "description", content: "Control presupuestal: plan vs real, flujo de caja y alertas." },
    ],
  }),
  component: BudgetPage,
});

function fmt(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function BudgetPage() {
  const { budget, addBudget, removeBudget } = useExtra();
  const [open, setOpen] = useState(false);

  const planned = budget.reduce((s, b) => s + b.planned, 0);
  const actual = budget.reduce((s, b) => s + b.actual, 0);
  const variance = actual - planned;
  const overbudget = budget.filter((b) => b.actual > b.planned);

  const byCat = useMemo(() => {
    const m = new Map<string, { category: string; planned: number; actual: number }>();
    budget.forEach((b) => {
      const prev = m.get(b.category) ?? { category: b.category, planned: 0, actual: 0 };
      m.set(b.category, { category: b.category, planned: prev.planned + b.planned, actual: prev.actual + b.actual });
    });
    return Array.from(m.values());
  }, [budget]);

  const cashflow = useMemo(() => {
    const sorted = [...budget].sort((a, b) => a.date.localeCompare(b.date));
    let cumPlanned = 0, cumActual = 0;
    return sorted.map((b) => {
      cumPlanned += b.planned;
      cumActual += b.actual;
      return { date: format(parseISO(b.date), "dd MMM"), Planeado: cumPlanned, Real: cumActual };
    });
  }, [budget]);

  const projection = (actual / Math.max(1, planned)) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Control Presupuestal</h2>
          <p className="text-sm text-muted-foreground">Planeado vs real, flujo de caja y proyección.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo rubro</Button></DialogTrigger>
          <BudgetDialog onClose={() => setOpen(false)} onSave={(b) => { addBudget(b); setOpen(false); }} />
        </Dialog>
      </div>

      {overbudget.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">{overbudget.length} rubro(s) con sobrecosto</p>
            <p className="text-muted-foreground mt-1">
              {overbudget.map((b) => `${b.description} (+${fmt(b.actual - b.planned)})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Planeado", value: fmt(planned), icon: Wallet },
          { label: "Real", value: fmt(actual), icon: TrendingUp },
          { label: "Variación", value: fmt(variance), icon: variance > 0 ? AlertTriangle : CheckCircle2, color: variance > 0 ? "text-destructive" : "text-primary" },
          { label: "Ejecución", value: `${projection.toFixed(0)}%`, icon: TrendingUp, color: projection > 100 ? "text-destructive" : "text-primary" },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{m.label}</span>
                <m.icon className={`h-4 w-4 ${m.color ?? ""}`} />
              </div>
              <div className={`mt-2 text-2xl font-semibold ${m.color ?? ""}`}>{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Planeado vs Real por categoría</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCat}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                <XAxis dataKey="category" stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <YAxis stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.255 0.035 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="planned" name="Planeado" fill="#64748b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="actual" name="Real" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Flujo de caja acumulado</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflow}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                <XAxis dataKey="date" stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <YAxis stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.255 0.035 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="Planeado" stroke="#64748b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Real" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Rubros</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Planeado</TableHead>
                <TableHead className="text-right">Real</TableHead>
                <TableHead className="text-right">Variación</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budget.map((b) => {
                const diff = b.actual - b.planned;
                const over = diff > 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.category}</TableCell>
                    <TableCell className="text-muted-foreground">{b.description}</TableCell>
                    <TableCell className="text-muted-foreground">{b.date}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(b.planned)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(b.actual)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${over ? "text-destructive" : "text-primary"}`}>
                      {over ? "+" : ""}{fmt(diff)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeBudget(b.id)}><Trash2 className="h-4 w-4" /></Button>
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

function BudgetDialog({ onSave, onClose }: { onSave: (b: Omit<BudgetItem, "id">) => void; onClose: () => void }) {
  const [form, setForm] = useState<Omit<BudgetItem, "id">>({
    category: "", description: "", planned: 0, actual: 0, date: format(new Date(), "yyyy-MM-dd"),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo rubro</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Categoría</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div><Label>Fecha</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
        <div><Label>Descripción</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Planeado</Label><Input type="number" value={form.planned} onChange={(e) => setForm({ ...form, planned: Number(e.target.value) })} /></div>
          <div><Label>Real</Label><Input type="number" value={form.actual} onChange={(e) => setForm({ ...form, actual: Number(e.target.value) })} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => form.category && onSave(form)}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

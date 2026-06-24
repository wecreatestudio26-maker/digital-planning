import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, AlertTriangle, TrendingUp, Wallet, CheckCircle2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from "recharts";
import { useExtra, budgetActual, type BudgetItem, type BudgetSubItem } from "@/lib/extra-store";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/presupuesto")({
  head: () => ({
    meta: [
      { title: "Presupuesto — Planeador" },
      { name: "description", content: "Control presupuestal con rubros, subrubros y alertas." },
    ],
  }),
  component: BudgetPage,
});

function fmt(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function BudgetPage() {
  const { budget, addBudget, updateBudget, removeBudget, addSubItem, updateSubItem, removeSubItem } = useExtra();
  const [budgetDialog, setBudgetDialog] = useState<{ mode: "create" | "edit"; item?: BudgetItem } | null>(null);
  const [subDialog, setSubDialog] = useState<{ budgetId: string; sub?: BudgetSubItem } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const planned = budget.reduce((s, b) => s + b.planned, 0);
  const actual = budget.reduce((s, b) => s + budgetActual(b), 0);
  const variance = actual - planned;
  const overbudget = budget.filter((b) => budgetActual(b) > b.planned);

  const byCat = useMemo(() => {
    const m = new Map<string, { category: string; planned: number; actual: number }>();
    budget.forEach((b) => {
      const prev = m.get(b.category) ?? { category: b.category, planned: 0, actual: 0 };
      m.set(b.category, { category: b.category, planned: prev.planned + b.planned, actual: prev.actual + budgetActual(b) });
    });
    return Array.from(m.values());
  }, [budget]);

  const cashflow = useMemo(() => {
    type Event = { date: string; planned: number; actual: number };
    const events: Event[] = [];
    budget.forEach((b) => {
      events.push({ date: b.date, planned: b.planned, actual: 0 });
      b.subItems.forEach((s) => events.push({ date: s.date, planned: 0, actual: s.amount }));
    });
    events.sort((a, b) => a.date.localeCompare(b.date));
    let cumPlanned = 0, cumActual = 0;
    return events.map((e) => {
      cumPlanned += e.planned;
      cumActual += e.actual;
      return { date: format(parseISO(e.date), "dd MMM"), Planeado: cumPlanned, Real: cumActual };
    });
  }, [budget]);

  const projection = (actual / Math.max(1, planned)) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Control Presupuestal</h2>
          <p className="text-sm text-muted-foreground">Planeado vs real (suma de subrubros), flujo de caja y proyección.</p>
        </div>
        <Button onClick={() => setBudgetDialog({ mode: "create" })}><Plus className="h-4 w-4" /> Nuevo rubro</Button>
      </div>

      {overbudget.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">{overbudget.length} rubro(s) con sobrecosto</p>
            <p className="text-muted-foreground mt-1">
              {overbudget.map((b) => `${b.description} (+${fmt(budgetActual(b) - b.planned)})`).join(" · ")}
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
        <CardContent className="space-y-2">
          {budget.map((b) => {
            const real = budgetActual(b);
            const diff = real - b.planned;
            const over = diff > 0;
            const isOpen = expanded[b.id];
            return (
              <div key={b.id} className="rounded-md border border-border">
                <div className="flex items-center gap-2 p-3">
                  <button onClick={() => setExpanded({ ...expanded, [b.id]: !isOpen })} className="text-muted-foreground hover:text-foreground">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{b.description}</div>
                    <div className="text-xs text-muted-foreground">{b.category} · {b.date} · {b.subItems.length} subrubro(s)</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Planeado</div>
                    <div className="text-sm tabular-nums">{fmt(b.planned)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Real</div>
                    <div className="text-sm tabular-nums">{fmt(real)}</div>
                  </div>
                  <div className="text-right w-24">
                    <div className="text-xs text-muted-foreground">Variación</div>
                    <div className={`text-sm tabular-nums ${over ? "text-destructive" : "text-primary"}`}>
                      {over ? "+" : ""}{fmt(diff)}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setBudgetDialog({ mode: "edit", item: b })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => removeBudget(b.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {isOpen && (
                  <div className="border-t border-border p-3 space-y-2 bg-muted/20">
                    {b.subItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin subrubros. Agrega el primer gasto.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {b.subItems.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 text-sm rounded border border-border bg-background p-2">
                            <span className="flex-1 truncate">{s.description}</span>
                            <span className="text-xs text-muted-foreground">{s.date}</span>
                            <span className="tabular-nums w-24 text-right">{fmt(s.amount)}</span>
                            <Button variant="ghost" size="icon" onClick={() => setSubDialog({ budgetId: b.id, sub: s })}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => removeSubItem(b.id, s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setSubDialog({ budgetId: b.id })}>
                      <Plus className="h-3.5 w-3.5" /> Agregar subrubro
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {budgetDialog && (
        <BudgetDialog
          item={budgetDialog.item}
          onClose={() => setBudgetDialog(null)}
          onSave={(b) => {
            if (budgetDialog.mode === "edit" && budgetDialog.item) updateBudget(budgetDialog.item.id, b);
            else addBudget(b);
            setBudgetDialog(null);
          }}
        />
      )}
      {subDialog && (
        <SubItemDialog
          sub={subDialog.sub}
          onClose={() => setSubDialog(null)}
          onSave={(s) => {
            if (subDialog.sub) updateSubItem(subDialog.budgetId, subDialog.sub.id, s);
            else addSubItem(subDialog.budgetId, s);
            setSubDialog(null);
          }}
        />
      )}
    </div>
  );
}

function BudgetDialog({ item, onSave, onClose }: {
  item?: BudgetItem;
  onSave: (b: Omit<BudgetItem, "id" | "subItems">) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    category: item?.category ?? "",
    description: item?.description ?? "",
    planned: item?.planned ?? 0,
    date: item?.date ?? format(new Date(), "yyyy-MM-dd"),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Editar rubro" : "Nuevo rubro"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoría</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Fecha</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <div><Label>Descripción</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Monto planeado ($)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input type="number" min={0} step="0.01" value={form.planned} onChange={(e) => setForm({ ...form, planned: Number(e.target.value) })} className="pl-7" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valor monetario presupuestado. El valor real se calcula sumando los subrubros que agregues.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => form.category && onSave(form)}>{item ? "Guardar" : "Crear rubro"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubItemDialog({ sub, onSave, onClose }: {
  sub?: BudgetSubItem;
  onSave: (s: Omit<BudgetSubItem, "id">) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    description: sub?.description ?? "",
    amount: sub?.amount ?? 0,
    date: sub?.date ?? format(new Date(), "yyyy-MM-dd"),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{sub ? "Editar subrubro" : "Nuevo subrubro"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descripción del gasto</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="pl-7" />
              </div>
            </div>
            <div><Label>Fecha</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Este monto se sumará al "Real" del rubro padre.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => form.description && onSave(form)}>{sub ? "Guardar" : "Agregar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

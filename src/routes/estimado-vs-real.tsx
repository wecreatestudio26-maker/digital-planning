import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProductivity } from "@/lib/productivity-store";
import { useActivities } from "@/lib/activities-store";

export const Route = createFileRoute("/estimado-vs-real")({
  head: () => ({ meta: [{ title: "Estimado vs Real — Planeador" }, { name: "description", content: "Comparativa de horas estimadas vs reales." }] }),
  component: VsPage,
});

function VsPage() {
  const { activities } = useActivities();
  const { estimates, setEstimate } = useProductivity();
  const getEst = (id: string) => estimates.find((e) => e.taskId === id) ?? { taskId: id, estimatedHours: 0, actualHours: 0 };

  const rows = activities.map((a) => {
    const e = getEst(a.id);
    const variance = e.estimatedHours > 0 ? ((e.actualHours - e.estimatedHours) / e.estimatedHours) * 100 : 0;
    return { a, ...e, variance };
  });
  const overByProject: Record<string, { est: number; act: number }> = {};
  rows.forEach((r) => {
    const k = r.a.category;
    overByProject[k] = overByProject[k] || { est: 0, act: 0 };
    overByProject[k].est += r.estimatedHours;
    overByProject[k].act += r.actualHours;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Estimado vs Real</h2>
        <p className="text-sm text-muted-foreground">Variación de horas por tarea y categoría. Rojo si supera el estimado en más de 20%.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Por categoría</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left py-2 font-normal">Categoría</th>
              <th className="text-right font-normal">Estimado</th>
              <th className="text-right font-normal">Real</th>
              <th className="text-right font-normal">Variación</th>
            </tr></thead>
            <tbody>
              {Object.entries(overByProject).map(([k, v]) => {
                const variance = v.est > 0 ? ((v.act - v.est) / v.est) * 100 : 0;
                const danger = variance > 20;
                return (
                  <tr key={k} className="border-b border-border/50">
                    <td className="py-2">{k}</td>
                    <td className="text-right tabular-nums">{v.est}h</td>
                    <td className="text-right tabular-nums">{v.act}h</td>
                    <td className={`text-right tabular-nums font-medium ${danger ? "text-red-400" : variance < 0 ? "text-primary" : ""}`}>{variance >= 0 ? "+" : ""}{variance.toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Por tarea</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left py-2 font-normal">Tarea</th>
              <th className="text-right font-normal w-28">Estimado (h)</th>
              <th className="text-right font-normal w-28">Real (h)</th>
              <th className="text-right font-normal w-24">Variación</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => {
                const danger = r.variance > 20 && r.estimatedHours > 0;
                return (
                  <tr key={r.a.id} className={`border-b border-border/50 ${danger ? "bg-red-500/5" : ""}`}>
                    <td className="py-2">
                      <div className="font-medium">{r.a.name}</div>
                      <div className="text-xs text-muted-foreground">{r.a.category}</div>
                    </td>
                    <td><Input type="number" value={r.estimatedHours} onChange={(e) => setEstimate(r.a.id, Number(e.target.value), r.actualHours)} className="h-8 text-right" /></td>
                    <td><Input type="number" value={r.actualHours} onChange={(e) => setEstimate(r.a.id, r.estimatedHours, Number(e.target.value))} className="h-8 text-right" /></td>
                    <td className={`text-right tabular-nums font-medium ${danger ? "text-red-400" : r.variance < 0 ? "text-primary" : ""}`}>
                      {r.estimatedHours > 0 ? `${r.variance >= 0 ? "+" : ""}${r.variance.toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

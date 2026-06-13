import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, subWeeks } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { useProductivity, weekStartStr } from "@/lib/productivity-store";
import { useActivities } from "@/lib/activities-store";

export const Route = createFileRoute("/evaluacion")({
  head: () => ({ meta: [{ title: "Evaluación Semanal — Planeador" }, { name: "description", content: "Review semanal automática con score y tendencia." }] }),
  component: EvalPage,
});

function EvalPage() {
  const { reviews, saveReview } = useProductivity();
  const { activities } = useActivities();
  const ws = weekStartStr();
  const existing = reviews.find((r) => r.weekStart === ws);
  const [good, setGood] = useState(existing?.good ?? "");
  const [improve, setImprove] = useState(existing?.improve ?? "");
  const [score, setScore] = useState(existing?.score ?? 7);
  const completed = activities.filter((a) => a.status === "completado").length;

  const trend = useMemo(() => {
    const sorted = [...reviews].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).slice(-12);
    return sorted.map((r) => ({ week: r.weekStart.slice(5), score: r.score }));
  }, [reviews]);

  const today = new Date();
  const isSunday = today.getDay() === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Evaluación semanal</h2>
        <p className="text-sm text-muted-foreground">
          {isSunday ? "Es domingo — momento perfecto para revisar la semana." : "Reflexiona sobre tu semana."}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Semana del {ws}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Resumen automático: <span className="text-foreground font-medium">{completed}</span> tareas completadas en total.
          </div>
          <div>
            <Label>¿Qué salió bien?</Label>
            <Textarea value={good} onChange={(e) => setGood(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>¿Qué mejorar?</Label>
            <Textarea value={improve} onChange={(e) => setImprove(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Puntuación: {score}/10</Label>
            <Slider value={[score]} onValueChange={([v]) => setScore(v)} min={1} max={10} step={1} className="mt-2" />
          </div>
          <Button onClick={() => saveReview({ weekStart: ws, good, improve, score, completedCount: completed })}>
            Guardar evaluación
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tendencia de puntuación</CardTitle></CardHeader>
        <CardContent className="h-64">
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay evaluaciones registradas.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                <XAxis dataKey="week" stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <YAxis domain={[0, 10]} stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.255 0.035 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[...reviews].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 8).map((r) => (
            <div key={r.id} className="border-b border-border pb-3 last:border-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">Semana {r.weekStart}</span>
                <span className="text-sm">⭐ {r.score}/10 · {r.completedCount} tareas</span>
              </div>
              {r.good && <p className="text-sm"><span className="text-primary">+</span> {r.good}</p>}
              {r.improve && <p className="text-sm"><span className="text-orange-400">△</span> {r.improve}</p>}
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-muted-foreground">Sin historial.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

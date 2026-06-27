import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import { useActivities } from "@/lib/activities-store";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/enfoque")({
  validateSearch: (s: Record<string, unknown>) => ({ taskId: (s.taskId as string) || "" }),
  head: () => ({ meta: [{ title: "Modo Enfoque — Planeador" }, { name: "description", content: "Modo enfoque sin distracciones." }] }),
  component: FocusPage,
});

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function FocusPage() {
  const { t } = useTranslation();
  const { taskId } = useSearch({ from: "/enfoque" });
  const { activities } = useActivities();
  const task = activities.find((a) => a.id === taskId) ?? activities.find((a) => a.status !== "completado") ?? activities[0];
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [checklist, setChecklist] = useState<{ text: string; done: boolean }[]>([
    { text: t("focus.check1"), done: false },
    { text: t("focus.check2"), done: false },
    { text: t("focus.check3"), done: false },
  ]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [running]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <Link to="/actividades" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("focus.exitFocus")}
        </Link>

        <Card className="border-primary/30">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-xs uppercase tracking-wider text-primary">{t("focus.activeTask")}</div>
            <h1 className="text-3xl font-semibold">{task?.name ?? t("focus.noTask")}</h1>
            {task && (
              <p className="text-sm text-muted-foreground">
                {task.category} · {task.assignee} · {task.endDate}
              </p>
            )}

            <div className="py-6">
              <div className="text-7xl font-mono font-bold tabular-nums">{fmt(seconds)}</div>
            </div>

            <div className="flex justify-center gap-2">
              <Button size="lg" onClick={() => setRunning((r) => !r)}>
                {running ? <><Pause className="h-4 w-4" /> {t("focus.pause")}</> : <><Play className="h-4 w-4" /> {t("focus.start")}</>}
              </Button>
              <Button size="lg" variant="outline" onClick={() => { setRunning(false); setSeconds(25 * 60); }}>
                <RotateCcw className="h-4 w-4" /> {t("focus.restart")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="font-medium text-sm">{t("focus.checklistTitle")}</h3>
            {checklist.map((c, i) => (
              <label key={i} className="flex items-center gap-3 text-sm cursor-pointer">
                <Checkbox checked={c.done} onCheckedChange={(v) => setChecklist((cs) => cs.map((x, j) => j === i ? { ...x, done: !!v } : x))} />
                <span className={c.done ? "line-through text-muted-foreground" : ""}>{c.text}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

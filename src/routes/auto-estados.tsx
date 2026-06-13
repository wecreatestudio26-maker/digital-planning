import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { useProductivity } from "@/lib/productivity-store";
import { useActivities } from "@/lib/activities-store";

export const Route = createFileRoute("/auto-estados")({
  head: () => ({ meta: [{ title: "Auto-estados — Planeador" }, { name: "description", content: "Cambio automático de estados de tareas." }] }),
  component: AutoStatesPage,
});

function AutoStatesPage() {
  const { autoStates, setAutoStates, changeLog, addLog } = useProductivity();
  const { activities, update } = useActivities();

  const runNow = () => {
    let count = 0;
    const today = format(new Date(), "yyyy-MM-dd");
    activities.forEach((a) => {
      if (autoStates.overdueAuto && a.status !== "completado" && a.endDate < today) {
        update(a.id, { status: "en_progreso" });
        addLog(a.name, "Marcado en progreso (estaba vencido)");
        count++;
      }
    });
    toast.success(`${count} cambios aplicados`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cambio automático de estados</h2>
        <p className="text-sm text-muted-foreground">Reglas que se aplican a tus tareas automáticamente.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Reglas activas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Subtareas completadas → tarea padre completa</Label><p className="text-xs text-muted-foreground">Marca el padre cuando todos los hijos están listos.</p></div>
            <Switch checked={autoStates.subtaskToParent} onCheckedChange={(v) => setAutoStates({ ...autoStates, subtaskToParent: v })} />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div><Label>Fecha vencida → estado "vencida"</Label><p className="text-xs text-muted-foreground">Marca las tareas con fecha pasada y sin completar.</p></div>
            <Switch checked={autoStates.overdueAuto} onCheckedChange={(v) => setAutoStates({ ...autoStates, overdueAuto: v })} />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div><Label>Horas registradas → en progreso</Label><p className="text-xs text-muted-foreground">Cambia a "en progreso" al registrar tiempo.</p></div>
            <Switch checked={autoStates.hoursToProgress} onCheckedChange={(v) => setAutoStates({ ...autoStates, hoursToProgress: v })} />
          </div>
          <Button onClick={runNow}>Ejecutar ahora</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Log de cambios</CardTitle></CardHeader>
        <CardContent>
          {changeLog.length === 0 ? <p className="text-sm text-muted-foreground">Sin cambios registrados.</p> : (
            <ul className="space-y-2 text-sm">
              {changeLog.map((l) => (
                <li key={l.id} className="flex gap-3 border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground tabular-nums">{l.ts.slice(0, 16).replace("T", " ")}</span>
                  <span className="font-medium">{l.entity}</span>
                  <span className="text-muted-foreground flex-1">{l.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

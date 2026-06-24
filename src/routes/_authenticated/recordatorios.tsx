import { createFileRoute } from "@tanstack/react-router";
import { differenceInDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { useProductivity } from "@/lib/productivity-store";
import { useActivities } from "@/lib/activities-store";

export const Route = createFileRoute("/recordatorios")({
  head: () => ({ meta: [{ title: "Recordatorios — Planeador" }, { name: "description", content: "Configuración de recordatorios internos." }] }),
  component: RemindersPage,
});

function RemindersPage() {
  const { reminders, setReminders, meetings } = useProductivity();
  const { activities } = useActivities();
  const today = new Date();

  const upcoming = activities.filter((a) => {
    const d = differenceInDays(parseISO(a.endDate), today);
    return d >= 0 && d <= reminders.daysBeforeDeadline && a.status !== "completado";
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Recordatorios</h2>
        <p className="text-sm text-muted-foreground">Configura cuándo enviar recordatorios automáticos.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Configuración</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Días antes de la fecha límite</Label>
              <Input type="number" value={reminders.daysBeforeDeadline} onChange={(e) => setReminders({ ...reminders, daysBeforeDeadline: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Minutos antes de reunión</Label>
              <Input type="number" value={reminders.minutesBeforeMeeting} onChange={(e) => setReminders({ ...reminders, minutesBeforeMeeting: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <Label>Recordatorio semanal de evaluación</Label>
              <p className="text-xs text-muted-foreground">Se enviará cada domingo</p>
            </div>
            <Switch checked={reminders.weeklyReview} onCheckedChange={(v) => setReminders({ ...reminders, weeklyReview: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Próximos recordatorios</CardTitle></CardHeader>
        <CardContent>
          {upcoming.length === 0 && meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay recordatorios programados.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((a) => (
                <li key={a.id} className="flex justify-between border-b border-border/50 pb-2">
                  <span><span className="font-medium">{a.name}</span> · vence {a.endDate}</span>
                  <span className="text-orange-400">{differenceInDays(parseISO(a.endDate), today)} días</span>
                </li>
              ))}
              {meetings.slice(0, 3).map((m) => (
                <li key={m.id} className="flex justify-between border-b border-border/50 pb-2">
                  <span><span className="font-medium">Reunión:</span> {m.title}</span>
                  <span className="text-blue-400">{m.date}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

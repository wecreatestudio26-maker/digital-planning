import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActivities } from "@/lib/activities-store";
import { cn } from "@/lib/utils";
import type { Activity, Status } from "@/lib/types";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario — Planeador de Actividades" },
      { name: "description", content: "Vista mensual, semanal y diaria de tus actividades." },
    ],
  }),
  component: CalendarPage,
});

const statusBar: Record<Status, string> = {
  pendiente: "bg-[oklch(0.65_0.02_255)]",
  en_progreso: "bg-[oklch(0.82_0.17_85)]",
  completado: "bg-primary",
};

function CalendarPage() {
  const { activities, update } = useActivities();
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(new Date());
  const [dragId, setDragId] = useState<string | null>(null);

  const activitiesOn = (day: Date) =>
    activities.filter((a) => {
      try {
        const s = parseISO(a.startDate);
        const e = parseISO(a.endDate);
        return day >= new Date(s.setHours(0, 0, 0, 0)) && day <= new Date(e.setHours(23, 59, 59, 999));
      } catch { return false; }
    });

  const onDrop = (day: Date) => {
    if (!dragId) return;
    const a = activities.find((x) => x.id === dragId);
    if (!a) return;
    const start = parseISO(a.startDate);
    const end = parseISO(a.endDate);
    const diff = end.getTime() - start.getTime();
    const newStart = format(day, "yyyy-MM-dd");
    const newEnd = format(new Date(day.getTime() + diff), "yyyy-MM-dd");
    update(a.id, { startDate: newStart, endDate: newEnd });
    setDragId(null);
  };

  const shift = (dir: 1 | -1) => {
    if (view === "month") setCursor((c) => (dir === 1 ? addMonths(c, 1) : subMonths(c, 1)));
    else if (view === "week") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => addDays(c, dir));
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return format(cursor, "MMMM yyyy", { locale: es });
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(start, "dd MMM", { locale: es })} – ${format(end, "dd MMM yyyy", { locale: es })}`;
    }
    return format(cursor, "EEEE dd 'de' MMMM yyyy", { locale: es });
  }, [cursor, view]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Calendario</h2>
          <p className="text-sm text-muted-foreground capitalize">{headerLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="month">Mes</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="day">Día</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hoy</Button>
            <Button variant="outline" size="icon" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {view === "month" && (
        <MonthGrid
          cursor={cursor}
          activitiesOn={activitiesOn}
          onDrop={onDrop}
          setDragId={setDragId}
        />
      )}
      {view === "week" && (
        <WeekView cursor={cursor} activitiesOn={activitiesOn} onDrop={onDrop} setDragId={setDragId} />
      )}
      {view === "day" && (
        <DayView day={cursor} activities={activitiesOn(cursor)} setDragId={setDragId} />
      )}
    </div>
  );
}

function ActivityPill({ a, onDragStart }: { a: Activity; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group flex items-center gap-1.5 rounded-md bg-accent/60 hover:bg-accent px-1.5 py-1 text-xs cursor-grab active:cursor-grabbing"
      title={`${a.name} · ${a.assignee}`}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", statusBar[a.status])} />
      <span className="truncate">{a.name}</span>
    </div>
  );
}

function MonthGrid({
  cursor, activitiesOn, onDrop, setDragId,
}: {
  cursor: Date;
  activitiesOn: (d: Date) => Activity[];
  onDrop: (d: Date) => void;
  setDragId: (id: string | null) => void;
}) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="px-2 py-2 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const items = activitiesOn(day);
          const isCur = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(day)}
              className={cn(
                "min-h-[110px] border-b border-r border-border p-1.5 flex flex-col gap-1",
                !isCur && "bg-background/40 text-muted-foreground/60",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday && "bg-primary text-primary-foreground font-semibold",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                {items.slice(0, 3).map((a) => (
                  <ActivityPill key={a.id} a={a} onDragStart={() => setDragId(a.id)} />
                ))}
                {items.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{items.length - 3} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeekView({
  cursor, activitiesOn, onDrop, setDragId,
}: {
  cursor: Date;
  activitiesOn: (d: Date) => Activity[];
  onDrop: (d: Date) => void;
  setDragId: (id: string | null) => void;
}) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const items = activitiesOn(day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(day)}
              className="min-h-[420px] border-r border-border p-2 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs text-muted-foreground capitalize">
                  {format(day, "EEE", { locale: es })}
                </span>
                <span className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary text-primary-foreground font-semibold",
                )}>{format(day, "d")}</span>
              </div>
              {items.map((a) => (
                <ActivityPill key={a.id} a={a} onDragStart={() => setDragId(a.id)} />
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DayView({ day, activities, setDragId }: {
  day: Date;
  activities: Activity[];
  setDragId: (id: string | null) => void;
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-medium capitalize">{format(day, "EEEE dd 'de' MMMM", { locale: es })}</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin actividades en este día.</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((a) => (
            <li
              key={a.id}
              draggable
              onDragStart={() => setDragId(a.id)}
              className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-accent/40"
            >
              <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full shrink-0", statusBar[a.status])} />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.assignee} · {a.category}
                  {a.startTime && ` · ${a.startTime}${a.endTime ? `–${a.endTime}` : ""}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

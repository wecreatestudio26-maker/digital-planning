import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { es, enUS, fr, it } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActivities } from "@/lib/activities-store";
import { cn } from "@/lib/utils";
import type { Activity, Status } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/calendario")({
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

const LOCALE_MAP = { es, en: enUS, fr, it } as const;
type LocaleKey = keyof typeof LOCALE_MAP;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 55%)`;
}

function AssigneeBadge({ name }: { name: string }) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-semibold text-white shrink-0"
        style={{ backgroundColor: colorFor(name) }}
        aria-hidden
      >
        {initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </div>
  );
}

function CalendarPage() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_MAP[(i18n.resolvedLanguage as LocaleKey) ?? "es"] ?? es;
  const { activities, update } = useActivities();
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(new Date());
  const [dragId, setDragId] = useState<string | null>(null);
  const [pulseToday, setPulseToday] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

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

  const goToday = () => {
    setCursor(new Date());
    setPulseToday(true);
    requestAnimationFrame(() => {
      const today = format(new Date(), "yyyy-MM-dd");
      const cell = gridRef.current?.querySelector(`[data-date="${today}"]`);
      cell?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    setTimeout(() => setPulseToday(false), 2000);
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return format(cursor, "MMMM yyyy", { locale });
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(start, "dd MMM", { locale })} – ${format(end, "dd MMM yyyy", { locale })}`;
    }
    return format(cursor, "EEEE dd MMMM yyyy", { locale });
  }, [cursor, view, locale]);

  const dayHeaders = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(base, i), "EEE", { locale }));
  }, [locale]);

  return (
    <div className="space-y-4" ref={gridRef}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("calendar.title")}</h2>
          <p className="text-sm text-muted-foreground capitalize">{headerLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="month">{t("common.month")}</TabsTrigger>
              <TabsTrigger value="week">{t("common.week")}</TabsTrigger>
              <TabsTrigger value="day">{t("common.day")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>{t("common.today")}</Button>
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
          dayHeaders={dayHeaders}
          pulseToday={pulseToday}
          moreLabel={t("calendar.more")}
        />
      )}
      {view === "week" && (
        <WeekView
          cursor={cursor}
          activitiesOn={activitiesOn}
          onDrop={onDrop}
          setDragId={setDragId}
          locale={locale}
          pulseToday={pulseToday}
        />
      )}
      {view === "day" && (
        <DayView
          day={cursor}
          activities={activitiesOn(cursor)}
          setDragId={setDragId}
          locale={locale}
          emptyLabel={t("calendar.noActivitiesDay")}
        />
      )}
    </div>
  );
}

function ActivityPill({ a, onDragStart }: { a: Activity; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group rounded-md bg-accent/60 hover:bg-accent px-1.5 py-1 cursor-grab active:cursor-grabbing"
      title={`${a.name} · ${a.assignee}`}
    >
      <div className="flex items-center gap-1.5 text-xs">
        <span className={cn("h-2 w-2 rounded-full shrink-0", statusBar[a.status])} />
        <span className="truncate">{a.name}</span>
      </div>
      <div className="pl-3.5">
        <AssigneeBadge name={a.assignee} />
      </div>
    </div>
  );
}

function MonthGrid({
  cursor, activitiesOn, onDrop, setDragId, dayHeaders, pulseToday, moreLabel,
}: {
  cursor: Date;
  activitiesOn: (d: Date) => Activity[];
  onDrop: (d: Date) => void;
  setDragId: (id: string | null) => void;
  dayHeaders: string[];
  pulseToday: boolean;
  moreLabel: string;
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
        {dayHeaders.map((d) => (
          <div key={d} className="px-2 py-2 text-center capitalize">{d}</div>
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
              data-date={format(day, "yyyy-MM-dd")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(day)}
              className={cn(
                "min-h-[130px] border-b border-r border-border p-1.5 flex flex-col gap-1 transition-all",
                !isCur && "bg-background/40 text-muted-foreground/60",
                isToday && pulseToday && "ring-2 ring-primary ring-inset",
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
                  <span className="text-[10px] text-muted-foreground">+{items.length - 3} {moreLabel}</span>
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
  cursor, activitiesOn, onDrop, setDragId, locale, pulseToday,
}: {
  cursor: Date;
  activitiesOn: (d: Date) => Activity[];
  onDrop: (d: Date) => void;
  setDragId: (id: string | null) => void;
  locale: Locale;
  pulseToday: boolean;
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
              data-date={format(day, "yyyy-MM-dd")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(day)}
              className={cn(
                "min-h-[420px] border-r border-border p-2 flex flex-col gap-2 transition-all",
                isToday && pulseToday && "ring-2 ring-primary ring-inset",
              )}
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs text-muted-foreground capitalize">
                  {format(day, "EEE", { locale })}
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

function DayView({ day, activities, setDragId, locale, emptyLabel }: {
  day: Date;
  activities: Activity[];
  setDragId: (id: string | null) => void;
  locale: Locale;
  emptyLabel: string;
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-medium capitalize">{format(day, "EEEE dd MMMM", { locale })}</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
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
                <div className="mt-1">
                  <AssigneeBadge name={a.assignee} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.category}
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

// keep referenced to silence unused import warnings in some bundlers
void useEffect;

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es, enUS, fr, it, type Locale } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ActivityForm } from "@/components/ActivityForm";
import { useActivities } from "@/lib/activities-store";
import type { Activity } from "@/lib/types";

const LOCALE_MAP: Record<string, Locale> = { es, en: enUS, fr, it };

export function DayActivitiesSheet({
  day,
  open,
  onOpenChange,
}: {
  day: Date | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_MAP[i18n.resolvedLanguage ?? "es"] ?? es;
  const { activities, remove } = useActivities();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

  const dayStr = day ? format(day, "yyyy-MM-dd") : "";
  const items = day
    ? activities.filter((a) => {
        try {
          const s = parseISO(a.startDate);
          const e = parseISO(a.endDate);
          const d = new Date(day);
          d.setHours(12, 0, 0, 0);
          return d >= new Date(s.setHours(0, 0, 0, 0)) && d <= new Date(e.setHours(23, 59, 59, 999));
        } catch {
          return false;
        }
      })
    : [];

  const openNew = () => {
    setEditing(null);
    setPrefillDate(dayStr);
    setFormOpen(true);
  };

  const openEdit = (a: Activity) => {
    setEditing(a);
    setPrefillDate(null);
    setFormOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0">
          <SheetHeader>
            <SheetTitle className="capitalize">
              {day ? format(day, "EEEE d MMMM yyyy", { locale }) : ""}
            </SheetTitle>
            <SheetDescription>
              {t("calendar.sheet.count", { count: items.length })}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">{t("calendar.sheet.empty")}</p>
                <Button size="sm" onClick={openNew}>
                  <Plus className="h-4 w-4" /> {t("calendar.sheet.addActivity")}
                </Button>
              </div>
            ) : (
              items.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-border p-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.assignee} · {a.category}
                        {a.startTime ? ` · ${a.startTime}${a.endTime ? `–${a.endTime}` : ""}` : ""}
                      </p>
                      <div className="mt-2">
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)} aria-label={t("common.edit")}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(a.id)} aria-label={t("common.delete")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-border p-4">
              <Button className="w-full" onClick={openNew}>
                <Plus className="h-4 w-4" /> {t("calendar.sheet.addActivity")}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ActivityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        prefillStartDate={prefillDate ?? undefined}
      />
    </>
  );
}

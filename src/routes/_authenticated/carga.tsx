import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useActivities } from "@/lib/activities-store";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/carga")({
  head: () => ({ meta: [{ title: "Carga de Trabajo — Planeador" }, { name: "description", content: "Carga por persona con semáforo." }] }),
  component: WorkloadPage,
});

function WorkloadPage() {
  const { t } = useTranslation();
  const { activities } = useActivities();
  const byPerson: Record<string, { total: number; pending: number }> = {};
  activities.forEach((a) => {
    byPerson[a.assignee] = byPerson[a.assignee] || { total: 0, pending: 0 };
    byPerson[a.assignee].total++;
    if (a.status !== "completado") byPerson[a.assignee].pending++;
  });
  const max = Math.max(1, ...Object.values(byPerson).map((v) => v.pending));

  const traffic = (n: number) => n >= 6
    ? { color: "bg-red-500", label: t("workload.high"), text: "text-red-400" }
    : n >= 3
    ? { color: "bg-yellow-500", label: t("workload.medium"), text: "text-yellow-400" }
    : { color: "bg-primary", label: t("workload.low"), text: "text-primary" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("workload.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("workload.subtitle")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(byPerson).map(([name, v]) => {
          const tl = traffic(v.pending);
          return (
            <Card key={name}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">{t("workload.pendingOf", { pending: v.pending, total: v.total })}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${tl.color}`} />
                    <span className={`text-sm font-medium ${tl.text}`}>{tl.label}</span>
                  </div>
                </div>
                <Progress value={(v.pending / max) * 100} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

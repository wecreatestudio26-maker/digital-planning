import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ListPlus, CheckCircle2, RotateCcw, Archive } from "lucide-react";
import { toast } from "sonner";
import { useProductivity } from "@/lib/productivity-store";
import { useActivities } from "@/lib/activities-store";

export const Route = createFileRoute("/_authenticated/reuniones")({
  head: () => ({ meta: [{ title: "Reuniones — Planeador" }, { name: "description", content: "Agenda, actas y acuerdos." }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { t } = useTranslation();
  const {
    meetings, addMeeting, updateMeeting, removeMeeting,
    addAgreement, toggleAgreementDone, removeAgreement, convertAgreement,
    completeMeeting, reopenMeeting,
  } = useProductivity();
  const { add: addActivity } = useActivities();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: format(new Date(), "yyyy-MM-dd"), agenda: "" });
  const [newAgr, setNewAgr] = useState<Record<string, string>>({});

  const active = meetings.filter((m) => !m.completed);
  const archived = meetings.filter((m) => m.completed);

  const renderMeetings = (list: typeof meetings) => (
    <div className="grid gap-4 lg:grid-cols-2">
      {list.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("meetings.empty")}</p>
      )}
      {list.map((m) => {
        const allDone = m.agreements.length > 0 && m.agreements.every((a) => a.done);
        return (
          <Card key={m.id} className={m.completed ? "opacity-80" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    {m.title}
                    {m.completed && <Archive className="h-3.5 w-3.5 text-muted-foreground" />}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {m.date}{m.archivedAt && ` · ${t("meetings.archivedOn", { date: m.archivedAt.slice(0, 10) })}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm(t("meetings.confirmDelete"))) removeMeeting(m.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">{t("meetings.agenda")}</Label>
                <Textarea value={m.agenda} onChange={(e) => updateMeeting(m.id, { agenda: e.target.value })} rows={2} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{t("meetings.minutes")}</Label>
                <Textarea value={m.minutes} onChange={(e) => updateMeeting(m.id, { minutes: e.target.value })} rows={3} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{t("meetings.agreements")}</Label>
                <ul className="space-y-1.5 mt-1">
                  {m.agreements.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-sm group">
                      <input
                        type="checkbox"
                        checked={!!a.done}
                        onChange={() => toggleAgreementDone(m.id, a.id)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                      <span className={`flex-1 ${a.done ? "line-through text-muted-foreground" : ""}`}>
                        {a.text}
                        {a.convertedTaskId && <span className="text-xs text-primary ml-1">({t("meetings.task")})</span>}
                      </span>
                      {!a.convertedTaskId && !m.completed && (
                        <Button size="sm" variant="ghost" onClick={() => {
                          const id = crypto.randomUUID();
                          addActivity({
                            name: a.text,
                            category: "Reuniones",
                            startDate: m.date,
                            endDate: format(addDays(new Date(m.date), 7), "yyyy-MM-dd"),
                            assignee: a.assignee ?? "Sin asignar",
                            priority: "media",
                            status: "pendiente",
                            description: t("meetings.agreementDesc", { title: m.title }),
                          });
                          convertAgreement(m.id, a.id, id);
                          toast.success(t("meetings.agreementConverted"));
                        }}><ListPlus className="h-3.5 w-3.5" /> {t("meetings.makeTask")}</Button>
                      )}
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => removeAgreement(m.id, a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
                {!m.completed && (
                  <div className="flex gap-2 mt-2">
                    <Input value={newAgr[m.id] ?? ""} onChange={(e) => setNewAgr({ ...newAgr, [m.id]: e.target.value })} placeholder={t("meetings.newAgreement")} className="h-8" />
                    <Button size="sm" onClick={() => { const v = newAgr[m.id]; if (v) { addAgreement(m.id, v); setNewAgr({ ...newAgr, [m.id]: "" }); } }}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                {m.completed ? (
                  <Button variant="outline" className="w-full" onClick={() => { reopenMeeting(m.id); toast.success(t("meetings.reactivated")); }}>
                    <RotateCcw className="h-4 w-4" /> {t("meetings.reactivate")}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    disabled={!allDone}
                    onClick={() => { completeMeeting(m.id); toast.success(t("meetings.completedToast")); }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {allDone ? t("meetings.markComplete") : t("meetings.completeProgress", { done: m.agreements.filter((a) => a.done).length, total: m.agreements.length })}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("meetings.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("meetings.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> {t("meetings.newMeeting")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("meetings.newMeeting")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("meetings.meetingTitle")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>{t("meetings.date")}</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>{t("meetings.agenda")}</Label><Textarea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={() => { if (form.title) { addMeeting({ ...form, minutes: "" }); setForm({ title: "", date: format(new Date(), "yyyy-MM-dd"), agenda: "" }); setOpen(false); } }}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">{t("meetings.activeTab", { count: active.length })}</TabsTrigger>
          <TabsTrigger value="archived">{t("meetings.archivedTab", { count: archived.length })}</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">{renderMeetings(active)}</TabsContent>
        <TabsContent value="archived" className="mt-4">{renderMeetings(archived)}</TabsContent>
      </Tabs>
    </div>
  );
}

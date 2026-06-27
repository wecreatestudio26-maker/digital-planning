import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowRight, Pencil } from "lucide-react";
import { useProductivity, type Rule } from "@/lib/productivity-store";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/reglas")({
  head: () => ({ meta: [{ title: "Motor de Reglas — Planeador" }, { name: "description", content: "Reglas si esto, entonces esto." }] }),
  component: RulesPage,
});

function RulesPage() {
  const { t } = useTranslation();
  const { rules, addRule, updateRule, toggleRule, removeRule } = useProductivity();
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; rule?: Rule } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("rules.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("rules.subtitle")}</p>
        </div>
        <Button onClick={() => setEditing({ mode: "create" })}><Plus className="h-4 w-4" /> {t("rules.newRule")}</Button>
      </div>

      <div className="grid gap-3">
        {rules.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <Switch checked={r.enabled} onCheckedChange={() => toggleRule(r.id)} />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.name}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-xs">{t("rules.si")} {t(`rules.when_${r.when}`)}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">{t("rules.entonces")} {t(`rules.then_${r.then}`)}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditing({ mode: "edit", rule: r })}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm(t("rules.confirmDelete", { name: r.name }))) removeRule(r.id); }}><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <RuleDialog
          rule={editing.rule}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            if (editing.mode === "edit" && editing.rule) updateRule(editing.rule.id, r);
            else addRule(r);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function RuleDialog({ rule, onSave, onClose }: {
  rule?: Rule;
  onSave: (r: Omit<Rule, "id">) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const WHEN_KEYS: Rule["when"][] = ["task_overdue", "budget_over", "risk_high", "no_activity"];
  const THEN_KEYS: Rule["then"][] = ["notify", "change_status", "create_followup"];

  const [form, setForm] = useState<Omit<Rule, "id">>({
    name: rule?.name ?? "",
    when: rule?.when ?? "task_overdue",
    then: rule?.then ?? "notify",
    enabled: rule?.enabled ?? true,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{rule ? t("rules.dialogEditTitle") : t("rules.dialogNewTitle")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("rules.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>{t("rules.if")}</Label>
            <Select value={form.when} onValueChange={(v) => setForm({ ...form, when: v as Rule["when"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{WHEN_KEYS.map((k) => <SelectItem key={k} value={k}>{t(`rules.when_${k}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("rules.then")}</Label>
            <Select value={form.then} onValueChange={(v) => setForm({ ...form, then: v as Rule["then"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{THEN_KEYS.map((k) => <SelectItem key={k} value={k}>{t(`rules.then_${k}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            <Label>{t("rules.active")}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={() => form.name && onSave(form)}>{rule ? t("rules.save") : t("rules.create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

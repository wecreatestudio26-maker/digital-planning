import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { riskLevel, useExtra, type Risk, type RiskStatus } from "@/lib/extra-store";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/riesgos")({
  head: () => ({
    meta: [
      { title: "Riesgos — Planeador" },
      { name: "description", content: "Matriz de riesgos con probabilidad, impacto y mitigación." },
    ],
  }),
  component: RisksPage,
});

function RisksPage() {
  const { t } = useTranslation();
  const { risks, addRisk, updateRisk, removeRisk } = useExtra();
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; risk?: Risk } | null>(null);

  const STATUS_LABEL: Record<RiskStatus, string> = {
    abierto: t("risks.status_open"),
    mitigado: t("risks.status_mitigated"),
    cerrado: t("risks.status_closed"),
  };

  const matrix: Risk[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
  risks.forEach((r) => matrix[5 - r.impact][r.probability - 1].push(r));

  const summary = [
    { key: "Bajo", label: t("risks.level_low"), color: "#22c55e" },
    { key: "Medio", label: t("risks.level_medium"), color: "#eab308" },
    { key: "Alto", label: t("risks.level_high"), color: "#f97316" },
    { key: "Crítico", label: t("risks.level_critical"), color: "#ef4444" },
  ].map((lvl) => ({
    name: lvl.label,
    value: risks.filter((r) => riskLevel(r.probability, r.impact).label === lvl.key).length,
    color: lvl.color,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("risks.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("risks.subtitle")}</p>
        </div>
        <Button onClick={() => setEditing({ mode: "create" })}><Plus className="h-4 w-4" /> {t("risks.new_risk")}</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{t("risks.matrix_title")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex flex-col justify-between text-xs text-muted-foreground py-2">
                <span className="-rotate-90 origin-bottom-left h-0 whitespace-nowrap translate-y-20 font-medium">{t("risks.impact_axis")}</span>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-5 gap-1.5">
                  {matrix.map((row, ri) =>
                    row.map((cell, ci) => {
                      const impact = 5 - ri;
                      const prob = ci + 1;
                      const lvl = riskLevel(prob, impact);
                      return (
                        <div
                          key={`${ri}-${ci}`}
                          className="aspect-square rounded-md p-1.5 text-[10px] flex flex-col"
                          style={{ background: `${lvl.color}22`, border: `1px solid ${lvl.color}55` }}
                        >
                          <span className="text-muted-foreground">{prob}×{impact}</span>
                          <div className="flex-1 flex flex-wrap gap-0.5 mt-1 content-start">
                            {cell.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => setEditing({ mode: "edit", risk: r })}
                                title={`${r.name} (${t("risks.click_to_edit")})`}
                                className="rounded px-1 py-0.5 text-[10px] font-medium truncate max-w-full"
                                style={{ background: lvl.color, color: "#0f172a" }}
                              >
                                {r.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }),
                  )}
                </div>
                <div className="text-center text-xs text-muted-foreground mt-2">{t("risks.probability_axis")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("risks.summary_title")}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                <XAxis dataKey="name" stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="oklch(0.72 0.02 255)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.255 0.035 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {summary.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("risks.list_title")}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("risks.col_risk")}</TableHead>
                <TableHead>{t("risks.col_category")}</TableHead>
                <TableHead>{t("risks.col_p")}</TableHead>
                <TableHead>{t("risks.col_i")}</TableHead>
                <TableHead>{t("risks.col_level")}</TableHead>
                <TableHead>{t("risks.col_mitigation")}</TableHead>
                <TableHead>{t("risks.col_status")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map((r) => {
                const lvl = riskLevel(r.probability, r.impact);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category}</TableCell>
                    <TableCell>{r.probability}</TableCell>
                    <TableCell>{r.impact}</TableCell>
                    <TableCell>
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `${lvl.color}33`, color: lvl.color }}>
                        {lvl.label} ({lvl.score})
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[260px] truncate">{r.mitigation}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v: RiskStatus) => updateRisk(r.id, { status: v })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["abierto", "mitigado", "cerrado"] as RiskStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing({ mode: "edit", risk: r })}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => removeRisk(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <RiskDialog
          risk={editing.risk}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            if (editing.mode === "edit" && editing.risk) updateRisk(editing.risk.id, r);
            else addRisk(r);
            setEditing(null);
          }}
          statusLabel={STATUS_LABEL}
        />
      )}
    </div>
  );
}

function RiskDialog({ risk, onSave, onClose, statusLabel }: {
  risk?: Risk;
  onSave: (r: Omit<Risk, "id">) => void;
  onClose: () => void;
  statusLabel: Record<RiskStatus, string>;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Omit<Risk, "id">>(
    risk
      ? { name: risk.name, category: risk.category, probability: risk.probability, impact: risk.impact, mitigation: risk.mitigation, status: risk.status }
      : { name: "", category: "Operativo", probability: 3, impact: 3, mitigation: "", status: "abierto" }
  );
  const lvl = riskLevel(form.probability, form.impact);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{risk ? t("risks.dialog_edit") : t("risks.dialog_new")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("risks.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("risks.category")}</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div>
              <Label>{t("risks.status")}</Label>
              <Select value={form.status} onValueChange={(v: RiskStatus) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["abierto", "mitigado", "cerrado"] as RiskStatus[]).map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("risks.probability")}</Label><Input type="number" min={1} max={5} value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} /></div>
            <div><Label>{t("risks.impact")}</Label><Input type="number" min={1} max={5} value={form.impact} onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })} /></div>
          </div>
          <div className="text-sm">{t("risks.level_label")}: <span className="font-medium" style={{ color: lvl.color }}>{lvl.label} ({lvl.score})</span></div>
          <div><Label>{t("risks.mitigation")}</Label><Textarea value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("risks.cancel")}</Button>
          <Button onClick={() => form.name && onSave(form)}>{risk ? t("risks.save_changes") : t("risks.create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

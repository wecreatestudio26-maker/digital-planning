import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from "recharts";
import { riskLevel, useExtra, type Risk, type RiskStatus } from "@/lib/extra-store";
import { useTranslation } from "react-i18next";
import { RichTooltip, EmptyChart, ChartFrame } from "@/lib/chart-utils";

export const Route = createFileRoute("/_authenticated/riesgos")({
  head: () => ({
    meta: [
      { title: "Riesgos — Planeador" },
      { name: "description", content: "Matriz de riesgos con probabilidad, impacto y mitigación." },
    ],
  }),
  component: RisksPage,
});

const LEVELS = ["Bajo", "Medio", "Alto", "Crítico"] as const;

function RisksPage() {
  const { t } = useTranslation();
  const { risks, addRisk, updateRisk, removeRisk } = useExtra();
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; risk?: Risk; prefill?: { probability: number; impact: number } } | null>(null);
  const [cellSheet, setCellSheet] = useState<{ probability: number; impact: number } | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  const STATUS_LABEL: Record<RiskStatus, string> = {
    abierto: t("risks.status_open"),
    mitigado: t("risks.status_mitigated"),
    cerrado: t("risks.status_closed"),
  };

  const assignees = useMemo(() => {
    const s = new Set<string>();
    risks.forEach((r) => r.assignee && s.add(r.assignee));
    return Array.from(s);
  }, [risks]);

  const filtered = useMemo(() => {
    return risks.filter((r) => {
      if (filterLevel !== "all" && riskLevel(r.probability, r.impact).label !== filterLevel) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterAssignee !== "all" && (r.assignee ?? "") !== filterAssignee) return false;
      return true;
    });
  }, [risks, filterLevel, filterStatus, filterAssignee]);

  // matrix[impactRowIndex][probColIndex] = Risk[]
  // Row 0 = impact 5 (top), Row 4 = impact 1 (bottom). Col 0 = prob 1, Col 4 = prob 5.
  const matrix: Risk[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
  filtered.forEach((r) => matrix[5 - r.impact][r.probability - 1].push(r));

  const summary = [
    { key: "Bajo", label: t("risks.level_low"), color: "#22c55e" },
    { key: "Medio", label: t("risks.level_medium"), color: "#eab308" },
    { key: "Alto", label: t("risks.level_high"), color: "#f97316" },
    { key: "Crítico", label: t("risks.level_critical"), color: "#ef4444" },
  ].map((lvl) => ({
    name: lvl.label,
    value: filtered.filter((r) => riskLevel(r.probability, r.impact).label === lvl.key).length,
    color: lvl.color,
  })).filter((s) => s.value > 0);

  const inCell = (p: number, i: number) =>
    filtered.filter((r) => r.probability === p && r.impact === i);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("risks.title")} <span className="text-muted-foreground text-lg font-normal">({filtered.length})</span>
          </h2>
          <p className="text-sm text-muted-foreground">{t("risks.subtitle")}</p>
        </div>
        <Button onClick={() => setEditing({ mode: "create" })}><Plus className="h-4 w-4" /> {t("risks.new_risk")}</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">{t("risks.filter_level")}</Label>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("risks.filter_all")}</SelectItem>
                {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">{t("risks.filter_status")}</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("risks.filter_all")}</SelectItem>
                {(["abierto", "mitigado", "cerrado"] as RiskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {assignees.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{t("risks.filter_assignee")}</Label>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("risks.filter_all")}</SelectItem>
                  {assignees.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{t("risks.matrix_title")}</CardTitle></CardHeader>
          <CardContent>
            {/* Top axis label: Probability */}
            <div className="grid grid-cols-[auto_1fr] gap-2">
              {/* Left axis label: Impact (rotated) */}
              <div className="relative w-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="-rotate-90 whitespace-nowrap text-xs font-medium text-muted-foreground">
                    {t("risks.impact_label")}
                  </span>
                </div>
              </div>
              <div>
                {/* Probability header numbers */}
                <div className="grid grid-cols-[1.5rem_repeat(5,minmax(0,1fr))] gap-1 mb-1">
                  <div />
                  {[1, 2, 3, 4, 5].map((p) => (
                    <div key={p} className="text-center text-[10px] text-muted-foreground">{p}</div>
                  ))}
                </div>
                {matrix.map((row, ri) => {
                  const impact = 5 - ri;
                  return (
                    <div key={ri} className="grid grid-cols-[1.5rem_repeat(5,minmax(0,1fr))] gap-1 mb-1">
                      <div className="flex items-center justify-center text-[10px] text-muted-foreground">{impact}</div>
                      {row.map((cell, ci) => {
                        const prob = ci + 1;
                        const lvl = riskLevel(prob, impact);
                        const empty = cell.length === 0;
                        return (
                          <button
                            key={`${ri}-${ci}`}
                            onClick={() => setCellSheet({ probability: prob, impact })}
                            className={`aspect-square max-h-16 min-h-10 rounded-md text-[10px] font-medium transition-all hover:scale-105 hover:z-10 hover:shadow-md ${empty ? "border border-dashed" : "border"}`}
                            style={{
                              background: empty ? "transparent" : `${lvl.color}33`,
                              borderColor: empty ? "oklch(1 0 0 / 0.15)" : lvl.color,
                              color: empty ? "oklch(0.6 0.02 255)" : lvl.color,
                            }}
                            title={`P${prob}×I${impact} — ${cell.length} riesgo(s)`}
                          >
                            {empty ? "" : cell.length}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                <div className="text-center text-xs font-medium text-muted-foreground mt-2">
                  {t("risks.probability_label")}
                </div>
              </div>
            </div>

            {/* Legend chips */}
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
              {[
                { label: t("risks.level_low"), color: "#22c55e" },
                { label: t("risks.level_medium"), color: "#eab308" },
                { label: t("risks.level_high"), color: "#f97316" },
                { label: t("risks.level_critical"), color: "#ef4444" },
              ].map((l) => (
                <span key={l.label} className="inline-flex items-center gap-1.5 text-xs rounded-full px-2 py-1 border" style={{ background: `${l.color}22`, borderColor: `${l.color}55`, color: l.color }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: l.color }} /> {l.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("risks.summary_title")}</CardTitle></CardHeader>
          <CardContent>
            <ChartFrame>
              {summary.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={summary} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                    <XAxis dataKey="name" stroke="oklch(0.72 0.02 255)" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="oklch(0.72 0.02 255)" fontSize={12} domain={[0, "auto"]} />
                    <Tooltip content={<RichTooltip />} cursor={{ fill: "oklch(1 0 0 / 0.05)" }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="value" position="top" fill="oklch(0.85 0.02 255)" fontSize={11} />
                      {summary.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartFrame>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("risks.list_title")}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 font-normal">{t("risks.col_risk")}</th>
                  <th className="py-2 font-normal">{t("risks.col_category")}</th>
                  <th className="py-2 font-normal text-center">P</th>
                  <th className="py-2 font-normal text-center">I</th>
                  <th className="py-2 font-normal">{t("risks.col_level")}</th>
                  <th className="py-2 font-normal">{t("risks.col_mitigation")}</th>
                  <th className="py-2 font-normal">{t("risks.col_status")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const lvl = riskLevel(r.probability, r.impact);
                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-accent/20">
                      <td className="py-2 font-medium">{r.name}</td>
                      <td className="py-2 text-muted-foreground">{r.category}</td>
                      <td className="py-2 text-center">{r.probability}</td>
                      <td className="py-2 text-center">{r.impact}</td>
                      <td className="py-2">
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `${lvl.color}33`, color: lvl.color }}>
                          {lvl.label} ({lvl.score})
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground max-w-[240px] truncate">{r.mitigation}</td>
                      <td className="py-2">
                        <Select value={r.status} onValueChange={(v: RiskStatus) => updateRisk(r.id, { status: v })}>
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["abierto", "mitigado", "cerrado"] as RiskStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing({ mode: "edit", risk: r })}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => removeRisk(r.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">{t("risks.no_risks")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cell detail sheet */}
      <Sheet open={!!cellSheet} onOpenChange={(o) => !o && setCellSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0">
          <SheetHeader>
            <SheetTitle>
              {cellSheet ? `P${cellSheet.probability} × I${cellSheet.impact}` : ""}
              {cellSheet && (
                <span className="ml-2 text-sm font-normal" style={{ color: riskLevel(cellSheet.probability, cellSheet.impact).color }}>
                  {riskLevel(cellSheet.probability, cellSheet.impact).label}
                </span>
              )}
            </SheetTitle>
            <SheetDescription>{t("risks.cell_desc")}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {cellSheet && (() => {
              const cellRisks = inCell(cellSheet.probability, cellSheet.impact);
              if (cellRisks.length === 0) {
                return (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">{t("risks.cell_empty")}</p>
                    <Button size="sm" onClick={() => {
                      setEditing({ mode: "create", prefill: cellSheet });
                      setCellSheet(null);
                    }}>
                      <Plus className="h-4 w-4" /> {t("risks.new_risk")}
                    </Button>
                  </div>
                );
              }
              return cellRisks.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.category} · {STATUS_LABEL[r.status]}</p>
                      {r.assignee && <p className="text-xs text-muted-foreground">{r.assignee}</p>}
                      {r.mitigation && <p className="text-xs mt-2">{r.mitigation}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing({ mode: "edit", risk: r }); setCellSheet(null); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeRisk(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
          {cellSheet && inCell(cellSheet.probability, cellSheet.impact).length > 0 && (
            <div className="border-t border-border p-4">
              <Button className="w-full" onClick={() => {
                setEditing({ mode: "create", prefill: cellSheet });
                setCellSheet(null);
              }}>
                <Plus className="h-4 w-4" /> {t("risks.new_risk")}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {editing && (
        <RiskDialog
          risk={editing.risk}
          prefill={editing.prefill}
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

function RiskDialog({ risk, prefill, onSave, onClose, statusLabel }: {
  risk?: Risk;
  prefill?: { probability: number; impact: number };
  onSave: (r: Omit<Risk, "id">) => void;
  onClose: () => void;
  statusLabel: Record<RiskStatus, string>;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Omit<Risk, "id">>(
    risk
      ? { name: risk.name, category: risk.category, probability: risk.probability, impact: risk.impact, mitigation: risk.mitigation, status: risk.status, assignee: risk.assignee ?? "" }
      : { name: "", category: "Operativo", probability: prefill?.probability ?? 3, impact: prefill?.impact ?? 3, mitigation: "", status: "abierto", assignee: "" }
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
          <div><Label>{t("risks.assignee")}</Label><Input value={form.assignee ?? ""} onChange={(e) => setForm({ ...form, assignee: e.target.value })} /></div>
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

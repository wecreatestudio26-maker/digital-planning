import { useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { collectSnapshot } from "@/lib/snapshot";
import { toast } from "sonner";

type Fmt = "json" | "csv" | "excel" | "pdf";

const MODULES = [
  { key: "activities", label: "Actividades" },
  { key: "gantt", label: "Gantt" },
  { key: "risks", label: "Riesgos" },
  { key: "budget", label: "Presupuesto" },
  { key: "meetings", label: "Reuniones" },
  { key: "members", label: "Equipo" },
  { key: "templates", label: "Plantillas" },
] as const;

function toRows(snap: ReturnType<typeof collectSnapshot>, key: string): Record<string, unknown>[] {
  const a = snap.activities as { activities?: unknown[] };
  const e = snap.extra as { ganttCharts?: { name: string; tasks: unknown[] }[]; risks?: unknown[]; budget?: unknown[] };
  const p = snap.productivity as { meetings?: unknown[]; members?: unknown[]; templates?: unknown[] };
  switch (key) {
    case "activities": return (a.activities ?? []) as Record<string, unknown>[];
    case "gantt": return (e.ganttCharts ?? []).flatMap((c) => (c.tasks ?? []).map((t) => ({ chart: c.name, ...(t as Record<string, unknown>) })));
    case "risks": return (e.risks ?? []) as Record<string, unknown>[];
    case "budget": return (e.budget ?? []) as Record<string, unknown>[];
    case "meetings": return (p.meetings ?? []).map((m) => { const r = m as Record<string, unknown>; return { ...r, agreements: JSON.stringify(r.agreements ?? []) }; });
    case "members": return (p.members ?? []) as Record<string, unknown>[];
    case "templates": return (p.templates ?? []).map((t) => { const r = t as Record<string, unknown>; return { ...r, tasks: JSON.stringify(r.tasks ?? []) }; });
    default: return [];
  }
}

function downloadBlob(name: string, data: Blob) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [format, setFormat] = useState<Fmt>("excel");
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m.key, true])),
  );

  const doExport = () => {
    const snap = collectSnapshot();
    const active = MODULES.filter((m) => selected[m.key]);
    if (!active.length) { toast.error("Selecciona al menos un módulo"); return; }
    const stamp = Date.now();

    if (format === "json") {
      const data = Object.fromEntries(active.map((m) => [m.key, toRows(snap, m.key)]));
      downloadBlob(`planeador-${stamp}.json`, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    } else if (format === "csv") {
      // one file per module if multiple, or a single file
      if (active.length === 1) {
        downloadBlob(`${active[0].key}-${stamp}.csv`, new Blob([toCsv(toRows(snap, active[0].key))], { type: "text/csv" }));
      } else {
        for (const m of active) {
          const csv = toCsv(toRows(snap, m.key));
          downloadBlob(`${m.key}-${stamp}.csv`, new Blob([csv], { type: "text/csv" }));
        }
      }
    } else if (format === "excel") {
      const wb = XLSX.utils.book_new();
      for (const m of active) {
        const ws = XLSX.utils.json_to_sheet(toRows(snap, m.key));
        XLSX.utils.book_append_sheet(wb, ws, m.label.slice(0, 31));
      }
      XLSX.writeFile(wb, `planeador-${stamp}.xlsx`);
    } else if (format === "pdf") {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(18);
      doc.text("Reporte — Planeador de Actividades", 14, 15);
      doc.setFontSize(10);
      doc.text(new Date().toLocaleString(), 14, 22);
      let y = 30;
      for (const m of active) {
        const rows = toRows(snap, m.key);
        doc.setFontSize(14);
        doc.text(m.label, 14, y);
        y += 4;
        if (!rows.length) {
          doc.setFontSize(10);
          doc.text("(sin datos)", 14, y + 4);
          y += 12;
          continue;
        }
        const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).slice(0, 8);
        autoTable(doc, {
          startY: y + 2,
          head: [cols],
          body: rows.map((r) => cols.map((c) => {
            const v = r[c];
            return v == null ? "" : typeof v === "object" ? JSON.stringify(v).slice(0, 60) : String(v).slice(0, 80);
          })),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [16, 185, 129] },
          margin: { left: 14, right: 14 },
        });
        // @ts-expect-error autotable extends doc
        y = (doc.lastAutoTable?.finalY ?? y + 20) + 10;
        if (y > 180) { doc.addPage(); y = 20; }
      }
      doc.save(`reporte-${stamp}.pdf`);
    }
    toast.success("Exportado");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Exportar datos</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Formato</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as Fmt)} className="grid grid-cols-4 gap-2">
              {(["json", "csv", "excel", "pdf"] as Fmt[]).map((f) => (
                <label key={f} className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value={f} />
                  <span className="uppercase text-sm">{f}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label className="mb-2 block">Módulos</Label>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((m) => (
                <label key={m.key} className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-accent">
                  <Checkbox checked={selected[m.key]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [m.key]: !!v }))} />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={doExport}>Exportar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

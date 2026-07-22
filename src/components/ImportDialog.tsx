import { useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActivities } from "@/lib/activities-store";
import { useExtra, type Risk, type BudgetItem, type GanttTask } from "@/lib/extra-store";
import { useProductivity } from "@/lib/productivity-store";
import type { Activity } from "@/lib/types";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

type Target = "activities" | "risks" | "budget" | "gantt";

const FIELD_MAP: Record<string, string> = {
  nombre: "name", name: "name", title: "name", titulo: "name", "título": "name", actividad: "name", tarea: "name",
  categoria: "category", "categoría": "category", category: "category",
  fecha_inicio: "startDate", inicio: "startDate", "fecha inicio": "startDate", startdate: "startDate", start: "startDate",
  fecha_fin: "endDate", fin: "endDate", "fecha fin": "endDate", enddate: "endDate", end: "endDate",
  responsable: "assignee", assignee: "assignee", owner: "assignee",
  prioridad: "priority", priority: "priority",
  estado: "status", status: "status",
  descripcion: "description", "descripción": "description", description: "description",
  notas: "notes", notes: "notes",
  probabilidad: "probability", probability: "probability",
  impacto: "impact", impact: "impact",
  mitigacion: "mitigation", "mitigación": "mitigation", mitigation: "mitigation",
  planeado: "planned", planned: "planned", presupuesto: "planned",
  progreso: "progress", progress: "progress",
};

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const norm = k.trim().toLowerCase().replace(/\s+/g, "_");
    const mapped = FIELD_MAP[norm] ?? FIELD_MAP[k.trim().toLowerCase()] ?? k;
    out[mapped] = v;
  }
  return out;
}

async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "json") {
    const txt = await file.text();
    const data = JSON.parse(txt);
    if (Array.isArray(data)) return data;
    // snapshot-style: pick first array
    for (const v of Object.values(data)) if (Array.isArray(v)) return v as Record<string, unknown>[];
    return [];
  }
  if (ext === "csv") {
    const txt = await file.text();
    const wb = XLSX.read(txt, { type: "string" });
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
}

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [target, setTarget] = useState<Target>("activities");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState("");

  const handleFile = async (f: File | null) => {
    if (!f) return;
    try {
      const parsed = await parseFile(f);
      setRows(parsed.map(normalizeRow));
      setFileName(f.name);
    } catch (e) {
      toast.error("No se pudo leer el archivo");
      console.error(e);
    }
  };

  const doImport = () => {
    if (!rows.length) { toast.error("Sin filas para importar"); return; }
    let created = 0, updated = 0, errors = 0;

    if (target === "activities") {
      const state = useActivities.getState();
      for (const r of rows) {
        try {
          const norm: Partial<Activity> = {
            name: String(r.name ?? "").trim(),
            category: String(r.category ?? "Otro"),
            startDate: String(r.startDate ?? new Date().toISOString().slice(0, 10)),
            endDate: String(r.endDate ?? r.startDate ?? new Date().toISOString().slice(0, 10)),
            assignee: String(r.assignee ?? ""),
            priority: (["alta", "media", "baja"].includes(String(r.priority)) ? r.priority : "media") as Activity["priority"],
            status: (["pendiente", "en_progreso", "completado"].includes(String(r.status)) ? r.status : "pendiente") as Activity["status"],
            description: r.description ? String(r.description) : undefined,
            notes: r.notes ? String(r.notes) : undefined,
          };
          if (!norm.name) { errors++; continue; }
          const existing = state.activities.find((a) => (r.id && a.id === r.id) || (a.name === norm.name && a.startDate === norm.startDate));
          if (existing) { state.update(existing.id, norm); updated++; }
          else { state.add(norm as Omit<Activity, "id">); created++; }
        } catch { errors++; }
      }
    } else if (target === "risks") {
      const state = useExtra.getState();
      for (const r of rows) {
        try {
          const norm: Omit<Risk, "id"> = {
            name: String(r.name ?? "").trim(),
            category: String(r.category ?? "Operativo"),
            probability: Math.max(1, Math.min(5, Number(r.probability) || 3)),
            impact: Math.max(1, Math.min(5, Number(r.impact) || 3)),
            mitigation: String(r.mitigation ?? ""),
            status: (["abierto", "mitigado", "cerrado"].includes(String(r.status)) ? r.status : "abierto") as Risk["status"],
          };
          if (!norm.name) { errors++; continue; }
          const existing = state.risks.find((x) => (r.id && x.id === r.id) || x.name === norm.name);
          if (existing) { state.updateRisk(existing.id, norm); updated++; }
          else { state.addRisk(norm); created++; }
        } catch { errors++; }
      }
    } else if (target === "budget") {
      const state = useExtra.getState();
      for (const r of rows) {
        try {
          const norm: Omit<BudgetItem, "id" | "subItems"> = {
            category: String(r.category ?? "General"),
            description: String((r as Record<string, unknown>).description ?? r.name ?? ""),
            planned: Number(r.planned) || 0,
            date: String(r.date ?? r.startDate ?? new Date().toISOString().slice(0, 10)),
          };
          if (!norm.description) { errors++; continue; }
          const existing = state.budget.find((x) => (r.id && x.id === r.id) || x.description === norm.description);
          if (existing) { state.updateBudget(existing.id, norm); updated++; }
          else { state.addBudget(norm); created++; }
        } catch { errors++; }
      }
    } else if (target === "gantt") {
      const state = useExtra.getState();
      const chartId = state.activeChartId;
      const chart = state.ganttCharts.find((c) => c.id === chartId);
      for (const r of rows) {
        try {
          const norm: Omit<GanttTask, "id"> = {
            name: String(r.name ?? "").trim(),
            startDate: String(r.startDate ?? new Date().toISOString().slice(0, 10)),
            endDate: String(r.endDate ?? r.startDate ?? new Date().toISOString().slice(0, 10)),
            progress: Math.max(0, Math.min(100, Number(r.progress) || 0)),
            dependencies: Array.isArray(r.dependencies) ? (r.dependencies as string[]) : [],
          };
          if (!norm.name) { errors++; continue; }
          const existing = chart?.tasks.find((t) => (r.id && t.id === r.id) || t.name === norm.name);
          if (existing) { state.updateGantt(chartId, existing.id, norm); updated++; }
          else { state.addGantt(chartId, norm); created++; }
        } catch { errors++; }
      }
    }
    // touch productivity so it counts as an activity (if imported into meetings, etc.) — keep simple
    useProductivity.getState();

    toast.success(`Importación: ${created} nuevos, ${updated} actualizados${errors ? `, ${errors} errores` : ""}`);
    setRows([]); setFileName("");
    onOpenChange(false);
  };

  const preview = rows.slice(0, 5);
  const columns = preview.length ? Array.from(new Set(preview.flatMap((r) => Object.keys(r)))).slice(0, 6) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Importar datos</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Destino</label>
              <Select value={target} onValueChange={(v) => setTarget(v as Target)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activities">Actividades</SelectItem>
                  <SelectItem value="risks">Riesgos</SelectItem>
                  <SelectItem value="budget">Presupuesto</SelectItem>
                  <SelectItem value="gantt">Gantt (chart activo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Fusión</label>
              <p className="text-xs text-muted-foreground mt-1.5">Filas con ID o nombre coincidente se actualizan.</p>
            </div>
          </div>

          <label
            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent/30 transition"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null); }}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm">Arrastra un archivo o haz clic para seleccionar</p>
            <p className="text-xs text-muted-foreground">JSON, CSV, XLSX</p>
            {fileName && <p className="text-xs font-medium text-primary">{fileName} — {rows.length} filas</p>}
            <input type="file" accept=".json,.csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          </label>

          {preview.length > 0 && (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>{columns.map((c) => <th key={c} className="text-left px-2 py-1.5 font-medium">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t">
                      {columns.map((c) => {
                        const v = r[c];
                        const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
                        return <td key={c} className="px-2 py-1 truncate max-w-[140px]">{s.slice(0, 40)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={doImport} disabled={!rows.length}>Importar {rows.length} filas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

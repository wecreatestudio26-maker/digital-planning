import { useMemo, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActivities } from "@/lib/activities-store";
import { useExtra } from "@/lib/extra-store";
import { useProductivity } from "@/lib/productivity-store";
import { exportToPDF, exportToExcel, exportToJSON, exportToCSV } from "@/lib/export";
import type { Activity, Priority, Status } from "@/lib/types";

type Fmt = "json" | "csv" | "pdf" | "excel";
type Section = "activities" | "gantt" | "meetings" | "team" | "templates";

export function ExportImportBar() {
  const { t } = useTranslation();
  const [expOpen, setExpOpen] = useState(false);
  const [impOpen, setImpOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setExpOpen(true)}>
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">{t("io.export")}</span>
      </Button>
      <Button variant="outline" size="sm" onClick={() => setImpOpen(true)}>
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">{t("io.import")}</span>
      </Button>
      <ExportDialog open={expOpen} onOpenChange={setExpOpen} />
      <ImportDialog open={impOpen} onOpenChange={setImpOpen} />
    </>
  );
}

// ============ EXPORT ============

function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const activities = useActivities((s) => s.activities);
  const extra = useExtra();
  const prod = useProductivity();
  const [fmt, setFmt] = useState<Fmt>("json");
  const [sections, setSections] = useState<Record<Section, boolean>>({
    activities: true, gantt: true, meetings: true, team: true, templates: true,
  });

  const collect = () => {
    const out: Record<string, unknown> = {};
    if (sections.activities) out.activities = activities;
    if (sections.gantt) out.ganttCharts = extra.ganttCharts;
    if (sections.meetings) out.meetings = prod.meetings;
    if (sections.team) out.members = prod.members;
    if (sections.templates) out.templates = prod.templates;
    return out;
  };

  const doExport = () => {
    const data = collect();
    if (fmt === "json") {
      exportToJSON(data);
    } else if (fmt === "csv") {
      if (!sections.activities) return toast.error(t("io.csvNeedsActivities"));
      exportToCSV(activities);
    } else if (fmt === "pdf") {
      if (!sections.activities) return toast.error(t("io.pdfNeedsActivities"));
      exportToPDF(activities);
    } else {
      if (!sections.activities) return toast.error(t("io.excelNeedsActivities"));
      exportToExcel(activities);
    }
    toast.success(t("io.exportSuccess"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("io.exportTitle")}</DialogTitle>
          <DialogDescription>{t("io.exportDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">{t("io.format")}</Label>
            <RadioGroup value={fmt} onValueChange={(v) => setFmt(v as Fmt)} className="grid grid-cols-2 gap-2">
              {(["json", "csv", "pdf", "excel"] as Fmt[]).map((f) => (
                <label key={f} className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-accent/40">
                  <RadioGroupItem value={f} />
                  <span className="text-sm uppercase">{f}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">{t("io.content")}</Label>
            <div className="space-y-2">
              {(Object.keys(sections) as Section[]).map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={sections[s]}
                    onCheckedChange={(v) => setSections((cur) => ({ ...cur, [s]: !!v }))}
                  />
                  {t(`io.section.${s}`)}
                </label>
              ))}
            </div>
            {(fmt === "csv" || fmt === "pdf" || fmt === "excel") && (
              <p className="text-xs text-muted-foreground mt-2">{t("io.onlyActivitiesHint")}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={doExport}>{t("io.export")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ IMPORT ============

const FIELD_SYNONYMS: Record<keyof Omit<Activity, "id">, string[]> = {
  name: ["name", "nombre", "título", "titulo", "title", "actividad", "task", "activity"],
  description: ["description", "descripción", "descripcion", "detalle", "details"],
  category: ["category", "categoría", "categoria", "categorie"],
  startDate: ["startdate", "start_date", "fecha inicio", "fecha_inicio", "inicio", "start"],
  endDate: ["enddate", "end_date", "fecha fin", "fecha_fin", "fin", "due date", "fecha límite", "fecha limite", "deadline", "end"],
  startTime: ["starttime", "start_time", "hora inicio", "hora_inicio"],
  endTime: ["endtime", "end_time", "hora fin", "hora_fin"],
  assignee: ["assignee", "responsable", "asignado", "owner", "propietario"],
  priority: ["priority", "prioridad", "priorité", "priorita"],
  status: ["status", "estado", "état", "stato"],
  notes: ["notes", "notas", "note", "comentarios", "comments"],
};

const FIELDS = Object.keys(FIELD_SYNONYMS) as (keyof Omit<Activity, "id">)[];
const REQUIRED_FIELDS: (keyof Omit<Activity, "id">)[] = ["name", "category", "startDate", "endDate", "assignee"];

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    const norm = h.toLowerCase().trim();
    for (const field of FIELDS) {
      if (FIELD_SYNONYMS[field].some((syn) => syn.toLowerCase() === norm)) {
        map[h] = field;
        break;
      }
    }
  }
  return map;
}

function normStatus(v: string): Status {
  const s = v.toLowerCase().trim();
  if (["completado", "completed", "done", "terminé", "terminado", "completo"].includes(s)) return "completado";
  if (["en_progreso", "en progreso", "in progress", "in_progress", "doing", "en cours"].includes(s)) return "en_progreso";
  return "pendiente";
}

function normPriority(v: string): Priority {
  const s = v.toLowerCase().trim();
  if (["alta", "high", "haute", "alta prioridad"].includes(s)) return "alta";
  if (["baja", "low", "basse"].includes(s)) return "baja";
  return "media";
}

function normDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  // Excel serial (days since 1899-12-30)
  if (typeof v === "number" && isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const { setAll, activities } = useActivities();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [imported, setImported] = useState<Activity[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const reset = () => {
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setImported([]);
    setErrors([]);
  };

  const handleFile = async (f: File) => {
    reset();
    try {
      const buf = await f.arrayBuffer();
      let rows: Record<string, unknown>[] = [];
      if (f.name.endsWith(".json")) {
        const text = new TextDecoder().decode(buf);
        const data = JSON.parse(text);
        rows = Array.isArray(data) ? data : Array.isArray(data.activities) ? data.activities : [];
      } else {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      }
      if (rows.length === 0) {
        toast.error(t("io.emptyFile"));
        return;
      }
      const hdrs = Object.keys(rows[0]);
      setRawRows(rows);
      setHeaders(hdrs);
      setMapping(autoMap(hdrs));
    } catch (e) {
      toast.error(t("io.parseError"));
      console.error(e);
    }
  };

  const preview = useMemo(() => {
    const errs: string[] = [];
    const ok: Activity[] = [];
    rawRows.forEach((row, idx) => {
      const rec: Partial<Omit<Activity, "id">> = {};
      for (const [header, field] of Object.entries(mapping)) {
        if (!field) continue;
        rec[field as keyof Omit<Activity, "id">] = String(row[header] ?? "") as never;
      }
      const missing = REQUIRED_FIELDS.filter((f) => !rec[f]);
      if (missing.length) {
        errs.push(t("io.rowMissing", { row: idx + 2, fields: missing.join(", ") }));
        return;
      }
      const sd = normDate(rec.startDate);
      const ed = normDate(rec.endDate);
      if (!sd || !ed) {
        errs.push(t("io.rowBadDate", { row: idx + 2 }));
        return;
      }
      ok.push({
        id: crypto.randomUUID(),
        name: String(rec.name ?? ""),
        description: rec.description ? String(rec.description) : "",
        category: String(rec.category ?? "Otro"),
        startDate: sd,
        endDate: ed,
        startTime: rec.startTime ? String(rec.startTime) : "",
        endTime: rec.endTime ? String(rec.endTime) : "",
        assignee: String(rec.assignee ?? ""),
        priority: normPriority(String(rec.priority ?? "media")),
        status: normStatus(String(rec.status ?? "pendiente")),
        notes: rec.notes ? String(rec.notes) : "",
      });
    });
    return { ok, errs };
  }, [rawRows, mapping, t]);

  const doImport = (mode: "merge" | "replace") => {
    const next = mode === "replace" ? preview.ok : [...activities, ...preview.ok];
    setAll(next);
    setImported(preview.ok);
    setErrors(preview.errs);
    toast.success(t("io.importSuccess", { count: preview.ok.length }));
    setTimeout(() => {
      reset();
      onOpenChange(false);
    }, 1500);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("io.importTitle")}</DialogTitle>
          <DialogDescription>{t("io.importDesc")}</DialogDescription>
        </DialogHeader>

        {rawRows.length === 0 ? (
          <div
            className="rounded-lg border-2 border-dashed border-border p-8 text-center cursor-pointer hover:bg-accent/30"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t("io.dropHint")}</p>
            <p className="text-xs text-muted-foreground mt-1">JSON · CSV · XLSX</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">{t("io.mapColumns")}</Label>
              <div className="rounded-md border border-border divide-y divide-border max-h-64 overflow-y-auto">
                {headers.map((h) => (
                  <div key={h} className="flex items-center gap-3 p-2">
                    <span className="text-sm flex-1 truncate font-mono">{h}</span>
                    <span className="text-muted-foreground">→</span>
                    <Select
                      value={mapping[h] ?? "__skip__"}
                      onValueChange={(v) =>
                        setMapping((cur) => ({ ...cur, [h]: v === "__skip__" ? "" : v }))
                      }
                    >
                      <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">— {t("io.skip")} —</SelectItem>
                        {FIELDS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm">
              <span className="text-primary font-medium">{preview.ok.length}</span> {t("io.rowsValid")}
              {preview.errs.length > 0 && (
                <>
                  <span className="mx-2">·</span>
                  <span className="text-destructive font-medium">{preview.errs.length}</span> {t("io.rowsInvalid")}
                </>
              )}
            </div>
            {preview.errs.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 max-h-32 overflow-y-auto space-y-1">
                {preview.errs.slice(0, 8).map((e, i) => (
                  <p key={i} className="text-xs text-destructive">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {imported.length > 0 && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
            {t("io.imported", { count: imported.length })}
            {errors.length > 0 && <> · {t("io.skipped", { count: errors.length })}</>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>{t("common.cancel")}</Button>
          {rawRows.length > 0 && (
            <>
              <Button variant="outline" onClick={() => doImport("merge")} disabled={preview.ok.length === 0}>
                {t("io.merge")}
              </Button>
              <Button onClick={() => doImport("replace")} disabled={preview.ok.length === 0}>
                {t("io.replace")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

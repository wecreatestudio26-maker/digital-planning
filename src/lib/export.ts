import type { Activity } from "./types";
import { PRIORITY_LABEL, STATUS_LABEL } from "./types";

// Heavy browser-only libraries (jspdf, xlsx) are imported dynamically so they
// never enter the SSR/worker bundle.

export async function exportToPDF(activities: Activity[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("Planeación de Actividades", 14, 16);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [["#", "Actividad", "Categoría", "Inicio", "Fin", "Responsable", "Prioridad", "Estado"]],
    body: activities.map((a, i) => [
      i + 1,
      a.name,
      a.category,
      a.startDate,
      a.endDate,
      a.assignee,
      PRIORITY_LABEL[a.priority],
      STATUS_LABEL[a.status],
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94] },
  });
  doc.save(`planeacion-${Date.now()}.pdf`);
}

function activitiesRows(activities: Activity[]) {
  return activities.map((a, i) => ({
    "#": i + 1,
    Actividad: a.name,
    Descripción: a.description ?? "",
    Categoría: a.category,
    "Fecha inicio": a.startDate,
    "Fecha fin": a.endDate,
    "Hora inicio": a.startTime ?? "",
    "Hora fin": a.endTime ?? "",
    Responsable: a.assignee,
    Prioridad: PRIORITY_LABEL[a.priority],
    Estado: STATUS_LABEL[a.status],
    Notas: a.notes ?? "",
  }));
}

export async function exportToExcel(activities: Activity[]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(activitiesRows(activities));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Actividades");
  XLSX.writeFile(wb, `planeacion-${Date.now()}.xlsx`);
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(data: Record<string, unknown>) {
  downloadBlob(JSON.stringify(data, null, 2), `planeacion-${Date.now()}.json`, "application/json");
}

export async function exportToCSV(activities: Activity[]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(activitiesRows(activities));
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadBlob(csv, `planeacion-${Date.now()}.csv`, "text/csv;charset=utf-8;");
}

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Activity } from "./types";
import { PRIORITY_LABEL, STATUS_LABEL } from "./types";

export function exportToPDF(activities: Activity[]) {
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

export function exportToExcel(activities: Activity[]) {
  const rows = activities.map((a, i) => ({
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
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Actividades");
  XLSX.writeFile(wb, `planeacion-${Date.now()}.xlsx`);
}

export type Status = "pendiente" | "en_progreso" | "completado";
export type Priority = "alta" | "media" | "baja";

export interface Activity {
  id: string;
  name: string;
  description?: string;
  category: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;
  startTime?: string;
  endTime?: string;
  assignee: string;
  priority: Priority;
  status: Status;
  notes?: string;
}

export const CATEGORIES = [
  "Trabajo",
  "Personal",
  "Reuniones",
  "Estudio",
  "Proyecto",
  "Otro",
];

export const STATUS_LABEL: Record<Status, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completado: "Completado",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

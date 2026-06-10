import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, format, startOfMonth } from "date-fns";
import type { Activity } from "./types";

function seed(): Activity[] {
  const base = startOfMonth(new Date());
  const d = (offset: number) => format(addDays(base, offset), "yyyy-MM-dd");
  return [
    {
      id: crypto.randomUUID(),
      name: "Kickoff del proyecto",
      description: "Reunión inicial con el equipo y stakeholders.",
      category: "Reuniones",
      startDate: d(2),
      endDate: d(2),
      startTime: "09:00",
      endTime: "10:30",
      assignee: "Ana López",
      priority: "alta",
      status: "completado",
      notes: "Llevar presentación de roadmap.",
    },
    {
      id: crypto.randomUUID(),
      name: "Diseño de wireframes",
      category: "Proyecto",
      startDate: d(4),
      endDate: d(8),
      assignee: "Carlos Pérez",
      priority: "media",
      status: "en_progreso",
    },
    {
      id: crypto.randomUUID(),
      name: "Curso de TypeScript",
      category: "Estudio",
      startDate: d(10),
      endDate: d(14),
      assignee: "María Ruiz",
      priority: "baja",
      status: "pendiente",
    },
    {
      id: crypto.randomUUID(),
      name: "Entrega sprint 1",
      category: "Trabajo",
      startDate: d(15),
      endDate: d(15),
      startTime: "16:00",
      endTime: "18:00",
      assignee: "Ana López",
      priority: "alta",
      status: "en_progreso",
    },
    {
      id: crypto.randomUUID(),
      name: "Revisión mensual",
      category: "Trabajo",
      startDate: d(22),
      endDate: d(22),
      assignee: "Jorge Díaz",
      priority: "media",
      status: "pendiente",
    },
  ];
}

interface State {
  activities: Activity[];
  add: (a: Omit<Activity, "id">) => void;
  update: (id: string, patch: Partial<Activity>) => void;
  remove: (id: string) => void;
  setAll: (a: Activity[]) => void;
}

export const useActivities = create<State>()(
  persist(
    (set) => ({
      activities: seed(),
      add: (a) =>
        set((s) => ({ activities: [...s.activities, { ...a, id: crypto.randomUUID() }] })),
      update: (id, patch) =>
        set((s) => ({
          activities: s.activities.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      remove: (id) =>
        set((s) => ({ activities: s.activities.filter((x) => x.id !== id) })),
      setAll: (a) => set({ activities: a }),
    }),
    { name: "planeador-activities" },
  ),
);

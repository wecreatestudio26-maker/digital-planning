import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, format, startOfMonth } from "date-fns";

const base = startOfMonth(new Date());
const d = (o: number) => format(addDays(base, o), "yyyy-MM-dd");

// ====== GANTT ======
export interface GanttTask {
  id: string;
  name: string;
  parentId?: string | null;
  startDate: string;
  endDate: string;
  progress: number; // 0-100
  dependencies: string[]; // ids of predecessors
}
export interface GanttChart {
  id: string;
  name: string;
  tasks: GanttTask[];
}

// ====== RISKS ======
export type RiskStatus = "abierto" | "mitigado" | "cerrado";
export interface Risk {
  id: string;
  name: string;
  category: string;
  probability: number; // 1-5
  impact: number; // 1-5
  mitigation: string;
  status: RiskStatus;
}
export function riskLevel(p: number, i: number) {
  const score = p * i;
  if (score >= 15) return { label: "Crítico", color: "#ef4444", score };
  if (score >= 9) return { label: "Alto", color: "#f97316", score };
  if (score >= 4) return { label: "Medio", color: "#eab308", score };
  return { label: "Bajo", color: "#22c55e", score };
}

// ====== BUDGET ======
export interface BudgetSubItem {
  id: string;
  description: string;
  amount: number;
  date: string;
}
export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  planned: number;
  date: string;
  subItems: BudgetSubItem[];
}
export function budgetActual(b: BudgetItem): number {
  return b.subItems.reduce((s, x) => s + x.amount, 0);
}

interface State {
  ganttCharts: GanttChart[];
  activeChartId: string;
  risks: Risk[];
  budget: BudgetItem[];
  // gantt charts
  addChart: (name: string) => string;
  renameChart: (id: string, name: string) => void;
  removeChart: (id: string) => void;
  setActiveChart: (id: string) => void;
  // gantt tasks (in active chart)
  addGantt: (chartId: string, t: Omit<GanttTask, "id">) => void;
  updateGantt: (chartId: string, id: string, p: Partial<GanttTask>) => void;
  removeGantt: (chartId: string, id: string) => void;
  // risks
  addRisk: (r: Omit<Risk, "id">) => void;
  updateRisk: (id: string, p: Partial<Risk>) => void;
  removeRisk: (id: string) => void;
  // budget
  addBudget: (b: Omit<BudgetItem, "id" | "subItems">) => void;
  updateBudget: (id: string, p: Partial<Omit<BudgetItem, "subItems">>) => void;
  removeBudget: (id: string) => void;
  addSubItem: (budgetId: string, s: Omit<BudgetSubItem, "id">) => void;
  updateSubItem: (budgetId: string, subId: string, p: Partial<BudgetSubItem>) => void;
  removeSubItem: (budgetId: string, subId: string) => void;
}

const seedGanttTasks = (): GanttTask[] => {
  const t1 = "g1", t2 = "g2", t3 = "g3", t4 = "g4", t5 = "g5", t6 = "g6";
  return [
    { id: t1, name: "Planeación", startDate: d(0), endDate: d(4), progress: 100, dependencies: [] },
    { id: t2, name: "Definir alcance", parentId: t1, startDate: d(0), endDate: d(2), progress: 100, dependencies: [] },
    { id: t3, name: "Aprobación", parentId: t1, startDate: d(3), endDate: d(4), progress: 100, dependencies: [t2] },
    { id: t4, name: "Diseño", startDate: d(5), endDate: d(12), progress: 60, dependencies: [t1] },
    { id: t5, name: "Desarrollo", startDate: d(13), endDate: d(25), progress: 30, dependencies: [t4] },
    { id: t6, name: "Lanzamiento", startDate: d(26), endDate: d(28), progress: 0, dependencies: [t5] },
  ];
};

const seedCharts = (): GanttChart[] => [
  { id: "chart-main", name: "Proyecto principal", tasks: seedGanttTasks() },
];

const seedRisks = (): Risk[] => [
  { id: "r1", name: "Retraso del proveedor", category: "Operativo", probability: 4, impact: 4, mitigation: "Buscar proveedor alterno", status: "abierto" },
  { id: "r2", name: "Cambio de alcance", category: "Proyecto", probability: 3, impact: 5, mitigation: "Control de cambios formal", status: "mitigado" },
  { id: "r3", name: "Falla técnica", category: "Técnico", probability: 2, impact: 3, mitigation: "Pruebas de carga", status: "abierto" },
  { id: "r4", name: "Sobrecosto", category: "Financiero", probability: 3, impact: 4, mitigation: "Revisión semanal de presupuesto", status: "abierto" },
  { id: "r5", name: "Baja adopción", category: "Negocio", probability: 2, impact: 2, mitigation: "Capacitación a usuarios", status: "cerrado" },
];

const seedBudget = (): BudgetItem[] => [
  { id: "b1", category: "Personal", description: "Equipo de desarrollo", planned: 12000, date: d(2), subItems: [
    { id: "s1", description: "Salarios mes 1", amount: 6500, date: d(2) },
    { id: "s2", description: "Bonos", amount: 7000, date: d(15) },
  ]},
  { id: "b2", category: "Software", description: "Licencias", planned: 2500, date: d(5), subItems: [
    { id: "s3", description: "Suite de diseño", amount: 1200, date: d(5) },
    { id: "s4", description: "Hosting anual", amount: 1100, date: d(8) },
  ]},
  { id: "b3", category: "Marketing", description: "Campaña lanzamiento", planned: 4000, date: d(10), subItems: [
    { id: "s5", description: "Anuncios redes", amount: 2800, date: d(10) },
    { id: "s6", description: "Producción video", amount: 2000, date: d(14) },
  ]},
  { id: "b4", category: "Infraestructura", description: "Servidores", planned: 1800, date: d(15), subItems: [
    { id: "s7", description: "Servidores cloud", amount: 1500, date: d(15) },
  ]},
];

export const useExtra = create<State>()(
  persist(
    (set) => ({
      ganttCharts: seedCharts(),
      activeChartId: "chart-main",
      risks: seedRisks(),
      budget: seedBudget(),

      addChart: (name) => {
        const id = crypto.randomUUID();
        set((s) => ({ ganttCharts: [...s.ganttCharts, { id, name, tasks: [] }], activeChartId: id }));
        return id;
      },
      renameChart: (id, name) => set((s) => ({ ganttCharts: s.ganttCharts.map((c) => c.id === id ? { ...c, name } : c) })),
      removeChart: (id) => set((s) => {
        const remaining = s.ganttCharts.filter((c) => c.id !== id);
        return { ganttCharts: remaining, activeChartId: s.activeChartId === id ? (remaining[0]?.id ?? "") : s.activeChartId };
      }),
      setActiveChart: (id) => set({ activeChartId: id }),

      addGantt: (chartId, t) => set((s) => ({
        ganttCharts: s.ganttCharts.map((c) => c.id === chartId ? { ...c, tasks: [...c.tasks, { ...t, id: crypto.randomUUID() }] } : c),
      })),
      updateGantt: (chartId, id, p) => set((s) => ({
        ganttCharts: s.ganttCharts.map((c) => c.id === chartId ? { ...c, tasks: c.tasks.map((x) => x.id === id ? { ...x, ...p } : x) } : c),
      })),
      removeGantt: (chartId, id) => set((s) => ({
        ganttCharts: s.ganttCharts.map((c) => c.id === chartId ? { ...c, tasks: c.tasks.filter((x) => x.id !== id && x.parentId !== id) } : c),
      })),

      addRisk: (r) => set((s) => ({ risks: [...s.risks, { ...r, id: crypto.randomUUID() }] })),
      updateRisk: (id, p) => set((s) => ({ risks: s.risks.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      removeRisk: (id) => set((s) => ({ risks: s.risks.filter((x) => x.id !== id) })),

      addBudget: (b) => set((s) => ({ budget: [...s.budget, { ...b, id: crypto.randomUUID(), subItems: [] }] })),
      updateBudget: (id, p) => set((s) => ({ budget: s.budget.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      removeBudget: (id) => set((s) => ({ budget: s.budget.filter((x) => x.id !== id) })),
      addSubItem: (bid, sub) => set((s) => ({
        budget: s.budget.map((b) => b.id === bid ? { ...b, subItems: [...b.subItems, { ...sub, id: crypto.randomUUID() }] } : b),
      })),
      updateSubItem: (bid, subId, p) => set((s) => ({
        budget: s.budget.map((b) => b.id === bid ? { ...b, subItems: b.subItems.map((x) => x.id === subId ? { ...x, ...p } : x) } : b),
      })),
      removeSubItem: (bid, subId) => set((s) => ({
        budget: s.budget.map((b) => b.id === bid ? { ...b, subItems: b.subItems.filter((x) => x.id !== subId) } : b),
      })),
    }),
    {
      name: "planeador-extra",
      version: 2,
      migrate: (persisted: unknown) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (!p.ganttCharts && Array.isArray(p.gantt)) {
          p.ganttCharts = [{ id: "chart-main", name: "Proyecto principal", tasks: p.gantt }];
          p.activeChartId = "chart-main";
        }
        if (Array.isArray(p.budget)) {
          p.budget = (p.budget as BudgetItem[]).map((b) => ({
            ...b,
            subItems: Array.isArray(b.subItems) ? b.subItems : [],
          }));
        }
        delete p.okrs;
        delete p.gantt;
        return p as never;
      },
    },
  ),
);

// Critical path computation (longest path by duration in days)
export function computeCriticalPath(tasks: GanttTask[]): Set<string> {
  const leaves = tasks.filter((t) => !tasks.some((x) => x.parentId === t.id));
  const byId = new Map(leaves.map((t) => [t.id, t]));
  const duration = (t: GanttTask) =>
    Math.max(1, (new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86400000 + 1);
  const memo = new Map<string, { len: number; path: string[] }>();
  function longest(id: string): { len: number; path: string[] } {
    if (memo.has(id)) return memo.get(id)!;
    const t = byId.get(id);
    if (!t) return { len: 0, path: [] };
    let best = { len: duration(t), path: [id] };
    for (const dep of t.dependencies) {
      if (!byId.has(dep)) continue;
      const sub = longest(dep);
      const cand = { len: sub.len + duration(t), path: [...sub.path, id] };
      if (cand.len > best.len) best = cand;
    }
    memo.set(id, best);
    return best;
  }
  let global = { len: 0, path: [] as string[] };
  for (const t of leaves) {
    const r = longest(t.id);
    if (r.len > global.len) global = r;
  }
  return new Set(global.path);
}

// Detect circular dependencies when adding/editing a task
export function hasCycle(tasks: GanttTask[], taskId: string, dependencies: string[]): boolean {
  const map = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  function reaches(from: string, target: string): boolean {
    if (from === target) return true;
    if (visited.has(from)) return false;
    visited.add(from);
    const t = map.get(from);
    if (!t) return false;
    return t.dependencies.some((d) => reaches(d, target));
  }
  return dependencies.some((d) => reaches(d, taskId));
}

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
export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  planned: number;
  actual: number;
  date: string;
}

// ====== OKR ======
export interface KeyResult {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
}
export interface Objective {
  id: string;
  name: string;
  description?: string;
  owner: string;
  quarter: string;
  keyResults: KeyResult[];
}

interface State {
  gantt: GanttTask[];
  risks: Risk[];
  budget: BudgetItem[];
  okrs: Objective[];
  // gantt
  addGantt: (t: Omit<GanttTask, "id">) => void;
  updateGantt: (id: string, p: Partial<GanttTask>) => void;
  removeGantt: (id: string) => void;
  // risks
  addRisk: (r: Omit<Risk, "id">) => void;
  updateRisk: (id: string, p: Partial<Risk>) => void;
  removeRisk: (id: string) => void;
  // budget
  addBudget: (b: Omit<BudgetItem, "id">) => void;
  updateBudget: (id: string, p: Partial<BudgetItem>) => void;
  removeBudget: (id: string) => void;
  // okrs
  addOkr: (o: Omit<Objective, "id" | "keyResults"> & { keyResults?: KeyResult[] }) => void;
  updateOkr: (id: string, p: Partial<Objective>) => void;
  removeOkr: (id: string) => void;
  addKR: (objId: string, kr: Omit<KeyResult, "id">) => void;
  updateKR: (objId: string, krId: string, p: Partial<KeyResult>) => void;
  removeKR: (objId: string, krId: string) => void;
}

const seedGantt = (): GanttTask[] => {
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

const seedRisks = (): Risk[] => [
  { id: "r1", name: "Retraso del proveedor", category: "Operativo", probability: 4, impact: 4, mitigation: "Buscar proveedor alterno", status: "abierto" },
  { id: "r2", name: "Cambio de alcance", category: "Proyecto", probability: 3, impact: 5, mitigation: "Control de cambios formal", status: "mitigado" },
  { id: "r3", name: "Falla técnica", category: "Técnico", probability: 2, impact: 3, mitigation: "Pruebas de carga", status: "abierto" },
  { id: "r4", name: "Sobrecosto", category: "Financiero", probability: 3, impact: 4, mitigation: "Revisión semanal de presupuesto", status: "abierto" },
  { id: "r5", name: "Baja adopción", category: "Negocio", probability: 2, impact: 2, mitigation: "Capacitación a usuarios", status: "cerrado" },
];

const seedBudget = (): BudgetItem[] => [
  { id: "b1", category: "Personal", description: "Equipo de desarrollo", planned: 12000, actual: 13500, date: d(2) },
  { id: "b2", category: "Software", description: "Licencias", planned: 2500, actual: 2300, date: d(5) },
  { id: "b3", category: "Marketing", description: "Campaña lanzamiento", planned: 4000, actual: 4800, date: d(10) },
  { id: "b4", category: "Infraestructura", description: "Servidores y hosting", planned: 1800, actual: 1500, date: d(15) },
  { id: "b5", category: "Capacitación", description: "Talleres", planned: 1200, actual: 900, date: d(20) },
];

const seedOkrs = (): Objective[] => [
  {
    id: "o1",
    name: "Aumentar satisfacción del cliente",
    owner: "Ana López",
    quarter: "Q1",
    keyResults: [
      { id: "k1", name: "NPS", current: 42, target: 60, unit: "" },
      { id: "k2", name: "Tickets resueltos a tiempo", current: 78, target: 95, unit: "%" },
    ],
  },
  {
    id: "o2",
    name: "Acelerar el crecimiento",
    owner: "Carlos Pérez",
    quarter: "Q1",
    keyResults: [
      { id: "k3", name: "Nuevos clientes", current: 120, target: 200, unit: "" },
      { id: "k4", name: "MRR", current: 18000, target: 30000, unit: "$" },
      { id: "k5", name: "Conversión landing", current: 2.1, target: 4, unit: "%" },
    ],
  },
];

export const useExtra = create<State>()(
  persist(
    (set) => ({
      gantt: seedGantt(),
      risks: seedRisks(),
      budget: seedBudget(),
      okrs: seedOkrs(),
      addGantt: (t) => set((s) => ({ gantt: [...s.gantt, { ...t, id: crypto.randomUUID() }] })),
      updateGantt: (id, p) => set((s) => ({ gantt: s.gantt.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      removeGantt: (id) => set((s) => ({ gantt: s.gantt.filter((x) => x.id !== id && x.parentId !== id) })),
      addRisk: (r) => set((s) => ({ risks: [...s.risks, { ...r, id: crypto.randomUUID() }] })),
      updateRisk: (id, p) => set((s) => ({ risks: s.risks.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      removeRisk: (id) => set((s) => ({ risks: s.risks.filter((x) => x.id !== id) })),
      addBudget: (b) => set((s) => ({ budget: [...s.budget, { ...b, id: crypto.randomUUID() }] })),
      updateBudget: (id, p) => set((s) => ({ budget: s.budget.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      removeBudget: (id) => set((s) => ({ budget: s.budget.filter((x) => x.id !== id) })),
      addOkr: (o) =>
        set((s) => ({ okrs: [...s.okrs, { ...o, id: crypto.randomUUID(), keyResults: o.keyResults ?? [] }] })),
      updateOkr: (id, p) => set((s) => ({ okrs: s.okrs.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      removeOkr: (id) => set((s) => ({ okrs: s.okrs.filter((x) => x.id !== id) })),
      addKR: (objId, kr) =>
        set((s) => ({
          okrs: s.okrs.map((o) =>
            o.id === objId ? { ...o, keyResults: [...o.keyResults, { ...kr, id: crypto.randomUUID() }] } : o,
          ),
        })),
      updateKR: (objId, krId, p) =>
        set((s) => ({
          okrs: s.okrs.map((o) =>
            o.id === objId ? { ...o, keyResults: o.keyResults.map((k) => (k.id === krId ? { ...k, ...p } : k)) } : o,
          ),
        })),
      removeKR: (objId, krId) =>
        set((s) => ({
          okrs: s.okrs.map((o) =>
            o.id === objId ? { ...o, keyResults: o.keyResults.filter((k) => k.id !== krId) } : o,
          ),
        })),
    }),
    { name: "planeador-extra" },
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

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format, startOfWeek, addDays } from "date-fns";

// ============ TYPES ============
export interface Habit { id: string; name: string; okrId?: string; log: Record<string, boolean>; }
export interface TimeEntry { id: string; taskId?: string; taskName: string; project: string; minutes: number; date: string; }
export interface ActiveTimer { taskName: string; project: string; startedAt: number; pausedAt?: number; accumulated: number; }
export interface WeeklyReview { id: string; weekStart: string; good: string; improve: string; score: number; completedCount: number; }
export interface Member { id: string; name: string; email: string; role: "admin" | "editor" | "viewer"; permissions: string[]; }
export interface MeetingAgreement { id: string; text: string; assignee?: string; convertedTaskId?: string; done?: boolean; }
export interface Meeting { id: string; title: string; date: string; agenda: string; minutes: string; agreements: MeetingAgreement[]; completed?: boolean; archivedAt?: string; }
export interface AutoStateRule { id: string; name: string; trigger: "overdue" | "all_subtasks_done" | "time_logged"; action: "set_in_progress" | "set_completed" | "notify"; enabled: boolean; }
export interface RoadmapItem { id: string; name: string; quarter: string; year: number; progress: number; status: "planeado" | "en_curso" | "completado" | "bloqueado"; }
export interface SprintTask { id: string; name: string; estimate: number; done: boolean; }
export interface Sprint { id: string; name: string; startDate: string; endDate: string; active: boolean; closed: boolean; tasks: SprintTask[]; backlog: SprintTask[]; retro?: { good: string; bad: string; actions: string }; }
export interface Template { id: string; name: string; type: "proyecto" | "tarea"; tasks: { name: string; days: number }[]; }
export interface ReminderConfig { daysBeforeDeadline: number; minutesBeforeMeeting: number; weeklyReview: boolean; }
export interface AutoStateConfig { subtaskToParent: boolean; overdueAuto: boolean; hoursToProgress: boolean; }
export interface ChangeLog { id: string; ts: string; entity: string; message: string; }
export interface Rule { id: string; name: string; when: "task_overdue" | "budget_over" | "risk_high" | "no_activity"; then: "notify" | "change_status" | "create_followup"; enabled: boolean; }
export interface TaskEstimate { taskId: string; estimatedHours: number; actualHours: number; }

interface State {
  habits: Habit[];
  timeEntries: TimeEntry[];
  activeTimer: ActiveTimer | null;
  reviews: WeeklyReview[];
  members: Member[];
  meetings: Meeting[];
  roadmap: RoadmapItem[];
  sprints: Sprint[];
  templates: Template[];
  reminders: ReminderConfig;
  autoStates: AutoStateConfig;
  changeLog: ChangeLog[];
  rules: Rule[];
  autoRules: AutoStateRule[];
  estimates: TaskEstimate[];
  // mutations
  toggleHabit: (id: string, date: string) => void;
  addHabit: (h: Omit<Habit, "id" | "log">) => void;
  removeHabit: (id: string) => void;
  startTimer: (taskName: string, project: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  addTimeEntry: (e: Omit<TimeEntry, "id">) => void;
  removeTimeEntry: (id: string) => void;
  saveReview: (r: Omit<WeeklyReview, "id">) => void;
  addMember: (m: Omit<Member, "id">) => void;
  updateMember: (id: string, p: Partial<Member>) => void;
  removeMember: (id: string) => void;
  addMeeting: (m: Omit<Meeting, "id" | "agreements">) => void;
  updateMeeting: (id: string, p: Partial<Meeting>) => void;
  removeMeeting: (id: string) => void;
  addAgreement: (mid: string, text: string) => void;
  toggleAgreementDone: (mid: string, aid: string) => void;
  removeAgreement: (mid: string, aid: string) => void;
  convertAgreement: (mid: string, aid: string, taskId: string) => void;
  completeMeeting: (mid: string) => void;
  reopenMeeting: (mid: string) => void;
  addRoadmap: (r: Omit<RoadmapItem, "id">) => void;
  updateRoadmap: (id: string, p: Partial<RoadmapItem>) => void;
  removeRoadmap: (id: string) => void;
  addSprint: (s: Omit<Sprint, "id" | "tasks" | "backlog" | "closed">) => void;
  updateSprint: (id: string, p: Partial<Sprint>) => void;
  removeSprint: (id: string) => void;
  addBacklog: (sid: string, t: Omit<SprintTask, "id" | "done">) => void;
  moveToSprint: (sid: string, tid: string) => void;
  toggleSprintTask: (sid: string, tid: string) => void;
  closeSprint: (sid: string, retro: Sprint["retro"]) => void;
  addTemplate: (t: Omit<Template, "id">) => void;
  removeTemplate: (id: string) => void;
  setReminders: (r: ReminderConfig) => void;
  setAutoStates: (a: AutoStateConfig) => void;
  addLog: (entity: string, message: string) => void;
  addRule: (r: Omit<Rule, "id">) => void;
  toggleRule: (id: string) => void;
  removeRule: (id: string) => void;
  setEstimate: (taskId: string, estimatedHours: number, actualHours: number) => void;
}

const today = () => format(new Date(), "yyyy-MM-dd");

const seedHabits = (): Habit[] => {
  const log: Record<string, boolean> = {};
  for (let i = 0; i < 20; i++) log[format(addDays(new Date(), -i), "yyyy-MM-dd")] = Math.random() > 0.3;
  return [
    { id: "h1", name: "Ejercicio 30 min", log },
    { id: "h2", name: "Leer 20 páginas", log: { ...log } },
    { id: "h3", name: "Meditar", log: { ...log } },
  ];
};

const seedTime = (): TimeEntry[] => {
  const arr: TimeEntry[] = [];
  for (let i = 0; i < 14; i++) {
    arr.push({
      id: `t${i}`,
      taskName: ["Diseño", "Desarrollo", "Reunión", "QA"][i % 4],
      project: ["Web", "App móvil", "Marketing"][i % 3],
      minutes: 30 + Math.floor(Math.random() * 180),
      date: format(addDays(new Date(), -i), "yyyy-MM-dd"),
    });
  }
  return arr;
};

const seedMembers = (): Member[] => [
  { id: "m1", name: "Ana López", email: "ana@empresa.com", role: "admin", permissions: ["all"] },
  { id: "m2", name: "Carlos Pérez", email: "carlos@empresa.com", role: "editor", permissions: ["actividades", "gantt", "okr"] },
  { id: "m3", name: "María Ruiz", email: "maria@empresa.com", role: "editor", permissions: ["actividades", "tiempo"] },
  { id: "m4", name: "Jorge Díaz", email: "jorge@empresa.com", role: "viewer", permissions: ["dashboard"] },
];

const seedRoadmap = (): RoadmapItem[] => {
  const y = new Date().getFullYear();
  return [
    { id: "rm1", name: "Lanzamiento MVP", quarter: "Q1", year: y, progress: 100, status: "completado" },
    { id: "rm2", name: "Integración pagos", quarter: "Q2", year: y, progress: 60, status: "en_curso" },
    { id: "rm3", name: "App móvil", quarter: "Q3", year: y, progress: 20, status: "en_curso" },
    { id: "rm4", name: "Expansión LATAM", quarter: "Q4", year: y, progress: 0, status: "planeado" },
  ];
};

const seedSprints = (): Sprint[] => [
  {
    id: "s1",
    name: "Sprint 1",
    startDate: today(),
    endDate: format(addDays(new Date(), 14), "yyyy-MM-dd"),
    active: true,
    closed: false,
    tasks: [
      { id: "st1", name: "Login con OAuth", estimate: 8, done: true },
      { id: "st2", name: "Dashboard inicial", estimate: 13, done: true },
      { id: "st3", name: "Perfil de usuario", estimate: 5, done: false },
      { id: "st4", name: "Notificaciones", estimate: 8, done: false },
      { id: "st5", name: "Tests E2E", estimate: 5, done: false },
    ],
    backlog: [
      { id: "b1", name: "Modo oscuro", estimate: 3, done: false },
      { id: "b2", name: "Exportar PDF", estimate: 5, done: false },
    ],
  },
];

const seedTemplates = (): Template[] => [
  { id: "tpl1", name: "Lanzamiento de producto", type: "proyecto", tasks: [
    { name: "Investigación de mercado", days: 7 },
    { name: "Definir propuesta de valor", days: 3 },
    { name: "Producción de contenido", days: 10 },
    { name: "Campaña pre-lanzamiento", days: 14 },
    { name: "Día de lanzamiento", days: 1 },
    { name: "Análisis post-lanzamiento", days: 7 },
  ]},
  { id: "tpl2", name: "Campaña de marketing", type: "proyecto", tasks: [
    { name: "Brief y objetivos", days: 2 },
    { name: "Creación de creatividades", days: 7 },
    { name: "Configuración de canales", days: 3 },
    { name: "Ejecución de la campaña", days: 21 },
    { name: "Reporte de resultados", days: 3 },
  ]},
  { id: "tpl3", name: "Desarrollo de software", type: "proyecto", tasks: [
    { name: "Discovery y requisitos", days: 5 },
    { name: "Diseño UI/UX", days: 10 },
    { name: "Setup y arquitectura", days: 3 },
    { name: "Desarrollo de features", days: 30 },
    { name: "QA y bug fixing", days: 10 },
    { name: "Deploy a producción", days: 2 },
  ]},
];

const seedRules = (): Rule[] => [
  { id: "ru1", name: "Notificar si tarea vencida", when: "task_overdue", then: "notify", enabled: true },
  { id: "ru2", name: "Crear seguimiento si presupuesto excedido", when: "budget_over", then: "create_followup", enabled: true },
  { id: "ru3", name: "Notificar riesgo alto", when: "risk_high", then: "notify", enabled: true },
];

export const useProductivity = create<State>()(
  persist(
    (set, get) => ({
      habits: seedHabits(),
      timeEntries: seedTime(),
      activeTimer: null,
      reviews: [],
      members: seedMembers(),
      meetings: [
        { id: "mt1", title: "Kickoff", date: today(), agenda: "Presentación, objetivos, roadmap", minutes: "Acuerdo en arrancar fase 1.", agreements: [
          { id: "ag1", text: "Definir métricas de éxito", assignee: "Ana" },
          { id: "ag2", text: "Programar reunión semanal", assignee: "Carlos" },
        ]},
      ],
      roadmap: seedRoadmap(),
      sprints: seedSprints(),
      templates: seedTemplates(),
      reminders: { daysBeforeDeadline: 2, minutesBeforeMeeting: 30, weeklyReview: true },
      autoStates: { subtaskToParent: true, overdueAuto: true, hoursToProgress: true },
      changeLog: [],
      rules: seedRules(),
      estimates: [],

      toggleHabit: (id, date) => set((s) => ({
        habits: s.habits.map((h) => h.id === id ? { ...h, log: { ...h.log, [date]: !h.log[date] } } : h),
      })),
      addHabit: (h) => set((s) => ({ habits: [...s.habits, { ...h, id: crypto.randomUUID(), log: {} }] })),
      removeHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      startTimer: (taskName, project) => set({ activeTimer: { taskName, project, startedAt: Date.now(), accumulated: 0 } }),
      pauseTimer: () => set((s) => {
        if (!s.activeTimer || s.activeTimer.pausedAt) return {};
        const elapsed = Date.now() - s.activeTimer.startedAt;
        return { activeTimer: { ...s.activeTimer, pausedAt: Date.now(), accumulated: s.activeTimer.accumulated + elapsed } };
      }),
      resumeTimer: () => set((s) => {
        if (!s.activeTimer || !s.activeTimer.pausedAt) return {};
        return { activeTimer: { ...s.activeTimer, startedAt: Date.now(), pausedAt: undefined } };
      }),
      stopTimer: () => {
        const t = get().activeTimer;
        if (!t) return;
        const total = t.accumulated + (t.pausedAt ? 0 : Date.now() - t.startedAt);
        const minutes = Math.max(1, Math.round(total / 60000));
        set((s) => ({
          activeTimer: null,
          timeEntries: [...s.timeEntries, { id: crypto.randomUUID(), taskName: t.taskName, project: t.project, minutes, date: today() }],
        }));
      },
      addTimeEntry: (e) => set((s) => ({ timeEntries: [...s.timeEntries, { ...e, id: crypto.randomUUID() }] })),
      removeTimeEntry: (id) => set((s) => ({ timeEntries: s.timeEntries.filter((e) => e.id !== id) })),

      saveReview: (r) => set((s) => {
        const existing = s.reviews.find((x) => x.weekStart === r.weekStart);
        if (existing) return { reviews: s.reviews.map((x) => x.weekStart === r.weekStart ? { ...existing, ...r } : x) };
        return { reviews: [...s.reviews, { ...r, id: crypto.randomUUID() }] };
      }),

      addMember: (m) => set((s) => ({ members: [...s.members, { ...m, id: crypto.randomUUID() }] })),
      updateMember: (id, p) => set((s) => ({ members: s.members.map((m) => m.id === id ? { ...m, ...p } : m) })),
      removeMember: (id) => set((s) => ({ members: s.members.filter((m) => m.id !== id) })),

      addMeeting: (m) => set((s) => ({ meetings: [...s.meetings, { ...m, id: crypto.randomUUID(), agreements: [] }] })),
      updateMeeting: (id, p) => set((s) => ({ meetings: s.meetings.map((m) => m.id === id ? { ...m, ...p } : m) })),
      removeMeeting: (id) => set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),
      addAgreement: (mid, text) => set((s) => ({
        meetings: s.meetings.map((m) => m.id === mid ? { ...m, agreements: [...m.agreements, { id: crypto.randomUUID(), text }] } : m),
      })),
      convertAgreement: (mid, aid, taskId) => set((s) => ({
        meetings: s.meetings.map((m) => m.id === mid ? {
          ...m, agreements: m.agreements.map((a) => a.id === aid ? { ...a, convertedTaskId: taskId } : a),
        } : m),
      })),

      addRoadmap: (r) => set((s) => ({ roadmap: [...s.roadmap, { ...r, id: crypto.randomUUID() }] })),
      updateRoadmap: (id, p) => set((s) => ({ roadmap: s.roadmap.map((r) => r.id === id ? { ...r, ...p } : r) })),
      removeRoadmap: (id) => set((s) => ({ roadmap: s.roadmap.filter((r) => r.id !== id) })),

      addSprint: (s) => set((st) => ({ sprints: [...st.sprints, { ...s, id: crypto.randomUUID(), tasks: [], backlog: [], closed: false }] })),
      updateSprint: (id, p) => set((s) => ({ sprints: s.sprints.map((x) => x.id === id ? { ...x, ...p } : x) })),
      removeSprint: (id) => set((s) => ({ sprints: s.sprints.filter((x) => x.id !== id) })),
      addBacklog: (sid, t) => set((s) => ({
        sprints: s.sprints.map((x) => x.id === sid ? { ...x, backlog: [...x.backlog, { ...t, id: crypto.randomUUID(), done: false }] } : x),
      })),
      moveToSprint: (sid, tid) => set((s) => ({
        sprints: s.sprints.map((x) => {
          if (x.id !== sid) return x;
          const task = x.backlog.find((t) => t.id === tid);
          if (!task) return x;
          return { ...x, backlog: x.backlog.filter((t) => t.id !== tid), tasks: [...x.tasks, task] };
        }),
      })),
      toggleSprintTask: (sid, tid) => set((s) => ({
        sprints: s.sprints.map((x) => x.id === sid ? {
          ...x, tasks: x.tasks.map((t) => t.id === tid ? { ...t, done: !t.done } : t),
        } : x),
      })),
      closeSprint: (sid, retro) => set((s) => ({
        sprints: s.sprints.map((x) => x.id === sid ? { ...x, active: false, closed: true, retro } : x),
      })),

      addTemplate: (t) => set((s) => ({ templates: [...s.templates, { ...t, id: crypto.randomUUID() }] })),
      removeTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

      setReminders: (r) => set({ reminders: r }),
      setAutoStates: (a) => set({ autoStates: a }),
      addLog: (entity, message) => set((s) => ({
        changeLog: [{ id: crypto.randomUUID(), ts: new Date().toISOString(), entity, message }, ...s.changeLog].slice(0, 200),
      })),

      addRule: (r) => set((s) => ({ rules: [...s.rules, { ...r, id: crypto.randomUUID() }] })),
      toggleRule: (id) => set((s) => ({ rules: s.rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r) })),
      removeRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

      setEstimate: (taskId, estimatedHours, actualHours) => set((s) => {
        const exist = s.estimates.find((e) => e.taskId === taskId);
        if (exist) return { estimates: s.estimates.map((e) => e.taskId === taskId ? { taskId, estimatedHours, actualHours } : e) };
        return { estimates: [...s.estimates, { taskId, estimatedHours, actualHours }] };
      }),
    }),
    { name: "planeador-productivity" },
  ),
);

// Helpers
export function computeStreak(log: Record<string, boolean>): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = format(addDays(new Date(), -i), "yyyy-MM-dd");
    if (log[d]) streak++; else if (i > 0) break;
  }
  return streak;
}

export function weekStartStr(date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

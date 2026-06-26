import type { Database } from "@/integrations/supabase/types";

export type OrgRole = Database["public"]["Enums"]["org_role"];

export type OrgAction =
  | "invite"
  | "changeRole"
  | "removeMember"
  | "transferOwner"
  | "manageBilling"
  | "manageProjects"
  | "renameOrg"
  | "viewTeam";

const MATRIX: Record<OrgAction, OrgRole[]> = {
  invite: ["OWNER", "ADMIN"],
  changeRole: ["OWNER", "ADMIN"],
  removeMember: ["OWNER", "ADMIN"],
  transferOwner: ["OWNER"],
  manageBilling: ["OWNER"],
  manageProjects: ["OWNER", "ADMIN", "EDITOR"],
  renameOrg: ["OWNER"],
  viewTeam: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
};

export function can(role: OrgRole | null | undefined, action: OrgAction): boolean {
  if (!role) return false;
  return MATRIX[action].includes(role);
}

export const ASSIGNABLE_ROLES: Record<OrgRole, OrgRole[]> = {
  OWNER: ["ADMIN", "EDITOR", "VIEWER"],
  ADMIN: ["EDITOR", "VIEWER"],
  EDITOR: [],
  VIEWER: [],
};

export const ROLE_LABEL: Record<OrgRole, string> = {
  OWNER: "Dueño",
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Visualizador",
};

export const ROLE_BADGE_CLASS: Record<OrgRole, string> = {
  OWNER: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  ADMIN: "bg-primary/20 text-primary border-primary/40",
  EDITOR: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  VIEWER: "bg-muted text-muted-foreground border-border",
};

// ===== Module-level RBAC =====
export type ModuleKey =
  | "calendario" | "actividades" | "gantt" | "riesgos"
  | "presupuesto" | "equipo" | "carga" | "reuniones"
  | "plantillas" | "categorias" | "recordatorios";

export const MODULES: { key: ModuleKey; label: string }[] = [
  { key: "calendario", label: "Calendario" },
  { key: "actividades", label: "Actividades" },
  { key: "gantt", label: "Gantt" },
  { key: "riesgos", label: "Riesgos" },
  { key: "presupuesto", label: "Presupuesto" },
  { key: "equipo", label: "Equipo" },
  { key: "carga", label: "Carga" },
  { key: "reuniones", label: "Reuniones" },
  { key: "plantillas", label: "Plantillas" },
  { key: "categorias", label: "Categorías" },
  { key: "recordatorios", label: "Recordatorios" },
];

export type ModulePermissions = Partial<Record<ModuleKey, { view?: boolean; edit?: boolean }>>;

export type AccessLevel = "view" | "edit";

/**
 * Decide module access.
 * - OWNER / ADMIN: full access always.
 * - EDITOR: view + edit by default; restricted only if permissions[module] explicitly sets false.
 * - VIEWER: view only by default; explicit edit:true required to edit; view can be revoked with view:false.
 */
export function canModule(
  role: OrgRole | null | undefined,
  permissions: ModulePermissions | null | undefined,
  moduleKey: ModuleKey,
  level: AccessLevel = "view",
): boolean {
  if (!role) return false;
  if (role === "OWNER" || role === "ADMIN") return true;
  const p = permissions?.[moduleKey];
  if (role === "EDITOR") {
    if (level === "view") return p?.view !== false;
    return p?.edit !== false;
  }
  // VIEWER
  if (level === "view") return p?.view !== false;
  return !!p?.edit;
}

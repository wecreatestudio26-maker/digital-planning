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
  OWNER: ["ADMIN", "EDITOR", "VIEWER"], // OWNER can set any non-OWNER role; transfer is a separate flow
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

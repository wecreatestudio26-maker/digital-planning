import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type OrgRole = Database["public"]["Enums"]["org_role"];

export const getMyOrganization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: membership, error: mErr } = await supabase
      .from("organization_members")
      .select("id, org_id, role, is_owner, organizations(id, name, owner_id, created_at)")
      .eq("user_id", userId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!membership) return null;
    return {
      membershipId: membership.id,
      orgId: membership.org_id,
      role: membership.role as OrgRole,
      isOwner: membership.is_owner,
      organization: membership.organizations,
    };
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: me, error: meErr } = await supabase
      .from("organization_members").select("org_id").eq("user_id", userId).maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me) return [];
    const { data, error } = await supabase
      .from("organization_members")
      .select("id, user_id, role, is_owner, created_at, profiles:user_id(email, full_name)")
      .eq("org_id", me.org_id)
      .order("is_owner", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      role: m.role as OrgRole,
      isOwner: m.is_owner,
      email: m.profiles?.email ?? null,
      fullName: m.profiles?.full_name ?? null,
      createdAt: m.created_at,
    }));
  });

export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("organization_members").select("org_id").eq("user_id", userId).maybeSingle();
    if (!me) return [];
    const { data, error } = await supabase
      .from("organization_invites")
      .select("id, email, role, created_at, expires_at, accepted_at")
      .eq("org_id", me.org_id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: OrgRole }) => {
    if (!d?.email?.includes("@")) throw new Error("Email inválido");
    if (d.role === "OWNER") throw new Error("No puedes invitar como OWNER");
    if (!["ADMIN", "EDITOR", "VIEWER"].includes(d.role)) throw new Error("Rol inválido");
    return { email: d.email.trim().toLowerCase(), role: d.role };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("organization_members").select("org_id, role").eq("user_id", userId).maybeSingle();
    if (!me) throw new Error("Sin organización");
    if (!["OWNER", "ADMIN"].includes(me.role)) throw new Error("No autorizado");
    if (me.role === "ADMIN" && data.role === "ADMIN") throw new Error("Sólo el OWNER puede crear administradores");
    const { data: invite, error } = await supabase
      .from("organization_invites")
      .insert({ org_id: me.org_id, email: data.email, role: data.role, invited_by: userId })
      .select().single();
    if (error) throw new Error(error.message);
    return invite;
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string; role: OrgRole }) => {
    if (d.role === "OWNER") throw new Error("Usa transferOwnership para cambiar el OWNER");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("organization_members").select("org_id, role").eq("user_id", userId).maybeSingle();
    if (!me) throw new Error("Sin organización");
    if (!["OWNER", "ADMIN"].includes(me.role)) throw new Error("No autorizado");
    const { data: target, error: tErr } = await supabase
      .from("organization_members").select("is_owner, role")
      .eq("id", data.memberId).maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!target) throw new Error("Miembro no encontrado");
    if (target.is_owner) throw new Error("No puedes modificar al OWNER");
    if (me.role === "ADMIN" && data.role === "ADMIN") throw new Error("Sólo el OWNER puede asignar ADMIN");
    const { error } = await supabase
      .from("organization_members").update({ role: data.role }).eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: target } = await supabase
      .from("organization_members").select("is_owner, user_id, org_id")
      .eq("id", data.memberId).maybeSingle();
    if (!target) throw new Error("Miembro no encontrado");
    if (target.is_owner) throw new Error("No puedes eliminar al OWNER");
    if (target.user_id === userId) throw new Error("No puedes eliminarte a ti mismo");
    const { error } = await supabase.from("organization_members").delete().eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const transferOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { newOwnerUserId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("organization_members").select("org_id, is_owner")
      .eq("user_id", userId).maybeSingle();
    if (!me?.is_owner) throw new Error("Sólo el OWNER puede transferir");
    const { error } = await supabase.rpc("transfer_ownership" as any, {
      _org: me.org_id, _new_owner: data.newOwnerUserId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => {
    const name = d.name?.trim();
    if (!name) throw new Error("Nombre requerido");
    return { name };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("organization_members").select("org_id, is_owner")
      .eq("user_id", userId).maybeSingle();
    if (!me?.is_owner) throw new Error("Sólo el OWNER puede renombrar");
    const { error } = await supabase
      .from("organizations").update({ name: data.name }).eq("id", me.org_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

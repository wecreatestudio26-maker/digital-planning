import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type OrgRole = Database["public"]["Enums"]["org_role"];
export type ModulePermissions = Record<string, { view?: boolean; edit?: boolean }>;

function serverPublic() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function sendInviteEmail(opts: {
  to: string; name?: string | null; orgName: string; role: OrgRole; url: string;
}) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) {
    console.warn("[invite] Missing LOVABLE_API_KEY or RESEND_API_KEY; skipping email");
    return { skipped: true };
  }
  const roleLabel: Record<OrgRole, string> = {
    OWNER: "Dueño", ADMIN: "Administrador", EDITOR: "Editor", VIEWER: "Visualizador",
  };
  const greeting = opts.name ? `Hola ${opts.name},` : "Hola,";
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#0b0b0b;color:#e7e7e7;padding:24px">
    <div style="max-width:540px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;padding:28px">
      <h1 style="margin:0 0 12px;font-size:20px">Te han invitado a ${escapeHtml(opts.orgName)}</h1>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.55">${greeting}</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.55">
        Tu rol será <strong>${roleLabel[opts.role]}</strong>. Haz clic en el botón para aceptar la invitación y crear tu cuenta.
      </p>
      <p style="margin:24px 0">
        <a href="${opts.url}" style="background:#22c55e;color:#0a0a0a;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;display:inline-block">Aceptar invitación</a>
      </p>
      <p style="margin:16px 0 0;font-size:12px;color:#999">O copia este enlace: <br/><span style="word-break:break-all">${opts.url}</span></p>
      <p style="margin:16px 0 0;font-size:12px;color:#999">El enlace expira en 7 días.</p>
    </div>
  </body></html>`;

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: "Planeador <onboarding@resend.dev>",
      to: [opts.to],
      subject: `Te han invitado a ${opts.orgName}`,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[invite] Resend error", res.status, text);
    return { skipped: false, error: `Resend ${res.status}` };
  }
  return { skipped: false };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const getMyOrganization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: membership, error: mErr } = await supabase
      .from("organization_members")
      .select("id, org_id, role, is_owner, permissions, organizations(id, name, owner_id, created_at)")
      .eq("user_id", userId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!membership) return null;
    return {
      membershipId: membership.id,
      orgId: membership.org_id,
      role: membership.role as OrgRole,
      isOwner: membership.is_owner,
      permissions: (membership.permissions ?? {}) as ModulePermissions,
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
      .select("id, user_id, role, is_owner, permissions, created_at")
      .eq("org_id", me.org_id)
      .order("is_owner", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const userIds = (data ?? []).map((m) => m.user_id);
    const profileMap = new Map<string, { email: string | null; full_name: string | null }>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, email, full_name").in("id", userIds);
      (profs ?? []).forEach((p: any) => profileMap.set(p.id, { email: p.email, full_name: p.full_name }));
    }
    return (data ?? []).map((m) => ({
      id: m.id,
      userId: m.user_id,
      role: m.role as OrgRole,
      isOwner: m.is_owner,
      permissions: (m.permissions ?? {}) as ModulePermissions,
      email: profileMap.get(m.user_id)?.email ?? null,
      fullName: profileMap.get(m.user_id)?.full_name ?? null,
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
      .select("id, email, role, name, status, created_at, expires_at, accepted_at, token")
      .eq("org_id", me.org_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: OrgRole; name?: string; permissions?: ModulePermissions }) => {
    if (!d?.email?.includes("@")) throw new Error("Email inválido");
    if (d.role === "OWNER") throw new Error("No puedes invitar como OWNER");
    if (!["ADMIN", "EDITOR", "VIEWER"].includes(d.role)) throw new Error("Rol inválido");
    return {
      email: d.email.trim().toLowerCase(),
      role: d.role,
      name: d.name?.trim() || null,
      permissions: d.permissions ?? {},
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("organization_members")
      .select("org_id, role, organizations(name)")
      .eq("user_id", userId).maybeSingle();
    if (!me) throw new Error("Sin organización");
    if (!["OWNER", "ADMIN"].includes(me.role)) throw new Error("No autorizado");
    if (me.role === "ADMIN" && data.role === "ADMIN") throw new Error("Sólo el OWNER puede crear administradores");

    const { data: invite, error } = await supabase
      .from("organization_invites")
      .insert({
        org_id: me.org_id,
        email: data.email,
        role: data.role,
        name: data.name,
        permissions: data.permissions as any,
        invited_by: userId,
        status: "pending",
      })
      .select("id, token, email, role").single();
    if (error) throw new Error(error.message);

    const origin = getRequestHeader("origin") || getRequestHeader("referer") || "";
    const baseUrl = origin.replace(/\/$/, "") || "https://app.lovable.dev";
    const url = `${baseUrl}/invite/${invite.token}`;
    const orgName = (me.organizations as any)?.name ?? "tu organización";
    const emailResult = await sendInviteEmail({
      to: data.email, name: data.name, orgName, role: data.role, url,
    });

    return { invite, url, emailResult };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string; role: OrgRole; permissions?: ModulePermissions }) => {
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
    const patch: any = { role: data.role };
    if (data.permissions) patch.permissions = data.permissions;
    const { error } = await supabase
      .from("organization_members").update(patch).eq("id", data.memberId);
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

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { inviteId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("organization_members").select("org_id, role").eq("user_id", userId).maybeSingle();
    if (!me || !["OWNER", "ADMIN"].includes(me.role)) throw new Error("No autorizado");
    const { error } = await supabase
      .from("organization_invites")
      .update({ status: "revoked" })
      .eq("id", data.inviteId).eq("org_id", me.org_id);
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

// Public: read invite info by token (no auth required)
export const getInviteByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => {
    if (!d?.token) throw new Error("Token requerido");
    return { token: d.token };
  })
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: rows, error } = await sb.rpc("get_invite_public" as any, { _token: data.token });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error("Invitación no encontrada");
    return row as {
      email: string; role: OrgRole; name: string | null;
      org_name: string; status: string; expires_at: string; expired: boolean;
    };
  });

// Authenticated: accept invite
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => {
    if (!d?.token) throw new Error("Token requerido");
    return { token: d.token };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: orgId, error } = await supabase.rpc("accept_org_invite" as any, { _token: data.token });
    if (error) throw new Error(error.message);
    return { orgId };
  });

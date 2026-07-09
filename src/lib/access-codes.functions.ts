import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CODE_REGEX = /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const SUPER_ADMIN_EMAIL = "wecreatestudio26@gmail.com";

// ---------- Redeem (public) ----------

const redeemSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
  fullName: z.string().trim().min(1).max(120),
  code: z.string().trim().min(6).max(200),
  orgName: z.string().trim().min(1).max(120).optional(),
});

type RedeemResult = { ok: true } | { ok: false; error: string };

export const redeemAccessCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => redeemSchema.parse(data))
  .handler(async ({ data }): Promise<RedeemResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rawCode = data.code.trim().toUpperCase();

    const isPlatformCode = CODE_REGEX.test(rawCode);

    // -------- Case A: Hotmart/manual code XXXX-XXXX-XXXX --------
    if (isPlatformCode) {
      const { data: row, error } = await supabaseAdmin
        .from("access_codes")
        .select("id, status, email_buyer")
        .eq("code", rawCode)
        .maybeSingle();
      if (error) {
        console.error("[access-codes] select failed", error);
        return { ok: false, error: "Error interno. Inténtalo de nuevo." };
      }
      if (!row) return { ok: false, error: "Código no encontrado." };
      if (row.status === "redeemed")
        return { ok: false, error: "Este código ya fue canjeado por otra cuenta." };
      if (row.status === "revoked")
        return { ok: false, error: "Este código ha sido revocado." };

      // Create user
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: data.fullName,
          ...(data.orgName ? { org_name: data.orgName } : {}),
        },
      });
      if (createErr || !created?.user) {
        const msg = createErr?.message ?? "No se pudo crear la cuenta.";
        if (/registered|exists/i.test(msg))
          return { ok: false, error: "Ya existe una cuenta con este correo." };
        return { ok: false, error: msg };
      }

      const { error: rpcErr } = await supabaseAdmin.rpc("redeem_access_code", {
        _code: rawCode,
        _user: created.user.id,
      });
      if (rpcErr) {
        console.error("[access-codes] redeem rpc failed", rpcErr);
        // best-effort: user is created; surface soft warning
      }
      return { ok: true };
    }

    // -------- Case B: Gumroad license --------
    const productId = process.env.GUMROAD_PRODUCT_ID;
    if (!productId) {
      return { ok: false, error: "Formato de código no reconocido." };
    }

    let purchase: any;
    try {
      const body = new URLSearchParams({
        product_id: productId,
        license_key: data.code,
        increment_uses_count: "true",
      });
      const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const json = (await res.json()) as any;
      if (!json?.success) return { ok: false, error: json?.message || "Código inválido." };
      purchase = json.purchase;
      if (purchase?.refunded || purchase?.disputed || purchase?.chargebacked)
        return { ok: false, error: "Esta licencia fue reembolsada o disputada." };
    } catch (err) {
      console.error("[access-codes] gumroad verify failed", err);
      return { ok: false, error: "No se pudo verificar el código." };
    }

    const buyerEmail = String(purchase?.email ?? "").toLowerCase();
    if (!buyerEmail || buyerEmail !== data.email.toLowerCase())
      return { ok: false, error: "El correo no coincide con el de la compra." };

    // Reject re-redemption via gumroad_licenses (legacy) + access_codes
    const { data: existingLic } = await supabaseAdmin
      .from("gumroad_licenses")
      .select("id, user_id")
      .eq("license_key", data.code)
      .maybeSingle();
    if (existingLic?.user_id)
      return { ok: false, error: "Esta licencia ya fue canjeada por otra cuenta." };

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        ...(data.orgName ? { org_name: data.orgName } : {}),
      },
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? "No se pudo crear la cuenta.";
      if (/registered|exists/i.test(msg))
        return { ok: false, error: "Ya existe una cuenta con este correo." };
      return { ok: false, error: msg };
    }
    const userId = created.user.id;

    await supabaseAdmin.from("gumroad_licenses").upsert(
      {
        license_key: data.code,
        user_id: userId,
        email: buyerEmail,
        product_id: String(purchase?.product_id ?? productId),
        product_permalink: purchase?.product_permalink ?? null,
        sale_id: purchase?.sale_id ?? null,
        purchase_id: purchase?.id ?? null,
        uses: Number(purchase?.uses ?? 1),
        redeemed_at: new Date().toISOString(),
        raw: purchase,
      },
      { onConflict: "license_key" },
    );

    // Mirror into access_codes as redeemed
    await supabaseAdmin.from("access_codes").upsert(
      {
        code: data.code,
        source: "gumroad",
        email_buyer: buyerEmail,
        status: "redeemed",
        redeemed_by_user_id: userId,
        redeemed_at: new Date().toISOString(),
        metadata: purchase,
      },
      { onConflict: "code" },
    );

    return { ok: true };
  });

// ---------- Admin ----------

async function assertSuperAdmin(context: { supabase: any; claims: any }) {
  const email = (context.claims?.email as string | undefined)?.toLowerCase();
  if (email !== SUPER_ADMIN_EMAIL) throw new Error("Forbidden");
}

export const listAccessCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("access_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

async function sendCodeEmail(toEmail: string, code: string): Promise<{ sent: boolean; error?: string }> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) return { sent: false, error: "Resend no configurado" };
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "WCS Digital Planning <noreply@we-create-studio.com>",
        to: [toEmail],
        subject: "Tu código de acceso a WCS Digital Planning",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 12px">¡Gracias por tu compra!</h2>
            <p>Este es tu código único de activación para WCS Digital Planning:</p>
            <div style="font-size:22px;font-weight:700;letter-spacing:2px;background:#f4f4f5;padding:16px;border-radius:8px;text-align:center;margin:16px 0">${code}</div>
            <p>Regístrate en la aplicación y pega el código durante el registro para activar tu cuenta.</p>
            <p style="color:#666;font-size:12px;margin-top:24px">Si no realizaste esta compra, ignora este mensaje.</p>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[resend] send failed", res.status, txt);
      return { sent: false, error: `${res.status}: ${txt}` };
    }
    return { sent: true };
  } catch (err: any) {
    console.error("[resend] send exception", err);
    return { sent: false, error: err?.message ?? "error" };
  }
}

const generateSchema = z.object({
  email: z.string().trim().email().optional().or(z.literal("")),
  sendEmail: z.boolean().default(false),
});

export const generateManualCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => generateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email && data.email.length > 0 ? data.email : null;
    let code = generateCode();
    // retry a few times on collision
    for (let i = 0; i < 3; i++) {
      const { error } = await supabaseAdmin.from("access_codes").insert({
        code,
        source: "manual",
        email_buyer: email,
        status: "active",
      });
      if (!error) break;
      if (!/duplicate/i.test(error.message)) throw new Error(error.message);
      code = generateCode();
    }
    if (data.sendEmail && email) {
      await sendCodeEmail(email, code);
    }
    return { code };
  });

const codeIdSchema = z.object({ id: z.string().uuid() });

export const revokeAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => codeIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("access_codes")
      .update({ status: "revoked" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resendAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => codeIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("access_codes")
      .select("code, email_buyer")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error(error?.message ?? "Código no encontrado");
    if (!row.email_buyer) throw new Error("Este código no tiene correo asociado");
    const r = await sendCodeEmail(row.email_buyer, row.code);
    if (!r.sent) throw new Error(r.error ?? "No se pudo enviar el correo");
    return { ok: true };
  });

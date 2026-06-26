import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
  fullName: z.string().trim().min(1).max(120),
  licenseKey: z.string().trim().min(6).max(200),
  orgName: z.string().trim().min(1).max(120).optional(),
});

type RedeemResult = { ok: true } | { ok: false; error: string };

export const redeemGumroadLicense = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<RedeemResult> => {
    const productId = process.env.GUMROAD_PRODUCT_ID;
    if (!productId) {
      return { ok: false, error: "Servidor no configurado (falta GUMROAD_PRODUCT_ID)." };
    }

    // 1. Verify license with Gumroad
    let purchase: any;
    try {
      const body = new URLSearchParams({
        product_id: productId,
        license_key: data.licenseKey,
        increment_uses_count: "true",
      });
      const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const json = (await res.json()) as any;
      if (!json?.success) {
        return { ok: false, error: json?.message || "Licencia inválida." };
      }
      purchase = json.purchase;
      if (purchase?.refunded || purchase?.disputed || purchase?.chargebacked) {
        return { ok: false, error: "Esta licencia fue reembolsada o disputada." };
      }
    } catch (err) {
      console.error("[gumroad] verify failed", err);
      return { ok: false, error: "No se pudo contactar con Gumroad. Inténtalo de nuevo." };
    }

    // 2. Match email
    const buyerEmail = String(purchase?.email ?? "").toLowerCase();
    if (!buyerEmail || buyerEmail !== data.email.toLowerCase()) {
      return { ok: false, error: "El correo no coincide con el de la compra en Gumroad." };
    }

    // 3. Admin client (privileged)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 4. Reject re-redemption
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("gumroad_licenses")
      .select("id, user_id")
      .eq("license_key", data.licenseKey)
      .maybeSingle();
    if (selErr) {
      console.error("[gumroad] select failed", selErr);
      return { ok: false, error: "Error interno. Inténtalo de nuevo." };
    }
    if (existing?.user_id) {
      return { ok: false, error: "Esta licencia ya fue canjeada por otra cuenta." };
    }

    // 5. Create user (email_confirm true → no verification email)
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
      if (/registered|exists/i.test(msg)) {
        return { ok: false, error: "Ya existe una cuenta con este correo." };
      }
      return { ok: false, error: msg };
    }
    const userId = created.user.id;

    // 6. Upsert license record
    const { error: upErr } = await supabaseAdmin
      .from("gumroad_licenses")
      .upsert(
        {
          license_key: data.licenseKey,
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
    if (upErr) {
      console.error("[gumroad] upsert failed", upErr);
      // Best-effort: don't fail the signup, the user already exists.
    }

    return { ok: true };
  });

import { createFileRoute } from "@tanstack/react-router";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

const APPROVED_EVENTS = new Set([
  "PURCHASE_APPROVED",
  "PURCHASE_COMPLETE",
  "PURCHASE_COMPLETED",
]);

async function sendCodeEmail(toEmail: string, code: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    console.error("[hotmart-webhook] missing Resend/Lovable keys");
    return;
  }
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
          <p>Este es tu código único de activación:</p>
          <div style="font-size:22px;font-weight:700;letter-spacing:2px;background:#f4f4f5;padding:16px;border-radius:8px;text-align:center;margin:16px 0">${code}</div>
          <p>Regístrate en la aplicación y pega el código durante el registro para activar tu cuenta.</p>
        </div>
      `,
    }),
  });
  if (!res.ok) console.error("[hotmart-webhook] resend failed", res.status, await res.text());
}

export const Route = createFileRoute("/api/public/hotmart-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.HOTMART_HOTTOK;
        if (!expected) return new Response("Server not configured", { status: 500 });

        const raw = await request.text();
        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const provided =
          request.headers.get("x-hotmart-hottok") ||
          request.headers.get("x-hottok") ||
          payload?.hottok ||
          payload?.data?.hottok;
        if (provided !== expected) return new Response("Unauthorized", { status: 401 });

        const event: string = payload?.event ?? payload?.data?.event ?? "";
        if (!APPROVED_EVENTS.has(String(event).toUpperCase())) {
          return Response.json({ ok: true, ignored: true, event });
        }

        const buyer =
          payload?.data?.buyer ?? payload?.buyer ?? payload?.data?.purchase?.buyer ?? {};
        const purchase =
          payload?.data?.purchase ?? payload?.purchase ?? payload?.data ?? {};
        const email: string | undefined = buyer?.email ?? payload?.email;
        const transactionId: string | undefined =
          purchase?.transaction ?? purchase?.transaction_id ?? payload?.transaction;

        if (!email) return new Response("Missing buyer email", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: check by transaction id in metadata
        if (transactionId) {
          const { data: existing } = await supabaseAdmin
            .from("access_codes")
            .select("id, code")
            .eq("source", "hotmart")
            .contains("metadata", { transaction_id: transactionId })
            .maybeSingle();
          if (existing) {
            return Response.json({ ok: true, duplicate: true, code: existing.code });
          }
        }

        // Generate unique code (retry on collision)
        let code = generateCode();
        let inserted = false;
        for (let i = 0; i < 5; i++) {
          const { error } = await supabaseAdmin.from("access_codes").insert({
            code,
            source: "hotmart",
            email_buyer: email,
            status: "active",
            metadata: {
              transaction_id: transactionId ?? null,
              event,
              buyer,
              purchase,
            },
          });
          if (!error) {
            inserted = true;
            break;
          }
          if (!/duplicate/i.test(error.message)) {
            console.error("[hotmart-webhook] insert failed", error);
            return new Response("DB error", { status: 500 });
          }
          code = generateCode();
        }
        if (!inserted) return new Response("Could not generate code", { status: 500 });

        await sendCodeEmail(email, code);

        return Response.json({ ok: true, code });
      },
    },
  },
});

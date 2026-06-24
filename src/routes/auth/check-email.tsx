import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/auth/check-email")({
  validateSearch: searchSchema,
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { email } = Route.useSearch();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (!email || cooldown > 0) return;
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) toast.error("No se pudo reenviar el email");
    else {
      toast.success("Email reenviado");
      setCooldown(60);
    }
  }

  return (
    <AuthCard title="Confirma tu email">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Te enviamos un enlace de confirmación{email ? ` a ${email}` : ""}. Revisa tu bandeja de entrada y
          spam.
        </p>
        <Button onClick={resend} disabled={!email || cooldown > 0} variant="outline" className="w-full">
          {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar email"}
        </Button>
        <Link to="/auth/login" className="text-sm text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    </AuthCard>
  );
}

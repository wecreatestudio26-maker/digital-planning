import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { getInviteByToken, acceptInvite } from "@/lib/org.functions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, type OrgRole } from "@/lib/permissions";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Aceptar invitación — Planeador" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const getInvite = useServerFn(getInviteByToken);
  const accept = useServerFn(acceptInvite);

  const inviteQ = useQuery({
    queryKey: ["invite", token],
    queryFn: () => getInvite({ data: { token } }),
    retry: false,
  });

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const invite = inviteQ.data;
  const status = invite?.status;
  const expired = !!invite?.expired;
  const invalid = status && status !== "pending";

  // If signed-in and emails match, allow direct accept
  const emailMatches = !!user?.email && !!invite?.email &&
    user.email.toLowerCase() === invite.email.toLowerCase();

  async function handleAcceptExisting() {
    setSubmitting(true);
    try {
      await accept({ data: { token } });
      toast.success("¡Invitación aceptada!");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al aceptar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    if (password.length < 6) return toast.error("Mínimo 6 caracteres");
    if (password !== confirm) return toast.error("Las contraseñas no coinciden");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { data: { full_name: invite.name ?? undefined } },
      });
      if (error) throw new Error(translateAuthError(error));
      // Try immediate sign-in (in case email confirmation is disabled)
      await supabase.auth.signInWithPassword({ email: invite.email, password });
      // Wait briefly for session
      await new Promise((r) => setTimeout(r, 300));
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        toast.success("Revisa tu correo para confirmar tu cuenta, luego vuelve a este enlace.");
        return;
      }
      await accept({ data: { token } });
      toast.success("¡Bienvenido!");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-accept if signed-in user matches email
  useEffect(() => {
    if (!authLoading && user && invite && !invalid && !expired && emailMatches) {
      // no auto, show confirm button
    }
  }, [authLoading, user, invite, invalid, expired, emailMatches]);

  if (inviteQ.isLoading || authLoading) {
    return (
      <AuthCard title="Cargando invitación…" subtitle="">
        <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AuthCard>
    );
  }

  if (inviteQ.isError || !invite) {
    return (
      <AuthCard title="Invitación no válida" subtitle="El enlace no existe o ha caducado">
        <Button className="w-full" onClick={() => navigate({ to: "/auth/login" })}>Ir a iniciar sesión</Button>
      </AuthCard>
    );
  }

  if (invalid) {
    return (
      <AuthCard title="Invitación no disponible" subtitle={`Estado: ${status}`}>
        <Button className="w-full" onClick={() => navigate({ to: "/auth/login" })}>Ir a iniciar sesión</Button>
      </AuthCard>
    );
  }

  if (expired) {
    return (
      <AuthCard title="Invitación expirada" subtitle="Pide una nueva invitación al administrador">
        <Button className="w-full" onClick={() => navigate({ to: "/auth/login" })}>Ir a iniciar sesión</Button>
      </AuthCard>
    );
  }

  const subtitle = `Te han invitado a ${invite.org_name} como ${ROLE_LABEL[invite.role as OrgRole]}`;

  if (user && !emailMatches) {
    return (
      <AuthCard title="Cuenta distinta" subtitle={subtitle}>
        <p className="text-sm text-muted-foreground">
          Esta invitación es para <strong>{invite.email}</strong>, pero estás conectado como <strong>{user.email}</strong>.
        </p>
        <Button
          variant="outline" className="w-full mt-4"
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: `/invite/${token}` as any }); }}
        >
          Cerrar sesión y continuar
        </Button>
      </AuthCard>
    );
  }

  if (user && emailMatches) {
    return (
      <AuthCard title="Aceptar invitación" subtitle={subtitle}>
        <Button className="w-full" onClick={handleAcceptExisting} disabled={submitting}>
          {submitting ? "Procesando…" : "Aceptar y entrar"}
        </Button>
      </AuthCard>
    );
  }

  // Not signed in → create password
  return (
    <AuthCard title="Crea tu cuenta" subtitle={subtitle}>
      <form onSubmit={handleCreateAccount} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={invite.email} readOnly disabled />
        </div>
        {invite.name && (
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={invite.name} readOnly disabled />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password" type={showPass ? "text" : "password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} className="pr-10"
            />
            <button
              type="button" onClick={() => setShowPass((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input id="confirm" type={showPass ? "text" : "password"}
            value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creando cuenta…" : "Crear cuenta y aceptar"}
        </Button>
      </form>
    </AuthCard>
  );
}

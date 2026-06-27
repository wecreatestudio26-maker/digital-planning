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
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Aceptar invitación — Planeador" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { t } = useTranslation();
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
      toast.success(t("invite.accepted"));
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? t("invite.acceptError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    if (password.length < 6) return toast.error(t("auth.minChars"));
    if (password !== confirm) return toast.error(t("auth.passwordMismatch"));
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { data: { full_name: invite.name ?? undefined } },
      });
      if (error) throw new Error(translateAuthError(error.message));
      // Try immediate sign-in (in case email confirmation is disabled)
      await supabase.auth.signInWithPassword({ email: invite.email, password });
      // Wait briefly for session
      await new Promise((r) => setTimeout(r, 300));
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        toast.success(t("invite.confirmEmail"));
        return;
      }
      await accept({ data: { token } });
      toast.success(t("invite.welcome"));
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? t("invite.genericError"));
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
      <AuthCard title={t("invite.loading")} subtitle="">
        <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AuthCard>
    );
  }

  if (inviteQ.isError || !invite) {
    return (
      <AuthCard title={t("invite.invalidTitle")} subtitle={t("invite.invalidSubtitle")}>
        <Button className="w-full" onClick={() => navigate({ to: "/auth/login" })}>{t("invite.goToLogin")}</Button>
      </AuthCard>
    );
  }

  if (invalid) {
    return (
      <AuthCard title={t("invite.unavailableTitle")} subtitle={t("invite.statusLabel", { status })}>
        <Button className="w-full" onClick={() => navigate({ to: "/auth/login" })}>{t("invite.goToLogin")}</Button>
      </AuthCard>
    );
  }

  if (expired) {
    return (
      <AuthCard title={t("invite.expiredTitle")} subtitle={t("invite.expiredSubtitle")}>
        <Button className="w-full" onClick={() => navigate({ to: "/auth/login" })}>{t("invite.goToLogin")}</Button>
      </AuthCard>
    );
  }

  const subtitle = t("invite.subtitle", { org: invite.org_name, role: ROLE_LABEL[invite.role as OrgRole] });

  if (user && !emailMatches) {
    return (
      <AuthCard title={t("invite.wrongAccountTitle")} subtitle={subtitle}>
        <p className="text-sm text-muted-foreground">
          {t("invite.wrongAccountBody", { inviteEmail: invite.email, currentEmail: user.email })}
        </p>
        <Button
          variant="outline" className="w-full mt-4"
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: `/invite/${token}` as any }); }}
        >
          {t("invite.signOutAndContinue")}
        </Button>
      </AuthCard>
    );
  }

  if (user && emailMatches) {
    return (
      <AuthCard title={t("invite.acceptTitle")} subtitle={subtitle}>
        <Button className="w-full" onClick={handleAcceptExisting} disabled={submitting}>
          {submitting ? t("invite.processing") : t("invite.acceptAndEnter")}
        </Button>
      </AuthCard>
    );
  }

  // Not signed in → create password
  return (
    <AuthCard title={t("invite.createAccountTitle")} subtitle={subtitle}>
      <form onSubmit={handleCreateAccount} className="space-y-4">
        <div className="space-y-2">
          <Label>{t("auth.email")}</Label>
          <Input value={invite.email} readOnly disabled />
        </div>
        {invite.name && (
          <div className="space-y-2">
            <Label>{t("auth.name")}</Label>
            <Input value={invite.name} readOnly disabled />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <div className="relative">
            <Input
              id="password" type={showPass ? "text" : "password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} className="pr-10"
            />
            <button
              type="button" onClick={() => setShowPass((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
          <Input id="confirm" type={showPass ? "text" : "password"}
            value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t("invite.creatingAccount") : t("invite.createAndAccept")}
        </Button>
      </form>
    </AuthCard>
  );
}

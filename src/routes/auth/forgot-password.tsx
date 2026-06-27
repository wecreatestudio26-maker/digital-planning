import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPage,
});

function ForgotPage() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await resetPassword(email);
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title={t("auth.checkEmailTitle")}>
        <p className="text-sm text-muted-foreground text-center">
          {t("auth.resetEmailSent")}
        </p>
        <Link to="/auth/login" className="mt-4 block text-center text-sm text-primary hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={!email || loading}>
          {loading ? t("auth.sending") : t("auth.sendLink")}
        </Button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link to="/auth/login" className="text-primary hover:underline">
          {t("auth.back")}
        </Link>
      </div>
    </AuthCard>
  );
}

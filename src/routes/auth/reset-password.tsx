import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { translateAuthError } from "@/lib/auth-errors";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPage,
});

function ResetPage() {
  const { t } = useTranslation();
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = password.length >= 6 && password === confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      toast.error(translateAuthError(error));
    } else {
      toast.success(t("auth.passwordUpdated"));
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <AuthCard title={t("auth.newPasswordTitle")} subtitle={t("auth.newPasswordSubtitle")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.newPassword")}</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {confirm && confirm !== password && (
            <p className="text-xs text-destructive">{t("auth.passwordMismatch")}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={!valid || loading}>
          {loading ? t("auth.saving") : t("auth.updatePassword")}
        </Button>
      </form>
    </AuthCard>
  );
}

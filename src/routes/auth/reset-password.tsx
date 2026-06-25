import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { translateAuthError } from "@/lib/auth-errors";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPage,
});

function ResetPage() {
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
      toast.success("Contraseña actualizada");
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <AuthCard title="Nueva contraseña" subtitle="Elige una contraseña segura">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {confirm && confirm !== password && (
            <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={!valid || loading}>
          {loading ? "Guardando..." : "Actualizar contraseña"}
        </Button>
      </form>
    </AuthCard>
  );
}

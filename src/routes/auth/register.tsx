import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Eye, EyeOff, ExternalLink, ArrowLeft } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { translateAuthError } from "@/lib/auth-errors";
import { toast } from "sonner";
import { redeemGumroadLicense } from "@/lib/gumroad.functions";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});

function passwordStrength(pw: string): { label: string; level: 0 | 1 | 2 | 3; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (score === 0) return { label: "—", level: 0, color: "bg-muted" };
  if (score === 1) return { label: "Débil", level: 1, color: "bg-destructive" };
  if (score === 2) return { label: "Media", level: 2, color: "bg-yellow-500" };
  return { label: "Fuerte", level: 3, color: "bg-green-500" };
}

const GUMROAD_URL = import.meta.env.VITE_GUMROAD_PRODUCT_URL as string | undefined;

function RegisterPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const redeem = useServerFn(redeemGumroadLicense);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const valid =
    fullName.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email) &&
    licenseKey.trim().length >= 6 &&
    password.length >= 8 &&
    password === confirm &&
    terms;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await redeem({
        data: {
          fullName: fullName.trim(),
          email: email.trim(),
          licenseKey: licenseKey.trim(),
          password,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { error } = await signIn(email.trim(), password);
      if (error) {
        toast.error(translateAuthError(error));
        return;
      }
      toast.success("Licencia validada. ¡Bienvenido!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "Error validando la licencia.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Crear cuenta" subtitle="Canjea tu licencia de Gumroad">
      <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Introduce la clave de licencia que recibiste por correo de Gumroad tras tu compra.
        {GUMROAD_URL && (
          <>
            {" "}
            <a
              href={GUMROAD_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Comprar ahora <ExternalLink className="h-3 w-3" />
            </a>
          </>
        )}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email (el mismo de la compra)</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="licenseKey">Clave de licencia</Label>
          <Input
            id="licenseKey"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
            autoComplete="off"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-10"
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <div className="space-y-1">
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${strength.color}`}
                  style={{ width: `${(strength.level / 3) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Fortaleza: {strength.label}</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input
            id="confirm"
            type={showPass ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {confirm && confirm !== password && (
            <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
          )}
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="terms" checked={terms} onCheckedChange={(v) => setTerms(v === true)} />
          <Label htmlFor="terms" className="text-sm font-normal leading-tight">
            Acepto los términos y condiciones
          </Label>
        </div>
        <Button type="submit" className="w-full" disabled={!valid || loading}>
          {loading ? "Validando licencia..." : "Canjear licencia y crear cuenta"}
        </Button>
      </form>
      <div className="mt-4 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link to="/auth/login" className="text-primary hover:underline">
          Inicia sesión
        </Link>
      </div>
    </AuthCard>
  );
}

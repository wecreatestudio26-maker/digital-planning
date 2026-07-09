import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  listAccessCodes,
  generateManualCode,
  revokeAccessCode,
  resendAccessCode,
} from "@/lib/access-codes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin/codigos")({
  component: AdminCodigosPage,
});

const SUPER_ADMIN_EMAIL = "wecreatestudio26@gmail.com";

function AdminCodigosPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user && user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  const qc = useQueryClient();
  const list = useServerFn(listAccessCodes);
  const gen = useServerFn(generateManualCode);
  const revoke = useServerFn(revokeAccessCode);
  const resend = useServerFn(resendAccessCode);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["access-codes"],
    queryFn: () => list(),
    enabled: !!user && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL,
  });

  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "redeemed" | "revoked">("all");
  const [newEmail, setNewEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const filtered = useMemo(() => {
    return (codes as any[]).filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (filter) {
        const f = filter.toLowerCase();
        if (!c.code.toLowerCase().includes(f) && !(c.email_buyer ?? "").toLowerCase().includes(f))
          return false;
      }
      return true;
    });
  }, [codes, filter, status]);

  const genMut = useMutation({
    mutationFn: (v: { email: string; sendEmail: boolean }) =>
      gen({ data: { email: v.email, sendEmail: v.sendEmail } }),
    onSuccess: (r: any) => {
      toast.success(`Código creado: ${r.code}`);
      setNewEmail("");
      qc.invalidateQueries({ queryKey: ["access-codes"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });
  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("Código revocado");
      qc.invalidateQueries({ queryKey: ["access-codes"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });
  const resendMut = useMutation({
    mutationFn: (id: string) => resend({ data: { id } }),
    onSuccess: () => toast.success("Correo reenviado"),
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  if (loading || !user || user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return <div className="p-6 text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">🔑 Códigos de acceso</h1>
        <p className="text-sm text-muted-foreground">
          Panel de administración de códigos (Hotmart, Gumroad, manuales).
        </p>
      </div>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-lg font-medium">Generar código manual</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="newEmail">Correo (opcional)</Label>
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sendEmail" checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
            <Label htmlFor="sendEmail" className="font-normal">Enviar por correo</Label>
          </div>
          <Button
            onClick={() => genMut.mutate({ email: newEmail, sendEmail })}
            disabled={genMut.isPending}
          >
            {genMut.isPending ? "Creando…" : "Generar"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Input
            placeholder="Buscar por código o correo…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex gap-2">
            {(["all", "active", "redeemed", "revoked"] as const).map((s) => (
              <Button
                key={s}
                variant={status === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatus(s)}
              >
                {s === "all" ? "Todos" : s === "active" ? "Activos" : s === "redeemed" ? "Canjeados" : "Revocados"}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin resultados</TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.code}</TableCell>
                    <TableCell><Badge variant="secondary">{c.source}</Badge></TableCell>
                    <TableCell className="text-sm">{c.email_buyer ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === "active" ? "default" : c.status === "redeemed" ? "outline" : "destructive"}
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {c.email_buyer && (
                        <Button size="sm" variant="outline" onClick={() => resendMut.mutate(c.id)} disabled={resendMut.isPending}>
                          Reenviar
                        </Button>
                      )}
                      {c.status === "active" && (
                        <Button size="sm" variant="destructive" onClick={() => revokeMut.mutate(c.id)} disabled={revokeMut.isPending}>
                          Revocar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

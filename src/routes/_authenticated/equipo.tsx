import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Trash2, Mail, Crown, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import {
  listMembers, listInvites, inviteMember, updateMemberRole,
  removeMember, revokeInvite, transferOwnership,
} from "@/lib/org.functions";
import { useOrgRole } from "@/hooks/useOrgRole";
import {
  ASSIGNABLE_ROLES, ROLE_BADGE_CLASS, ROLE_LABEL, MODULES,
  type OrgRole, type ModulePermissions,
} from "@/lib/permissions";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/equipo")({
  head: () => ({ meta: [{ title: "Equipo — Planeador" }] }),
  component: TeamPage,
});

function TeamPage() {
  const qc = useQueryClient();
  const org = useOrgRole();
  const fetchMembers = useServerFn(listMembers);
  const fetchInvites = useServerFn(listInvites);
  const inviteFn = useServerFn(inviteMember);
  const updateRoleFn = useServerFn(updateMemberRole);
  const removeFn = useServerFn(removeMember);
  const transferFn = useServerFn(transferOwnership);

  const membersQ = useQuery({ queryKey: ["org-members"], queryFn: () => fetchMembers() });
  const invitesQ = useQuery({ queryKey: ["org-invites"], queryFn: () => fetchInvites() });

  const [openInvite, setOpenInvite] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [form, setForm] = useState<{ email: string; role: OrgRole }>({ email: "", role: "EDITOR" });
  const [transferTo, setTransferTo] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");

  const assignable = org.role ? ASSIGNABLE_ROLES[org.role] : [];

  const inviteMut = useMutation({
    mutationFn: (v: { email: string; role: OrgRole }) => inviteFn({ data: v }),
    onSuccess: () => {
      toast.success(`Invitación creada para ${form.email}`);
      setForm({ email: "", role: "EDITOR" }); setOpenInvite(false);
      qc.invalidateQueries({ queryKey: ["org-invites"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const roleMut = useMutation({
    mutationFn: (v: { memberId: string; role: OrgRole }) => updateRoleFn({ data: v }),
    onSuccess: () => { toast.success("Rol actualizado"); qc.invalidateQueries({ queryKey: ["org-members"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const removeMut = useMutation({
    mutationFn: (v: { memberId: string }) => removeFn({ data: v }),
    onSuccess: () => { toast.success("Miembro eliminado"); qc.invalidateQueries({ queryKey: ["org-members"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const transferMut = useMutation({
    mutationFn: (v: { newOwnerUserId: string }) => transferFn({ data: v }),
    onSuccess: () => {
      toast.success("Propiedad transferida");
      setOpenTransfer(false); setTransferTo(""); setConfirmText("");
      qc.invalidateQueries({ queryKey: ["org-members"] });
      qc.invalidateQueries({ queryKey: ["my-org"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  if (org.loading) return <div className="text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Equipo</h2>
          <p className="text-sm text-muted-foreground">
            {org.orgName} · Tu rol:{" "}
            <span className={`px-2 py-0.5 rounded text-xs border ${org.role ? ROLE_BADGE_CLASS[org.role] : ""}`}>
              {org.role ? ROLE_LABEL[org.role] : "—"}
            </span>
          </p>
        </div>
        {org.can("invite") && (
          <Dialog open={openInvite} onOpenChange={setOpenInvite}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Invitar miembro</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invitar miembro</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Correo</Label>
                  <Input type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as OrgRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {assignable.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenInvite(false)}>Cancelar</Button>
                <Button
                  disabled={!form.email || inviteMut.isPending}
                  onClick={() => inviteMut.mutate(form)}
                >
                  <Mail className="h-4 w-4" /> Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Miembros</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left p-3 font-normal">Miembro</th>
                <th className="text-left font-normal">Rol</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(membersQ.data ?? []).map((m) => {
                const canEditThis = org.can("changeRole") && !m.isOwner;
                const canRemoveThis = org.can("removeMember") && !m.isOwner;
                return (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="p-3">
                      <div className="font-medium flex items-center gap-2">
                        {m.fullName || m.email || m.userId.slice(0, 8)}
                        {m.isOwner && <Crown className="h-3.5 w-3.5 text-amber-400" aria-label="OWNER" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </td>
                    <td>
                      {canEditThis && org.role ? (
                        <Select
                          value={m.role}
                          onValueChange={(v) => roleMut.mutate({ memberId: m.id, role: v as OrgRole })}
                        >
                          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES[org.role].map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-xs border ${ROLE_BADGE_CLASS[m.role]}`}>
                          {ROLE_LABEL[m.role]}
                        </span>
                      )}
                    </td>
                    <td className="text-right pr-3">
                      {canRemoveThis && (
                        <Button variant="ghost" size="icon"
                          onClick={() => {
                            if (confirm(`¿Eliminar a ${m.fullName || m.email}?`)) {
                              removeMut.mutate({ memberId: m.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {(invitesQ.data ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Invitaciones pendientes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {invitesQ.data!.map((i) => (
                  <tr key={i.id} className="border-b border-border/50">
                    <td className="p-3">{i.email}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-xs border ${ROLE_BADGE_CLASS[i.role as OrgRole]}`}>
                        {ROLE_LABEL[i.role as OrgRole]}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      Expira {new Date(i.expires_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {org.can("transferOwner") && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-amber-400" />
              Transferir propiedad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pasarás a ser <strong>Administrador</strong>. Esta acción no se puede deshacer fácilmente.
            </p>
            <Dialog open={openTransfer} onOpenChange={(o) => { setOpenTransfer(o); if (!o) { setTransferTo(""); setConfirmText(""); } }}>
              <DialogTrigger asChild>
                <Button variant="outline">Transferir propiedad</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transferir propiedad de la organización</DialogTitle>
                  <DialogDescription>
                    Escribe <code className="font-mono">TRANSFERIR</code> para confirmar.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nuevo OWNER</Label>
                    <Select value={transferTo} onValueChange={setTransferTo}>
                      <SelectTrigger><SelectValue placeholder="Elige un miembro" /></SelectTrigger>
                      <SelectContent>
                        {(membersQ.data ?? [])
                          .filter((m) => !m.isOwner)
                          .map((m) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              {m.fullName || m.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Confirmación</Label>
                    <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="TRANSFERIR" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenTransfer(false)}>Cancelar</Button>
                  <Button
                    variant="destructive"
                    disabled={!transferTo || confirmText !== "TRANSFERIR" || transferMut.isPending}
                    onClick={() => transferMut.mutate({ newOwnerUserId: transferTo })}
                  >
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

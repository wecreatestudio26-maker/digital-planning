import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const org = useOrgRole();
  const fetchMembers = useServerFn(listMembers);
  const fetchInvites = useServerFn(listInvites);
  const inviteFn = useServerFn(inviteMember);
  const updateRoleFn = useServerFn(updateMemberRole);
  const removeFn = useServerFn(removeMember);
  const revokeFn = useServerFn(revokeInvite);
  const transferFn = useServerFn(transferOwnership);

  const membersQ = useQuery({ queryKey: ["org-members"], queryFn: () => fetchMembers() });
  const invitesQ = useQuery({ queryKey: ["org-invites"], queryFn: () => fetchInvites() });

  const [openInvite, setOpenInvite] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: OrgRole; permissions: ModulePermissions }>(
    { name: "", email: "", role: "EDITOR", permissions: {} },
  );
  const [transferTo, setTransferTo] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");

  const assignable = org.role ? ASSIGNABLE_ROLES[org.role] : [];

  const inviteMut = useMutation({
    mutationFn: (v: { name: string; email: string; role: OrgRole; permissions: ModulePermissions }) =>
      inviteFn({ data: v }),
    onSuccess: (res: any) => {
      const msg = res?.emailResult?.skipped
        ? t("team.inviteCreatedNoEmail", { url: res.url })
        : t("team.inviteSent", { email: form.email });
      toast.success(msg);
      setForm({ name: "", email: "", role: "EDITOR", permissions: {} });
      setOpenInvite(false);
      qc.invalidateQueries({ queryKey: ["org-invites"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const roleMut = useMutation({
    mutationFn: (v: { memberId: string; role: OrgRole }) => updateRoleFn({ data: v }),
    onSuccess: () => { toast.success(t("team.roleUpdated")); qc.invalidateQueries({ queryKey: ["org-members"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const removeMut = useMutation({
    mutationFn: (v: { memberId: string }) => removeFn({ data: v }),
    onSuccess: () => { toast.success(t("team.memberRemoved")); qc.invalidateQueries({ queryKey: ["org-members"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const revokeMut = useMutation({
    mutationFn: (v: { inviteId: string }) => revokeFn({ data: v }),
    onSuccess: () => { toast.success(t("team.inviteRevoked")); qc.invalidateQueries({ queryKey: ["org-invites"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });


  const transferMut = useMutation({
    mutationFn: (v: { newOwnerUserId: string }) => transferFn({ data: v }),
    onSuccess: () => {
      toast.success(t("team.ownershipTransferred"));
      setOpenTransfer(false); setTransferTo(""); setConfirmText("");
      qc.invalidateQueries({ queryKey: ["org-members"] });
      qc.invalidateQueries({ queryKey: ["my-org"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  if (org.loading) return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("team.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {org.orgName} · {t("team.yourRole")}{" "}
            <span className={`px-2 py-0.5 rounded text-xs border ${org.role ? ROLE_BADGE_CLASS[org.role] : ""}`}>
              {org.role ? ROLE_LABEL[org.role] : "—"}
            </span>
          </p>
        </div>
        {org.can("invite") && (
          <Dialog open={openInvite} onOpenChange={setOpenInvite}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> {t("team.inviteMember")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t("team.inviteMember")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>{t("team.name")}</Label>
                  <Input value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t("team.namePlaceholder")} />
                </div>
                <div>
                  <Label>{t("team.email")}</Label>
                  <Input type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>{t("team.role")}</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as OrgRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {assignable.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(form.role === "EDITOR" || form.role === "VIEWER") && (
                  <div className="space-y-2">
                    <Label>{t("team.modulePermissions")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {form.role === "VIEWER"
                        ? t("team.viewerHint")
                        : t("team.editorHint")}
                    </p>
                    <div className="border border-border rounded-md divide-y divide-border">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-xs text-muted-foreground">
                        <span>{t("team.module")}</span><span>{t("team.view")}</span><span>{t("team.editPerm")}</span>
                      </div>
                      {MODULES.map((mod) => {
                        const p = form.permissions[mod.key] ?? {};
                        const defaultView = form.role === "EDITOR" ? true : true;
                        const defaultEdit = form.role === "EDITOR" ? true : false;
                        const viewVal = p.view ?? defaultView;
                        const editVal = p.edit ?? defaultEdit;
                        const setP = (next: { view?: boolean; edit?: boolean }) =>
                          setForm({
                            ...form,
                            permissions: { ...form.permissions, [mod.key]: { ...p, ...next } },
                          });
                        return (
                          <div key={mod.key} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 items-center">
                            <span className="text-sm">{mod.label}</span>
                            <Checkbox checked={viewVal} onCheckedChange={(v) => setP({ view: v === true })} />
                            <Checkbox checked={editVal}
                              disabled={!viewVal}
                              onCheckedChange={(v) => setP({ edit: v === true })} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenInvite(false)}>{t("common.cancel")}</Button>
                <Button
                  disabled={!form.email || inviteMut.isPending}
                  onClick={() => inviteMut.mutate(form)}
                >
                  <Mail className="h-4 w-4" /> {t("team.sendInvitation")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("team.members")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left p-3 font-normal">{t("team.member")}</th>
                <th className="text-left font-normal">{t("team.role")}</th>
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
                            if (confirm(t("team.confirmRemove", { name: m.fullName || m.email }))) {
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
          <CardHeader><CardTitle className="text-base">{t("team.pendingInvitations")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {invitesQ.data!.map((i: any) => (
                  <tr key={i.id} className="border-b border-border/50">
                    <td className="p-3">
                      <div className="font-medium">{i.name || i.email}</div>
                      {i.name && <div className="text-xs text-muted-foreground">{i.email}</div>}
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-xs border ${ROLE_BADGE_CLASS[i.role as OrgRole]}`}>
                        {ROLE_LABEL[i.role as OrgRole]}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {t("team.expires", { date: new Date(i.expires_at).toLocaleDateString() })}
                    </td>
                    <td className="text-right pr-3">
                      {org.can("invite") && (
                        <>
                          <Button variant="ghost" size="sm"
                            onClick={() => {
                              const url = `${window.location.origin}/invite/${i.token}`;
                              navigator.clipboard.writeText(url);
                              toast.success(t("team.linkCopied"));
                            }}
                          >{t("team.copyLink")}</Button>
                          <Button variant="ghost" size="icon"
                            onClick={() => {
                              if (confirm(t("team.confirmRevoke", { email: i.email }))) {
                                revokeMut.mutate({ inviteId: i.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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
              {t("team.transferOwnership")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("team.transferWarning")}
            </p>
            <Dialog open={openTransfer} onOpenChange={(o) => { setOpenTransfer(o); if (!o) { setTransferTo(""); setConfirmText(""); } }}>
              <DialogTrigger asChild>
                <Button variant="outline">{t("team.transferOwnership")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("team.transferOrgTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("team.transferConfirmHint")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>{t("team.newOwner")}</Label>
                    <Select value={transferTo} onValueChange={setTransferTo}>
                      <SelectTrigger><SelectValue placeholder={t("team.chooseMember")} /></SelectTrigger>
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
                    <Label>{t("team.confirmation")}</Label>
                    <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="TRANSFERIR" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenTransfer(false)}>{t("common.cancel")}</Button>
                  <Button
                    variant="destructive"
                    disabled={!transferTo || confirmText !== "TRANSFERIR" || transferMut.isPending}
                    onClick={() => transferMut.mutate({ newOwnerUserId: transferTo })}
                  >
                    {t("common.confirm")}
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

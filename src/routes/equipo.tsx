import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useProductivity, type Member } from "@/lib/productivity-store";

export const Route = createFileRoute("/equipo")({
  head: () => ({ meta: [{ title: "Equipo — Planeador" }, { name: "description", content: "Gestión de miembros y permisos." }] }),
  component: TeamPage,
});

const MODULES = ["dashboard", "actividades", "gantt", "okr", "tiempo", "presupuesto", "riesgos"];

function TeamPage() {
  const { members, addMember, updateMember, removeMember } = useProductivity();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: Member["role"] }>({ name: "", email: "", role: "editor" });

  const roleColor = (r: Member["role"]) => r === "admin" ? "bg-primary/20 text-primary" : r === "editor" ? "bg-blue-500/20 text-blue-300" : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Equipo</h2>
          <p className="text-sm text-muted-foreground">Miembros, roles y permisos por módulo.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Invitar miembro</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invitar miembro</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Correo</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Member["role"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => {
                if (form.name && form.email) {
                  addMember({ ...form, permissions: form.role === "admin" ? ["all"] : ["dashboard"] });
                  toast.success(`Invitación enviada a ${form.email}`);
                  setForm({ name: "", email: "", role: "editor" });
                  setOpen(false);
                }
              }}><Mail className="h-4 w-4" /> Enviar invitación</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left p-3 font-normal">Miembro</th>
              <th className="text-left font-normal">Rol</th>
              <th className="text-left font-normal">Permisos por módulo</th>
              <th></th>
            </tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="p-3">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </td>
                  <td>
                    <Select value={m.role} onValueChange={(v) => updateMember(m.id, { role: v as Member["role"] })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {MODULES.map((mod) => {
                        const enabled = m.permissions.includes("all") || m.permissions.includes(mod);
                        return (
                          <button
                            key={mod}
                            onClick={() => {
                              if (m.permissions.includes("all")) return;
                              const next = enabled ? m.permissions.filter((p) => p !== mod) : [...m.permissions, mod];
                              updateMember(m.id, { permissions: next });
                            }}
                            className={`px-2 py-0.5 rounded text-xs border ${enabled ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}
                          >{mod}</button>
                        );
                      })}
                    </div>
                  </td>
                  <td><Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

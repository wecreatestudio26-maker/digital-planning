import { useEffect, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Activity } from "@/lib/types";
import { useActivities } from "@/lib/activities-store";
import { toast } from "sonner";
import {
  listCategories, createCategory,
  listTeamMembers, createTeamMember,
} from "@/lib/catalog.functions";

const schema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
    description: z.string().max(500).optional(),
    category: z.string().min(1, "Categoría obligatoria"),
    startDate: z.string().min(1, "Fecha inicio obligatoria"),
    endDate: z.string().min(1, "Fecha fin obligatoria"),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    assignee: z.string().trim().min(1, "Responsable obligatorio").max(80),
    priority: z.enum(["alta", "media", "baja"]),
    status: z.enum(["pendiente", "en_progreso", "completado"]),
    notes: z.string().max(1000).optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    path: ["endDate"],
    message: "La fecha fin debe ser igual o posterior",
  });

const empty: Omit<Activity, "id"> = {
  name: "",
  description: "",
  category: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  startTime: "",
  endTime: "",
  assignee: "",
  priority: "media",
  status: "pendiente",
  notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Activity | null;
}

export function ActivityForm({ open, onOpenChange, editing }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { add, update } = useActivities();
  const [form, setForm] = useState<Omit<Activity, "id">>(empty);

  const listCats = useServerFn(listCategories);
  const listTeam = useServerFn(listTeamMembers);
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: () => listCats(), enabled: open });
  const teamQ = useQuery({ queryKey: ["team_members"], queryFn: () => listTeam(), enabled: open });

  useEffect(() => {
    if (open) {
      if (editing) {
        const { id: _id, ...rest } = editing;
        setForm(rest);
      } else {
        setForm(empty);
      }
    }
  }, [open, editing]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (editing) {
      update(editing.id, parsed.data);
      toast.success(t("activity.updated"));
    } else {
      add(parsed.data);
      toast.success(t("activity.created"));
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? t("activity.editTitle") : t("activity.newTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("activity.name")} *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("activity.description")}</Label>
            <Textarea rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("activity.category")} *</Label>
              <CategoryCombo
                value={form.category}
                onChange={(v) => set("category", v)}
                options={catsQ.data ?? []}
                onCreated={(name) => {
                  qc.invalidateQueries({ queryKey: ["categories"] });
                  set("category", name);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("activity.assignee")} *</Label>
              <AssigneeCombo
                value={form.assignee}
                onChange={(v) => set("assignee", v)}
                options={teamQ.data ?? []}
                onCreated={(name) => {
                  qc.invalidateQueries({ queryKey: ["team_members"] });
                  set("assignee", name);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("activity.startDate")} *</Label>
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("activity.endDate")} *</Label>
              <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("activity.startTime")}</Label>
              <Input type="time" value={form.startTime ?? ""} onChange={(e) => set("startTime", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("activity.endTime")}</Label>
              <Input type="time" value={form.endTime ?? ""} onChange={(e) => set("endTime", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("activity.priority")}</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v as Activity["priority"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">{t("activity.priorities.alta")}</SelectItem>
                  <SelectItem value="media">{t("activity.priorities.media")}</SelectItem>
                  <SelectItem value="baja">{t("activity.priorities.baja")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("activity.status")}</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as Activity["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">{t("activity.statuses.pendiente")}</SelectItem>
                  <SelectItem value="en_progreso">{t("activity.statuses.en_progreso")}</SelectItem>
                  <SelectItem value="completado">{t("activity.statuses.completado")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("activity.notes")}</Label>
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Category combobox ----
type Category = { id: string; name: string; color: string };

function CategoryCombo({
  value, onChange, options, onCreated,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Category[];
  onCreated: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="justify-between font-normal">
            {value || t("activity.selectOrCreate")}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command>
            <CommandInput placeholder={t("activity.selectOrCreate")} />
            <CommandList>
              <CommandEmpty>—</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    onSelect={() => { onChange(o.name); setOpen(false); }}
                  >
                    <span className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: o.color }} />
                    {o.name}
                    <Check className={cn("ml-auto h-4 w-4", value === o.name ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
                <CommandItem onSelect={() => { setOpen(false); setCreateOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("activity.createCategory")}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <CreateCategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onCreated}
      />
    </>
  );
}

function CreateCategoryDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (name: string) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const create = useServerFn(createCategory);
  const mut = useMutation({
    mutationFn: (input: { name: string; color: string }) => create({ data: input }),
    onSuccess: (row) => {
      toast.success(t("common.create"));
      onCreated(row.name);
      onOpenChange(false);
      setName(""); setColor("#10b981");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t("activity.newCategory")}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>{t("activity.category")} *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-2">
            <Label>{t("activity.color")}</Label>
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20 p-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button disabled={!name.trim() || mut.isPending} onClick={() => mut.mutate({ name: name.trim(), color })}>
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Assignee combobox ----
type Member = { id: string; full_name: string; email: string | null; role: string | null; avatar_color: string };

function AssigneeCombo({
  value, onChange, options, onCreated,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Member[];
  onCreated: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="justify-between font-normal">
            {value || t("activity.selectOrCreate")}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command>
            <CommandInput placeholder={t("activity.selectOrCreate")} />
            <CommandList>
              <CommandEmpty>—</CommandEmpty>
              <CommandGroup>
                {options.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.full_name}
                    onSelect={() => { onChange(m.full_name); setOpen(false); }}
                  >
                    <span className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: m.avatar_color }} />
                    {m.full_name}
                    <Check className={cn("ml-auto h-4 w-4", value === m.full_name ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
                <CommandItem onSelect={() => { setOpen(false); setCreateOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("activity.createTeamMember")}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <CreateMemberDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onCreated}
      />
    </>
  );
}

function CreateMemberDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (name: string) => void }) {
  const { t } = useTranslation();
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [color, setColor] = useState("#0ea5e9");
  const create = useServerFn(createTeamMember);
  const mut = useMutation({
    mutationFn: (input: { full_name: string; email: string; role: string; avatar_color: string }) =>
      create({ data: input }),
    onSuccess: (row) => {
      toast.success(t("common.create"));
      onCreated(row.full_name);
      onOpenChange(false);
      setFullName(""); setEmail(""); setRole(""); setColor("#0ea5e9");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t("activity.newTeamMember")}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>{t("activity.assignee")} *</Label>
            <Input value={full_name} onChange={(e) => setFullName(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-2">
            <Label>{t("activity.email")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("activity.role")}</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("activity.color")}</Label>
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20 p-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button disabled={!full_name.trim() || mut.isPending} onClick={() => mut.mutate({
            full_name: full_name.trim(), email: email.trim(), role: role.trim(), avatar_color: color,
          })}>
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

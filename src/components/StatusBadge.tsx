import { cn } from "@/lib/utils";
import { STATUS_LABEL, type Status, type Priority, PRIORITY_LABEL } from "@/lib/types";

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const styles: Record<Status, string> = {
    pendiente: "bg-muted text-muted-foreground border-border",
    en_progreso: "bg-[oklch(0.82_0.17_85_/_0.18)] text-[oklch(0.86_0.17_85)] border-[oklch(0.82_0.17_85_/_0.4)]",
    completado: "bg-primary/15 text-primary border-primary/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    alta: "bg-destructive/15 text-destructive border-destructive/40",
    media: "bg-[oklch(0.82_0.17_85_/_0.18)] text-[oklch(0.86_0.17_85)] border-[oklch(0.82_0.17_85_/_0.4)]",
    baja: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[priority],
      )}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

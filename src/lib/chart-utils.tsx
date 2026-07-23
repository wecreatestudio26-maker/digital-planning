import type { ReactNode } from "react";

export const CHART_MIN_HEIGHT = 320;

export function filterPositive<T extends Record<string, unknown>>(
  data: T[],
  keys: string[],
): T[] {
  return data.filter((row) =>
    keys.some((k) => {
      const v = row[k];
      return typeof v === "number" && v > 0;
    }),
  );
}

export function EmptyChart({ label = "Sin datos para mostrar" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function ChartFrame({ children }: { children: ReactNode }) {
  return <div className="w-full" style={{ minHeight: CHART_MIN_HEIGHT }}>{children}</div>;
}

/**
 * Recharts custom tooltip that always prints the real name and value.
 * Works for Bar / Pie / Line (each payload item exposes .name, .value, .payload).
 */
export function RichTooltip({
  active,
  payload,
  label,
  total,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string | number;
  total?: number;
  formatter?: (n: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const fmt = formatter ?? ((n: number) => String(n));
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      {label != null && (
        <div className="mb-1 text-xs font-medium text-foreground">{String(label)}</div>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => {
          const name = p.name ?? (p.payload as { name?: string })?.name ?? "";
          const value = Number(p.value ?? 0);
          const pct = total && total > 0 ? ` (${((value / total) * 100).toFixed(0)}%)` : "";
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: p.color ?? "#22c55e" }}
              />
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto font-medium tabular-nums text-foreground">
                {fmt(value)}
                {pct}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

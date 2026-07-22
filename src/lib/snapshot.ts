import { useActivities } from "./activities-store";
import { useExtra } from "./extra-store";
import { useProductivity } from "./productivity-store";

export interface AppSnapshot {
  version: 1;
  savedAt: string;
  activities: unknown;
  extra: unknown;
  productivity: unknown;
}

export function collectSnapshot(): AppSnapshot {
  const a = useActivities.getState();
  const e = useExtra.getState();
  const p = useProductivity.getState();
  const pick = (obj: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => typeof v !== "function"));
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    activities: pick(a as unknown as Record<string, unknown>),
    extra: pick(e as unknown as Record<string, unknown>),
    productivity: pick(p as unknown as Record<string, unknown>),
  };
}

export function applySnapshot(snap: AppSnapshot) {
  if (!snap || typeof snap !== "object") return;
  const a = snap.activities as { activities?: unknown } | undefined;
  const e = snap.extra as Record<string, unknown> | undefined;
  const p = snap.productivity as Record<string, unknown> | undefined;
  if (a && Array.isArray(a.activities)) useActivities.setState({ activities: a.activities as never });
  if (e) useExtra.setState((prev) => ({ ...prev, ...e }) as never);
  if (p) useProductivity.setState((prev) => ({ ...prev, ...p }) as never);
}

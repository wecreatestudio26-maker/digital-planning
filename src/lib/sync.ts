import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useActivities } from "./activities-store";
import { useProductivity } from "./productivity-store";
import { useExtra } from "./extra-store";
import { loadUserState, saveUserState } from "./sync.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STORES: Record<string, any> = {
  activities: useActivities,
  productivity: useProductivity,
  extra: useExtra,
};

function pickData(state: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    if (typeof v !== "function") out[k] = v;
  }
  return out;
}

export function collectSnapshot(): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  for (const key of Object.keys(STORES)) {
    snap[key] = pickData(STORES[key].getState() as Record<string, unknown>);
  }
  return snap;
}

export function applySnapshot(payload: unknown) {
  if (!payload || typeof payload !== "object") return;
  const p = payload as Record<string, unknown>;
  for (const key of Object.keys(STORES)) {
    const data = p[key];
    if (data && typeof data === "object") {
      STORES[key].setState(data);
    }
  }
}

type Status = "idle" | "saving" | "loading" | "saved" | "error";

let loadedOnce = false;

type LoadResult = { payloadJson: string; version: number; updatedAt: string } | null;
type SaveResult = { version: number; updatedAt: string };

export function useCloudSync() {
  const save = useServerFn(saveUserState);
  const load = useServerFn(loadUserState);
  const [status, setStatus] = useState<Status>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const versionRef = useRef<number>(1);

  const doSave = useCallback(async () => {
    setStatus("saving");
    try {
      const payload = collectSnapshot();
      const res = (await save({
        data: { payloadJson: JSON.stringify(payload), version: versionRef.current + 1 },
      })) as SaveResult;
      versionRef.current = res.version;
      setLastSavedAt(res.updatedAt);
      setIsDirty(false);
      setStatus("saved");
      toast.success("Guardado en la nube");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch (e) {
      setStatus("error");
      toast.error("No se pudo guardar: " + (e as Error).message);
    }
  }, [save]);

  const doLoad = useCallback(async () => {
    setStatus("loading");
    try {
      const res = (await load()) as LoadResult;
      if (res) {
        applySnapshot(JSON.parse(res.payloadJson));
        versionRef.current = res.version;
        setLastSavedAt(res.updatedAt);
      }
      setIsDirty(false);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      toast.error("No se pudo cargar: " + (e as Error).message);
    }
  }, [load]);

  useEffect(() => {
    const unsubs = Object.keys(STORES).map((k) =>
      STORES[k].subscribe(() => {
        if (loadedOnce) setIsDirty(true);
      }),
    );
    return () => unsubs.forEach((u: () => void) => u());
  }, []);

  useEffect(() => {
    if (loadedOnce) return;
    loadedOnce = true;
    doLoad();
  }, [doLoad]);

  return { save: doSave, load: doLoad, status, lastSavedAt, isDirty };
}

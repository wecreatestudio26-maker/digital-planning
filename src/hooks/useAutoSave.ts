import { create } from "zustand";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useActivities } from "@/lib/activities-store";
import { useExtra } from "@/lib/extra-store";
import { useProductivity } from "@/lib/productivity-store";
import { applySnapshot, collectSnapshot, type AppSnapshot } from "@/lib/snapshot";
import { saveSnapshot, loadSnapshot } from "@/lib/snapshot.functions";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

type Status = "idle" | "saving" | "saved" | "error";

interface SaveState {
  dirty: boolean;
  status: Status;
  lastSavedAt: string | null;
  hydrated: boolean;
  setDirty: (d: boolean) => void;
  setStatus: (s: Status) => void;
  setLastSavedAt: (t: string | null) => void;
  setHydrated: (h: boolean) => void;
}

export const useSaveState = create<SaveState>((set) => ({
  dirty: false,
  status: "idle",
  lastSavedAt: null,
  hydrated: false,
  setDirty: (d) => set({ dirty: d }),
  setStatus: (s) => set({ status: s }),
  setLastSavedAt: (t) => set({ lastSavedAt: t }),
  setHydrated: (h) => set({ hydrated: h }),
}));

let subscribed = false;
function subscribeStores() {
  if (subscribed) return;
  subscribed = true;
  const mark = () => {
    if (useSaveState.getState().hydrated) useSaveState.getState().setDirty(true);
  };
  useActivities.subscribe(mark);
  useExtra.subscribe(mark);
  useProductivity.subscribe(mark);
}

export function useAutoSave() {
  const { user } = useAuth();
  const save = useServerFn(saveSnapshot);
  const load = useServerFn(loadSnapshot);
  const { setDirty, setStatus, setLastSavedAt, setHydrated } = useSaveState();
  const loadedRef = useRef(false);

  // Load on auth
  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      try {
        const row = await load();
        if (row && (row as { payload?: AppSnapshot }).payload) {
          applySnapshot((row as { payload: AppSnapshot }).payload);
          setLastSavedAt((row as { updated_at?: string }).updated_at ?? null);
        }
      } catch (e) {
        console.warn("[snapshot] load failed", e);
      } finally {
        subscribeStores();
        setHydrated(true);
        setDirty(false);
      }
    })();
  }, [user, load, setDirty, setHydrated, setLastSavedAt]);

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useSaveState.getState().dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // manual save
  const doSave = async (silent = false) => {
    if (!user) return;
    setStatus("saving");
    try {
      const snap = collectSnapshot();
      const res = await save({ data: { payload: snap } });
      setLastSavedAt(res.savedAt);
      setDirty(false);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
      if (!silent) toast.success("Guardado");
    } catch (e) {
      setStatus("error");
      toast.error("Error al guardar");
      console.error("[snapshot] save failed", e);
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  // auto-save every 3 min
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      if (useSaveState.getState().dirty) doSave(true);
    }, 3 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { save: doSave };
}

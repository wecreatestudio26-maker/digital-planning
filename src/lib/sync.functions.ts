import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Snapshot = { [key: string]: unknown };

type SaveInput = { payload: Snapshot; version: number };

export const loadUserState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_app_state")
      .select("payload, version, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      payload: data.payload as unknown,
      version: data.version as number,
      updatedAt: data.updated_at as string,
    };
  });

export const saveUserState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SaveInput) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("user_app_state")
      .upsert(
        {
          user_id: context.userId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: data.payload as any,
          version: data.version,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("version, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { version: row.version as number, updatedAt: row.updated_at as string };
  });

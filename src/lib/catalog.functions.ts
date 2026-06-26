import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("categories")
      .select("id,name,color")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ name: z.string().trim().min(1).max(60), color: z.string().min(1).max(20).default("#10b981") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("categories")
      .insert({ name: data.name, color: data.color, user_id: context.userId })
      .select("id,name,color")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("team_members")
      .select("id,full_name,email,role,avatar_color")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        full_name: z.string().trim().min(1).max(80),
        email: z.string().trim().email().optional().or(z.literal("")),
        role: z.string().trim().max(80).optional().or(z.literal("")),
        avatar_color: z.string().min(1).max(20).default("#0ea5e9"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("team_members")
      .insert({
        full_name: data.full_name,
        email: data.email || null,
        role: data.role || null,
        avatar_color: data.avatar_color,
        user_id: context.userId,
      })
      .select("id,full_name,email,role,avatar_color")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

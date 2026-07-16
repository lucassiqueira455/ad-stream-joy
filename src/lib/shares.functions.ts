import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DATE_PRESETS = [
  "today", "yesterday", "last_3d", "last_7d", "last_14d", "last_28d",
  "last_30d", "last_90d", "this_month", "last_month",
] as const;

// Admin: fetch existing share (if any) for a client owned by caller.
export const getClientShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clientId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("client_shares")
      .select("id, token, active, allow_date_change, created_at, updated_at")
      .eq("client_id", data.clientId)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

// Admin: create a share on first click, or regenerate token (invalidates old).
export const createOrRegenerateShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clientId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    // Ensure caller owns the client
    const { data: client, error: cErr } = await context.supabase
      .from("clients").select("id, user_id").eq("id", data.clientId).maybeSingle();
    if (cErr) throw cErr;
    if (!client) throw new Error("Cliente não encontrado");

    const { data: row, error } = await context.supabase
      .from("client_shares")
      .upsert(
        { client_id: data.clientId, user_id: client.user_id, token, active: true },
        { onConflict: "client_id" },
      )
      .select("id, token, active, allow_date_change, created_at, updated_at")
      .single();
    if (error) throw error;
    return row;
  });

export const setShareActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clientId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("client_shares")
      .update({ active: data.active })
      .eq("client_id", data.clientId);
    if (error) throw error;
    return { ok: true };
  });

export const setShareAllowDateChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clientId: z.string().uuid(), allow: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("client_shares")
      .update({ allow_date_change: data.allow })
      .eq("client_id", data.clientId);
    if (error) throw error;
    return { ok: true };
  });

// Public: fetch report data given a share token. No auth required.
// The token IS the authentication — validated server-side against the DB.
export const getPublicReport = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      token: z.string().min(20).max(200),
      datePreset: z.enum(DATE_PRESETS).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: share, error } = await supabaseAdmin
      .from("client_shares")
      .select("client_id, active, allow_date_change")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw error;
    if (!share || !share.active) {
      throw new Error("Link inválido ou desativado");
    }

    const { data: client, error: cErr } = await supabaseAdmin
      .from("clients")
      .select("id, name, brand_color, logo")
      .eq("id", share.client_id)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!client) throw new Error("Cliente não encontrado");

    const effectivePreset = share.allow_date_change && data.datePreset
      ? data.datePreset
      : "last_30d";

    const { computeClientMetrics } = await import("./metrics.server");
    const metrics = await computeClientMetrics(supabaseAdmin, share.client_id, effectivePreset);

    return {
      client,
      allowDateChange: share.allow_date_change,
      datePreset: effectivePreset,
      metrics,
    };
  });

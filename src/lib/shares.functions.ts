import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DATE_PRESETS = [
  "today", "yesterday", "last_3d", "last_7d", "last_14d", "last_28d",
  "last_30d", "last_90d", "this_month", "last_month",
] as const;

function generateToken(): string {
  // Uses Web Crypto (available in Workers). 32 random bytes → base64url.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Admin: fetch existing share (if any) for a client owned by caller.
export const getClientShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clientId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("client_shares")
      .select("id, token, dashboard_token, active, allow_date_change, created_at, updated_at")
      .eq("client_id", data.clientId)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

// Admin: create share on first click, or regenerate specific token.
export const createOrRegenerateShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      clientId: z.string().uuid(),
      kind: z.enum(["report", "dashboard", "both"]).default("both"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: client, error: cErr } = await context.supabase
      .from("clients").select("id, user_id").eq("id", data.clientId).maybeSingle();
    if (cErr) throw cErr;
    if (!client) throw new Error("Cliente não encontrado");

    // Load existing (if any)
    const { data: existing } = await context.supabase
      .from("client_shares")
      .select("id, token, dashboard_token")
      .eq("client_id", data.clientId)
      .maybeSingle();

    const nextToken = data.kind === "dashboard"
      ? (existing?.token ?? generateToken())
      : generateToken();
    const nextDashboardToken = data.kind === "report"
      ? (existing?.dashboard_token ?? generateToken())
      : generateToken();

    const { data: row, error } = await context.supabase
      .from("client_shares")
      .upsert(
        {
          client_id: data.clientId,
          user_id: client.user_id,
          token: nextToken,
          dashboard_token: nextDashboardToken,
          active: true,
        },
        { onConflict: "client_id" },
      )
      .select("id, token, dashboard_token, active, allow_date_change, created_at, updated_at")
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

// Public: report data by token.
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
    if (!share || !share.active) throw new Error("Link inválido ou desativado");

    const { data: client, error: cErr } = await supabaseAdmin
      .from("clients").select("id, name, brand_color, logo").eq("id", share.client_id).maybeSingle();
    if (cErr) throw cErr;
    if (!client) throw new Error("Cliente não encontrado");

    const effectivePreset = data.datePreset ?? "last_30d";
    const { computeClientMetrics } = await import("./metrics.server");
    const metrics = await computeClientMetrics(supabaseAdmin, share.client_id, effectivePreset);

    return { client, allowDateChange: true, datePreset: effectivePreset, metrics };
  });

// Public: dashboard data by dashboard_token.
export const getPublicDashboard = createServerFn({ method: "POST" })
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
      .eq("dashboard_token", data.token)
      .maybeSingle();
    if (error) throw error;
    if (!share || !share.active) throw new Error("Link inválido ou desativado");

    const { data: client, error: cErr } = await supabaseAdmin
      .from("clients").select("id, name, brand_color, logo").eq("id", share.client_id).maybeSingle();
    if (cErr) throw cErr;
    if (!client) throw new Error("Cliente não encontrado");

    const effectivePreset = data.datePreset ?? "last_30d";
    const { computeClientDashboard } = await import("./metrics.server");
    const dashboard = await computeClientDashboard(supabaseAdmin, share.client_id, effectivePreset);

    return { client, allowDateChange: share.allow_date_change, datePreset: effectivePreset, dashboard };
  });

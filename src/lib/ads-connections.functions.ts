import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Build Meta OAuth URL for the current user. Client redirects to the returned URL.
export const startMetaOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getRequestOrigin } = await import("./request-origin.server");
    const { buildMetaAuthUrl } = await import("./meta.server");
    const { signState } = await import("./crypto.server");
    const redirectUri = `${getRequestOrigin()}/api/auth/meta/callback`;
    const state = signState({ uid: context.userId, redirectUri, platform: "meta" });
    return { url: buildMetaAuthUrl({ redirectUri, state }) };
  });

// Build Google Ads OAuth URL.
export const startGoogleOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clientId: z.string().uuid().optional() }).optional().parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getRequestOrigin } = await import("./request-origin.server");
    const { buildGoogleAuthUrl } = await import("./google.server");
    const { signState } = await import("./crypto.server");
    const redirectUri = `${getRequestOrigin()}/api/auth/google/callback`;
    const state = signState({ uid: context.userId, redirectUri, platform: "google", clientId: data?.clientId });
    return { url: buildGoogleAuthUrl({ redirectUri, state }) };
  });

export const listConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ad_platform_connections")
      .select("id, platform, display_name, expires_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const listAdAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ad_accounts")
      .select("id, platform, external_account_id, account_name, currency, status, client_id")
      .order("account_name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const assignAdAccountToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      adAccountId: z.string().uuid(),
      clientId: z.string().uuid().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ad_accounts")
      .update({ client_id: data.clientId })
      .eq("id", data.adAccountId);
    if (error) throw error;
    return { ok: true };
  });

export const disconnectPlatform = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ connectionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ad_platform_connections")
      .delete()
      .eq("id", data.connectionId);
    if (error) throw error;
    return { ok: true };
  });

const DATE_PRESET_SCHEMA = z.enum([
  "today", "yesterday", "last_3d", "last_7d", "last_14d", "last_28d",
  "last_30d", "last_90d", "this_month", "last_month",
]);
const PLATFORM_SCHEMA = z.enum(["all", "meta", "google"]).default("all");

export const getClientMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      clientId: z.string().uuid(),
      datePreset: DATE_PRESET_SCHEMA.default("last_30d"),
      platform: PLATFORM_SCHEMA,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { computeClientMetrics } = await import("./metrics.server");
    return computeClientMetrics(context.supabase, data.clientId, data.datePreset, data.platform);
  });

export const getClientDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      clientId: z.string().uuid(),
      datePreset: DATE_PRESET_SCHEMA.default("last_30d"),
      platform: PLATFORM_SCHEMA,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { computeClientDashboard } = await import("./metrics.server");
    return computeClientDashboard(context.supabase, data.clientId, data.datePreset, data.platform);
  });



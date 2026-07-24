import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function getOrigin(): string {
  const req = getRequest();
  const url = new URL(req.url);
  // Prefer forwarded host in case of proxying
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

// Build Meta OAuth URL for the current user. Client redirects to the returned URL.
export const startMetaOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildMetaAuthUrl } = await import("./meta.server");
    const { signState } = await import("./crypto.server");
    const redirectUri = `${getOrigin()}/api/auth/meta/callback`;
    const state = signState({ uid: context.userId, redirectUri, platform: "meta" });
    return { url: buildMetaAuthUrl({ redirectUri, state }) };
  });

// Build Google Ads OAuth URL.
export const startGoogleOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildGoogleAuthUrl } = await import("./google.server");
    const { signState } = await import("./crypto.server");
    const redirectUri = `${getOrigin()}/api/auth/google/callback`;
    const state = signState({ uid: context.userId, redirectUri, platform: "google" });
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

export const getClientMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      clientId: z.string().uuid(),
      datePreset: z.enum([
        "today", "yesterday", "last_3d", "last_7d", "last_14d", "last_28d",
        "last_30d", "last_90d", "this_month", "last_month",
      ]).default("last_30d"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { computeClientMetrics } = await import("./metrics.server");
    return computeClientMetrics(context.supabase, data.clientId, data.datePreset);
  });

export const getClientDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      clientId: z.string().uuid(),
      datePreset: z.enum([
        "today", "yesterday", "last_3d", "last_7d", "last_14d", "last_28d",
        "last_30d", "last_90d", "this_month", "last_month",
      ]).default("last_30d"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { computeClientDashboard } = await import("./metrics.server");
    return computeClientDashboard(context.supabase, data.clientId, data.datePreset);
  });



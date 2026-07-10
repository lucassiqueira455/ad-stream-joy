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
      datePreset: z.enum(["today", "yesterday", "last_7d", "last_14d", "last_30d", "last_90d", "this_month", "last_month"]).default("last_30d"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: accounts, error } = await context.supabase
      .from("ad_accounts")
      .select("id, platform, external_account_id, account_name, currency, connection_id")
      .eq("client_id", data.clientId);
    if (error) throw error;
    if (!accounts || accounts.length === 0) return { accounts: [], totals: null, currency: null };

    const { decryptToken } = await import("./crypto.server");
    const { fetchAdAccountInsights } = await import("./meta.server");

    const connectionIds = [...new Set(accounts.map((a) => a.connection_id))];
    const { data: conns, error: cErr } = await context.supabase
      .from("ad_platform_connections")
      .select("id, access_token_encrypted, platform")
      .in("id", connectionIds);
    if (cErr) throw cErr;
    const tokenMap = new Map(conns?.map((c) => [c.id, decryptToken(c.access_token_encrypted)]));

    const results = await Promise.all(
      accounts.map(async (a) => {
        try {
          if (a.platform !== "meta") {
            return { account: a, insights: null, error: "Plataforma ainda não suportada" };
          }
          const token = tokenMap.get(a.connection_id);
          if (!token) return { account: a, insights: null, error: "Token não encontrado" };
          const insights = await fetchAdAccountInsights({
            token,
            externalAccountId: a.external_account_id,
            datePreset: data.datePreset,
          });
          return { account: a, insights, error: null };
        } catch (e) {
          return { account: a, insights: null, error: e instanceof Error ? e.message : "Erro" };
        }
      }),
    );

    // aggregate totals across accounts
    const withInsights = results.filter((r) => r.insights);
    let totals = null as null | Awaited<ReturnType<typeof fetchAdAccountInsights>>;
    if (withInsights.length > 0) {
      const sum = withInsights.reduce(
        (acc, r) => {
          const i = r.insights!;
          acc.spend += i.spend;
          acc.impressions += i.impressions;
          acc.clicks += i.clicks;
          acc.reach += i.reach;
          acc.conversions += i.conversions;
          return acc;
        },
        { spend: 0, impressions: 0, clicks: 0, reach: 0, conversions: 0 },
      );
      totals = {
        spend: sum.spend,
        impressions: sum.impressions,
        clicks: sum.clicks,
        ctr: sum.impressions > 0 ? (sum.clicks / sum.impressions) * 100 : 0,
        cpc: sum.clicks > 0 ? sum.spend / sum.clicks : 0,
        cpm: sum.impressions > 0 ? (sum.spend / sum.impressions) * 1000 : 0,
        reach: sum.reach,
        frequency: sum.reach > 0 ? sum.impressions / sum.reach : 0,
        conversions: sum.conversions,
        cost_per_conversion: sum.conversions > 0 ? sum.spend / sum.conversions : 0,
      };
    }

    return {
      accounts: results,
      totals,
      currency: accounts[0].currency ?? null,
    };
  });

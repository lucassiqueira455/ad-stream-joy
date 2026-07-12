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
      datePreset: z.enum([
        "today", "yesterday", "last_3d", "last_7d", "last_14d", "last_28d",
        "last_30d", "last_90d", "this_month", "last_month",
      ]).default("last_30d"),
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
      const s = {
        spend: 0, impressions: 0, reach: 0, clicks: 0, link_clicks: 0,
        landing_page_views: 0, purchases: 0, leads: 0, messaging_conversations: 0,
        purchase_value: 0,
        add_to_cart: 0, initiate_checkout: 0,
      };
      const breakdown: Record<string, number> = {};
      for (const r of withInsights) {
        const i = r.insights!;
        s.spend += i.spend;
        s.impressions += i.impressions;
        s.reach += i.reach;
        s.clicks += i.clicks;
        s.link_clicks += i.link_clicks;
        s.landing_page_views += i.landing_page_views;
        s.purchases += i.purchases;
        s.leads += i.leads;
        s.messaging_conversations += i.messaging_conversations;
        s.purchase_value += i.purchase_value;
        s.add_to_cart += i.add_to_cart;
        s.initiate_checkout += i.initiate_checkout;
        for (const [k, v] of Object.entries(i.conversions_breakdown)) {
          breakdown[k] = (breakdown[k] ?? 0) + v;
        }
      }
      const conversions = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
      totals = {
        spend: s.spend,
        impressions: s.impressions,
        reach: s.reach,
        frequency: s.reach > 0 ? s.impressions / s.reach : 0,
        cpm: s.impressions > 0 ? (s.spend / s.impressions) * 1000 : 0,
        clicks: s.clicks,
        link_clicks: s.link_clicks,
        cpc: s.clicks > 0 ? s.spend / s.clicks : 0,
        cpc_link: s.link_clicks > 0 ? s.spend / s.link_clicks : 0,
        ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0,
        ctr_link: s.impressions > 0 ? (s.link_clicks / s.impressions) * 100 : 0,
        landing_page_views: s.landing_page_views,
        cost_per_landing_page_view: s.landing_page_views > 0 ? s.spend / s.landing_page_views : 0,
        results: conversions,
        cost_per_result: conversions > 0 ? s.spend / conversions : 0,
        leads: s.leads,
        messaging_conversations: s.messaging_conversations,
        purchases: s.purchases,
        purchase_value: s.purchase_value,
        roas: s.spend > 0 ? s.purchase_value / s.spend : 0,
        add_to_cart: s.add_to_cart,
        initiate_checkout: s.initiate_checkout,
        conversions,
        cost_per_conversion: conversions > 0 ? s.spend / conversions : 0,
        conversions_breakdown: breakdown,
      };
    }


    return {
      accounts: results,
      totals,
      currency: accounts[0].currency ?? null,
    };
  });

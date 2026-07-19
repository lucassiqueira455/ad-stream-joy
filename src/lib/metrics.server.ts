// Shared aggregation logic for client metrics. Server-only.
// Used both by the authenticated dashboard and the public share endpoint.
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "./crypto.server";
import { fetchAdAccountInsights, fetchAdAccountCampaigns } from "./meta.server";


export type DatePreset =
  | "today" | "yesterday" | "last_3d" | "last_7d" | "last_14d"
  | "last_28d" | "last_30d" | "last_90d" | "this_month" | "last_month";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeClientMetrics(supabase: SupabaseClient<any>, clientId: string, datePreset: DatePreset) {
  const { data: accounts, error } = await supabase
    .from("ad_accounts")
    .select("id, platform, external_account_id, account_name, currency, connection_id")
    .eq("client_id", clientId);
  if (error) throw error;
  if (!accounts || accounts.length === 0) {
    return { accounts: [], totals: null, currency: null };
  }

  const connectionIds = [...new Set(accounts.map((a) => a.connection_id))];
  const { data: conns, error: cErr } = await supabase
    .from("ad_platform_connections")
    .select("id, access_token_encrypted, platform")
    .in("id", connectionIds);
  if (cErr) throw cErr;
  const tokenMap = new Map(conns?.map((c) => [c.id, decryptToken(c.access_token_encrypted)]));

  const campaignsAll: CampaignRow[] = [];
  const results = await Promise.all(
    accounts.map(async (a) => {
      try {
        if (a.platform !== "meta") {
          return { account: a, insights: null, error: "Plataforma ainda não suportada" };
        }
        const token = tokenMap.get(a.connection_id);
        if (!token) return { account: a, insights: null, error: "Token não encontrado" };
        const [insights, campaigns] = await Promise.all([
          fetchAdAccountInsights({ token, externalAccountId: a.external_account_id, datePreset }),
          fetchAdAccountCampaigns({ token, externalAccountId: a.external_account_id, datePreset }).catch(() => [] as CampaignRow[]),
        ]);
        campaignsAll.push(...campaigns);
        return { account: a, insights, error: null };
      } catch (e) {
        return { account: a, insights: null, error: e instanceof Error ? e.message : "Erro" };
      }
    }),
  );


  const withInsights = results.filter((r) => r.insights);
  let totals = null as null | Awaited<ReturnType<typeof fetchAdAccountInsights>>;
  if (withInsights.length > 0) {
    const s = {
      spend: 0, impressions: 0, reach: 0, clicks: 0, link_clicks: 0,
      landing_page_views: 0, purchases: 0, leads: 0, messaging_conversations: 0,
      purchase_value: 0, add_to_cart: 0, initiate_checkout: 0,
      profile_visits: 0, page_engagement: 0, post_engagement: 0, video_views: 0,
      conversion_cost_total: 0, profile_visit_cost_total: 0,
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
      s.profile_visits += i.profile_visits;
      s.page_engagement += i.page_engagement;
      s.post_engagement += i.post_engagement;
      s.video_views += i.video_views;
      s.conversion_cost_total += i.cost_per_conversion * i.conversions;
      s.profile_visit_cost_total += i.cost_per_profile_visit * i.profile_visits;
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
      cost_per_result: conversions > 0 ? s.conversion_cost_total / conversions : 0,
      leads: s.leads,
      messaging_conversations: s.messaging_conversations,
      purchases: s.purchases,
      purchase_value: s.purchase_value,
      roas: s.spend > 0 ? s.purchase_value / s.spend : 0,
      add_to_cart: s.add_to_cart,
      initiate_checkout: s.initiate_checkout,
      profile_visits: s.profile_visits,
      cost_per_profile_visit: s.profile_visits > 0 ? s.profile_visit_cost_total / s.profile_visits : 0,
      page_engagement: s.page_engagement,
      post_engagement: s.post_engagement,
      video_views: s.video_views,
      conversions,
      cost_per_conversion: conversions > 0 ? s.conversion_cost_total / conversions : 0,
      conversions_breakdown: breakdown,
    };
  }

  return {
    accounts: results,
    totals,
    currency: accounts[0].currency ?? null,
  };
}

// ============= Dashboard aggregation =============

import type { CampaignRow, AdRow, DailyPoint } from "./meta.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeClientDashboard(supabase: SupabaseClient<any>, clientId: string, datePreset: DatePreset) {
  const base = await computeClientMetrics(supabase, clientId, datePreset);
  if (!base.totals || base.accounts.length === 0) {
    return {
      ...base,
      series: [] as DailyPoint[],
      topCampaigns: [] as CampaignRow[],
      topAds: [] as AdRow[],
      previousTotals: null as typeof base.totals,
      lastSyncedAt: Date.now(),
    };
  }

  const { fetchAdAccountDaily, fetchAdAccountCampaigns, fetchAdAccountAds, fetchAdAccountInsights, previousRangeForPreset } = await import("./meta.server");

  const connectionIds = [...new Set(base.accounts.map((r) => r.account.connection_id))];
  const { data: conns } = await supabase
    .from("ad_platform_connections")
    .select("id, access_token_encrypted")
    .in("id", connectionIds);
  const tokenMap = new Map(conns?.map((c) => [c.id, decryptToken(c.access_token_encrypted)]));

  const daily: Record<string, DailyPoint> = {};
  const campaigns: CampaignRow[] = [];
  const ads: AdRow[] = [];
  const prevRange = previousRangeForPreset(datePreset);
  const prevInsightsList: Awaited<ReturnType<typeof fetchAdAccountInsights>>[] = [];

  await Promise.all(
    base.accounts.map(async (r) => {
      if (!r.insights || r.account.platform !== "meta") return;
      const token = tokenMap.get(r.account.connection_id);
      if (!token) return;
      try {
        const [d, c, a, prev] = await Promise.all([
          fetchAdAccountDaily({ token, externalAccountId: r.account.external_account_id, datePreset }),
          fetchAdAccountCampaigns({ token, externalAccountId: r.account.external_account_id, datePreset }),
          fetchAdAccountAds({ token, externalAccountId: r.account.external_account_id, datePreset }),
          prevRange
            ? fetchAdAccountInsights({ token, externalAccountId: r.account.external_account_id, timeRange: prevRange }).catch(() => null)
            : Promise.resolve(null),
        ]);
        for (const p of d) {
          const cur = daily[p.date];
          if (!cur) {
            daily[p.date] = { ...p };
          } else {
            cur.spend += p.spend;
            cur.impressions += p.impressions;
            cur.clicks += p.clicks;
            cur.conversions += p.conversions;
            cur.ctr = cur.impressions > 0 ? (cur.clicks / cur.impressions) * 100 : 0;
            cur.cpc = cur.clicks > 0 ? cur.spend / cur.clicks : 0;
          }
        }
        campaigns.push(...c);
        ads.push(...a);
        if (prev) prevInsightsList.push(prev);
      } catch { /* per-account failure — skip */ }
    }),
  );

  // Aggregate previous totals across accounts (subset of fields for deltas).
  let previousTotals: typeof base.totals | null = null;
  if (prevInsightsList.length > 0) {
    const s = {
      spend: 0, impressions: 0, reach: 0, clicks: 0, link_clicks: 0,
      conversions: 0, profile_visits: 0, conv_cost_total: 0, pv_cost_total: 0,
    };
    for (const i of prevInsightsList) {
      s.spend += i.spend;
      s.impressions += i.impressions;
      s.reach += i.reach;
      s.clicks += i.clicks;
      s.link_clicks += i.link_clicks;
      s.conversions += i.conversions;
      s.profile_visits += i.profile_visits;
      s.conv_cost_total += i.cost_per_conversion * i.conversions;
      s.pv_cost_total += i.cost_per_profile_visit * i.profile_visits;
    }
    previousTotals = {
      ...base.totals,
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
      conversions: s.conversions,
      results: s.conversions,
      cost_per_conversion: s.conversions > 0 ? s.conv_cost_total / s.conversions : 0,
      cost_per_result: s.conversions > 0 ? s.conv_cost_total / s.conversions : 0,
      profile_visits: s.profile_visits,
      cost_per_profile_visit: s.profile_visits > 0 ? s.pv_cost_total / s.profile_visits : 0,
    };
  }

  const series = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
  const topCampaigns = campaigns
    .filter((c) => c.spend > 0 || c.conversions > 0 || c.profile_visits > 0)
    .sort((a, b) => ((b.conversions + b.profile_visits) - (a.conversions + a.profile_visits)) || (b.spend - a.spend))
    .slice(0, 20);
  const topAds = ads
    .filter((a) => a.spend > 0 || a.conversions > 0 || a.profile_visits > 0)
    .sort((a, b) => ((b.conversions + b.profile_visits) - (a.conversions + a.profile_visits)) || (b.spend - a.spend))
    .slice(0, 20);


  return { ...base, series, topCampaigns, topAds, previousTotals, lastSyncedAt: Date.now() };
}




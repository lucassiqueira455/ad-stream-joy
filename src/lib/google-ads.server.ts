// Google Ads reporting (GAQL). Server-only.
// Returns rows shaped like Meta insights/campaigns/ads so metrics.server can
// aggregate uniformly across platforms.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetaInsights, DailyPoint, CampaignRow, AdRow } from "./meta.server";
import { decryptToken, encryptToken } from "./crypto.server";
import { refreshGoogleAccessToken } from "./google.server";

const API = "https://googleads.googleapis.com/v21";

function devToken(): string {
  const t = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!t) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN is not configured");
  return t;
}

function headers(accessToken: string, loginCustomerId?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": devToken(),
    "Content-Type": "application/json",
  };
  if (loginCustomerId) h["login-customer-id"] = loginCustomerId.replace(/-/g, "");
  return h;
}

// ============= Token freshness =============

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFreshGoogleToken(supabase: SupabaseClient<any>, connectionId: string): Promise<string | null> {
  const { data: conn } = await supabase
    .from("ad_platform_connections")
    .select("access_token_encrypted, refresh_token_encrypted, expires_at")
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn) return null;
  const access = decryptToken(conn.access_token_encrypted);
  const exp = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  const soon = Date.now() + 60_000;
  if (exp && exp > soon) return access;
  if (!conn.refresh_token_encrypted) return access; // no refresh available
  try {
    const refresh = decryptToken(conn.refresh_token_encrypted);
    const t = await refreshGoogleAccessToken(refresh);
    const newExp = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
    await supabase
      .from("ad_platform_connections")
      .update({
        access_token_encrypted: encryptToken(t.access_token),
        expires_at: newExp,
      })
      .eq("id", connectionId);
    return t.access_token;
  } catch (e) {
    console.error("google token refresh failed", e);
    return access;
  }
}

// ============= Date preset → GAQL =============

const DURING: Record<string, string> = {
  today: "TODAY",
  yesterday: "YESTERDAY",
  last_7d: "LAST_7_DAYS",
  last_14d: "LAST_14_DAYS",
  last_30d: "LAST_30_DAYS",
  this_month: "THIS_MONTH",
  last_month: "LAST_MONTH",
};

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function dateClause(preset: string): string {
  const d = DURING[preset];
  if (d) return `segments.date DURING ${d}`;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const n = preset === "last_3d" ? 3 : preset === "last_28d" ? 28 : preset === "last_90d" ? 90 : 30;
  const since = new Date(today.getTime() - n * 86400_000);
  const until = new Date(today.getTime() - 86400_000);
  return `segments.date BETWEEN '${ymd(since)}' AND '${ymd(until)}'`;
}

// ============= Low-level GAQL search =============

interface GaqlRow {
  campaign?: { id?: string; name?: string; status?: string; advertisingChannelType?: string };
  adGroupAd?: { ad?: { id?: string; name?: string; finalUrls?: string[] } };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    ctr?: number;
    averageCpc?: string;
    averageCpm?: string;
    conversions?: number;
    costPerConversion?: string;
    conversionsValue?: number;
    valuePerConversion?: number;
  };
  segments?: { date?: string };
}

async function gaqlSearch(
  accessToken: string,
  customerId: string,
  query: string,
  loginCustomerId?: string,
): Promise<GaqlRow[]> {
  const all: GaqlRow[] = [];
  let pageToken: string | undefined;
  // v21 removed page_size from GoogleAdsService.Search; paginate with nextPageToken only.
  do {
    const res = await fetch(`${API}/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: headers(accessToken, loginCustomerId ?? customerId),
      body: JSON.stringify(pageToken ? { query, pageToken } : { query }),
    });
    if (!res.ok) {
      throw new Error(`Google Ads GAQL failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { results?: GaqlRow[]; nextPageToken?: string };
    all.push(...(json.results ?? []));
    pageToken = json.nextPageToken || undefined;
  } while (pageToken);
  return all;
}

// ============= Helpers =============

const num = (v: string | number | undefined): number => {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
};
const micros = (v: string | number | undefined): number => num(v) / 1_000_000;

function emptyInsights(): MetaInsights {
  return {
    spend: 0, impressions: 0, reach: 0, frequency: 0, cpm: 0,
    clicks: 0, link_clicks: 0, cpc: 0, cpc_link: 0, ctr: 0, ctr_link: 0,
    landing_page_views: 0, cost_per_landing_page_view: 0,
    results: 0, cost_per_result: 0,
    leads: 0, messaging_conversations: 0, purchases: 0, purchase_value: 0, roas: 0,
    add_to_cart: 0, initiate_checkout: 0,
    profile_visits: 0, cost_per_profile_visit: 0,
    page_engagement: 0, post_engagement: 0, video_views: 0,
    conversions: 0, cost_per_conversion: 0,
    conversions_breakdown: {},
  };
}

// ============= Public fetchers (shape-compatible with meta.server) =============

export async function fetchGoogleAdsInsights(params: {
  accessToken: string;
  customerId: string;
  datePreset: string;
}): Promise<MetaInsights> {
  const { accessToken, customerId, datePreset } = params;
  const rows = await gaqlSearch(
    accessToken,
    customerId,
    `SELECT
       metrics.impressions, metrics.clicks, metrics.cost_micros,
       metrics.ctr, metrics.average_cpc, metrics.average_cpm,
       metrics.conversions, metrics.cost_per_conversion, metrics.conversions_value
     FROM customer
     WHERE ${dateClause(datePreset)}`,
  );

  const s = emptyInsights();
  for (const r of rows) {
    const m = r.metrics ?? {};
    s.impressions += num(m.impressions);
    s.clicks += num(m.clicks);
    s.spend += micros(m.costMicros);
    s.conversions += num(m.conversions);
    s.purchase_value += num(m.conversionsValue);
  }
  s.link_clicks = s.clicks;
  s.cpm = s.impressions > 0 ? (s.spend / s.impressions) * 1000 : 0;
  s.cpc = s.clicks > 0 ? s.spend / s.clicks : 0;
  s.cpc_link = s.cpc;
  s.ctr = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0;
  s.ctr_link = s.ctr;
  s.results = s.conversions;
  s.cost_per_conversion = s.conversions > 0 ? s.spend / s.conversions : 0;
  s.cost_per_result = s.cost_per_conversion;
  s.roas = s.spend > 0 ? s.purchase_value / s.spend : 0;
  if (s.conversions > 0) {
    s.conversions_breakdown = { "Google Ads": s.conversions };
  }
  return s;
}

export async function fetchGoogleAdsDaily(params: {
  accessToken: string;
  customerId: string;
  datePreset: string;
}): Promise<DailyPoint[]> {
  const { accessToken, customerId, datePreset } = params;
  const rows = await gaqlSearch(
    accessToken,
    customerId,
    `SELECT
       segments.date,
       metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
     FROM customer
     WHERE ${dateClause(datePreset)}
     ORDER BY segments.date`,
  );
  return rows.map((r) => {
    const m = r.metrics ?? {};
    const spend = micros(m.costMicros);
    const impressions = num(m.impressions);
    const clicks = num(m.clicks);
    return {
      date: r.segments?.date ?? "",
      spend, impressions, clicks,
      conversions: num(m.conversions),
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
    };
  });
}

export async function fetchGoogleAdsCampaigns(params: {
  accessToken: string;
  customerId: string;
  datePreset: string;
}): Promise<CampaignRow[]> {
  const { accessToken, customerId, datePreset } = params;
  const rows = await gaqlSearch(
    accessToken,
    customerId,
    `SELECT
       campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
       metrics.impressions, metrics.clicks, metrics.cost_micros,
       metrics.ctr, metrics.average_cpc, metrics.average_cpm,
       metrics.conversions, metrics.cost_per_conversion
     FROM campaign
     WHERE ${dateClause(datePreset)}`,
  );
  return rows.map((r) => {
    const c = r.campaign ?? {};
    const m = r.metrics ?? {};
    const spend = micros(m.costMicros);
    const impressions = num(m.impressions);
    const clicks = num(m.clicks);
    const conversions = num(m.conversions);
    return {
      campaign_id: String(c.id ?? ""),
      campaign_name: c.name ?? "—",
      objective: c.advertisingChannelType ?? null,
      optimization_goal: null,
      destination_type: null,
      status: c.status ?? null,
      spend,
      impressions,
      clicks,
      link_clicks: clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      conversions,
      cost_per_conversion: conversions > 0 ? spend / conversions : 0,
      profile_visits: 0,
      cost_per_profile_visit: 0,
      video_views: 0,
      cost_per_video_view: 0,
      page_engagement: 0,
      post_engagement: 0,
      cost_per_engagement: 0,
    };
  });
}

export async function fetchGoogleAdsAds(params: {
  accessToken: string;
  customerId: string;
  datePreset: string;
}): Promise<AdRow[]> {
  const { accessToken, customerId, datePreset } = params;
  const rows = await gaqlSearch(
    accessToken,
    customerId,
    `SELECT
       ad_group_ad.ad.id, ad_group_ad.ad.name,
       campaign.id, campaign.name, campaign.advertising_channel_type,
       metrics.impressions, metrics.clicks, metrics.cost_micros,
       metrics.ctr, metrics.conversions
     FROM ad_group_ad
     WHERE ${dateClause(datePreset)}`,
  );
  const mapped = rows.map((r) => {
    const ad = r.adGroupAd?.ad ?? {};
    const camp = r.campaign ?? {};
    const m = r.metrics ?? {};
    const spend = micros(m.costMicros);
    const impressions = num(m.impressions);
    const clicks = num(m.clicks);
    const conversions = num(m.conversions);
    return {
      ad_id: String(ad.id ?? ""),
      ad_name: ad.name ?? "—",
      campaign_id: String(camp.id ?? ""),
      campaign_name: camp.name ?? "",
      objective: camp.advertisingChannelType ?? null,
      optimization_goal: null,
      destination_type: null,
      thumbnail_url: null as string | null,
      spend,
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      conversions,
      cost_per_conversion: conversions > 0 ? spend / conversions : 0,
      profile_visits: 0,
      cost_per_profile_visit: 0,
      video_views: 0,
      cost_per_video_view: 0,
      post_engagement: 0,
      cost_per_engagement: 0,
    };
  });
  mapped.sort((a, b) => (b.conversions - a.conversions) || (b.spend - a.spend));
  return mapped.slice(0, 30);
}

// Meta Marketing API helpers. Server-only.
const GRAPH = "https://graph.facebook.com/v21.0";

export const META_SCOPES = ["ads_read", "business_management"];

export function buildMetaAuthUrl(params: {
  redirectUri: string;
  state: string;
}): string {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error("META_APP_ID is not configured");
  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", META_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export async function exchangeCodeForToken(params: {
  code: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code", params.code);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function exchangeForLongLivedToken(shortToken: string): Promise<TokenResponse> {
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Meta long-lived exchange failed: ${await res.text()}`);
  return res.json();
}

export interface MetaMe {
  id: string;
  name: string;
}

export async function fetchMetaMe(token: string): Promise<MetaMe> {
  const url = new URL(`${GRAPH}/me`);
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Meta /me failed: ${await res.text()}`);
  return res.json();
}

export interface MetaAdAccount {
  id: string; // "act_123"
  account_id: string; // "123"
  name: string;
  currency?: string;
  timezone_name?: string;
  account_status?: number;
}

export async function fetchMetaAdAccounts(token: string): Promise<MetaAdAccount[]> {
  const results: MetaAdAccount[] = [];
  let next: string | undefined = (() => {
    const url = new URL(`${GRAPH}/me/adaccounts`);
    url.searchParams.set("fields", "id,account_id,name,currency,timezone_name,account_status");
    url.searchParams.set("limit", "100");
    url.searchParams.set("access_token", token);
    return url.toString();
  })();

  while (next) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`Meta /me/adaccounts failed: ${await res.text()}`);
    const json = (await res.json()) as { data?: MetaAdAccount[]; paging?: { next?: string } };
    if (json.data) results.push(...json.data);
    next = json.paging?.next;
  }
  return results;
}

export function metaStatusLabel(status: number | undefined): string {
  switch (status) {
    case 1: return "active";
    case 2: return "disabled";
    case 3: return "unsettled";
    case 7: return "pending_risk_review";
    case 8: return "pending_settlement";
    case 9: return "in_grace_period";
    case 100: return "pending_closure";
    case 101: return "closed";
    case 201: return "any_active";
    case 202: return "any_closed";
    default: return "unknown";
  }
}

export interface MetaInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  frequency: number;
  conversions: number;
  cost_per_conversion: number;
}

export async function fetchAdAccountInsights(params: {
  token: string;
  externalAccountId: string; // numeric, without "act_"
  datePreset?: string;
}): Promise<MetaInsights> {
  const { token, externalAccountId, datePreset = "last_30d" } = params;
  const url = new URL(`${GRAPH}/act_${externalAccountId}/insights`);
  url.searchParams.set(
    "fields",
    "spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions",
  );
  url.searchParams.set("date_preset", datePreset);
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Meta insights failed: ${await res.text()}`);
  const json = (await res.json()) as {
    data?: Array<{
      spend?: string;
      impressions?: string;
      clicks?: string;
      ctr?: string;
      cpc?: string;
      cpm?: string;
      reach?: string;
      frequency?: string;
      actions?: Array<{ action_type: string; value: string }>;
    }>;
  };
  const row = json.data?.[0];
  if (!row) {
    return {
      spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0,
      reach: 0, frequency: 0, conversions: 0, cost_per_conversion: 0,
    };
  }
  const num = (v: string | undefined) => (v ? Number(v) : 0);
  const conversions = (row.actions ?? [])
    .filter((a) =>
      ["purchase", "offsite_conversion.fb_pixel_purchase", "onsite_conversion.purchase", "lead", "complete_registration"].includes(a.action_type),
    )
    .reduce((sum, a) => sum + Number(a.value || 0), 0);
  const spend = num(row.spend);
  return {
    spend,
    impressions: num(row.impressions),
    clicks: num(row.clicks),
    ctr: num(row.ctr),
    cpc: num(row.cpc),
    cpm: num(row.cpm),
    reach: num(row.reach),
    frequency: num(row.frequency),
    conversions,
    cost_per_conversion: conversions > 0 ? spend / conversions : 0,
  };
}


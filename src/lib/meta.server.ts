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
  id: string;
  account_id: string;
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
    default: return "unknown";
  }
}

// ---- Insights ----

export interface MetaInsights {
  // core delivery
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  cpm: number;
  // clicks
  clicks: number; // all clicks
  link_clicks: number; // inline_link_clicks
  cpc: number; // cost per all clicks
  cpc_link: number; // cost per link click
  ctr: number; // all clicks
  ctr_link: number; // link CTR
  // landing
  landing_page_views: number;
  cost_per_landing_page_view: number;
  // conversions/results (forms, messages, purchases and other conversion events)
  results: number;
  cost_per_result: number;
  // conversions breakdown
  leads: number;
  messaging_conversations: number;
  purchases: number;
  purchase_value: number;
  roas: number;
  add_to_cart: number;
  initiate_checkout: number;
  // legacy generic
  conversions: number;
  cost_per_conversion: number;
}

const EMPTY_INSIGHTS: MetaInsights = {
  spend: 0, impressions: 0, reach: 0, frequency: 0, cpm: 0,
  clicks: 0, link_clicks: 0, cpc: 0, cpc_link: 0, ctr: 0, ctr_link: 0,
  landing_page_views: 0, cost_per_landing_page_view: 0,
  results: 0, cost_per_result: 0,
  leads: 0, messaging_conversations: 0, purchases: 0, purchase_value: 0, roas: 0,
  add_to_cart: 0, initiate_checkout: 0,
  conversions: 0, cost_per_conversion: 0,
};

const PURCHASE_TYPES = [
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "onsite_conversion.purchase",
  "omni_purchase",
  "web_in_store_purchase",
];
const LEAD_TYPES = [
  "lead",
  "omni_lead",
  "leadgen_grouped",
  "offsite_conversion.fb_pixel_lead",
  "onsite_conversion.lead",
  "onsite_conversion.lead_grouped",
  "onsite_web_lead",
  "onsite_web_app_lead",
];
const MESSAGE_CONVERSATION_TYPES = [
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_conversation_started_1d",
  "messaging_conversation_started_7d",
  "messaging_conversation_started",
  "onsite_conversion.total_messaging_connection",
];
const MESSAGE_REPLY_TYPES = [
  "onsite_conversion.messaging_first_reply",
  "messaging_first_reply",
];
const ATC_TYPES = [
  "add_to_cart",
  "offsite_conversion.fb_pixel_add_to_cart",
  "onsite_conversion.add_to_cart",
  "omni_add_to_cart",
];
const IC_TYPES = [
  "initiate_checkout",
  "offsite_conversion.fb_pixel_initiate_checkout",
  "onsite_conversion.initiate_checkout",
  "omni_initiated_checkout",
];
const LPV_TYPES = ["landing_page_view", "omni_landing_page_view"];
const OTHER_CONVERSION_TYPES = [
  "contact",
  "omni_contact",
  "offsite_conversion.fb_pixel_contact",
  "onsite_conversion.contact",
  "complete_registration",
  "omni_complete_registration",
  "offsite_conversion.fb_pixel_complete_registration",
  "onsite_conversion.complete_registration",
  "subscribe",
  "omni_subscribe",
  "offsite_conversion.fb_pixel_subscribe",
  "start_trial",
  "omni_start_trial",
  "offsite_conversion.fb_pixel_start_trial",
  "schedule",
  "omni_schedule",
  "offsite_conversion.fb_pixel_schedule",
  "submit_application",
  "omni_submit_application",
  "offsite_conversion.fb_pixel_submit_application",
];

function sumActions(
  actions: Array<{ action_type: string; value: string }> | undefined,
  types: string[],
): number {
  if (!actions) return 0;
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((s, a) => s + Number(a.value || 0), 0);
}

function sumMessagingConversations(
  actions: Array<{ action_type: string; value: string }> | undefined,
): number {
  const conversations = sumActions(actions, MESSAGE_CONVERSATION_TYPES);
  const replies = sumActions(actions, MESSAGE_REPLY_TYPES);
  // Meta can expose both for message campaigns. Use the larger signal so the
  // same conversation is not counted twice.
  return Math.max(conversations, replies);
}

export async function fetchAdAccountInsights(params: {
  token: string;
  externalAccountId: string;
  datePreset?: string;
}): Promise<MetaInsights> {
  const { token, externalAccountId, datePreset = "last_30d" } = params;
  const url = new URL(`${GRAPH}/act_${externalAccountId}/insights`);
  url.searchParams.set(
    "fields",
    [
      "spend",
      "impressions",
      "reach",
      "frequency",
      "cpm",
      "clicks",
      "inline_link_clicks",
      "cpc",
      "cost_per_inline_link_click",
      "ctr",
      "inline_link_click_ctr",
      "actions",
      "action_values",
      "cost_per_action_type",
      "purchase_roas",
    ].join(","),
  );
  url.searchParams.set("date_preset", datePreset);
  // Match Ads Manager default attribution window
  url.searchParams.set("action_attribution_windows", JSON.stringify(["7d_click", "1d_view"]));
  url.searchParams.set("use_unified_attribution_setting", "true");
  url.searchParams.set("level", "account");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Meta insights failed: ${await res.text()}`);
  const json = (await res.json()) as {
    data?: Array<{
      spend?: string;
      impressions?: string;
      reach?: string;
      frequency?: string;
      cpm?: string;
      clicks?: string;
      inline_link_clicks?: string;
      cpc?: string;
      cost_per_inline_link_click?: string;
      ctr?: string;
      inline_link_click_ctr?: string;
      actions?: Array<{ action_type: string; value: string }>;
      action_values?: Array<{ action_type: string; value: string }>;
      cost_per_action_type?: Array<{ action_type: string; value: string }>;
      purchase_roas?: Array<{ action_type: string; value: string }>;
    }>;
  };
  const row = json.data?.[0];
  if (!row) return { ...EMPTY_INSIGHTS };

  const num = (v: string | undefined) => (v ? Number(v) : 0);
  const spend = num(row.spend);
  const impressions = num(row.impressions);
  const reach = num(row.reach);
  const clicks = num(row.clicks);
  const link_clicks = num(row.inline_link_clicks);

  const purchases = sumActions(row.actions, PURCHASE_TYPES);
  const leads = sumActions(row.actions, LEAD_TYPES);
  const messaging_conversations = sumMessagingConversations(row.actions);
  const add_to_cart = sumActions(row.actions, ATC_TYPES);
  const initiate_checkout = sumActions(row.actions, IC_TYPES);
  const landing_page_views = sumActions(row.actions, LPV_TYPES);
  const purchase_value = sumActions(row.action_values, PURCHASE_TYPES);
  const other_conversions = sumActions(row.actions, OTHER_CONVERSION_TYPES);

  // Treat "Conversões" as every final conversion outcome we can read from
  // Meta: forms/leads, messaging conversations, purchases and other standard
  // conversion events. Cart/checkout stay available as separate funnel metrics.
  const conversions = leads + messaging_conversations + purchases + other_conversions;
  const results = conversions;

  const roasEntry = row.purchase_roas?.find((r) => r.action_type === "omni_purchase")
    ?? row.purchase_roas?.[0];
  const roas = roasEntry ? Number(roasEntry.value || 0) : (spend > 0 ? purchase_value / spend : 0);

  const cost_per_landing_page_view = landing_page_views > 0 ? spend / landing_page_views : 0;
  const cost_per_result = results > 0 ? spend / results : 0;

  return {
    spend,
    impressions,
    reach,
    frequency: num(row.frequency),
    cpm: num(row.cpm),
    clicks,
    link_clicks,
    cpc: num(row.cpc),
    cpc_link: num(row.cost_per_inline_link_click),
    ctr: num(row.ctr),
    ctr_link: num(row.inline_link_click_ctr),
    landing_page_views,
    cost_per_landing_page_view,
    results,
    cost_per_result,
    leads,
    messaging_conversations,
    purchases,
    purchase_value,
    roas,
    add_to_cart,
    initiate_checkout,
    conversions,
    cost_per_conversion: conversions > 0 ? spend / conversions : 0,
  };
}

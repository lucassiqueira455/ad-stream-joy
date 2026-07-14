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
  // engagement
  profile_visits: number;
  cost_per_profile_visit: number;
  page_engagement: number;
  post_engagement: number;
  video_views: number;
  // legacy generic
  conversions: number;
  cost_per_conversion: number;
  // detailed breakdown of conversions by category (Formulários, WhatsApp, ...)
  conversions_breakdown: Record<string, number>;
}

const EMPTY_INSIGHTS: MetaInsights = {
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

const PROFILE_VISIT_TYPES = [
  "onsite_conversion.ig_profile_visit",
  "onsite_conversion.instagram_profile_visit",
  "onsite_conversion.profile_visits",
  "ig_profile_visit",
  "instagram_profile_visit",
  "instagram_profile_visits",
  "profile_visit",
  "profile_visits",
  "onsite_conversion.profile_visit",
  "omni_profile_visit",
];
const PAGE_ENGAGEMENT_TYPES = ["page_engagement"];
const POST_ENGAGEMENT_TYPES = ["post_engagement"];
const VIDEO_VIEW_TYPES = ["video_view", "omni_video_view"];


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

type MetaActionStat = { action_type: string; value?: string } & Record<string, string | undefined>;
type ProfileVisitFallback = { profileVisits: number; spend: number };

function actionValue(action: MetaActionStat): number {
  if (action.value !== undefined) return Number(action.value || 0);
  // Some Insights responses return attribution-window columns instead of
  // `value`. In that case, add the requested click/view windows only.
  return ["7d_click", "1d_view"].reduce((sum, key) => sum + Number(action[key] || 0), 0);
}

function sumActions(
  actions: MetaActionStat[] | undefined,
  types: string[],
): number {
  if (!actions) return 0;
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((s, a) => s + actionValue(a), 0);
}

function maxActionValue(
  sources: Array<MetaActionStat[] | undefined>,
  types: string[],
): number {
  let max = 0;
  for (const actions of sources) {
    for (const action of actions ?? []) {
      if (types.includes(action.action_type)) {
        max = Math.max(max, actionValue(action));
      }
    }
  }
  return max;
}

function isProfileVisitType(actionType: string): boolean {
  const t = actionType.toLowerCase();
  return PROFILE_VISIT_TYPES.includes(actionType)
    || (t.includes("profile") && t.includes("visit"))
    || t.includes("instagram_profile");
}

function maxActionValueWhere(
  sources: Array<MetaActionStat[] | undefined>,
  predicate: (actionType: string) => boolean,
): number {
  let max = 0;
  for (const actions of sources) {
    for (const action of actions ?? []) {
      if (predicate(action.action_type)) {
        max = Math.max(max, actionValue(action));
      }
    }
  }
  return max;
}

function sumMessagingConversations(
  actions: MetaActionStat[] | undefined,
): number {
  const conversations = sumActions(actions, MESSAGE_CONVERSATION_TYPES);
  const replies = sumActions(actions, MESSAGE_REPLY_TYPES);
  // Meta can expose both for message campaigns. Use the larger signal so the
  // same conversation is not counted twice.
  return Math.max(conversations, replies);
}

type ConversionClassification = {
  family: string;
  bucket: string;
  aggregate: boolean;
};

type CountedConversion = {
  actionType: string;
  bucket: string;
  value: number;
};

// Classify only final conversion events that Ads Manager commonly treats as
// result events. Generic pixel/custom conversion rows are intentionally ignored
// here because they often overlap with lead/purchase/message rows or represent
// non-final website events, which inflates the unified conversion total.
function classifyConversion(actionType: string): ConversionClassification | null {
  const t = actionType.toLowerCase();
  const excluded = [
    "link_click",
    "landing_page_view",
    "post_engagement",
    "page_engagement",
    "video_view",
    "view_content",
    "add_to_cart",
    "initiate_checkout",
    "search",
    "profile_visit",
    "ig_profile_visit",
  ];
  if (excluded.some((term) => t.includes(term))) return null;

  if (t.includes("lead")) {
    const isAggregate = actionType === "lead" || actionType === "omni_lead";
    const isForm = t.includes("leadgen") || t.includes("lead_grouped") || t.includes("onsite_conversion.lead");
    return {
      family: "lead",
      bucket: isAggregate ? "Leads" : isForm ? "Formulários" : "Leads do site",
      aggregate: isAggregate,
    };
  }

  if (PURCHASE_TYPES.includes(actionType) || t.includes("purchase")) {
    return {
      family: "purchase",
      bucket: "Compras",
      aggregate: actionType === "purchase" || actionType === "omni_purchase",
    };
  }

  if (
    MESSAGE_CONVERSATION_TYPES.includes(actionType)
    || MESSAGE_REPLY_TYPES.includes(actionType)
    || t.includes("messaging_conversation_started")
    || t.includes("messaging_first_reply")
  ) {
    const bucket = t.includes("whatsapp")
      ? "WhatsApp"
      : t.includes("messenger")
        ? "Messenger"
        : t.includes("instagram")
          ? "Instagram Direct"
          : "Mensagens";
    return { family: `messaging:${bucket}`, bucket, aggregate: false };
  }

  const known: Array<[string, string, string]> = [
    ["contact", "contact", "Contatos"],
    ["complete_registration", "complete_registration", "Cadastros"],
    ["subscribe", "subscribe", "Assinaturas"],
    ["start_trial", "start_trial", "Trials"],
    ["schedule", "schedule", "Agendamentos"],
    ["submit_application", "submit_application", "Candidaturas"],
    ["book", "booking", "Agendamentos"],
    ["appointment", "appointment", "Agendamentos"],
    ["call", "call", "Ligações"],
    ["phone", "call", "Ligações"],
    ["app_install", "app_install", "Instalações de app"],
  ];
  for (const [term, family, bucket] of known) {
    if (t.includes(term)) {
      return {
        family,
        bucket,
        aggregate: actionType === family || actionType === `omni_${family}`,
      };
    }
  }

  return null;
}

function buildConversionDetails(
  actions: MetaActionStat[] | undefined,
  conversions: MetaActionStat[] | undefined,
): { breakdown: Record<string, number>; counted: CountedConversion[] } {
  type Group = {
    aggregateMax: number;
    aggregateBucket: string | null;
    aggregateActionType: string | null;
    sourceMaxByBucket: Record<string, CountedConversion>;
  };
  const groups: Record<string, Group> = {};

  for (const a of [...(actions ?? []), ...(conversions ?? [])]) {
    const classification = classifyConversion(a.action_type);
    if (!classification) continue;
    const v = actionValue(a);
    if (!v) continue;
    const group = groups[classification.family] ?? {
      aggregateMax: 0,
      aggregateBucket: null,
      aggregateActionType: null,
      sourceMaxByBucket: {},
    };
    if (classification.aggregate) {
      if (v > group.aggregateMax) {
        group.aggregateMax = v;
        group.aggregateBucket = classification.bucket;
        group.aggregateActionType = a.action_type;
      }
    } else {
      const prev = group.sourceMaxByBucket[classification.bucket];
      if (!prev || v > prev.value) {
        group.sourceMaxByBucket[classification.bucket] = {
          actionType: a.action_type,
          bucket: classification.bucket,
          value: v,
        };
      }
    }
    groups[classification.family] = group;
  }

  const out: Record<string, number> = {};
  const counted: CountedConversion[] = [];
  for (const [family, group] of Object.entries(groups)) {
    const sourceEntries = Object.entries(group.sourceMaxByBucket);
    const sourceValues = sourceEntries.map(([, item]) => item.value);
    const hasSameValueDuplicates = sourceValues.length > 1
      && sourceValues.every((value) => value === sourceValues[0]);
    const dedupedSourceEntries = family === "lead" && hasSameValueDuplicates
      ? [["Leads", { ...sourceEntries[0][1], bucket: "Leads" }] as [string, CountedConversion]]
      : sourceEntries.map(([bucket, item]) => [bucket, item] as [string, CountedConversion]);
    const dedupedSourceTotal = dedupedSourceEntries.reduce((sum, [, item]) => sum + item.value, 0);

    // Meta often returns both generic aggregate rows (ex: `lead`) and more
    // specific final-event rows (ex: instant forms / messaging / pixel). The
    // aggregate is not always the complete total, so only trust it when it is
    // at least as large as the deduped specific total.
    if (group.aggregateMax > 0 && group.aggregateBucket && group.aggregateActionType && group.aggregateMax >= dedupedSourceTotal) {
      out[group.aggregateBucket] = (out[group.aggregateBucket] ?? 0) + group.aggregateMax;
      counted.push({
        actionType: group.aggregateActionType,
        bucket: group.aggregateBucket,
        value: group.aggregateMax,
      });
      continue;
    }

    for (const [bucket, item] of dedupedSourceEntries) {
      out[bucket] = (out[bucket] ?? 0) + item.value;
      counted.push(item);
    }
  }
  return { breakdown: out, counted };
}

async function fetchProfileVisitFallback(params: {
  token: string;
  externalAccountId: string;
  datePreset: string;
}): Promise<ProfileVisitFallback> {
  const rows: Array<{
    adsetId: string;
    adsetName: string;
    campaignName: string;
    spend: number;
    linkClicks: number;
    explicitProfileVisits: number;
  }> = [];
  let insightsNext: string | undefined = (() => {
    const url = new URL(`${GRAPH}/act_${params.externalAccountId}/insights`);
    url.searchParams.set(
      "fields",
      [
        "adset_id",
        "adset_name",
        "campaign_name",
        "spend",
        "inline_link_clicks",
        "actions",
        "conversions",
      ].join(","),
    );
    url.searchParams.set("level", "adset");
    url.searchParams.set("date_preset", params.datePreset);
    url.searchParams.set("use_unified_attribution_setting", "true");
    url.searchParams.set("limit", "500");
    url.searchParams.set("access_token", params.token);
    return url.toString();
  })();

  while (insightsNext) {
    const res = await fetch(insightsNext);
    if (!res.ok) return { profileVisits: 0, spend: 0 };
    const json = (await res.json()) as {
      data?: Array<{
        adset_id?: string;
        adset_name?: string;
        campaign_name?: string;
        spend?: string;
        inline_link_clicks?: string;
        actions?: MetaActionStat[];
        conversions?: MetaActionStat[];
      }>;
      paging?: { next?: string };
    };
    for (const row of json.data ?? []) {
      if (!row.adset_id) continue;
      const explicitProfileVisits = maxActionValueWhere([row.actions, row.conversions], isProfileVisitType);
      rows.push({
        adsetId: row.adset_id,
        adsetName: row.adset_name ?? "",
        campaignName: row.campaign_name ?? "",
        spend: Number(row.spend || 0),
        linkClicks: Number(row.inline_link_clicks || 0),
        explicitProfileVisits,
      });
    }
    insightsNext = json.paging?.next;
  }

  const explicitProfileVisits = rows.reduce((sum, row) => sum + row.explicitProfileVisits, 0);
  if (explicitProfileVisits > 0) {
    return {
      profileVisits: explicitProfileVisits,
      spend: rows.reduce((sum, row) => sum + (row.explicitProfileVisits > 0 ? row.spend : 0), 0),
    };
  }

  const profileAdsetIds = await fetchProfileVisitAdsetIds({
    token: params.token,
    adsetIds: rows.map((row) => row.adsetId),
  });

  let profileVisits = 0;
  let spend = 0;
  for (const row of rows) {
    const rowLooksLikeProfileVisit = [row.adsetName, row.campaignName]
      .join(" ")
      .toLowerCase()
      .match(/visita(s)?\s+(ao\s+)?perfil|visit(a|as)?\s+(ao\s+)?perfil|profile\s*visit|instagram\s*profile|ig\s*profile/);
    if (!profileAdsetIds.has(row.adsetId) && !rowLooksLikeProfileVisit) continue;
    profileVisits += row.linkClicks;
    spend += row.spend;
  }

  return { profileVisits, spend };
}

async function fetchProfileVisitAdsetIds(params: {
  token: string;
  adsetIds: string[];
}): Promise<Set<string>> {
  const out = new Set<string>();
  const uniqueIds = [...new Set(params.adsetIds)].filter(Boolean);
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const ids = uniqueIds.slice(i, i + 50);
    const url = new URL(`${GRAPH}/`);
    url.searchParams.set("ids", ids.join(","));
    url.searchParams.set("fields", "id,name,optimization_goal,destination_type,promoted_object,campaign{id,name,objective}");
    url.searchParams.set("access_token", params.token);
    const res = await fetch(url.toString());
    if (!res.ok) continue;
    const json = (await res.json()) as Record<string, {
      id?: string;
      name?: string;
      optimization_goal?: string;
      destination_type?: string;
      promoted_object?: Record<string, unknown>;
      campaign?: { id?: string; name?: string; objective?: string };
    }>;
    for (const [id, adset] of Object.entries(json)) {
      const haystack = [
        adset.name,
        adset.optimization_goal,
        adset.destination_type,
        JSON.stringify(adset.promoted_object ?? {}),
        adset.campaign?.name,
        adset.campaign?.objective,
      ].join(" ").toLowerCase();
      if (
        haystack.includes("visit_instagram_profile")
        || haystack.includes("instagram_profile")
        || haystack.includes("ig_profile")
        || haystack.includes("profile_visit")
        || /visit(a|as)?\s+(ao\s+)?perfil/.test(haystack)
      ) {
        out.add(id);
      }
    }
  }
  return out;
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
      "conversions",
      "action_values",
      "conversion_values",
      "purchase_roas",
    ].join(","),
  );
  url.searchParams.set("date_preset", datePreset);
  // Match Ads Manager attribution at campaign/ad-set level when configured.
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
      actions?: MetaActionStat[];
      conversions?: MetaActionStat[];
      action_values?: MetaActionStat[];
      conversion_values?: MetaActionStat[];
      purchase_roas?: MetaActionStat[];
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
  const accountProfileVisits = maxActionValueWhere([row.actions, row.conversions], isProfileVisitType);
  const profileFallback = await fetchProfileVisitFallback({ token, externalAccountId, datePreset });
  const profile_visits = Math.max(accountProfileVisits, profileFallback.profileVisits);
  const page_engagement = sumActions(row.actions, PAGE_ENGAGEMENT_TYPES);
  const post_engagement = sumActions(row.actions, POST_ENGAGEMENT_TYPES);
  const video_views = sumActions(row.actions, VIDEO_VIEW_TYPES);
  const cost_per_profile_visit = profile_visits > 0
    ? (profileFallback.profileVisits > accountProfileVisits && profileFallback.spend > 0
      ? profileFallback.spend / profile_visits
      : spend / profile_visits)
    : 0;

  // Detailed breakdown by conversion category (auto-detected from Meta actions).
  const conversionDetails = buildConversionDetails(row.actions, row.conversions);
  const conversions_breakdown = conversionDetails.breakdown;
  // Total conversions = sum of every final-conversion bucket (no duplication).
  const conversions = Object.values(conversions_breakdown).reduce((s, v) => s + v, 0);
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
    profile_visits,
    cost_per_profile_visit,
    page_engagement,
    post_engagement,
    video_views,
    conversions,
    cost_per_conversion: conversions > 0 ? spend / conversions : 0,
    conversions_breakdown,
  };
}


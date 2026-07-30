// Google Analytics 4 helpers (Admin API + Data API). Server-only.
import { rangeForPreset } from "./instagram.server";

export const GA4_SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

function oauthConfig(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credenciais OAuth do Google não configuradas");
  return { clientId, clientSecret };
}

export function buildGa4AuthUrl(params: { redirectUri: string; state: string }): string {
  const { clientId } = oauthConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", [...GA4_SCOPES, "openid", "email"].join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export interface Ga4Property {
  propertyId: string; // digits only
  displayName: string;
  accountName: string;
  currency?: string | null;
  timeZone?: string | null;
}

export async function listGa4Properties(accessToken: string): Promise<Ga4Property[]> {
  const out: Ga4Property[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`GA4 accountSummaries failed: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as {
      accountSummaries?: Array<{
        displayName?: string;
        propertySummaries?: Array<{ property?: string; displayName?: string }>;
      }>;
      nextPageToken?: string;
    };
    for (const acc of json.accountSummaries ?? []) {
      for (const p of acc.propertySummaries ?? []) {
        const id = (p.property ?? "").split("/")[1];
        if (!id) continue;
        out.push({
          propertyId: id,
          displayName: p.displayName ?? `GA4 ${id}`,
          accountName: acc.displayName ?? "GA4",
        });
      }
    }
    pageToken = json.nextPageToken;
  } while (pageToken);
  return out;
}

export interface Ga4Metrics {
  propertyId: string;
  sessions: number;
  users: number;
  newUsers: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  keyEvents: number;
  revenue: number;
  channels: Array<{ channel: string; sessions: number; users: number }>;
  daily: Array<{ date: string; sessions: number; users: number }>;
}

async function runReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>,
): Promise<{ rows?: Array<{ dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }> }> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`GA4 runReport failed: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const num = (v?: string) => Number(v ?? 0) || 0;

export async function fetchGa4Metrics(params: {
  accessToken: string;
  propertyId: string;
  datePreset: string;
}): Promise<Ga4Metrics> {
  const { accessToken, propertyId } = params;
  const { since, until } = rangeForPreset(params.datePreset);
  const dateRanges = [{ startDate: since, endDate: until }];
  const metrics = [
    { name: "sessions" },
    { name: "totalUsers" },
    { name: "newUsers" },
    { name: "screenPageViews" },
    { name: "bounceRate" },
    { name: "averageSessionDuration" },
    { name: "keyEvents" },
    { name: "totalRevenue" },
  ];

  const [totals, byChannel, byDay] = await Promise.all([
    runReport(accessToken, propertyId, { dateRanges, metrics }),
    runReport(accessToken, propertyId, {
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    }).catch(() => ({ rows: [] })),
    runReport(accessToken, propertyId, {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 100,
    }).catch(() => ({ rows: [] })),
  ]);

  const t = totals.rows?.[0]?.metricValues ?? [];
  return {
    propertyId,
    sessions: num(t[0]?.value),
    users: num(t[1]?.value),
    newUsers: num(t[2]?.value),
    pageViews: num(t[3]?.value),
    bounceRate: num(t[4]?.value),
    avgSessionDuration: num(t[5]?.value),
    keyEvents: num(t[6]?.value),
    revenue: num(t[7]?.value),
    channels: (byChannel.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? "—",
      sessions: num(r.metricValues?.[0]?.value),
      users: num(r.metricValues?.[1]?.value),
    })),
    daily: (byDay.rows ?? []).map((r) => {
      const raw = r.dimensionValues?.[0]?.value ?? "";
      return {
        date: raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw,
        sessions: num(r.metricValues?.[0]?.value),
        users: num(r.metricValues?.[1]?.value),
      };
    }),
  };
}

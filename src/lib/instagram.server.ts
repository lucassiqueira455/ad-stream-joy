// Instagram organic (Graph API) helpers. Server-only.
// Reuses the Meta OAuth connection token.

const GRAPH = "https://graph.facebook.com/v21.0";

export interface IgAccount {
  igId: string;
  username: string;
  name: string | null;
  pageId: string;
  pageName: string;
}

/** Lists Instagram Business/Creator accounts linked to the user's Facebook Pages. */
export async function fetchInstagramAccounts(token: string): Promise<IgAccount[]> {
  const url = new URL(`${GRAPH}/me/accounts`);
  url.searchParams.set("fields", "id,name,instagram_business_account{id,username,name}");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Instagram accounts failed: ${await res.text()}`);
  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      name: string;
      instagram_business_account?: { id: string; username: string; name?: string };
    }>;
  };
  const out: IgAccount[] = [];
  for (const page of json.data ?? []) {
    const ig = page.instagram_business_account;
    if (!ig) continue;
    out.push({
      igId: ig.id,
      username: ig.username,
      name: ig.name ?? null,
      pageId: page.id,
      pageName: page.name,
    });
  }
  return out;
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function rangeForPreset(preset: string): { since: string; until: string } {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const day = (n: number) => new Date(today.getTime() - n * 86400_000);
  const days: Record<string, number> = {
    today: 0, yesterday: 1, last_3d: 3, last_7d: 7, last_14d: 14,
    last_28d: 28, last_30d: 30, last_90d: 90,
  };
  if (preset === "this_month") {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    return { since: ymd(start), until: ymd(today) };
  }
  if (preset === "last_month") {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
    return { since: ymd(start), until: ymd(end) };
  }
  if (preset === "today") return { since: ymd(today), until: ymd(today) };
  if (preset === "yesterday") return { since: ymd(day(1)), until: ymd(day(1)) };
  const n = days[preset] ?? 30;
  // Instagram insights allow at most 30 days per request.
  const capped = Math.min(n, 30);
  return { since: ymd(day(capped)), until: ymd(today) };
}

export interface IgMedia {
  id: string;
  caption: string | null;
  mediaType: string;
  thumbnail: string | null;
  permalink: string;
  timestamp: string;
  likes: number;
  comments: number;
  engagement: number;
}

export interface IgInsights {
  igId: string;
  username: string;
  followers: number;
  mediaCount: number;
  newFollowers: number;
  reach: number;
  profileViews: number;
  websiteClicks: number;
  accountsEngaged: number;
  interactions: number;
  topMedia: IgMedia[];
  warnings: string[];
}

async function graphJson(url: URL): Promise<Record<string, unknown>> {
  const res = await fetch(url.toString());
  const body = await res.text();
  if (!res.ok) throw new Error(body.slice(0, 300));
  return JSON.parse(body);
}

function sumDaily(payload: Record<string, unknown>, metric: string): number {
  const data = (payload?.data ?? []) as Array<{
    name?: string;
    values?: Array<{ value?: number }>;
    total_value?: { value?: number };
  }>;
  const entry = data.find((d) => d.name === metric);
  if (!entry) return 0;
  if (entry.total_value?.value != null) return Number(entry.total_value.value) || 0;
  return (entry.values ?? []).reduce((acc, v) => acc + (Number(v.value) || 0), 0);
}

export async function fetchInstagramInsights(params: {
  token: string;
  igId: string;
  datePreset: string;
}): Promise<IgInsights> {
  const { token, igId } = params;
  const { since, until } = rangeForPreset(params.datePreset);
  const warnings: string[] = [];

  const profileUrl = new URL(`${GRAPH}/${igId}`);
  profileUrl.searchParams.set("fields", "username,followers_count,media_count");
  profileUrl.searchParams.set("access_token", token);

  const dayUrl = new URL(`${GRAPH}/${igId}/insights`);
  dayUrl.searchParams.set("metric", "reach,follower_count,profile_views,website_clicks");
  dayUrl.searchParams.set("period", "day");
  dayUrl.searchParams.set("since", since);
  dayUrl.searchParams.set("until", until);
  dayUrl.searchParams.set("access_token", token);

  const totalUrl = new URL(`${GRAPH}/${igId}/insights`);
  totalUrl.searchParams.set("metric", "accounts_engaged,total_interactions");
  totalUrl.searchParams.set("metric_type", "total_value");
  totalUrl.searchParams.set("period", "day");
  totalUrl.searchParams.set("since", since);
  totalUrl.searchParams.set("until", until);
  totalUrl.searchParams.set("access_token", token);

  const mediaUrl = new URL(`${GRAPH}/${igId}/media`);
  mediaUrl.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
  );
  mediaUrl.searchParams.set("limit", "50");
  mediaUrl.searchParams.set("access_token", token);

  const [profile, daily, totals, media] = await Promise.all([
    graphJson(profileUrl).catch((e) => {
      warnings.push(`Perfil: ${String(e.message ?? e)}`);
      return {} as Record<string, unknown>;
    }),
    graphJson(dayUrl).catch((e) => {
      warnings.push(`Métricas diárias: ${String(e.message ?? e)}`);
      return {} as Record<string, unknown>;
    }),
    graphJson(totalUrl).catch(() => ({}) as Record<string, unknown>),
    graphJson(mediaUrl).catch(() => ({}) as Record<string, unknown>),
  ]);

  const sinceMs = new Date(`${since}T00:00:00Z`).getTime();
  const untilMs = new Date(`${until}T23:59:59Z`).getTime();
  const mediaRows = ((media?.data ?? []) as Array<Record<string, unknown>>)
    .map((m) => {
      const likes = Number(m.like_count) || 0;
      const comments = Number(m.comments_count) || 0;
      return {
        id: String(m.id),
        caption: (m.caption as string) ?? null,
        mediaType: String(m.media_type ?? ""),
        thumbnail: (m.thumbnail_url as string) ?? (m.media_url as string) ?? null,
        permalink: String(m.permalink ?? ""),
        timestamp: String(m.timestamp ?? ""),
        likes,
        comments,
        engagement: likes + comments,
      } satisfies IgMedia;
    })
    .filter((m) => {
      const t = new Date(m.timestamp).getTime();
      return Number.isNaN(t) ? true : t >= sinceMs && t <= untilMs;
    })
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 6);

  return {
    igId,
    username: String((profile?.username as string) ?? ""),
    followers: Number(profile?.followers_count) || 0,
    mediaCount: Number(profile?.media_count) || 0,
    newFollowers: sumDaily(daily, "follower_count"),
    reach: sumDaily(daily, "reach"),
    profileViews: sumDaily(daily, "profile_views"),
    websiteClicks: sumDaily(daily, "website_clicks"),
    accountsEngaged: sumDaily(totals, "accounts_engaged"),
    interactions: sumDaily(totals, "total_interactions"),
    topMedia: mediaRows,
    warnings,
  };
}

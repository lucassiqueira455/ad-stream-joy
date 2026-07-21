import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  DollarSign,
  Eye,
  Flame,
  Gauge,
  Heart,
  Loader2,
  Megaphone,
  MousePointerClick,
  Percent,
  PlayCircle,
  RefreshCcw,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { getClientDashboard } from "@/lib/ads-connections.functions";
import { getPublicDashboard } from "@/lib/shares.functions";

type DatePreset =
  | "today" | "yesterday" | "last_3d" | "last_7d" | "last_14d"
  | "last_28d" | "last_30d" | "last_90d" | "this_month" | "last_month";

const DATE_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_28d", label: "Últimos 28 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "last_90d", label: "Últimos 90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
];

function fmtCurrency(v: number, currency: string | null): string {
  if (!Number.isFinite(v)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL", maximumFractionDigits: 2 }).format(v);
  } catch { return `${currency ?? ""} ${v.toFixed(2)}`; }
}
const fmtNumber = (v: number) => Number.isFinite(v) ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v) : "—";
const fmtPercent = (v: number) => Number.isFinite(v) ? `${v.toFixed(2)}%` : "—";

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return `há ${h}h`;
}

const PALETTE = [
  "oklch(0.72 0.20 260)",
  "oklch(0.75 0.18 165)",
  "oklch(0.80 0.18 65)",
  "oklch(0.70 0.22 25)",
  "oklch(0.75 0.18 300)",
  "oklch(0.75 0.16 200)",
  "oklch(0.72 0.18 100)",
  "oklch(0.75 0.20 350)",
  "oklch(0.70 0.20 220)",
  "oklch(0.78 0.16 140)",
];
const AXIS = "oklch(0.65 0.02 250)";
const GRID = "oklch(0.28 0.03 250)";

// ---------------- Types ----------------

type CampaignLike = {
  campaign_id: string;
  campaign_name: string;
  objective: string | null;
  optimization_goal: string | null;
  destination_type: string | null;
  status: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  link_clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cost_per_conversion: number;
  profile_visits: number;
  cost_per_profile_visit: number;
  video_views: number;
  cost_per_video_view: number;
  page_engagement: number;
  post_engagement: number;
  cost_per_engagement: number;
};

type AdLike = {
  ad_id: string;
  ad_name: string;
  campaign_id: string;
  campaign_name: string;
  objective: string | null;
  optimization_goal: string | null;
  destination_type: string | null;
  thumbnail_url: string | null;
  spend: number;
  ctr: number;
  clicks: number;
  conversions: number;
  cost_per_conversion: number;
  profile_visits: number;
  cost_per_profile_visit: number;
  video_views: number;
  cost_per_video_view: number;
  post_engagement: number;
  cost_per_engagement: number;
};

// ---------------- Objective groups ----------------

type GroupKey = "leads" | "profile_visits" | "traffic" | "engagement" | "video" | "sales" | "awareness" | "other";

type GroupSpec = {
  key: GroupKey;
  label: string;
  emoji: string;
  icon: LucideIcon;
  tone: string;
  resultLabel: string;
  costLabel: string;
  pickResult: (c: CampaignLike) => number;
  pickCost: (c: CampaignLike) => number;
  pickResultAd: (a: AdLike) => number;
  pickCostAd: (a: AdLike) => number;
};

const GROUPS: Record<GroupKey, GroupSpec> = {
  leads: {
    key: "leads", label: "Captação de Leads", emoji: "🎯", icon: Target, tone: PALETTE[1],
    resultLabel: "Conversões", costLabel: "Custo por Conversão",
    pickResult: (c) => c.conversions, pickCost: (c) => c.cost_per_conversion,
    pickResultAd: (a) => a.conversions, pickCostAd: (a) => a.cost_per_conversion,
  },
  profile_visits: {
    key: "profile_visits", label: "Visitas ao Perfil", emoji: "👤", icon: User, tone: PALETTE[4],
    resultLabel: "Visitas ao Perfil", costLabel: "Custo por Visita",
    pickResult: (c) => c.profile_visits, pickCost: (c) => c.cost_per_profile_visit,
    pickResultAd: (a) => a.profile_visits, pickCostAd: (a) => a.cost_per_profile_visit,
  },
  traffic: {
    key: "traffic", label: "Tráfego", emoji: "🚀", icon: MousePointerClick, tone: PALETTE[5],
    resultLabel: "Cliques no Link", costLabel: "CPC",
    pickResult: (c) => c.link_clicks || c.clicks, pickCost: (c) => c.cpc,
    pickResultAd: (a) => a.clicks, pickCostAd: (a) => a.clicks > 0 ? a.spend / a.clicks : 0,
  },
  engagement: {
    key: "engagement", label: "Engajamento", emoji: "❤️", icon: Heart, tone: PALETTE[7],
    resultLabel: "Engajamentos", costLabel: "Custo por Engajamento",
    pickResult: (c) => c.post_engagement || c.page_engagement, pickCost: (c) => c.cost_per_engagement,
    pickResultAd: (a) => a.post_engagement, pickCostAd: (a) => a.cost_per_engagement,
  },
  video: {
    key: "video", label: "Visualizações de Vídeo", emoji: "▶️", icon: PlayCircle, tone: PALETTE[8],
    resultLabel: "Visualizações", costLabel: "Custo por Visualização",
    pickResult: (c) => c.video_views, pickCost: (c) => c.cost_per_video_view,
    pickResultAd: (a) => a.video_views, pickCostAd: (a) => a.cost_per_video_view,
  },
  sales: {
    key: "sales", label: "Vendas", emoji: "🛒", icon: ShoppingCart, tone: PALETTE[3],
    resultLabel: "Compras", costLabel: "CPA",
    pickResult: (c) => c.conversions, pickCost: (c) => c.cost_per_conversion,
    pickResultAd: (a) => a.conversions, pickCostAd: (a) => a.cost_per_conversion,
  },
  awareness: {
    key: "awareness", label: "Reconhecimento", emoji: "📢", icon: Megaphone, tone: PALETTE[2],
    resultLabel: "Impressões", costLabel: "CPM",
    pickResult: (c) => c.impressions, pickCost: (c) => c.cpm,
    pickResultAd: () => 0, pickCostAd: () => 0,
  },
  other: {
    key: "other", label: "Outros", emoji: "📊", icon: BarChart3, tone: PALETTE[6],
    resultLabel: "Resultado", costLabel: "Custo",
    pickResult: (c) => c.conversions || c.link_clicks || c.clicks, pickCost: (c) => c.cost_per_conversion || c.cpc,
    pickResultAd: (a) => a.conversions || a.clicks, pickCostAd: (a) => a.cost_per_conversion,
  },
};

const GROUP_ORDER: GroupKey[] = ["leads", "sales", "profile_visits", "traffic", "engagement", "video", "awareness", "other"];

function classifyCampaign(c: CampaignLike): GroupKey {
  const obj = (c.objective || "").toUpperCase();
  const opt = (c.optimization_goal || "").toUpperCase();
  const dest = (c.destination_type || "").toUpperCase();

  // Profile visits — strongest signals first
  if (opt.includes("PROFILE_VISIT") || opt === "VISIT_INSTAGRAM_PROFILE" || dest.includes("INSTAGRAM_PROFILE")) {
    return "profile_visits";
  }
  if (c.profile_visits > 0 && c.profile_visits >= c.conversions) return "profile_visits";

  if (/SALES|CATALOG|PURCHASE/.test(obj)) return "sales";
  if (/LEAD|MESSAG|CONVERSATION|CONVERSION/.test(obj)) return "leads";
  if (/VIDEO/.test(obj)) return "video";
  if (/TRAFFIC|LINK_CLICKS/.test(obj)) return "traffic";
  if (/ENGAGEMENT|POST_ENGAGEMENT|PAGE_LIKES/.test(obj)) return "engagement";
  if (/AWARENESS|REACH|IMPRESSION/.test(obj)) return "awareness";

  // Data-based fallback
  if (c.conversions > 0) return "leads";
  if (c.video_views > 0 && c.video_views > c.clicks) return "video";
  if ((c.link_clicks || c.clicks) > 0) return "traffic";
  return "other";
}

function objectiveLabel(objective: string | null): string {
  if (!objective) return "—";
  const map: Record<string, string> = {
    OUTCOME_LEADS: "Leads",
    OUTCOME_SALES: "Vendas",
    OUTCOME_TRAFFIC: "Tráfego",
    OUTCOME_ENGAGEMENT: "Engajamento",
    OUTCOME_AWARENESS: "Reconhecimento",
    OUTCOME_APP_PROMOTION: "Promoção de app",
    LEAD_GENERATION: "Geração de Leads",
    MESSAGES: "Mensagens",
    CONVERSIONS: "Conversões",
    LINK_CLICKS: "Cliques no Link",
    POST_ENGAGEMENT: "Engajamento de Publicação",
    PAGE_LIKES: "Curtidas na Página",
    VIDEO_VIEWS: "Visualizações de Vídeo",
    REACH: "Alcance",
    BRAND_AWARENESS: "Reconhecimento de Marca",
    PRODUCT_CATALOG_SALES: "Vendas por Catálogo",
    APP_INSTALLS: "Instalações de App",
    EVENT_RESPONSES: "Respostas a Eventos",
    STORE_VISITS: "Visitas à Loja",
  };
  return map[objective] || objective.replace(/^OUTCOME_/, "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------- KPI ----------------

type Delta = { value: number; better: boolean } | null;

function computeDelta(current: number, previous: number | undefined, higherIsBetter: boolean): Delta {
  if (previous === undefined || !Number.isFinite(previous) || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  if (!Number.isFinite(change)) return null;
  const better = higherIsBetter ? change >= 0 : change <= 0;
  return { value: change, better };
}

function KpiCard({ label, value, icon: Icon, tone, delta, hint }: {
  label: string; value: string; icon: LucideIcon; tone: string; delta: Delta; hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: tone }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums md:text-3xl">{value}</p>
          {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-background shadow-sm" style={{ backgroundColor: tone }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {delta ? (
        <div className={`relative mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${delta.better ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
          {delta.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta.value).toFixed(1)}%
          <span className="ml-1 font-normal text-muted-foreground">vs. anterior</span>
        </div>
      ) : (
        <div className="relative mt-3 h-[22px]" />
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-display text-sm font-bold uppercase tracking-wider">{title}</h3>
        {subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 shadow-card ${className}`}>{children}</div>;
}

// ---------------- Tooltip ----------------

type ChartDatum = {
  name: string;
  value: number;
  campaign: CampaignLike;
  group: GroupSpec;
  totalValue: number;
  currency: string | null;
  valueKind: "spend" | "result";
};

function CampaignTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: ChartDatum }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  if (!d) return null;
  const { campaign, group, totalValue, currency, valueKind, value } = d;
  const share = totalValue > 0 ? (value / totalValue) * 100 : 0;
  const result = group.pickResult(campaign);
  const cost = group.pickCost(campaign);
  return (
    <div className="rounded-xl border border-border bg-card/95 p-3 text-xs shadow-card backdrop-blur-sm" style={{ minWidth: 240, maxWidth: 320 }}>
      <p className="mb-1 font-semibold leading-tight" style={{ color: group.tone }}>{campaign.campaign_name}</p>
      <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {group.emoji} {objectiveLabel(campaign.objective) || group.label}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">{group.resultLabel}</dt>
        <dd className="text-right font-semibold tabular-nums">{fmtNumber(result)}</dd>
        <dt className="text-muted-foreground">Investimento</dt>
        <dd className="text-right font-semibold tabular-nums">{fmtCurrency(campaign.spend, currency)}</dd>
        <dt className="text-muted-foreground">{group.costLabel}</dt>
        <dd className="text-right font-semibold tabular-nums">{fmtCurrency(cost, currency)}</dd>
        {totalValue > 0 && (
          <>
            <dt className="text-muted-foreground">Participação</dt>
            <dd className="text-right font-semibold tabular-nums">
              {share.toFixed(1)}% <span className="text-muted-foreground">({valueKind === "spend" ? "invest." : "result."})</span>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

// ---------------- Main ----------------

export function ClientDashboardView({
  clientId, hasAccounts, publicToken, allowDateChange = true,
}: {
  clientId: string; hasAccounts: boolean; publicToken?: string; allowDateChange?: boolean;
}) {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const fetchAuth = useServerFn(getClientDashboard);
  const fetchPublic = useServerFn(getPublicDashboard);

  const query = useQuery({
    queryKey: ["client-dashboard", clientId, datePreset, publicToken ?? "auth"],
    queryFn: async () => {
      if (publicToken) {
        const r = await fetchPublic({ data: { token: publicToken, datePreset } });
        return r.dashboard;
      }
      return fetchAuth({ data: { clientId, datePreset } });
    },
    enabled: hasAccounts,
    staleTime: 0,
    refetchOnMount: "always",
  });

  type DashboardData = Awaited<ReturnType<typeof getClientDashboard>>;
  const data = query.data as DashboardData | undefined;
  const totals = data?.totals ?? null;
  const prev = data?.previousTotals ?? null;
  const currency = data?.currency ?? null;
  const series = data?.series ?? [];
  const topCampaigns = (data?.topCampaigns ?? []) as CampaignLike[];
  const topAds = (data?.topAds ?? []) as AdLike[];

  const isProfileMode = !!totals && totals.profile_visits > totals.conversions;

  // Group campaigns by objective
  const groupedCampaigns = useMemo(() => {
    const map = new Map<GroupKey, CampaignLike[]>();
    for (const c of topCampaigns) {
      const k = classifyCampaign(c);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return map;
  }, [topCampaigns]);

  const groupedAds = useMemo(() => {
    // Ads inherit their campaign's group
    const camp2group = new Map<string, GroupKey>();
    for (const c of topCampaigns) camp2group.set(c.campaign_id, classifyCampaign(c));
    const map = new Map<GroupKey, AdLike[]>();
    for (const a of topAds) {
      const k = camp2group.get(a.campaign_id) ?? classifyCampaign({
        campaign_id: a.campaign_id, campaign_name: a.campaign_name,
        objective: a.objective, optimization_goal: a.optimization_goal, destination_type: a.destination_type,
        status: null, spend: a.spend, impressions: 0, clicks: a.clicks, link_clicks: 0,
        ctr: a.ctr, cpc: 0, cpm: 0,
        conversions: a.conversions, cost_per_conversion: a.cost_per_conversion,
        profile_visits: a.profile_visits, cost_per_profile_visit: a.cost_per_profile_visit,
        video_views: a.video_views, cost_per_video_view: a.cost_per_video_view,
        page_engagement: 0, post_engagement: a.post_engagement, cost_per_engagement: a.cost_per_engagement,
      });
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return map;
  }, [topAds, topCampaigns]);

  const activeGroups = useMemo(
    () => GROUP_ORDER.filter((k) => (groupedCampaigns.get(k)?.length ?? 0) > 0),
    [groupedCampaigns],
  );

  const insights = useMemo(
    () => buildAutoInsights({ totals, prev, campaigns: topCampaigns, ads: topAds, isProfileMode, currency }),
    [totals, prev, topCampaigns, topAds, isProfileMode, currency],
  );

  if (!hasAccounts) {
    return (
      <section className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">Vincule uma conta de anúncio para ver o dashboard.</p>
      </section>
    );
  }

  const resultLabelGlobal = isProfileMode ? "Visitas ao perfil" : "Resultado principal";
  const costLabelGlobal = isProfileMode ? "Custo por visita" : "Custo por resultado";

  return (
    <section className="mt-6 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {data?.lastSyncedAt ? <>Atualizado {timeAgo(data.lastSyncedAt)} · {new Date(now).toLocaleTimeString("pt-BR")}</> : "Dados ao vivo do Meta"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allowDateChange && (
            <select value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <button onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-accent">
            {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Atualizar
          </button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid place-items-center rounded-xl border border-border bg-card p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Erro: {(query.error as Error).message}
        </div>
      ) : !totals ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Sem dados no período selecionado.
        </div>
      ) : (
        <>
          {/* Account-level KPIs */}
          {(() => {
            const resultValue = isProfileMode ? totals.profile_visits : totals.conversions;
            const prevResult = prev ? (isProfileMode ? prev.profile_visits : prev.conversions) : undefined;
            const costValue = isProfileMode ? totals.cost_per_profile_visit : totals.cost_per_conversion;
            const prevCost = prev ? (isProfileMode ? prev.cost_per_profile_visit : prev.cost_per_conversion) : undefined;
            const clicks = totals.link_clicks || totals.clicks;
            const prevClicks = prev ? (prev.link_clicks || prev.clicks) : undefined;
            const ctr = totals.ctr_link || totals.ctr;
            const prevCtr = prev ? (prev.ctr_link || prev.ctr) : undefined;
            const cpc = totals.cpc_link || totals.cpc;
            const prevCpc = prev ? (prev.cpc_link || prev.cpc) : undefined;
            return (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <KpiCard label="💰 Investimento" value={fmtCurrency(totals.spend, currency)} icon={DollarSign} tone={PALETTE[0]} delta={computeDelta(totals.spend, prev?.spend, true)} />
                <KpiCard label={`🎯 ${resultLabelGlobal}`} value={fmtNumber(resultValue)} icon={Trophy} tone={PALETTE[1]} delta={computeDelta(resultValue, prevResult, true)} />
                <KpiCard label={`💵 ${costLabelGlobal}`} value={fmtCurrency(costValue, currency)} icon={Target} tone={PALETTE[3]} delta={computeDelta(costValue, prevCost, false)} />
                <KpiCard label="👆 Cliques" value={fmtNumber(clicks)} icon={MousePointerClick} tone={PALETTE[5]} delta={computeDelta(clicks, prevClicks, true)} />
                <KpiCard label="📈 Alcance" value={fmtNumber(totals.reach)} icon={Users} tone={PALETTE[4]} delta={computeDelta(totals.reach, prev?.reach, true)} />
                <KpiCard label="👀 Impressões" value={fmtNumber(totals.impressions)} icon={Eye} tone={PALETTE[2]} delta={computeDelta(totals.impressions, prev?.impressions, true)} />
                <KpiCard label="📊 CTR" value={fmtPercent(ctr)} icon={Percent} tone={PALETTE[6]} delta={computeDelta(ctr, prevCtr, true)} />
                <KpiCard label="💲 CPC" value={fmtCurrency(cpc, currency)} icon={Zap} tone={PALETTE[8]} delta={computeDelta(cpc, prevCpc, false)} />
                <KpiCard label="📢 CPM" value={fmtCurrency(totals.cpm, currency)} icon={Megaphone} tone={PALETTE[7]} delta={computeDelta(totals.cpm, prev?.cpm, false)} />
              </div>
            );
          })()}

          {insights.length > 0 && (
            <div>
              <SectionTitle icon={Sparkles} title="Insights automáticos" subtitle="Observações do período" />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {insights.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
                    <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-background" style={{ backgroundColor: s.tone }}>
                      <s.icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-snug">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-objective groups */}
          {activeGroups.map((key) => {
            const spec = GROUPS[key];
            const camps = groupedCampaigns.get(key) ?? [];
            const ads = groupedAds.get(key) ?? [];
            return (
              <ObjectiveGroupSection
                key={key}
                spec={spec}
                campaigns={camps}
                ads={ads}
                currency={currency}
              />
            );
          })}

          {activeGroups.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              Sem campanhas com dados no período.
            </div>
          )}

          {/* Global funnel */}
          <div>
            <SectionTitle icon={Gauge} title="Funil de performance" subtitle="Do impacto ao resultado" />
            <Funnel totals={totals} isProfileMode={isProfileMode} currency={currency} />
          </div>

          {series.length >= 3 && (
            <div>
              <SectionTitle icon={Flame} title="Mapa de calor semanal" subtitle="Dias da semana com mais resultados" />
              <WeekdayHeatmap series={series} />
            </div>
          )}

          {prev && (
            <div>
              <SectionTitle icon={TrendingUp} title="Comparativo entre períodos" subtitle="Período atual vs. anterior" />
              <PeriodComparison totals={totals} prev={prev} currency={currency} isProfileMode={isProfileMode} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ---------------- Objective group section ----------------

function ObjectiveGroupSection({
  spec, campaigns, ads, currency,
}: {
  spec: GroupSpec;
  campaigns: CampaignLike[];
  ads: AdLike[];
  currency: string | null;
}) {
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalResult = campaigns.reduce((s, c) => s + spec.pickResult(c), 0);
  const weightedCost = totalResult > 0 ? totalSpend / totalResult : 0;
  const clicks = campaigns.reduce((s, c) => s + (c.link_clicks || c.clicks), 0);
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  // Sort campaigns: primary metric desc, then cost asc, then spend desc
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const ra = spec.pickResult(a), rb = spec.pickResult(b);
    if (rb !== ra) return rb - ra;
    const ca = spec.pickCost(a), cb = spec.pickCost(b);
    if (ca !== cb) {
      if (ca === 0) return 1;
      if (cb === 0) return -1;
      return ca - cb;
    }
    return b.spend - a.spend;
  });
  const sortedAds = [...ads].sort((a, b) => {
    const ra = spec.pickResultAd(a), rb = spec.pickResultAd(b);
    if (rb !== ra) return rb - ra;
    return b.spend - a.spend;
  });

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5 md:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl text-background text-xl" style={{ backgroundColor: spec.tone }}>
            {spec.emoji}
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">{spec.label}</h3>
            <p className="text-xs text-muted-foreground">
              {campaigns.length} {campaigns.length === 1 ? "campanha" : "campanhas"} · Objetivo: {objectiveLabel(campaigns[0]?.objective ?? null)}
            </p>
          </div>
        </div>
      </header>

      {/* Group KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniKpi label="Investimento" value={fmtCurrency(totalSpend, currency)} tone={PALETTE[0]} icon={DollarSign} />
        <MiniKpi label={spec.resultLabel} value={fmtNumber(totalResult)} tone={spec.tone} icon={spec.icon} />
        <MiniKpi label={spec.costLabel} value={fmtCurrency(weightedCost, currency)} tone={PALETTE[3]} icon={Target} />
        <MiniKpi label="CTR" value={fmtPercent(ctr)} tone={PALETTE[6]} icon={Percent} />
      </div>

      {/* Charts */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Panel>
          <ChartHeader title="Investimento por campanha" subtitle="Donut" />
          <div className="h-64"><GroupDonut campaigns={sortedCampaigns} spec={spec} currency={currency} /></div>
        </Panel>
        <Panel>
          <ChartHeader title={`Top campanhas · ${spec.resultLabel}`} subtitle="Barras" />
          <div className="h-64"><GroupBars campaigns={sortedCampaigns} spec={spec} currency={currency} /></div>
        </Panel>
        <Panel>
          <ChartHeader title={`Participação em ${spec.resultLabel.toLowerCase()}`} subtitle="Pizza" />
          <div className="h-64"><GroupPie campaigns={sortedCampaigns} spec={spec} currency={currency} /></div>
        </Panel>
      </div>

      {/* Rankings */}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <CampaignRanking campaigns={sortedCampaigns} spec={spec} currency={currency} />
        <AdRanking ads={sortedAds} spec={spec} currency={currency} />
      </div>
    </div>
  );
}

function MiniKpi({ label, value, tone, icon: Icon }: { label: string; value: string; tone: string; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg text-background" style={{ backgroundColor: tone }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 font-display text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

// ---------------- Group charts ----------------

function buildChartData(campaigns: CampaignLike[], spec: GroupSpec, kind: "spend" | "result", currency: string | null): ChartDatum[] {
  const values = campaigns.map((c) => kind === "spend" ? c.spend : spec.pickResult(c));
  const total = values.reduce((s, v) => s + v, 0);
  const items: ChartDatum[] = campaigns.map((c, i) => ({
    name: c.campaign_name,
    value: values[i],
    campaign: c,
    group: spec,
    totalValue: total,
    currency,
    valueKind: kind,
  })).filter((d) => d.value > 0);
  return items;
}

function GroupDonut({ campaigns, spec, currency }: { campaigns: CampaignLike[]; spec: GroupSpec; currency: string | null }) {
  const rows = buildChartData(campaigns, spec, "spend", currency).slice(0, 8);
  if (rows.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2} stroke="none">
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip content={<CampaignTooltip />} />
        <Legend wrapperStyle={{ fontSize: 10, color: AXIS }} iconType="circle" formatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function GroupPie({ campaigns, spec, currency }: { campaigns: CampaignLike[]; spec: GroupSpec; currency: string | null }) {
  const rows = buildChartData(campaigns, spec, "result", currency).slice(0, 8);
  if (rows.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" outerRadius={80} stroke="none" label={({ percent }: { percent?: number }) => percent && percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : ""}>
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[(i + 1) % PALETTE.length]} />)}
        </Pie>
        <Tooltip content={<CampaignTooltip />} />
        <Legend wrapperStyle={{ fontSize: 10, color: AXIS }} iconType="circle" formatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function GroupBars({ campaigns, spec, currency }: { campaigns: CampaignLike[]; spec: GroupSpec; currency: string | null }) {
  const rows = buildChartData(campaigns, spec, "result", currency)
    .map((d) => ({ ...d, name: d.name.length > 22 ? `${d.name.slice(0, 22)}…` : d.name }))
    .slice(0, 10);
  if (rows.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" stroke={AXIS} fontSize={10} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} tickLine={false} axisLine={false} width={130} />
        <Tooltip content={<CampaignTooltip />} cursor={{ fill: "oklch(0.28 0.03 250 / 0.4)" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <p className="truncate text-sm font-semibold">{title}</p>
      {subtitle ? <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

// ---------------- Rankings ----------------

function CampaignRanking({ campaigns, spec, currency }: { campaigns: CampaignLike[]; spec: GroupSpec; currency: string | null }) {
  const rows = campaigns.slice(0, 10);
  const max = Math.max(1, ...rows.map((r) => spec.pickResult(r)));
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          <p className="text-sm font-semibold">Melhores Campanhas · {spec.label}</p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Top 10</span>
      </div>
      {rows.length === 0 ? <EmptyChart /> : (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => {
            const result = spec.pickResult(r);
            const cost = spec.pickCost(r);
            return (
              <li key={r.campaign_id} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 py-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={r.campaign_name}>{r.campaign_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(result / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                    </div>
                    <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                      CTR {fmtPercent(r.ctr)} · {fmtCurrency(r.spend, currency)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="tabular-nums text-sm font-bold">{fmtNumber(result)}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtCurrency(cost, currency)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function AdRanking({ ads, spec, currency }: { ads: AdLike[]; spec: GroupSpec; currency: string | null }) {
  const rows = ads.slice(0, 10);
  const max = Math.max(1, ...rows.map((r) => spec.pickResultAd(r)));
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Melhores Criativos · {spec.label}</p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Top 10</span>
      </div>
      {rows.length === 0 ? <EmptyChart /> : (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => {
            const result = spec.pickResultAd(r);
            const cost = spec.pickCostAd(r);
            return (
              <li key={r.ad_id} className="grid grid-cols-[24px_44px_1fr_auto] items-center gap-3 py-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
                {r.thumbnail_url ? (
                  <img src={r.thumbnail_url} alt="" className="h-11 w-11 rounded-md object-cover" />
                ) : (
                  <div className="h-11 w-11 rounded-md bg-muted" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={r.ad_name}>{r.ad_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(result / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                    </div>
                    <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                      CTR {fmtPercent(r.ctr)} · {fmtCurrency(r.spend, currency)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="tabular-nums text-sm font-bold">{fmtNumber(result)}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtCurrency(cost, currency)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ---------------- Account-level pieces (unchanged) ----------------

function Funnel({
  totals, isProfileMode, currency,
}: {
  totals: { impressions: number; clicks: number; link_clicks: number; conversions: number; profile_visits: number; cost_per_conversion: number; cost_per_profile_visit: number };
  isProfileMode: boolean;
  currency: string | null;
}) {
  const clicks = totals.link_clicks || totals.clicks;
  const result = isProfileMode ? totals.profile_visits : totals.conversions;
  const cost = isProfileMode ? totals.cost_per_profile_visit : totals.cost_per_conversion;
  const steps = [
    { label: "Impressões", value: totals.impressions, tone: PALETTE[2], format: fmtNumber, icon: Eye },
    { label: "Cliques", value: clicks, tone: PALETTE[5], format: fmtNumber, icon: MousePointerClick },
    { label: isProfileMode ? "Visitas ao perfil" : "Resultados", value: result, tone: PALETTE[1], format: fmtNumber, icon: Trophy },
    { label: isProfileMode ? "Custo por visita" : "Custo por resultado", value: cost, tone: PALETTE[3], format: (v: number) => fmtCurrency(v, currency), icon: Target },
  ];
  const first = steps[0].value || 1;
  return (
    <Panel>
      <div className="grid gap-3 md:grid-cols-4">
        {steps.map((s, i) => {
          const share = i < 3 ? Math.min(100, (s.value / first) * 100) : 100;
          const prev = i > 0 ? steps[i - 1].value : 0;
          const rate = i > 0 && i < 3 && prev > 0 ? (s.value / prev) * 100 : null;
          return (
            <div key={s.label} className="relative rounded-xl border border-border bg-background/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg text-background" style={{ backgroundColor: s.tone }}>
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
              </div>
              <p className="font-display text-2xl font-bold tabular-nums">{s.format(s.value)}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all" style={{ width: `${share}%`, background: s.tone }} />
              </div>
              {rate !== null && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Taxa {rate.toFixed(2)}% <span className="opacity-60">do passo anterior</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function WeekdayHeatmap({ series }: { series: { date: string; conversions: number; spend: number; clicks: number }[] }) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const buckets = days.map(() => ({ result: 0, spend: 0, clicks: 0, count: 0 }));
  for (const p of series) {
    const d = new Date(p.date + "T00:00:00");
    if (Number.isNaN(d.getTime())) continue;
    const w = d.getDay();
    buckets[w].result += p.conversions || 0;
    buckets[w].spend += p.spend || 0;
    buckets[w].clicks += p.clicks || 0;
    buckets[w].count += 1;
  }
  const max = Math.max(1, ...buckets.map((b) => b.result || b.clicks));
  return (
    <Panel>
      <div className="grid grid-cols-7 gap-2">
        {buckets.map((b, i) => {
          const val = b.result || b.clicks;
          const intensity = val / max;
          return (
            <div key={i} className="rounded-xl border border-border p-3 text-center transition-all hover:-translate-y-0.5" style={{ background: `color-mix(in oklab, ${PALETTE[1]} ${Math.round(intensity * 60)}%, transparent)` }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{days[i]}</p>
              <p className="mt-1 font-display text-lg font-bold tabular-nums">{fmtNumber(b.result)}</p>
              <p className="text-[10px] text-muted-foreground">{fmtNumber(b.clicks)} cliques</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Total de resultados por dia da semana no período.</p>
    </Panel>
  );
}

function PeriodComparison({
  totals, prev, currency, isProfileMode,
}: {
  totals: NonNullable<Awaited<ReturnType<typeof getClientDashboard>>["totals"]>;
  prev: NonNullable<Awaited<ReturnType<typeof getClientDashboard>>["previousTotals"]>;
  currency: string | null;
  isProfileMode: boolean;
}) {
  const clicks = totals.link_clicks || totals.clicks;
  const prevClicks = prev.link_clicks || prev.clicks;
  const ctr = totals.ctr_link || totals.ctr;
  const prevCtr = prev.ctr_link || prev.ctr;
  const cpc = totals.cpc_link || totals.cpc;
  const prevCpc = prev.cpc_link || prev.cpc;
  const res = isProfileMode ? totals.profile_visits : totals.conversions;
  const prevRes = isProfileMode ? prev.profile_visits : prev.conversions;

  const rows: { label: string; cur: string; prev: string; delta: Delta; higher: boolean }[] = [
    { label: "Investimento", cur: fmtCurrency(totals.spend, currency), prev: fmtCurrency(prev.spend, currency), delta: computeDelta(totals.spend, prev.spend, true), higher: true },
    { label: isProfileMode ? "Visitas" : "Resultados", cur: fmtNumber(res), prev: fmtNumber(prevRes), delta: computeDelta(res, prevRes, true), higher: true },
    { label: "CTR", cur: fmtPercent(ctr), prev: fmtPercent(prevCtr), delta: computeDelta(ctr, prevCtr, true), higher: true },
    { label: "CPC", cur: fmtCurrency(cpc, currency), prev: fmtCurrency(prevCpc, currency), delta: computeDelta(cpc, prevCpc, false), higher: false },
    { label: "CPM", cur: fmtCurrency(totals.cpm, currency), prev: fmtCurrency(prev.cpm, currency), delta: computeDelta(totals.cpm, prev.cpm, false), higher: false },
    { label: "Alcance", cur: fmtNumber(totals.reach), prev: fmtNumber(prev.reach), delta: computeDelta(totals.reach, prev.reach, true), higher: true },
    { label: "Cliques", cur: fmtNumber(clicks), prev: fmtNumber(prevClicks), delta: computeDelta(clicks, prevClicks, true), higher: true },
  ];
  return (
    <Panel>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="pb-2 text-left font-semibold">Métrica</th>
              <th className="pb-2 text-right font-semibold">Atual</th>
              <th className="pb-2 text-right font-semibold">Anterior</th>
              <th className="pb-2 text-right font-semibold">Variação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-2.5 font-medium">{r.label}</td>
                <td className="py-2.5 text-right tabular-nums font-semibold">{r.cur}</td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">{r.prev}</td>
                <td className="py-2.5 text-right">
                  {r.delta ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${r.delta.better ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                      {r.delta.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(r.delta.value).toFixed(1)}%
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function buildAutoInsights({
  totals, prev, campaigns, ads, isProfileMode, currency,
}: {
  totals: NonNullable<Awaited<ReturnType<typeof getClientDashboard>>["totals"]> | null;
  prev: Awaited<ReturnType<typeof getClientDashboard>>["previousTotals"] | null;
  campaigns: CampaignLike[];
  ads: AdLike[];
  isProfileMode: boolean;
  currency: string | null;
}): { icon: LucideIcon; tone: string; text: string }[] {
  if (!totals) return [];
  const out: { icon: LucideIcon; tone: string; text: string }[] = [];
  const totalResult = isProfileMode
    ? campaigns.reduce((s, c) => s + c.profile_visits, 0)
    : campaigns.reduce((s, c) => s + c.conversions, 0);
  const top = [...campaigns].sort((a, b) => (isProfileMode ? b.profile_visits - a.profile_visits : b.conversions - a.conversions))[0];
  if (top && totalResult > 0) {
    const val = isProfileMode ? top.profile_visits : top.conversions;
    const share = (val / totalResult) * 100;
    if (share >= 20) out.push({ icon: Trophy, tone: PALETTE[1], text: `A campanha "${top.campaign_name}" gerou ${share.toFixed(0)}% ${isProfileMode ? "das visitas" : "dos resultados"}.` });
  }
  const adsWithResults = ads.filter((a) => (isProfileMode ? a.profile_visits : a.conversions) > 0);
  const bestAd = [...adsWithResults].sort((a, b) => (isProfileMode ? a.cost_per_profile_visit - b.cost_per_profile_visit : a.cost_per_conversion - b.cost_per_conversion))[0];
  if (bestAd) {
    const cost = isProfileMode ? bestAd.cost_per_profile_visit : bestAd.cost_per_conversion;
    out.push({ icon: Award, tone: PALETTE[4], text: `O anúncio "${bestAd.ad_name}" tem o menor custo por ${isProfileMode ? "visita" : "resultado"} (${fmtCurrency(cost, currency)}).` });
  }
  if (prev) {
    const ctr = totals.ctr_link || totals.ctr;
    const prevCtr = prev.ctr_link || prev.ctr;
    const d = computeDelta(ctr, prevCtr, true);
    if (d && Math.abs(d.value) >= 5) out.push({ icon: d.value >= 0 ? TrendingUp : TrendingDown, tone: d.better ? PALETTE[1] : PALETTE[3], text: `O CTR ${d.value >= 0 ? "aumentou" : "reduziu"} ${Math.abs(d.value).toFixed(0)}% vs. o período anterior.` });
    const cpc = totals.cpc_link || totals.cpc;
    const prevCpc = prev.cpc_link || prev.cpc;
    const d2 = computeDelta(cpc, prevCpc, false);
    if (d2 && Math.abs(d2.value) >= 5) out.push({ icon: d2.value >= 0 ? TrendingUp : TrendingDown, tone: d2.better ? PALETTE[1] : PALETTE[3], text: `O CPC ${d2.value >= 0 ? "aumentou" : "reduziu"} ${Math.abs(d2.value).toFixed(0)}% vs. o período anterior.` });
    const d3 = computeDelta(totals.spend, prev.spend, true);
    if (d3 && Math.abs(d3.value) >= 10) out.push({ icon: DollarSign, tone: PALETTE[0], text: `O investimento ${d3.value >= 0 ? "aumentou" : "reduziu"} ${Math.abs(d3.value).toFixed(0)}% vs. o período anterior.` });
  }
  const bestCtr = [...campaigns].filter((c) => c.clicks > 0).sort((a, b) => b.ctr - a.ctr)[0];
  if (bestCtr && bestCtr.ctr > 0) out.push({ icon: TrendingUp, tone: PALETTE[6], text: `"${bestCtr.campaign_name}" tem o maior CTR (${fmtPercent(bestCtr.ctr)}).` });

  return out.slice(0, 6);
}

function EmptyChart() {
  return (
    <div className="grid h-full place-items-center text-xs text-muted-foreground">
      Sem dados no período
    </div>
  );
}

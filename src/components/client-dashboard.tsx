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
  Loader2,
  Megaphone,
  MousePointerClick,
  Percent,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
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

// Vivid palette
const PALETTE = [
  "oklch(0.72 0.20 260)", // indigo
  "oklch(0.75 0.18 165)", // green
  "oklch(0.80 0.18 65)",  // amber
  "oklch(0.70 0.22 25)",  // red
  "oklch(0.75 0.18 300)", // magenta
  "oklch(0.75 0.16 200)", // cyan
  "oklch(0.72 0.18 100)", // olive
  "oklch(0.75 0.20 350)", // pink
  "oklch(0.70 0.20 220)", // blue
  "oklch(0.78 0.16 140)", // lime
];
const AXIS = "oklch(0.65 0.02 250)";
const GRID = "oklch(0.28 0.03 250)";

const tooltipStyle = {
  background: "oklch(0.18 0.03 250)",
  border: `1px solid ${GRID}`,
  borderRadius: 8,
  fontSize: 12,
};

// ---------------- KPI ----------------

type Delta = { value: number; better: boolean } | null;

function computeDelta(current: number, previous: number | undefined, higherIsBetter: boolean): Delta {
  if (previous === undefined || !Number.isFinite(previous) || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  if (!Number.isFinite(change)) return null;
  const better = higherIsBetter ? change >= 0 : change <= 0;
  return { value: change, better };
}

function KpiCard({
  label, value, icon: Icon, tone, delta, hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
  delta: Delta;
  hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ background: tone }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums md:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-background shadow-sm"
          style={{ backgroundColor: tone }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {delta ? (
        <div
          className={`relative mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            delta.better
              ? "bg-success/15 text-success"
              : "bg-destructive/15 text-destructive"
          }`}
        >
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

// ---------------- Section shell ----------------

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
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-card ${className}`}>{children}</div>
  );
}

// ---------------- Main ----------------

export function ClientDashboardView({
  clientId,
  hasAccounts,
  publicToken,
  allowDateChange = true,
}: {
  clientId: string;
  hasAccounts: boolean;
  publicToken?: string;
  allowDateChange?: boolean;
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
  const topCampaigns = data?.topCampaigns ?? [];
  const topAds = data?.topAds ?? [];

  const isProfileMode = !!totals && totals.profile_visits > totals.conversions;
  const resultLabel = isProfileMode ? "Visitas ao perfil" : "Resultado principal";
  const costLabel = isProfileMode ? "Custo por visita" : "Custo por resultado";

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

  return (
    <section className="mt-6 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {data?.lastSyncedAt ? <>Atualizado {timeAgo(data.lastSyncedAt)} · {new Date(now).toLocaleTimeString("pt-BR")}</> : "Dados ao vivo do Meta"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allowDateChange && (
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
          >
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
          {/* 1 · KPIs */}
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
                <KpiCard label={`🎯 ${resultLabel}`} value={fmtNumber(resultValue)} icon={Trophy} tone={PALETTE[1]} delta={computeDelta(resultValue, prevResult, true)} />
                <KpiCard label={`💵 ${costLabel}`} value={fmtCurrency(costValue, currency)} icon={Target} tone={PALETTE[3]} delta={computeDelta(costValue, prevCost, false)} />
                <KpiCard label="👆 Cliques" value={fmtNumber(clicks)} icon={MousePointerClick} tone={PALETTE[5]} delta={computeDelta(clicks, prevClicks, true)} />
                <KpiCard label="📈 Alcance" value={fmtNumber(totals.reach)} icon={Users} tone={PALETTE[4]} delta={computeDelta(totals.reach, prev?.reach, true)} />
                <KpiCard label="👀 Impressões" value={fmtNumber(totals.impressions)} icon={Eye} tone={PALETTE[2]} delta={computeDelta(totals.impressions, prev?.impressions, true)} />
                <KpiCard label="📊 CTR" value={fmtPercent(ctr)} icon={Percent} tone={PALETTE[6]} delta={computeDelta(ctr, prevCtr, true)} />
                <KpiCard label="💲 CPC" value={fmtCurrency(cpc, currency)} icon={Zap} tone={PALETTE[8]} delta={computeDelta(cpc, prevCpc, false)} />
                <KpiCard label="📢 CPM" value={fmtCurrency(totals.cpm, currency)} icon={Megaphone} tone={PALETTE[7]} delta={computeDelta(totals.cpm, prev?.cpm, false)} />
              </div>
            );
          })()}

          {/* 10 · Auto insights */}
          {insights.length > 0 && (
            <div>
              <SectionTitle icon={Sparkles} title="Insights automáticos" subtitle="Observações do período" />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {insights.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
                    <div
                      className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-background"
                      style={{ backgroundColor: s.tone }}
                    >
                      <s.icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-snug">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2 · Donut / Bars / Pie */}
          <div>
            <SectionTitle icon={BarChart3} title="Distribuição" subtitle="Como o orçamento e os resultados se dividem entre campanhas" />
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel>
                <ChartHeader title="Investimento por campanha" subtitle="Donut" />
                <div className="h-72"><DonutSpend campaigns={topCampaigns} currency={currency} /></div>
              </Panel>
              <Panel>
                <ChartHeader title="Top 10 campanhas por resultado" subtitle="Barras" />
                <div className="h-72"><CampaignBars campaigns={topCampaigns} isProfileMode={isProfileMode} /></div>
              </Panel>
              <Panel>
                <ChartHeader title={isProfileMode ? "Visitas por campanha" : "Resultados por campanha"} subtitle="Pizza" />
                <div className="h-72"><PieResults campaigns={topCampaigns} breakdown={totals.conversions_breakdown} isProfileMode={isProfileMode} /></div>
              </Panel>
            </div>
          </div>

          {/* 3 · Rankings */}
          <div>
            <SectionTitle icon={Trophy} title="Rankings" subtitle="Melhores campanhas e criativos" />
            <div className="grid gap-4 xl:grid-cols-2">
              <CampaignRanking campaigns={topCampaigns} currency={currency} />
              <AdRanking ads={topAds} currency={currency} />
            </div>
          </div>

          {/* 4 · Comparisons */}
          <div>
            <SectionTitle icon={BarChart3} title="Comparativos entre campanhas" subtitle="Investimento, resultado, CTR e CPC lado a lado" />
            <div className="grid gap-4 md:grid-cols-2">
              <ComparisonBars title="Investimento" campaigns={topCampaigns} pick={(c) => c.spend} format={(v) => fmtCurrency(v, currency)} color={PALETTE[0]} />
              <ComparisonBars title={isProfileMode ? "Visitas" : "Resultados"} campaigns={topCampaigns} pick={(c) => isProfileMode ? c.profile_visits : c.conversions} format={fmtNumber} color={PALETTE[1]} />
              <ComparisonBars title="CTR" campaigns={topCampaigns} pick={(c) => c.ctr} format={fmtPercent} color={PALETTE[6]} />
              <ComparisonBars title="CPC" campaigns={topCampaigns} pick={(c) => c.cpc} format={(v) => fmtCurrency(v, currency)} color={PALETTE[8]} lowerBetter />
            </div>
          </div>

          {/* 5 · Funnel */}
          <div>
            <SectionTitle icon={Gauge} title="Funil de performance" subtitle="Do impacto ao resultado" />
            <Funnel totals={totals} isProfileMode={isProfileMode} currency={currency} />
          </div>

          {/* 6 · Heatmap (weekday) */}
          {series.length >= 3 && (
            <div>
              <SectionTitle icon={Flame} title="Mapa de calor semanal" subtitle="Dias da semana com mais resultados" />
              <WeekdayHeatmap series={series} />
            </div>
          )}

          {/* 7 · Highlights */}
          {topCampaigns.length > 0 && (
            <div>
              <SectionTitle icon={Award} title="Destaques" subtitle="Melhores marcas do período" />
              <Highlights campaigns={topCampaigns} ads={topAds} currency={currency} isProfileMode={isProfileMode} />
            </div>
          )}

          {/* 8 · Stacked bar */}
          {topCampaigns.length > 0 && (
            <div>
              <SectionTitle icon={BarChart3} title="Investimento vs. Resultados" subtitle="Comparação empilhada por campanha" />
              <Panel>
                <div className="h-80"><StackedCompare campaigns={topCampaigns} isProfileMode={isProfileMode} /></div>
              </Panel>
            </div>
          )}

          {/* 9 · Period comparison */}
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

// ---------------- Sub components ----------------

function ChartHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <p className="text-sm font-semibold">{title}</p>
      {subtitle ? <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

type CampaignLike = {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  ctr: number;
  cpc: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cost_per_conversion: number;
  profile_visits: number;
  cost_per_profile_visit: number;
};

type AdLike = {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  thumbnail_url: string | null;
  spend: number;
  ctr: number;
  conversions: number;
  cost_per_conversion: number;
  profile_visits: number;
  cost_per_profile_visit: number;
};

function DonutSpend({ campaigns, currency }: { campaigns: CampaignLike[]; currency: string | null }) {
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const top = [...campaigns].sort((a, b) => b.spend - a.spend).slice(0, 6);
  const other = campaigns.slice(6).reduce((s, c) => s + c.spend, 0);
  const rows = top.filter((c) => c.spend > 0).map((c) => ({ name: c.campaign_name, value: c.spend }));
  if (other > 0) rows.push({ name: "Outras", value: other });
  if (totalSpend === 0 || rows.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _n: string, p: { payload?: { name?: string } }) => [fmtCurrency(v, currency), p.payload?.name ?? ""]} />
        <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} iconType="circle" formatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function PieResults({ campaigns, breakdown, isProfileMode }: { campaigns: CampaignLike[]; breakdown: Record<string, number>; isProfileMode: boolean }) {
  let rows: { name: string; value: number }[] = [];
  if (isProfileMode) {
    const top = [...campaigns].filter((c) => c.profile_visits > 0).sort((a, b) => b.profile_visits - a.profile_visits).slice(0, 6);
    rows = top.map((c) => ({ name: c.campaign_name, value: c.profile_visits }));
  }
  if (rows.length === 0) {
    rows = Object.entries(breakdown).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }
  if (rows.length === 0) {
    rows = [...campaigns].filter((c) => c.conversions > 0).sort((a, b) => b.conversions - a.conversions).slice(0, 6).map((c) => ({ name: c.campaign_name, value: c.conversions }));
  }
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" outerRadius={90} stroke="none" label={({ percent }: { percent?: number }) => percent && percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : ""}>
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[(i + 1) % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _n: string, p: { payload?: { name?: string } }) => [fmtNumber(v), p.payload?.name ?? ""]} />
        <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} iconType="circle" formatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function CampaignBars({ campaigns, isProfileMode }: { campaigns: CampaignLike[]; isProfileMode: boolean }) {
  const totalProfile = campaigns.reduce((s, c) => s + c.profile_visits, 0);
  const totalConv = campaigns.reduce((s, c) => s + c.conversions, 0);
  const useProfile = isProfileMode && totalProfile > 0;
  const useConv = !useProfile && totalConv > 0;
  const rows = campaigns
    .map((c) => ({
      name: c.campaign_name.length > 22 ? `${c.campaign_name.slice(0, 22)}…` : c.campaign_name,
      value: useProfile ? c.profile_visits : useConv ? c.conversions : c.spend,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  if (rows.length === 0) return <EmptyChart />;
  const label = useProfile ? "Visitas" : useConv ? "Resultados" : "Investimento";
  return (
    <ResponsiveContainer>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={140} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtNumber(v), label]} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CampaignRanking({ campaigns, currency }: { campaigns: CampaignLike[]; currency: string | null }) {
  const rows = campaigns.slice(0, 10).map((c) => {
    const isProfile = c.profile_visits > c.conversions;
    return {
      ...c,
      result: isProfile ? c.profile_visits : c.conversions,
      cost: isProfile ? c.cost_per_profile_visit : c.cost_per_conversion,
      isProfile,
    };
  });
  const max = Math.max(1, ...rows.map((r) => r.result));
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          <p className="text-sm font-semibold">Melhores Campanhas</p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Top 10</span>
      </div>
      {rows.length === 0 ? (
        <EmptyChart />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
            <li key={r.campaign_id} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 py-2.5">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" title={r.campaign_name}>{r.campaign_name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(r.result / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                    CTR {fmtPercent(r.ctr)} · {fmtCurrency(r.spend, currency)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="tabular-nums text-sm font-bold">{fmtNumber(r.result)}</p>
                <p className="text-[10px] text-muted-foreground">{fmtCurrency(r.cost, currency)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AdRanking({ ads, currency }: { ads: AdLike[]; currency: string | null }) {
  const rows = ads.slice(0, 10).map((a) => {
    const isProfile = a.profile_visits > a.conversions;
    return {
      ...a,
      result: isProfile ? a.profile_visits : a.conversions,
      cost: isProfile ? a.cost_per_profile_visit : a.cost_per_conversion,
    };
  });
  const max = Math.max(1, ...rows.map((r) => r.result));
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Melhores Criativos</p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Top 10</span>
      </div>
      {rows.length === 0 ? (
        <EmptyChart />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
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
                    <div className="h-full rounded-full transition-all" style={{ width: `${(r.result / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                    CTR {fmtPercent(r.ctr)} · {fmtCurrency(r.spend, currency)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="tabular-nums text-sm font-bold">{fmtNumber(r.result)}</p>
                <p className="text-[10px] text-muted-foreground">{fmtCurrency(r.cost, currency)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ComparisonBars({
  title, campaigns, pick, format, color, lowerBetter,
}: {
  title: string;
  campaigns: CampaignLike[];
  pick: (c: CampaignLike) => number;
  format: (v: number) => string;
  color: string;
  lowerBetter?: boolean;
}) {
  const rows = campaigns
    .map((c) => ({ name: c.campaign_name.length > 22 ? `${c.campaign_name.slice(0, 22)}…` : c.campaign_name, value: pick(c) }))
    .filter((r) => Number.isFinite(r.value) && r.value > 0)
    .sort((a, b) => lowerBetter ? a.value - b.value : b.value - a.value)
    .slice(0, 8);
  return (
    <Panel>
      <ChartHeader title={title} subtitle={lowerBetter ? "Menor é melhor" : "Maior é melhor"} />
      <div className="h-64">
        {rows.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => format(v)} />
              <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={130} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [format(v), title]} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={color} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

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
            <div
              key={i}
              className="rounded-xl border border-border p-3 text-center transition-all hover:-translate-y-0.5"
              style={{ background: `color-mix(in oklab, ${PALETTE[1]} ${Math.round(intensity * 60)}%, transparent)` }}
            >
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

function Highlights({
  campaigns, ads, currency, isProfileMode,
}: {
  campaigns: CampaignLike[];
  ads: AdLike[];
  currency: string | null;
  isProfileMode: boolean;
}) {
  const withClicks = campaigns.filter((c) => c.clicks > 0);
  const bestCtr = [...withClicks].sort((a, b) => b.ctr - a.ctr)[0];
  const minCpc = [...withClicks].filter((c) => c.cpc > 0).sort((a, b) => a.cpc - b.cpc)[0];
  const maxSpend = [...campaigns].sort((a, b) => b.spend - a.spend)[0];
  const maxResult = [...campaigns].sort((a, b) => (isProfileMode ? b.profile_visits - a.profile_visits : b.conversions - a.conversions))[0];
  const withResults = campaigns.filter((c) => (isProfileMode ? c.profile_visits : c.conversions) > 0);
  const minCost = [...withResults].sort((a, b) => (isProfileMode ? a.cost_per_profile_visit - b.cost_per_profile_visit : a.cost_per_conversion - b.cost_per_conversion))[0];
  const adsWithResults = ads.filter((a) => (isProfileMode ? a.profile_visits : a.conversions) > 0);
  const bestAd = adsWithResults[0];
  const worstAd = [...adsWithResults].sort((a, b) => (isProfileMode ? b.cost_per_profile_visit - a.cost_per_profile_visit : b.cost_per_conversion - a.cost_per_conversion))[0];

  const items: { icon: LucideIcon; tone: string; label: string; name: string; value: string }[] = [];
  if (bestCtr) items.push({ icon: TrendingUp, tone: PALETTE[6], label: "Maior CTR", name: bestCtr.campaign_name, value: fmtPercent(bestCtr.ctr) });
  if (minCpc) items.push({ icon: TrendingDown, tone: PALETTE[8], label: "Menor CPC", name: minCpc.campaign_name, value: fmtCurrency(minCpc.cpc, currency) });
  if (maxSpend) items.push({ icon: DollarSign, tone: PALETTE[0], label: "Maior investimento", name: maxSpend.campaign_name, value: fmtCurrency(maxSpend.spend, currency) });
  if (maxResult) items.push({ icon: Trophy, tone: PALETTE[1], label: "Mais resultados", name: maxResult.campaign_name, value: fmtNumber(isProfileMode ? maxResult.profile_visits : maxResult.conversions) });
  if (minCost) items.push({ icon: Target, tone: PALETTE[3], label: "Menor custo/resultado", name: minCost.campaign_name, value: fmtCurrency(isProfileMode ? minCost.cost_per_profile_visit : minCost.cost_per_conversion, currency) });
  if (bestAd) items.push({ icon: Award, tone: PALETTE[4], label: "Melhor anúncio", name: bestAd.ad_name, value: fmtNumber(isProfileMode ? bestAd.profile_visits : bestAd.conversions) });
  if (worstAd && worstAd !== bestAd) items.push({ icon: TrendingDown, tone: PALETTE[3], label: "Anúncio a revisar", name: worstAd.ad_name, value: fmtCurrency(isProfileMode ? worstAd.cost_per_profile_visit : worstAd.cost_per_conversion, currency) });

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((it, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg text-background" style={{ backgroundColor: it.tone }}>
              <it.icon className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{it.label}</p>
          </div>
          <p className="mt-3 truncate text-sm font-semibold" title={it.name}>{it.name}</p>
          <p className="mt-1 font-display text-xl font-bold tabular-nums">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

function StackedCompare({ campaigns, isProfileMode }: { campaigns: CampaignLike[]; isProfileMode: boolean }) {
  const rows = campaigns.slice(0, 8).map((c) => ({
    name: c.campaign_name.length > 18 ? `${c.campaign_name.slice(0, 18)}…` : c.campaign_name,
    Investimento: c.spend,
    Resultados: isProfileMode ? c.profile_visits : c.conversions,
    Cliques: c.clicks,
  }));
  if (rows.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer>
      <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" />
        <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: AXIS }} />
        <Bar dataKey="Investimento" stackId="a" fill={PALETTE[0]} radius={[0, 0, 0, 0]} />
        <Bar dataKey="Cliques" stackId="a" fill={PALETTE[5]} />
        <Bar dataKey="Resultados" stackId="a" fill={PALETTE[1]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
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

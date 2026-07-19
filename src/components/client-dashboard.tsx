import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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
  BarChart3,
  DollarSign,
  Eye,
  Loader2,
  Megaphone,
  MousePointerClick,
  Percent,
  RefreshCcw,
  Target,
  Trophy,
  Users,
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

// Palette — high contrast, no pastel wash.
const PALETTE = [
  "oklch(0.72 0.20 260)", // indigo
  "oklch(0.75 0.18 165)", // green
  "oklch(0.80 0.18 65)",  // amber
  "oklch(0.70 0.22 25)",  // red
  "oklch(0.75 0.18 300)", // magenta
  "oklch(0.75 0.16 200)", // cyan
  "oklch(0.72 0.18 100)", // olive
  "oklch(0.75 0.20 350)", // pink
];
const AXIS = "oklch(0.65 0.02 250)";
const GRID = "oklch(0.28 0.03 250)";

const tooltipStyle = {
  background: "oklch(0.18 0.03 250)",
  border: `1px solid ${GRID}`,
  borderRadius: 8,
  fontSize: 12,
};

// ---------------- Colored KPI card ----------------

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
  tone: string; // oklch
  delta: Delta;
  hint?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-30 blur-2xl"
        style={{ background: tone }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums">
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
          <span className="ml-1 font-normal text-muted-foreground">vs. período anterior</span>
        </div>
      ) : (
        <div className="relative mt-3 h-[22px]" />
      )}
    </div>
  );
}

// ---------------- Main component ----------------

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

  const data = query.data;
  const totals = data?.totals ?? null;
  const prev = data?.previousTotals ?? null;
  const currency = data?.currency ?? null;

  const series = useMemo(() => data?.series ?? [], [data]);

  const topCampaigns = data?.topCampaigns ?? [];
  const topAds = data?.topAds ?? [];

  // Determine the primary result mode across the account.
  const isProfileMode = !!totals && totals.profile_visits > totals.conversions;
  const resultLabel = isProfileMode ? "Visitas ao perfil" : "Resultado principal";
  const costLabel = isProfileMode ? "Custo por visita" : "Custo por resultado";

  if (!hasAccounts) {
    return (
      <section className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">Vincule uma conta de anúncio para ver o dashboard.</p>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {data?.lastSyncedAt ? <>Atualizado {timeAgo(data.lastSyncedAt)} · agora {new Date(now).toLocaleTimeString("pt-BR")}</> : "Dados ao vivo do Meta"}
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
          {/* KPI cards */}
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
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <KpiCard
                  label="💰 Investimento" value={fmtCurrency(totals.spend, currency)} icon={DollarSign} tone={PALETTE[0]}
                  delta={computeDelta(totals.spend, prev?.spend, true)}
                />
                <KpiCard
                  label={`🎯 ${resultLabel}`} value={fmtNumber(resultValue)} icon={Trophy} tone={PALETTE[1]}
                  delta={computeDelta(resultValue, prevResult, true)}
                />
                <KpiCard
                  label={`💵 ${costLabel}`} value={fmtCurrency(costValue, currency)} icon={Target} tone={PALETTE[3]}
                  delta={computeDelta(costValue, prevCost, false)}
                />
                <KpiCard
                  label="👆 Cliques" value={fmtNumber(clicks)} icon={MousePointerClick} tone={PALETTE[5]}
                  delta={computeDelta(clicks, prevClicks, true)}
                />
                <KpiCard
                  label="📈 Alcance" value={fmtNumber(totals.reach)} icon={Users} tone={PALETTE[4]}
                  delta={computeDelta(totals.reach, prev?.reach, true)}
                />
                <KpiCard
                  label="📊 Impressões" value={fmtNumber(totals.impressions)} icon={Eye} tone={PALETTE[2]}
                  delta={computeDelta(totals.impressions, prev?.impressions, true)}
                />
                <KpiCard
                  label="📉 CTR" value={fmtPercent(ctr)} icon={Percent} tone={PALETTE[6]}
                  delta={computeDelta(ctr, prevCtr, true)}
                />
                <KpiCard
                  label="📢 CPM" value={fmtCurrency(totals.cpm, currency)} icon={Megaphone} tone={PALETTE[7]}
                  delta={computeDelta(totals.cpm, prev?.cpm, false)}
                  hint={`CPC ${fmtCurrency(cpc, currency)}${prevCpc ? "" : ""}`}
                />
              </div>
            );
          })()}

          {/* Chart row: donut (spend), pie (results), bars (top campaigns) */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {/* Donut: spend distribution by campaign */}
            <ChartCard title="Investimento por campanha" subtitle="Distribuição do gasto">
              <DonutSpend campaigns={topCampaigns} currency={currency} />
            </ChartCard>

            {/* Pie: results distribution */}
            <ChartCard title={isProfileMode ? "Visitas por campanha" : "Conversões por origem"} subtitle="Distribuição dos resultados">
              <PieResults
                campaigns={topCampaigns}
                breakdown={totals.conversions_breakdown}
                isProfileMode={isProfileMode}
              />
            </ChartCard>

            {/* Bars: top campaigns by result */}
            <ChartCard title="Top campanhas" subtitle={isProfileMode ? "Por visitas ao perfil" : "Por resultados"}>
              <CampaignBars campaigns={topCampaigns} isProfileMode={isProfileMode} />
            </ChartCard>
          </div>

          {/* Daily evolution line — spend + clicks */}
          {series.length > 1 && (
            <div className="mt-6">
              <ChartCard title="Evolução diária" subtitle="Investimento e cliques por dia" tall>
                <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: AXIS }}
                    formatter={(v: number, k: string) => k === "spend" ? [fmtCurrency(v, currency), "Investimento"] : [fmtNumber(v), "Cliques"]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: AXIS }} />
                  <Line yAxisId="left" type="monotone" dataKey="spend" name="Investimento" stroke={PALETTE[0]} strokeWidth={2.5} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="clicks" name="Cliques" stroke={PALETTE[1]} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ChartCard>
            </div>
          )}

          {/* 🏆 Melhores Campanhas — ranking table */}
          {topCampaigns.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-warning" />
                  <h3 className="text-sm font-semibold">Melhores Campanhas</h3>
                </div>
                <span className="text-xs text-muted-foreground">Ordenadas por desempenho</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-background/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Campanha</th>
                      <th className="px-4 py-2 text-right">Resultado</th>
                      <th className="px-4 py-2 text-right">Custo/Result.</th>
                      <th className="px-4 py-2 text-right">CTR</th>
                      <th className="px-4 py-2 text-right">Investimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topCampaigns.slice(0, 10).map((c, i) => {
                      const isProfile = c.profile_visits > c.conversions;
                      const result = isProfile ? c.profile_visits : c.conversions;
                      const cost = isProfile ? c.cost_per_profile_visit : c.cost_per_conversion;
                      return (
                        <tr key={c.campaign_id}>
                          <td className="px-4 py-2 text-xs font-bold text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2 font-medium">
                            <div className="max-w-[280px] truncate" title={c.campaign_name}>{c.campaign_name}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {isProfile ? "Visitas ao perfil" : "Conversões"}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmtNumber(result)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(cost, currency)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtPercent(c.ctr)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(c.spend, currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 🎨 Melhores Criativos — with thumbnails */}
          {topAds.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Melhores Criativos</h3>
                </div>
                <span className="text-xs text-muted-foreground">Ordenados por desempenho</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-background/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Anúncio</th>
                      <th className="px-4 py-2 text-right">Resultado</th>
                      <th className="px-4 py-2 text-right">CTR</th>
                      <th className="px-4 py-2 text-right">Investimento</th>
                      <th className="px-4 py-2 text-right">Custo/Result.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topAds.slice(0, 10).map((a, i) => {
                      const isProfile = a.profile_visits > a.conversions;
                      const result = isProfile ? a.profile_visits : a.conversions;
                      const cost = isProfile ? a.cost_per_profile_visit : a.cost_per_conversion;
                      return (
                        <tr key={a.ad_id}>
                          <td className="px-4 py-2 text-xs font-bold text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              {a.thumbnail_url ? (
                                <img src={a.thumbnail_url} alt="" className="h-10 w-10 flex-shrink-0 rounded-md object-cover" />
                              ) : (
                                <div className="h-10 w-10 flex-shrink-0 rounded-md bg-muted" />
                              )}
                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate font-medium" title={a.ad_name}>{a.ad_name}</p>
                                <p className="max-w-[220px] truncate text-[10px] text-muted-foreground" title={a.campaign_name}>{a.campaign_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmtNumber(result)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtPercent(a.ctr)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(a.spend, currency)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(cost, currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ---------------- Chart primitives ----------------

function ChartCard({ title, subtitle, children, tall }: { title: string; subtitle?: string; children: React.ReactNode; tall?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-2">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className={tall ? "h-72 w-full" : "h-56 w-full"}>
        <ResponsiveContainer>{children as React.ReactElement}</ResponsiveContainer>
      </div>
    </div>
  );
}

type CampaignLike = {
  campaign_id: string;
  campaign_name: string;
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
  const rows = top.map((c) => ({ name: c.campaign_name, value: c.spend }));
  if (other > 0) rows.push({ name: "Outras", value: other });
  if (totalSpend === 0) return <EmptyChart />;
  return (
    <PieChart>
      <Pie
        data={rows}
        dataKey="value"
        nameKey="name"
        innerRadius={55}
        outerRadius={85}
        paddingAngle={2}
        stroke="none"
      >
        {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
      </Pie>
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(v: number, _n: string, p: { payload?: { name?: string } }) => [fmtCurrency(v, currency), p.payload?.name ?? ""]}
      />
      <Legend
        wrapperStyle={{ fontSize: 11, color: AXIS }}
        iconType="circle"
        formatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)}
      />
    </PieChart>
  );
}

function PieResults({
  campaigns, breakdown, isProfileMode,
}: {
  campaigns: CampaignLike[];
  breakdown: Record<string, number>;
  isProfileMode: boolean;
}) {
  let rows: { name: string; value: number }[] = [];
  if (isProfileMode) {
    const top = [...campaigns]
      .filter((c) => c.profile_visits > 0)
      .sort((a, b) => b.profile_visits - a.profile_visits)
      .slice(0, 6);
    const other = campaigns.slice(6).reduce((s, c) => s + c.profile_visits, 0);
    rows = top.map((c) => ({ name: c.campaign_name, value: c.profile_visits }));
    if (other > 0) rows.push({ name: "Outras", value: other });
  } else {
    rows = Object.entries(breakdown)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total === 0) return <EmptyChart />;
  return (
    <PieChart>
      <Pie
        data={rows}
        dataKey="value"
        nameKey="name"
        outerRadius={90}
        stroke="none"
        label={({ percent }: { percent?: number }) => percent && percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : ""}
      >
        {rows.map((_, i) => <Cell key={i} fill={PALETTE[(i + 1) % PALETTE.length]} />)}
      </Pie>
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(v: number, _n: string, p: { payload?: { name?: string } }) => [fmtNumber(v), p.payload?.name ?? ""]}
      />
      <Legend
        wrapperStyle={{ fontSize: 11, color: AXIS }}
        iconType="circle"
        formatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)}
      />
    </PieChart>
  );
}

function CampaignBars({ campaigns, isProfileMode }: { campaigns: CampaignLike[]; isProfileMode: boolean }) {
  const rows = campaigns
    .map((c) => ({
      name: c.campaign_name.length > 22 ? `${c.campaign_name.slice(0, 22)}…` : c.campaign_name,
      value: isProfileMode ? c.profile_visits : c.conversions,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  if (rows.length === 0) return <EmptyChart />;
  return (
    <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
      <XAxis type="number" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
      <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={130} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtNumber(v), isProfileMode ? "Visitas" : "Resultados"]} />
      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
        {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
      </Bar>
    </BarChart>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-full place-items-center text-xs text-muted-foreground">
      Sem dados no período
    </div>
  );
}

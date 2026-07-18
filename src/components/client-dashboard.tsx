import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  DollarSign, Eye, Loader2, MousePointerClick, Percent, RefreshCcw, Target, Trophy, Users,
} from "lucide-react";
import { getClientDashboard } from "@/lib/ads-connections.functions";
import { getPublicDashboard } from "@/lib/shares.functions";
import { MetricCard } from "@/components/metric-card";

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

const AXIS = "oklch(0.65 0.02 250)";
const GRID = "oklch(0.28 0.03 250)";
const LINE = "oklch(0.68 0.19 260)";
const FILL_TOP = "oklch(0.68 0.19 260)";

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="h-56 w-full">
        <ResponsiveContainer>{children as React.ReactElement}</ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "oklch(0.18 0.03 250)",
  border: `1px solid ${GRID}`,
  borderRadius: 8,
  fontSize: 12,
};

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
  const currency = data?.currency ?? null;

  const series = useMemo(() => data?.series ?? [], [data]);

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
          {(() => {
            const isProfile = totals.profile_visits > totals.conversions;
            const resultLabel = isProfile ? "Visitas ao perfil" : "Conversões";
            const costLabel = isProfile ? "Custo por visita" : "Custo por conversão";
            const resultValue = isProfile ? totals.profile_visits : totals.conversions;
            const costValue = isProfile ? totals.cost_per_profile_visit : totals.cost_per_conversion;
            return (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                <MetricCard label="Investimento" value={fmtCurrency(totals.spend, currency)} icon={DollarSign} />
                <MetricCard label={resultLabel} value={fmtNumber(resultValue)} icon={Trophy} />
                <MetricCard label={costLabel} value={fmtCurrency(costValue, currency)} icon={Target} />
                <MetricCard label="Alcance" value={fmtNumber(totals.reach)} icon={Users} />
                <MetricCard label="Impressões" value={fmtNumber(totals.impressions)} icon={Eye} />
                <MetricCard label="Cliques" value={fmtNumber(totals.link_clicks || totals.clicks)} icon={MousePointerClick} />
                <MetricCard label="CTR" value={fmtPercent(totals.ctr_link || totals.ctr)} icon={Percent} />
                <MetricCard label="CPC" value={fmtCurrency(totals.cpc_link || totals.cpc, currency)} icon={DollarSign} />
              </div>
            );
          })()}

          {series.length > 0 && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ChartCard title="Investimento diário">
                <AreaChart data={series} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={FILL_TOP} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={FILL_TOP} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} />
                  <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={50} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: AXIS }} formatter={(v: number) => [fmtCurrency(v, currency), "Investimento"]} />
                  <Area type="monotone" dataKey="spend" stroke={LINE} strokeWidth={2} fill="url(#fSpend)" />
                </AreaChart>
              </ChartCard>

              <ChartCard title="Conversões por dia">
                <AreaChart data={series} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fConv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={FILL_TOP} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={FILL_TOP} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} />
                  <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: AXIS }} formatter={(v: number) => [fmtNumber(v), "Conversões"]} />
                  <Area type="monotone" dataKey="conversions" stroke={LINE} strokeWidth={2} fill="url(#fConv)" />
                </AreaChart>
              </ChartCard>

              <ChartCard title="CTR (%)">
                <LineChart data={series} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} />
                  <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: AXIS }} formatter={(v: number) => [fmtPercent(v), "CTR"]} />
                  <Line type="monotone" dataKey="ctr" stroke={LINE} strokeWidth={2} dot={false} />
                </LineChart>
              </ChartCard>

              <ChartCard title="CPC">
                <LineChart data={series} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} />
                  <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={50} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: AXIS }} formatter={(v: number) => [fmtCurrency(v, currency), "CPC"]} />
                  <Line type="monotone" dataKey="cpc" stroke={LINE} strokeWidth={2} dot={false} />
                </LineChart>
              </ChartCard>
            </div>
          )}

          {data && data.topCampaigns.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">Melhores campanhas</h3>
                <p className="text-xs text-muted-foreground">Métrica ajustada ao objetivo de cada campanha</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Campanha</th>
                      <th className="px-4 py-2 text-left">Objetivo</th>
                      <th className="px-4 py-2 text-right">Investimento</th>
                      <th className="px-4 py-2 text-right">CTR</th>
                      <th className="px-4 py-2 text-right">Resultado</th>
                      <th className="px-4 py-2 text-right">Custo/Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.topCampaigns.map((c) => {
                      const isProfile = c.profile_visits > c.conversions;
                      const result = isProfile ? c.profile_visits : c.conversions;
                      const cost = isProfile ? c.cost_per_profile_visit : c.cost_per_conversion;
                      return (
                        <tr key={c.campaign_id}>
                          <td className="px-4 py-2 font-medium">{c.campaign_name}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {isProfile ? "Visitas ao perfil" : "Conversões"}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(c.spend, currency)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtPercent(c.ctr)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtNumber(result)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(cost, currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data && data.topAds.length > 0 && (() => {
            const groups = new Map<string, { campaign_name: string; ads: typeof data.topAds }>();
            for (const a of data.topAds) {
              const key = a.campaign_id || a.campaign_name || "unknown";
              const g = groups.get(key) ?? { campaign_name: a.campaign_name || "Sem campanha", ads: [] as typeof data.topAds };
              g.ads.push(a);
              groups.set(key, g);
            }
            const ordered = Array.from(groups.entries()).sort(
              (x, y) =>
                y[1].ads.reduce((s, a) => s + a.conversions + a.profile_visits, 0) -
                x[1].ads.reduce((s, a) => s + a.conversions + a.profile_visits, 0),
            );
            return (
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Melhores anúncios por campanha</h3>
                  <p className="text-xs text-muted-foreground">Agrupado por campanha; a métrica muda conforme o objetivo (conversões ou visitas ao perfil)</p>
                </div>
                {ordered.map(([key, group]) => {
                  const totalConv = group.ads.reduce((s, a) => s + a.conversions, 0);
                  const totalVisits = group.ads.reduce((s, a) => s + a.profile_visits, 0);
                  const isProfile = totalVisits > totalConv;
                  const resultLabel = isProfile ? "Visitas" : "Conversões";
                  const costLabel = isProfile ? "Custo/Visita" : "Custo/Conv.";
                  const objectiveLabel = isProfile ? "Visitas ao perfil" : "Conversões";
                  return (
                    <div key={key} className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/40 px-4 py-2">
                        <p className="text-sm font-semibold">{group.campaign_name}</p>
                        <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {objectiveLabel}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
                            <tr>
                              <th className="px-4 py-2 text-left">Anúncio</th>
                              <th className="px-4 py-2 text-right">Investimento</th>
                              <th className="px-4 py-2 text-right">CTR</th>
                              <th className="px-4 py-2 text-right">{resultLabel}</th>
                              <th className="px-4 py-2 text-right">{costLabel}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {group.ads.map((a) => {
                              const result = isProfile ? a.profile_visits : a.conversions;
                              const cost = isProfile ? a.cost_per_profile_visit : a.cost_per_conversion;
                              return (
                                <tr key={a.ad_id}>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-3">
                                      {a.thumbnail_url ? (
                                        <img src={a.thumbnail_url} alt="" className="h-10 w-10 flex-shrink-0 rounded object-cover" />
                                      ) : (
                                        <div className="h-10 w-10 flex-shrink-0 rounded bg-muted" />
                                      )}
                                      <div className="min-w-0">
                                        <p className="truncate font-medium">{a.ad_name}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(a.spend, currency)}</td>
                                  <td className="px-4 py-2 text-right tabular-nums">{fmtPercent(a.ctr)}</td>
                                  <td className="px-4 py-2 text-right tabular-nums">{fmtNumber(result)}</td>
                                  <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(cost, currency)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}


        </>
      )}
    </section>
  );
}

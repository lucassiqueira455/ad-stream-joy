import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  DollarSign,
  Eye,
  Gauge,
  Heart,
  Loader2,
  MousePointerClick,
  Percent,
  PlayCircle,
  RefreshCcw,
  Settings2,
  ShoppingCart,
  Target,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getClientMetrics } from "@/lib/ads-connections.functions";
import { getPublicReport } from "@/lib/shares.functions";
import { MetricCard } from "@/components/metric-card";


type DatePreset =
  | "today"
  | "yesterday"
  | "last_3d"
  | "last_7d"
  | "last_14d"
  | "last_28d"
  | "last_30d"
  | "last_90d"
  | "this_month"
  | "last_month";

const DATE_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_3d", label: "Últimos 3 dias" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_28d", label: "Últimos 28 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "last_90d", label: "Últimos 90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
];

type Totals = {
  spend: number; impressions: number; reach: number; frequency: number; cpm: number;
  clicks: number; link_clicks: number; cpc: number; cpc_link: number; ctr: number; ctr_link: number;
  landing_page_views: number; cost_per_landing_page_view: number;
  results: number; cost_per_result: number;
  leads: number; messaging_conversations: number; purchases: number; purchase_value: number; roas: number;
  add_to_cart: number; initiate_checkout: number;
  profile_visits: number; cost_per_profile_visit: number;
  page_engagement: number; post_engagement: number; video_views: number;
  conversions: number; cost_per_conversion: number;
  conversions_breakdown: Record<string, number>;
};

type MetricFormat = "currency" | "number" | "percent" | "decimal";

interface MetricDef {
  key: string;
  label: string;
  icon: LucideIcon;
  format: MetricFormat;
  group: string;
  get: (t: NonNullable<Totals>) => number;
}

const METRICS: MetricDef[] = [
  { key: "spend", label: "Investimento", icon: DollarSign, format: "currency", group: "Entrega", get: (t) => t.spend },
  { key: "reach", label: "Alcance", icon: Users, format: "number", group: "Entrega", get: (t) => t.reach },
  { key: "impressions", label: "Impressões", icon: Eye, format: "number", group: "Entrega", get: (t) => t.impressions },
  { key: "frequency", label: "Frequência", icon: Gauge, format: "decimal", group: "Entrega", get: (t) => t.frequency },
  { key: "cpm", label: "CPM", icon: DollarSign, format: "currency", group: "Entrega", get: (t) => t.cpm },

  { key: "clicks", label: "Cliques", icon: MousePointerClick, format: "number", group: "Cliques", get: (t) => t.link_clicks || t.clicks },
  { key: "ctr", label: "CTR", icon: Percent, format: "percent", group: "Cliques", get: (t) => t.ctr_link || t.ctr },
  { key: "cpc", label: "CPC", icon: Target, format: "currency", group: "Cliques", get: (t) => t.cpc_link || t.cpc },
  { key: "lpv", label: "Visitas na LP", icon: Eye, format: "number", group: "Cliques", get: (t) => t.landing_page_views },
  { key: "cost_per_lpv", label: "Custo por visita LP", icon: DollarSign, format: "currency", group: "Cliques", get: (t) => t.cost_per_landing_page_view },

  { key: "conversions", label: "Conversões", icon: Trophy, format: "number", group: "Conversões", get: (t) => t.conversions },
  { key: "cost_per_conversion", label: "Custo por conversão", icon: DollarSign, format: "currency", group: "Conversões", get: (t) => t.cost_per_conversion },
  { key: "purchases", label: "Compras", icon: ShoppingCart, format: "number", group: "Conversões", get: (t) => t.purchases },
  { key: "purchase_value", label: "Valor de conversão", icon: DollarSign, format: "currency", group: "Conversões", get: (t) => t.purchase_value },
  { key: "roas", label: "ROAS", icon: BarChart3, format: "decimal", group: "Conversões", get: (t) => t.roas },
  { key: "atc", label: "Adições ao carrinho", icon: ShoppingCart, format: "number", group: "Conversões", get: (t) => t.add_to_cart },
  { key: "ic", label: "Checkouts iniciados", icon: ShoppingCart, format: "number", group: "Conversões", get: (t) => t.initiate_checkout },


  { key: "profile_visits", label: "Visitas ao perfil", icon: UserRound, format: "number", group: "Engajamento", get: (t) => t.profile_visits },
  { key: "cost_per_profile_visit", label: "Custo por visita ao perfil", icon: DollarSign, format: "currency", group: "Engajamento", get: (t) => t.cost_per_profile_visit },
  { key: "page_engagement", label: "Engajamento com página", icon: Heart, format: "number", group: "Engajamento", get: (t) => t.page_engagement },
  { key: "post_engagement", label: "Engajamento com post", icon: Heart, format: "number", group: "Engajamento", get: (t) => t.post_engagement },
  { key: "video_views", label: "Visualizações de vídeo", icon: PlayCircle, format: "number", group: "Engajamento", get: (t) => t.video_views },
];

const DEFAULT_SELECTED = [
  "spend", "reach", "impressions", "clicks", "ctr", "cpc",
  "conversions", "cost_per_conversion", "profile_visits", "cost_per_profile_visit",
];

const STORAGE_KEY = "client-metrics-selection-v2";

function fmtCurrency(value: number, currency: string | null): string {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency ?? ""} ${value.toFixed(2)}`;
  }
}

function fmtNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

function fmtPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function fmtDecimal(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

function formatMetric(def: MetricDef, value: number, currency: string | null): string {
  switch (def.format) {
    case "currency": return fmtCurrency(value, currency);
    case "percent": return fmtPercent(value);
    case "decimal": return fmtDecimal(value);
    default: return fmtNumber(value);
  }
}

export function ClientMetrics({ clientId, hasAccounts }: { clientId: string; hasAccounts: boolean }) {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSelected(parsed.filter((k) => METRICS.some((m) => m.key === k)));
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selected)); } catch { /* noop */ }
  }, [selected]);

  const fetchMetrics = useServerFn(getClientMetrics);
  const query = useQuery({
    queryKey: ["client-metrics", clientId, datePreset],
    queryFn: () => fetchMetrics({ data: { clientId, datePreset } }),
    enabled: hasAccounts,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const totals = query.data?.totals ?? null;
  const currency = query.data?.currency ?? null;
  const breakdown = totals?.conversions_breakdown ?? {};
  const breakdownEntries = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const grouped = useMemo(() => {
    const g: Record<string, MetricDef[]> = {};
    for (const m of METRICS) {
      (g[m.group] = g[m.group] ?? []).push(m);
    }
    return g;
  }, []);

  const visibleMetrics = METRICS.filter((m) => selected.includes(m.key));

  function toggle(key: string) {
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  if (!hasAccounts) {
    return (
      <section className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Vincule uma conta de anúncio acima para começar a ver as métricas.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Métricas</h2>
          <p className="text-sm text-muted-foreground">
            Dados agregados de todas as contas vinculadas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as DatePreset)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {DATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="relative">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              <Settings2 className="h-4 w-4" />
              Métricas ({selected.length})
            </button>
            {pickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setPickerOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-border bg-popover p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Escolha as métricas</p>
                    <button
                      onClick={() => setSelected(DEFAULT_SELECTED)}
                      className="text-xs text-muted-foreground underline"
                    >
                      Padrão
                    </button>
                  </div>
                  {Object.entries(grouped).map(([group, defs]) => (
                    <div key={group} className="mb-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                      <div className="space-y-1">
                        {defs.map((m) => (
                          <label key={m.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent">
                            <input
                              type="checkbox"
                              checked={selected.includes(m.key)}
                              onChange={() => toggle(m.key)}
                              className="h-4 w-4 accent-primary"
                            />
                            <span>{m.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
          >
            {query.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
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
          Erro ao carregar métricas: {(query.error as Error).message}
        </div>
      ) : (query.data?.accounts ?? []).some((a) => a.error) && !totals ? (
        <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
          <p className="font-medium text-destructive">Erro ao buscar dados no Meta:</p>
          <ul className="list-disc space-y-1 pl-5 text-destructive/90">
            {query.data!.accounts.filter((a) => a.error).map((a) => (
              <li key={a.account.id}>
                <span className="font-medium">{a.account.account_name}:</span> {a.error}
              </li>
            ))}
          </ul>
        </div>
      ) : !totals ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Sem dados no período selecionado.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleMetrics.map((m) => (
              <MetricCard
                key={m.key}
                label={m.label}
                value={formatMetric(m, m.get(totals), currency)}
                icon={m.icon}
              />
            ))}
          </div>

          {breakdownEntries.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">Detalhamento das conversões</h3>
                <p className="text-xs text-muted-foreground">
                  Por origem detectada automaticamente na Meta Ads API
                </p>
              </div>
              <div className="divide-y divide-border">
                {breakdownEntries.map(([label, value]) => {
                  const pct = totals.conversions > 0 ? (value / totals.conversions) * 100 : 0;
                  return (
                    <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                      </div>
                      <span className="tabular-nums font-medium">{fmtNumber(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {query.data && query.data.accounts.length > 1 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">Por conta</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Conta</th>
                      <th className="px-4 py-2 text-right">Investimento</th>
                      <th className="px-4 py-2 text-right">Impressões</th>
                      <th className="px-4 py-2 text-right">Cliques</th>
                      <th className="px-4 py-2 text-right">CTR</th>
                      <th className="px-4 py-2 text-right">CPC</th>
                      <th className="px-4 py-2 text-right">Conversões</th>
                      <th className="px-4 py-2 text-right">Custo/Conv.</th>
                      <th className="px-4 py-2 text-right">Visitas ao perfil</th>
                      <th className="px-4 py-2 text-right">Custo/visita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {query.data.accounts.map((row) => (
                      <tr key={row.account.id}>
                        <td className="px-4 py-2">
                          <div className="font-medium">{row.account.account_name}</div>
                          <div className="text-xs text-muted-foreground">{row.account.platform}</div>
                        </td>
                        {row.insights ? (
                          <>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(row.insights.spend, row.account.currency)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtNumber(row.insights.impressions)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtNumber(row.insights.link_clicks || row.insights.clicks)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtPercent(row.insights.ctr_link || row.insights.ctr)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(row.insights.cpc_link || row.insights.cpc, row.account.currency)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtNumber(row.insights.conversions)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(row.insights.cost_per_conversion, row.account.currency)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtNumber(row.insights.profile_visits)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(row.insights.cost_per_profile_visit, row.account.currency)}</td>
                          </>
                        ) : (
                          <td colSpan={9} className="px-4 py-2 text-right text-xs text-destructive">
                            {row.error ?? "Sem dados"}
                          </td>
                        )}
                      </tr>
                    ))}
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

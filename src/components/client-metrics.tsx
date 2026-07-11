import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  DollarSign,
  Eye,
  Loader2,
  MousePointerClick,
  Percent,
  RefreshCcw,
  Settings2,
  ShoppingCart,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { getClientMetrics } from "@/lib/ads-connections.functions";
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

type MetricKey =
  | "spend"
  | "impressions"
  | "reach"
  | "frequency"
  | "cpm"
  | "link_clicks"
  | "cpc_link"
  | "ctr_link"
  | "clicks"
  | "cpc"
  | "ctr"
  | "landing_page_views"
  | "cost_per_landing_page_view"
  | "results"
  | "cost_per_result"
  | "leads"
  | "purchases"
  | "purchase_value"
  | "roas"
  | "add_to_cart"
  | "initiate_checkout";

type MetricFormat = "currency" | "number" | "percent" | "decimal" | "roas";

const METRICS: {
  key: MetricKey;
  label: string;
  icon: typeof DollarSign;
  format: MetricFormat;
  group: "Entrega" | "Cliques" | "Resultados" | "Conversões";
}[] = [
  { key: "spend", label: "Valor gasto", icon: DollarSign, format: "currency", group: "Entrega" },
  { key: "impressions", label: "Impressões", icon: Eye, format: "number", group: "Entrega" },
  { key: "reach", label: "Alcance", icon: Users, format: "number", group: "Entrega" },
  { key: "frequency", label: "Frequência", icon: Zap, format: "decimal", group: "Entrega" },
  { key: "cpm", label: "CPM", icon: BarChart3, format: "currency", group: "Entrega" },
  { key: "link_clicks", label: "Cliques no link", icon: MousePointerClick, format: "number", group: "Cliques" },
  { key: "cpc_link", label: "CPC (link)", icon: TrendingUp, format: "currency", group: "Cliques" },
  { key: "ctr_link", label: "CTR (link)", icon: Percent, format: "percent", group: "Cliques" },
  { key: "clicks", label: "Cliques (todos)", icon: MousePointerClick, format: "number", group: "Cliques" },
  { key: "cpc", label: "CPC (todos)", icon: TrendingUp, format: "currency", group: "Cliques" },
  { key: "ctr", label: "CTR (todos)", icon: Percent, format: "percent", group: "Cliques" },
  { key: "landing_page_views", label: "Visualizações da LP", icon: Eye, format: "number", group: "Cliques" },
  { key: "cost_per_landing_page_view", label: "Custo por visualização da LP", icon: DollarSign, format: "currency", group: "Cliques" },
  { key: "results", label: "Resultados", icon: Trophy, format: "number", group: "Resultados" },
  { key: "cost_per_result", label: "Custo por resultado", icon: DollarSign, format: "currency", group: "Resultados" },
  { key: "leads", label: "Leads", icon: Target, format: "number", group: "Conversões" },
  { key: "purchases", label: "Compras", icon: ShoppingCart, format: "number", group: "Conversões" },
  { key: "purchase_value", label: "Valor de conversão", icon: DollarSign, format: "currency", group: "Conversões" },
  { key: "roas", label: "ROAS", icon: TrendingUp, format: "roas", group: "Conversões" },
  { key: "add_to_cart", label: "Adições ao carrinho", icon: ShoppingCart, format: "number", group: "Conversões" },
  { key: "initiate_checkout", label: "Checkouts iniciados", icon: ShoppingCart, format: "number", group: "Conversões" },
];

const DEFAULT_SELECTION: MetricKey[] = [
  "spend", "impressions", "reach", "cpm",
  "link_clicks", "cpc_link", "ctr_link",
  "results", "cost_per_result",
  "purchases", "purchase_value", "roas",
];

function formatValue(value: number, format: string, currency: string | null): string {
  if (!Number.isFinite(value)) return "—";
  if (format === "currency") {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: currency || "BRL",
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${(currency ?? "")} ${value.toFixed(2)}`;
    }
  }
  if (format === "percent") return `${value.toFixed(2)}%`;
  if (format === "decimal") return value.toFixed(2);
  if (format === "roas") return `${value.toFixed(2)}x`;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

export function ClientMetrics({ clientId, hasAccounts }: { clientId: string; hasAccounts: boolean }) {
  const storageKey = `metrics-selection:${clientId}`;
  const [selected, setSelected] = useState<MetricKey[]>(DEFAULT_SELECTION);
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as MetricKey[];
        if (Array.isArray(parsed) && parsed.length > 0) setSelected(parsed);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(selected));
    } catch {}
  }, [storageKey, selected]);

  const fetchMetrics = useServerFn(getClientMetrics);
  const query = useQuery({
    queryKey: ["client-metrics", clientId, datePreset],
    queryFn: () => fetchMetrics({ data: { clientId, datePreset } }),
    enabled: hasAccounts,
    staleTime: 60_000,
  });

  const visibleMetrics = useMemo(
    () => METRICS.filter((m) => selected.includes(m.key)),
    [selected],
  );

  const toggle = (key: MetricKey) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  if (!hasAccounts) {
    return (
      <section className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Vincule uma conta de anúncio acima para começar a ver as métricas.
        </p>
      </section>
    );
  }

  const totals = query.data?.totals;
  const currency = query.data?.currency ?? null;

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
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
                  className="fixed inset-0 z-10"
                  onClick={() => setPickerOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-card p-2 shadow-lg">
                  <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Selecionar métricas
                  </p>
                  {METRICS.map((m) => {
                    const on = selected.includes(m.key);
                    return (
                      <label
                        key={m.key}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(m.key)}
                          className="h-4 w-4"
                        />
                        <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
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
          <p className="pt-2 text-xs text-muted-foreground">
            "API access blocked" normalmente significa que o app Meta ainda não tem
            acesso avançado a <code>ads_read</code>, ou o usuário conectado não é
            admin da BM/conta. Verifique a conexão em Integrações e reconecte.
          </p>
        </div>
      ) : !totals ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Sem dados no período selecionado.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleMetrics.map((m) => (
              <MetricCard
                key={m.key}
                label={m.label}
                value={formatValue(totals[m.key], m.format, currency)}
                icon={m.icon}
              />
            ))}
          </div>

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
                      {visibleMetrics.map((m) => (
                        <th key={m.key} className="px-4 py-2 text-right">
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {query.data.accounts.map((row) => (
                      <tr key={row.account.id}>
                        <td className="px-4 py-2">
                          <div className="font-medium">{row.account.account_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.account.platform}
                          </div>
                        </td>
                        {row.insights ? (
                          visibleMetrics.map((m) => (
                            <td key={m.key} className="px-4 py-2 text-right tabular-nums">
                              {formatValue(row.insights![m.key], m.format, row.account.currency)}
                            </td>
                          ))
                        ) : (
                          <td
                            colSpan={visibleMetrics.length}
                            className="px-4 py-2 text-right text-xs text-destructive"
                          >
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

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  DollarSign,
  Eye,
  Loader2,
  MousePointerClick,
  Percent,
  RefreshCcw,
  Target,
  Trophy,
  Users,
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

export function ClientMetrics({ clientId, hasAccounts }: { clientId: string; hasAccounts: boolean }) {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");

  const fetchMetrics = useServerFn(getClientMetrics);
  const query = useQuery({
    queryKey: ["client-metrics", clientId, datePreset],
    queryFn: () => fetchMetrics({ data: { clientId, datePreset } }),
    enabled: hasAccounts,
    staleTime: 60_000,
  });

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
  const breakdown = totals?.conversions_breakdown ?? {};
  const breakdownEntries = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Investimento" value={fmtCurrency(totals.spend, currency)} icon={DollarSign} />
            <MetricCard label="Alcance" value={fmtNumber(totals.reach)} icon={Users} />
            <MetricCard label="Impressões" value={fmtNumber(totals.impressions)} icon={Eye} />
            <MetricCard label="Cliques" value={fmtNumber(totals.link_clicks || totals.clicks)} icon={MousePointerClick} />
            <MetricCard label="CTR" value={fmtPercent(totals.ctr_link || totals.ctr)} icon={Percent} />
            <MetricCard label="CPC" value={fmtCurrency(totals.cpc_link || totals.cpc, currency)} icon={Target} />
            <MetricCard label="Conversões" value={fmtNumber(totals.conversions)} icon={Trophy} />
            <MetricCard label="Custo por conversão" value={fmtCurrency(totals.cost_per_conversion, currency)} icon={DollarSign} />
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
                          </>
                        ) : (
                          <td colSpan={7} className="px-4 py-2 text-right text-xs text-destructive">
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

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DollarSign,
  MessageSquare,
  MousePointerClick,
  Target,
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { SpendChart } from "@/components/spend-chart";
import { PlatformBadge } from "@/components/platform-badge";
import {
  aggregate,
  buildDaily,
  clients,
  money,
  num,
  pct,
} from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Overview,
});

function Overview() {
  // Aggregate all clients
  const perClient = clients.map((c) => {
    const d = buildDaily(c.id);
    return { client: c, daily: d, metrics: aggregate(d) };
  });

  const totals = perClient.reduce(
    (acc, r) => {
      acc.spend += r.metrics.spend;
      acc.clicks += r.metrics.clicks;
      acc.impressions += r.metrics.impressions;
      acc.conversions += r.metrics.conversions;
      acc.messages += r.metrics.messages;
      return acc;
    },
    { spend: 0, clicks: 0, impressions: 0, conversions: 0, messages: 0 },
  );

  const combinedDaily = perClient[0].daily.map((_, i) => ({
    date: perClient[0].daily[i].date,
    spend: perClient.reduce((s, r) => s + r.daily[i].spend, 0),
    clicks: perClient.reduce((s, r) => s + r.daily[i].clicks, 0),
    impressions: perClient.reduce((s, r) => s + r.daily[i].impressions, 0),
    conversions: perClient.reduce((s, r) => s + r.daily[i].conversions, 0),
    messages: perClient.reduce((s, r) => s + r.daily[i].messages, 0),
  }));

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Visão geral
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            Todos os clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Últimos 30 dias • {clients.length} clientes ativos
          </p>
        </div>
        <select className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option>Últimos 30 dias</option>
          <option>Últimos 7 dias</option>
          <option>Este mês</option>
          <option>Mês anterior</option>
        </select>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Investimento"
          value={money(totals.spend)}
          delta={12.4}
          icon={DollarSign}
          hint={`CPC médio ${money(totals.spend / totals.clicks)}`}
        />
        <MetricCard
          label="Cliques"
          value={num(totals.clicks)}
          delta={8.1}
          icon={MousePointerClick}
          hint={`CTR ${pct((totals.clicks / totals.impressions) * 100)}`}
        />
        <MetricCard
          label="Mensagens"
          value={num(totals.messages)}
          delta={22.7}
          icon={MessageSquare}
          hint="WhatsApp + Direct + Messenger"
        />
        <MetricCard
          label="Conversões"
          value={num(totals.conversions)}
          delta={-3.4}
          icon={Target}
          hint={`CPA ${money(totals.spend / totals.conversions)}`}
        />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Investimento diário
            </h2>
            <p className="text-xs text-muted-foreground">
              Soma de todas as contas conectadas
            </p>
          </div>
        </div>
        <SpendChart data={combinedDaily} />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-display text-lg font-semibold">
          Desempenho por cliente
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Plataformas</th>
                <th className="px-4 py-3 text-right font-medium">Investimento</th>
                <th className="px-4 py-3 text-right font-medium">Cliques</th>
                <th className="px-4 py-3 text-right font-medium">CPC</th>
                <th className="px-4 py-3 text-right font-medium">Conversões</th>
                <th className="px-4 py-3 text-right font-medium">CPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {perClient.map(({ client, metrics }) => (
                <tr key={client.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <Link
                      to="/app/clients/$clientId"
                      params={{ clientId: client.id }}
                      className="flex items-center gap-3 font-medium hover:text-primary"
                    >
                      <span
                        className="grid h-8 w-8 place-items-center rounded-md text-xs font-semibold text-background"
                        style={{ backgroundColor: client.brandColor }}
                      >
                        {client.logo}
                      </span>
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {client.accounts.map((a) => (
                        <PlatformBadge key={a.accountId} platform={a.platform} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(metrics.spend)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {num(metrics.clicks)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(metrics.cpc)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {num(metrics.conversions)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(metrics.cpa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

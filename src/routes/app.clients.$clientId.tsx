import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import {
  DollarSign,
  Eye,
  FileDown,
  Link2,
  MessageSquare,
  MousePointerClick,
  Target,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PlatformBadge } from "@/components/platform-badge";
import { SpendChart } from "@/components/spend-chart";
import {
  aggregate,
  buildCampaigns,
  buildDaily,
  getClient,
  money,
  num,
  pct,
} from "@/lib/mock-data";

export const Route = createFileRoute("/app/clients/$clientId")({
  loader: ({ params }) => {
    const client = getClient(params.clientId);
    if (!client) throw notFound();
    return { client };
  },
  notFoundComponent: () => (
    <div className="p-10">
      <p className="text-muted-foreground">Cliente não encontrado.</p>
      <Link to="/app/clients" className="text-primary">Voltar</Link>
    </div>
  ),
  component: ClientDashboard,
});

function ClientDashboard() {
  const { client } = Route.useLoaderData();
  const daily = buildDaily(client.id);
  const m = aggregate(daily);
  const campaigns = buildCampaigns(client.id);

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className="grid h-14 w-14 place-items-center rounded-xl text-base font-semibold text-background"
            style={{ backgroundColor: client.brandColor }}
          >
            {client.logo}
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Cliente
            </p>
            <h1 className="font-display text-3xl font-semibold">{client.name}</h1>
            <div className="mt-1 flex gap-1.5">
              {client.accounts.map((a) => (
                <PlatformBadge key={a.accountId} platform={a.platform} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option>Últimos 30 dias</option>
            <option>Últimos 7 dias</option>
            <option>Este mês</option>
          </select>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
            <Link2 className="h-4 w-4" />
            Link público
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Investimento" value={money(m.spend)} delta={14.2} icon={DollarSign} />
        <MetricCard label="Cliques" value={num(m.clicks)} delta={9.8} icon={MousePointerClick} hint={`CPC ${money(m.cpc)}`} />
        <MetricCard label="Impressões" value={num(m.impressions)} delta={4.1} icon={Eye} hint={`CPM ${money(m.cpm)}`} />
        <MetricCard label="CTR" value={pct(m.ctr)} delta={2.6} icon={TrendingUp} />
        <MetricCard label="Mensagens" value={num(m.messages)} delta={31.4} icon={MessageSquare} hint="WhatsApp + Direct" />
        <MetricCard label="Conversões" value={num(m.conversions)} delta={-2.1} icon={Target} hint={`CPA ${money(m.cpa)}`} />
        <MetricCard label="Alcance estimado" value={num(Math.round(m.impressions / 3.2))} delta={5.6} icon={Eye} />
        <MetricCard label="Frequência" value={(m.impressions / (m.impressions / 3.2)).toFixed(2)} delta={1.1} icon={TrendingUp} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Investimento diário</h2>
          <p className="text-xs text-muted-foreground">
            Meta Ads + Google Ads combinados
          </p>
          <div className="mt-4">
            <SpendChart data={daily} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Divisão por plataforma</h2>
          <p className="text-xs text-muted-foreground">Investimento no período</p>
          <div className="mt-6 space-y-5">
            {(["meta", "google"] as const).map((p) => {
              const share = p === "meta" ? 0.62 : 0.38;
              return (
                <div key={p}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <PlatformBadge platform={p} />
                    <span className="tabular-nums">{money(m.spend * share)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full ${p === "meta" ? "bg-meta" : "bg-google"}`}
                      style={{ width: `${share * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(share * 100).toFixed(0)}% do total
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-display text-lg font-semibold">Campanhas</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Campanha</th>
                <th className="px-4 py-3 text-left font-medium">Plataforma</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Invest.</th>
                <th className="px-4 py-3 text-right font-medium">Cliques</th>
                <th className="px-4 py-3 text-right font-medium">CPC</th>
                <th className="px-4 py-3 text-right font-medium">Conv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => (
                <tr key={c.name} className="hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <PlatformBadge platform={c.platform} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${
                        c.status === "active"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          c.status === "active" ? "bg-success" : "bg-muted-foreground"
                        }`}
                      />
                      {c.status === "active" ? "Ativa" : "Pausada"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(c.spend)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{num(c.clicks)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(c.spend / c.clicks)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{num(c.conversions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

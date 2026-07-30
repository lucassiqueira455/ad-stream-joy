import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrganicMetrics } from "@/lib/organic.functions";

const nf = new Intl.NumberFormat("pt-BR");

export function OrganicPanel({ clientId, datePreset = "last_30d" }: { clientId: string; datePreset?: string }) {
  const fetchOrganic = useServerFn(getOrganicMetrics);
  const [preset] = useState(datePreset);
  const { data } = useQuery({
    queryKey: ["organic", clientId, preset],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => fetchOrganic({ data: { clientId, datePreset: preset as any } }),
    refetchInterval: 60_000,
  });

  if (!data) return null;
  const ig = data.instagram.insights[0];
  const ga = data.ga4.metrics[0];
  if (!ig && !ga) return null;

  return (
    <section className="mt-10 grid gap-5 lg:grid-cols-2">
      {ig && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground">Instagram orgânico · @{ig.username}</h3>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Seguidores" value={ig.followers} />
            <Stat label="Novos seguidores" value={ig.newFollowers} />
            <Stat label="Alcance" value={ig.reach} />
            <Stat label="Visitas ao perfil" value={ig.profileViews} />
            <Stat label="Contas engajadas" value={ig.accountsEngaged} />
            <Stat label="Interações" value={ig.interactions} />
          </div>
          {ig.topMedia.length > 0 && (
            <ul className="mt-5 space-y-2">
              {ig.topMedia.slice(0, 3).map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border p-2 text-xs">
                  {m.thumbnail && (
                    <img src={m.thumbnail} alt="" className="h-10 w-10 rounded-lg object-cover" loading="lazy" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{m.caption ?? m.mediaType}</span>
                  <span className="font-medium text-foreground">{nf.format(m.engagement)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {ga && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground">Google Analytics 4</h3>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Sessões" value={ga.sessions} />
            <Stat label="Usuários" value={ga.users} />
            <Stat label="Novos usuários" value={ga.newUsers} />
            <Stat label="Visualizações" value={ga.pageViews} />
            <Stat label="Conversões" value={ga.keyEvents} />
            <Stat label="Receita" value={Math.round(ga.revenue)} />
          </div>
          {ga.channels.length > 0 && (
            <ul className="mt-5 space-y-1 text-xs">
              {ga.channels.slice(0, 5).map((c) => (
                <li key={c.channel} className="flex justify-between border-b border-border/60 py-1">
                  <span className="text-muted-foreground">{c.channel}</span>
                  <span className="font-medium text-foreground">{nf.format(c.sessions)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{nf.format(value)}</p>
    </div>
  );
}

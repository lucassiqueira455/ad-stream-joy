import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Link2, Plus } from "lucide-react";
import { PlatformBadge } from "@/components/platform-badge";
import { supabase } from "@/integrations/supabase/client";
import { initialsFromName } from "@/lib/mock-data";

const overviewQuery = queryOptions({
  queryKey: ["overview-clients"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, brand_color, logo, ad_accounts(id, platform, account_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const Route = createFileRoute("/_authenticated/app/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(overviewQuery),
  component: Overview,
});

function Overview() {
  const { data: clients } = useSuspenseQuery(overviewQuery);
  const totalAccounts = clients.reduce((n, c) => n + (c.ad_accounts?.length ?? 0), 0);

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
            {clients.length} cliente{clients.length === 1 ? "" : "s"} • {totalAccounts} conta{totalAccounts === 1 ? "" : "s"} vinculada{totalAccounts === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/app/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Link2 className="h-4 w-4" />
            Integrações
          </Link>
          <Link
            to="/app/clients"
            className="inline-flex items-center gap-2 rounded-lg gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Novo cliente
          </Link>
        </div>
      </header>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <p className="font-display text-lg font-semibold">
            Bem-vindo! Comece criando seu primeiro cliente.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Depois vincule uma BM/conta de anúncio para puxar as métricas.
          </p>
          <Link
            to="/app/clients"
            className="mt-6 inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Criar cliente
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Contas vinculadas</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c) => {
                const accounts = c.ad_accounts ?? [];
                return (
                  <tr key={c.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <Link
                        to="/app/clients/$clientId"
                        params={{ clientId: c.id }}
                        className="flex items-center gap-3 font-medium hover:text-primary"
                      >
                        <span
                          className="grid h-8 w-8 place-items-center rounded-md text-xs font-semibold text-background"
                          style={{ backgroundColor: c.brand_color }}
                        >
                          {c.logo ?? initialsFromName(c.name)}
                        </span>
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {accounts.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Nenhuma
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {accounts.map((a) => (
                            <PlatformBadge
                              key={a.id}
                              platform={a.platform as "meta" | "google"}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/app/clients/$clientId"
                        params={{ clientId: c.id }}
                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

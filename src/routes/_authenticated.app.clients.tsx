import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ChevronRight } from "lucide-react";
import { PlatformBadge } from "@/components/platform-badge";
import { aggregate, buildDaily, clients, money, num } from "@/lib/mock-data";

export const Route = createFileRoute("/app/clients")({
  component: ClientsList,
});

function ClientsList() {
  return (
    <div className="p-6 md:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Clientes
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            Sua carteira
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length} clientes • {clients.reduce((n, c) => n + c.accounts.length, 0)} contas conectadas
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" />
          Novo cliente
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => {
          const m = aggregate(buildDaily(c.id));
          return (
            <Link
              key={c.id}
              to="/app/clients/$clientId"
              params={{ clientId: c.id }}
              className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-card transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-lg text-sm font-semibold text-background"
                    style={{ backgroundColor: c.brandColor }}
                  >
                    {c.logo}
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold">
                      {c.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.accounts.length} conta{c.accounts.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.accounts.map((a) => (
                  <PlatformBadge key={a.accountId} platform={a.platform} />
                ))}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Invest.
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {money(m.spend)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Cliques
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {num(m.clicks)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Conv.
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {num(m.conversions)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}

        <button className="grid place-items-center rounded-xl border border-dashed border-border bg-card/40 p-6 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
          <div>
            <Plus className="mx-auto h-6 w-6" />
            <p className="mt-2 text-sm font-medium">Adicionar cliente</p>
          </div>
        </button>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ClientDashboardView } from "@/components/client-dashboard";
import { Logo } from "@/components/logo";
import { getPublicDashboard } from "@/lib/shares.functions";
import { initialsFromName } from "@/lib/mock-data";

const dashboardQuery = (token: string) =>
  queryOptions({
    queryKey: ["public-dashboard", token],
    queryFn: () => getPublicDashboard({ data: { token } }),
    staleTime: 0,
  });

export const Route = createFileRoute("/dashboard/$token")({
  ssr: false,
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(dashboardQuery(params.token)),
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Link inválido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este link de dashboard é inválido ou foi desativado.
        </p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard não encontrado</h1>
      </div>
    </div>
  ),
  component: PublicDashboard,
});

function PublicDashboard() {
  const { token } = Route.useParams();
  const { data } = useSuspenseQuery(dashboardQuery(token));
  const { client, allowDateChange, dashboard } = data;
  const hasAccounts = (dashboard?.accounts?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <span
              className="grid h-12 w-12 place-items-center rounded-xl text-base font-semibold text-background"
              style={{ backgroundColor: client.brand_color }}
            >
              {client.logo ?? initialsFromName(client.name)}
            </span>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Dashboard</p>
              <h1 className="font-display text-2xl font-semibold">{client.name}</h1>
            </div>
          </div>
          <div className="opacity-70"><Logo /></div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <ClientDashboardView
          clientId={client.id}
          hasAccounts={hasAccounts}
          publicToken={token}
          allowDateChange={allowDateChange}
        />
      </main>
    </div>
  );
}

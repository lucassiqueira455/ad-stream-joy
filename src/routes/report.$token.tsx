import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { ClientMetrics } from "@/components/client-metrics";
import { Logo } from "@/components/logo";
import { getPublicReport } from "@/lib/shares.functions";
import { initialsFromName } from "@/lib/mock-data";

const reportQuery = (token: string) =>
  queryOptions({
    queryKey: ["public-report", token],
    queryFn: async () => {
      // Fetch initial "shell" data (client + config); the metrics grid
      // has its own query hooked to date preset changes.
      return getPublicReport({ data: { token } });
    },
    staleTime: 0,
  });

export const Route = createFileRoute("/report/$token")({
  ssr: false,
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(reportQuery(params.token)).catch(() => null),
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Link inválido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este link de relatório é inválido ou foi desativado.
        </p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Relatório não encontrado</h1>
      </div>
    </div>
  ),
  component: PublicReport,
});

function PublicReport() {
  const { token } = Route.useParams();
  const fetchPublic = useServerFn(getPublicReport);
  const { data, isLoading, isError } = useSuspenseQuery({
    queryKey: ["public-report", token],
    queryFn: () => fetchPublic({ data: { token } }),
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">Link inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link de relatório é inválido ou foi desativado.
          </p>
        </div>
      </div>
    );
  }

  const { client, allowDateChange, metrics } = data;
  const hasAccounts = (metrics?.accounts?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <span
              className="grid h-12 w-12 place-items-center rounded-xl text-base font-semibold text-background"
              style={{ backgroundColor: client.brand_color }}
            >
              {client.logo ?? initialsFromName(client.name)}
            </span>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Relatório
              </p>
              <h1 className="font-display text-2xl font-semibold">{client.name}</h1>
            </div>
          </div>
          <div className="opacity-70">
            <Logo />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <ClientMetrics
          clientId={client.id}
          hasAccounts={hasAccounts}
          publicToken={token}
          allowDateChange={allowDateChange}
        />
      </main>
    </div>
  );
}

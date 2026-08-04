import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ClientDashboardView } from "@/components/client-dashboard";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPublicDashboard } from "@/lib/shares.functions";
import { initialsFromName } from "@/lib/mock-data";

const dashboardQuery = (token: string) =>
  queryOptions({
    queryKey: ["public-dashboard", token],
    queryFn: () => getPublicDashboard({ data: { token, platform: "all" } }),
    staleTime: 0,
    retry: false,
  });

function InvalidLink() {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <div className="mb-6 flex justify-center opacity-70">
          <Logo />
        </div>
        <h1 className="font-display text-2xl font-semibold">Link inválido ou expirado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Peça um novo link de dashboard para quem compartilhou com você.
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard-public/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard de mídia paga — Analizze" },
      { name: "description", content: "Dashboard de performance de mídia paga compartilhado pela agência, atualizado em tempo real." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Dashboard de mídia paga — Analizze" },
      { property: "og:description", content: "Dashboard de performance de mídia paga compartilhado pela agência." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(dashboardQuery(params.token)),
  errorComponent: InvalidLink,
  notFoundComponent: InvalidLink,
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
          <div className="flex items-center gap-3">
            <ThemeToggle className="print:hidden" />
            <div className="opacity-70">
              <Logo />
            </div>
          </div>
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

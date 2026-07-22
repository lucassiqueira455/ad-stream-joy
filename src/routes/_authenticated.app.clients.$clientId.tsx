import { createFileRoute, Outlet, notFound, Link } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listAdAccounts, listConnections } from "@/lib/ads-connections.functions";
import { ClientHeader } from "@/components/client-header";

const clientQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, brand_color, logo")
        .eq("id", clientId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

const adAccountsQuery = queryOptions({
  queryKey: ["ad-accounts"],
  queryFn: () => listAdAccounts(),
});

const connectionsQuery = queryOptions({
  queryKey: ["ad-connections"],
  queryFn: () => listConnections(),
});

export const Route = createFileRoute("/_authenticated/app/clients/$clientId")({
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(clientQuery(params.clientId)),
      context.queryClient.ensureQueryData(adAccountsQuery),
      context.queryClient.ensureQueryData(connectionsQuery),
    ]);
  },
  errorComponent: () => (
    <div className="p-10">
      <p className="text-muted-foreground">Erro ao carregar cliente.</p>
      <Link to="/app/clients" className="text-primary">Voltar</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10">
      <p className="text-muted-foreground">Cliente não encontrado.</p>
      <Link to="/app/clients" className="text-primary">Voltar</Link>
    </div>
  ),
  component: ClientLayout,
});

function ClientLayout() {
  const { clientId } = Route.useParams();
  return (
    <div>
      <ClientHeader clientId={clientId} />
      <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-10">
        <Outlet />
      </div>
    </div>
  );
}

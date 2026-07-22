import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ClientMetrics } from "@/components/client-metrics";
import { listAdAccounts } from "@/lib/ads-connections.functions";

const adAccountsQuery = queryOptions({
  queryKey: ["ad-accounts"],
  queryFn: () => listAdAccounts(),
});

export const Route = createFileRoute("/_authenticated/app/clients/$clientId/reports")({
  component: ReportsTab,
});

function ReportsTab() {
  const { clientId } = Route.useParams();
  const { data: accounts } = useSuspenseQuery(adAccountsQuery);
  const hasAccounts = accounts.some((a) => a.client_id === clientId);
  return <ClientMetrics clientId={clientId} hasAccounts={hasAccounts} />;
}

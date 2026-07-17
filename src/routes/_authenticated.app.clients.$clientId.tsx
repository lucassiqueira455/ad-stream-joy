import { createFileRoute, notFound, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import { ClientMetrics } from "@/components/client-metrics";
import { ClientDashboardView } from "@/components/client-dashboard";
import { ShareReportCard } from "@/components/share-report-card";


import { supabase } from "@/integrations/supabase/client";
import {
  listAdAccounts,
  assignAdAccountToClient,
} from "@/lib/ads-connections.functions";
import { initialsFromName } from "@/lib/mock-data";

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

export const Route = createFileRoute("/_authenticated/app/clients/$clientId")({
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(clientQuery(params.clientId)),
      context.queryClient.ensureQueryData(adAccountsQuery),
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
  component: ClientDashboard,
});

function ClientDashboard() {
  const { clientId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: allAccounts } = useSuspenseQuery(adAccountsQuery);
  const assign = useServerFn(assignAdAccountToClient);

  const assigned = allAccounts.filter((a) => a.client_id === clientId);
  const available = allAccounts.filter((a) => !a.client_id);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["ad-accounts"] });
    await qc.invalidateQueries({ queryKey: ["clients-with-accounts"] });
  };

  const attach = async () => {
    if (!selected) return;
    setAttaching(true);
    try {
      await assign({ data: { adAccountId: selected, clientId } });
      setSelected("");
      await refresh();
    } finally {
      setAttaching(false);
    }
  };

  const detach = async (id: string) => {
    setBusyId(id);
    try {
      await assign({ data: { adAccountId: id, clientId: null } });
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const deleteClient = async () => {
    if (!confirm(`Excluir cliente "${client.name}"? As contas vinculadas ficarão sem cliente.`)) return;
    setDeleting(true);
    // Detach all first (RLS lets user do it via server fn, but client-side update is enough since policies allow it)
    await supabase.from("ad_accounts").update({ client_id: null }).eq("client_id", clientId);
    const { error } = await supabase.from("clients").delete().eq("id", clientId);
    setDeleting(false);
    if (error) {
      alert(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["clients-with-accounts"] });
    await qc.invalidateQueries({ queryKey: ["sidebar-clients"] });
    await qc.invalidateQueries({ queryKey: ["ad-accounts"] });
    router.navigate({ to: "/app/clients" });
  };

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className="grid h-14 w-14 place-items-center rounded-xl text-base font-semibold text-background"
            style={{ backgroundColor: client.brand_color }}
          >
            {client.logo ?? initialsFromName(client.name)}
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Cliente
            </p>
            <h1 className="font-display text-3xl font-semibold">{client.name}</h1>
            <div className="mt-1 flex gap-1.5">
              {assigned.map((a) => (
                <PlatformBadge key={a.id} platform={a.platform as "meta" | "google"} />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={deleteClient}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Excluir cliente
        </button>
      </header>

      <section className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">Contas vinculadas</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Vincule as BMs / contas de anúncio importadas nas integrações.
        </p>

        {assigned.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
            Nenhuma conta vinculada ainda.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {assigned.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.account_name}</p>
                  <p className="text-xs text-muted-foreground">
                    ID {a.external_account_id} • {a.currency ?? "—"} • {a.status ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <PlatformBadge platform={a.platform as "meta" | "google"} />
                  <button
                    onClick={() => detach(a.id)}
                    disabled={busyId === a.id}
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Desvincular"
                  >
                    {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={available.length === 0}
            className="min-w-[240px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">
              {available.length === 0
                ? "Nenhuma conta disponível — conecte uma em Integrações"
                : "Selecione uma conta para vincular…"}
            </option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name} ({a.platform})
              </option>
            ))}
          </select>
          <button
            onClick={attach}
            disabled={!selected || attaching}
            className="inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {attaching && <Loader2 className="h-4 w-4 animate-spin" />}
            Vincular
          </button>
          <Link
            to="/app/settings"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Integrações →
          </Link>
        </div>
      </section>

      <ShareReportCard clientId={clientId} />

      <ClientTabs clientId={clientId} hasAccounts={assigned.length > 0} />
    </div>
  );
}

function ClientTabs({ clientId, hasAccounts }: { clientId: string; hasAccounts: boolean }) {
  const [tab, setTab] = useState<"report" | "dashboard">("report");
  return (
    <>
      <div className="mt-8 inline-flex rounded-lg border border-border bg-card p-1">
        <button
          onClick={() => setTab("report")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === "report" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Relatório
        </button>
        <button
          onClick={() => setTab("dashboard")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === "dashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Dashboard
        </button>
      </div>
      {tab === "report" ? (
        <ClientMetrics clientId={clientId} hasAccounts={hasAccounts} />
      ) : (
        <ClientDashboardView clientId={clientId} hasAccounts={hasAccounts} />
      )}
    </>
  );
}


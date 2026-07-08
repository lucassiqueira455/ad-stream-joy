import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Link2, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import {
  listConnections,
  listAdAccounts,
  startMetaOAuth,
  disconnectPlatform,
  assignAdAccountToClient,
} from "@/lib/ads-connections.functions";
import { supabase } from "@/integrations/supabase/client";

const connectionsQuery = queryOptions({
  queryKey: ["ad-connections"],
  queryFn: () => listConnections(),
});

const adAccountsQuery = queryOptions({
  queryKey: ["ad-accounts"],
  queryFn: () => listAdAccounts(),
});

const clientsQuery = queryOptions({
  queryKey: ["clients"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const Route = createFileRoute("/_authenticated/app/settings")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(connectionsQuery),
      context.queryClient.ensureQueryData(adAccountsQuery),
      context.queryClient.ensureQueryData(clientsQuery),
    ]);
  },
  component: Settings,
});

function Settings() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: connections } = useSuspenseQuery(connectionsQuery);
  const { data: adAccounts } = useSuspenseQuery(adAccountsQuery);
  const { data: clients } = useSuspenseQuery(clientsQuery);

  const startMeta = useServerFn(startMetaOAuth);
  const disconnect = useServerFn(disconnectPlatform);
  const assign = useServerFn(assignAdAccountToClient);

  const [connecting, setConnecting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const flash = useMemo(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    const status = p.get("meta");
    if (!status) return null;
    const count = p.get("count");
    return { platform: "meta" as const, status, count };
  }, []);

  const metaConnections = connections.filter((c) => c.platform === "meta");
  const metaAccounts = adAccounts.filter((a) => a.platform === "meta");

  const handleConnectMeta = async () => {
    setConnecting(true);
    try {
      const res = await startMeta();
      // Facebook OAuth refuses to load inside iframes (e.g. Lovable preview).
      // Try to navigate the top window; if cross-origin blocks it, open in a new tab.
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = res.url;
        } else {
          window.location.href = res.url;
        }
      } catch {
        window.open(res.url, "_blank", "noopener,noreferrer");
        setConnecting(false);
      }
    } catch (e) {
      console.error(e);
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    setBusyId(id);
    try {
      await disconnect({ data: { connectionId: id } });
      await qc.invalidateQueries({ queryKey: ["ad-connections"] });
      await qc.invalidateQueries({ queryKey: ["ad-accounts"] });
      router.invalidate();
    } finally {
      setBusyId(null);
    }
  };

  const handleAssign = async (adAccountId: string, clientId: string | null) => {
    setBusyId(adAccountId);
    try {
      await assign({ data: { adAccountId, clientId } });
      await qc.invalidateQueries({ queryKey: ["ad-accounts"] });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Integrações
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Conectar plataformas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte suas contas do Meta Ads e Google Ads para puxar dados reais.
        </p>
      </header>

      {flash?.status === "connected" && (
        <FlashBanner
          tone="success"
          title={`Meta Ads conectado`}
          description={`Importamos ${flash.count ?? "0"} conta(s) de anúncio. Atribua cada uma a um cliente abaixo.`}
        />
      )}
      {flash?.status === "denied" && (
        <FlashBanner
          tone="warning"
          title="Conexão cancelada"
          description="Você recusou a autorização no Meta. Nenhuma conta foi importada."
        />
      )}
      {flash?.status && !["connected", "denied"].includes(flash.status) && (
        <FlashBanner
          tone="warning"
          title="Não conseguimos concluir a conexão"
          description="Verifique se a URL de redirecionamento está cadastrada no app do Meta e tente novamente."
        />
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-meta/20 text-meta">
                <Link2 className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold">Meta Ads</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Facebook, Instagram, Messenger e WhatsApp.
              </p>
            </div>
            {metaConnections.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </span>
            )}
          </div>

          {metaConnections.length === 0 ? (
            <button
              onClick={handleConnectMeta}
              disabled={connecting}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecionando…
                </>
              ) : (
                "Conectar Meta Ads"
              )}
            </button>
          ) : (
            <ul className="mt-6 space-y-2">
              {metaConnections.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{c.display_name ?? "Conta Meta"}</p>
                    {c.expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Expira em {new Date(c.expires_at).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDisconnect(c.id)}
                    disabled={busyId === c.id}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    {busyId === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Desconectar
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={handleConnectMeta}
                  disabled={connecting}
                  className="mt-1 w-full rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {connecting ? "Redirecionando…" : "+ Adicionar outra conta"}
                </button>
              </li>
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-google/20 text-google">
                <Link2 className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold">Google Ads</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Search, Display, YouTube e Performance Max.
              </p>
            </div>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Em breve
            </span>
          </div>
          <button
            disabled
            className="mt-6 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground"
          >
            Conectar Google Ads
          </button>
        </div>
      </section>

      {metaAccounts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">
            Contas de anúncio importadas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Atribua cada conta a um cliente para começar a puxar métricas nos dashboards.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-background/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Conta</th>
                  <th className="px-4 py-3 font-medium">Plataforma</th>
                  <th className="px-4 py-3 font-medium">Moeda</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metaAccounts.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.account_name}</p>
                      <p className="text-xs text-muted-foreground">
                        ID {a.external_account_id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <PlatformBadge platform="meta" />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {a.currency ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {a.status ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.client_id ?? ""}
                        onChange={(e) =>
                          handleAssign(a.id, e.target.value || null)
                        }
                        disabled={busyId === a.id}
                        className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                      >
                        <option value="">— Não atribuído —</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function FlashBanner({
  tone,
  title,
  description,
}: {
  tone: "success" | "warning";
  title: string;
  description: string;
}) {
  const isSuccess = tone === "success";
  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-lg border p-4 text-sm ${
        isSuccess
          ? "border-success/30 bg-success/5"
          : "border-warning/30 bg-warning/5"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      )}
      <div>
        <p className={`font-medium ${isSuccess ? "text-success" : "text-warning"}`}>
          {title}
        </p>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

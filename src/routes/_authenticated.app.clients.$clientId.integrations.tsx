import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Loader2, Trash2, Link2 } from "lucide-react";
import { useState } from "react";
import { IntegrationCard } from "@/components/integration-card";
import {
  listConnections,
  listAdAccounts,
  startMetaOAuth,
  startGoogleOAuth,
  disconnectPlatform,
  assignAdAccountToClient,
} from "@/lib/ads-connections.functions";
import type { PlatformKey } from "@/components/platform-chip";

const connectionsQuery = queryOptions({
  queryKey: ["ad-connections"],
  queryFn: () => listConnections(),
});

const adAccountsQuery = queryOptions({
  queryKey: ["ad-accounts"],
  queryFn: () => listAdAccounts(),
});

export const Route = createFileRoute("/_authenticated/app/clients/$clientId/integrations")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(connectionsQuery),
      context.queryClient.ensureQueryData(adAccountsQuery),
    ]);
  },
  component: IntegrationsTab,
});

function IntegrationsTab() {
  const { clientId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: connections } = useSuspenseQuery(connectionsQuery);
  const { data: accounts } = useSuspenseQuery(adAccountsQuery);

  const startMeta = useServerFn(startMetaOAuth);
  const startGoogle = useServerFn(startGoogleOAuth);
  const startGa4 = useServerFn(startGa4OAuth);
  const syncIg = useServerFn(syncInstagramAccounts);
  const disconnect = useServerFn(disconnectPlatform);
  const assign = useServerFn(assignAdAccountToClient);

  const [connecting, setConnecting] = useState<null | "meta" | "google" | "ga4">(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [igMessage, setIgMessage] = useState<string | null>(null);

  const metaConn = connections.find((c) => c.platform === "meta");
  const googleConn = connections.find((c) => c.platform === "google");
  const ga4Conn = connections.find((c) => c.platform === "ga4");
  const clientMetaAccounts = accounts.filter((a) => a.platform === "meta" && a.client_id === clientId);
  const availableMetaAccounts = accounts.filter((a) => a.platform === "meta" && !a.client_id);
  const clientGoogleAccounts = accounts.filter((a) => a.platform === "google" && a.client_id === clientId);
  const availableGoogleAccounts = accounts.filter((a) => a.platform === "google" && !a.client_id);
  const clientIgAccounts = accounts.filter((a) => a.platform === "instagram" && a.client_id === clientId);
  const availableIgAccounts = accounts.filter((a) => a.platform === "instagram" && !a.client_id);
  const clientGa4Accounts = accounts.filter((a) => a.platform === "ga4" && a.client_id === clientId);
  const availableGa4Accounts = accounts.filter((a) => a.platform === "ga4" && !a.client_id);


  const redirectToOAuth = (url: string) => {
    // Google/Facebook block their consent pages inside iframes via
    // X-Frame-Options / ERR_BLOCKED_BY_RESPONSE. Force a top-level full-page
    // redirect (breaking out of the Lovable preview iframe when needed) so the
    // browser lands directly on accounts.google.com / facebook.com.
    try {
      const topTarget = window.top && window.top !== window.self ? window.top : window;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_top";
      anchor.rel = "noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => {
        try {
          window.open(url, "_blank", "noopener,noreferrer");
        } catch {
          window.location.href = url;
        }
      }, 700);
      topTarget.location.href = url;
      return;
    } catch {
      // Cross-origin top access denied — fall through to same-window redirect.
    }
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
        return;
      }
    } catch {
      // Cross-origin top access denied — fall through to same-window redirect.
    }
    window.location.href = url;
  };


  const handleConnectMeta = async () => {
    setConnecting("meta");
    try {
      const res = await startMeta();
      redirectToOAuth(res.url);
    } catch (e) {
      console.error(e);
      setConnecting(null);
    }
  };

  const handleConnectGoogle = async () => {
    setConnecting("google");
    try {
      const res = await startGoogle({ data: { clientId } });
      redirectToOAuth(res.url);
    } catch (e) {
      console.error(e);
      setConnecting(null);
      alert("Não foi possível iniciar a conexão com o Google. Verifique as credenciais.");
    }
  };

  const handleAssign = async (adAccountId: string, cId: string | null) => {
    setBusy(adAccountId);
    try {
      await assign({ data: { adAccountId, clientId: cId } });
      await qc.invalidateQueries({ queryKey: ["ad-accounts"] });
      await qc.invalidateQueries({ queryKey: ["clients-with-accounts"] });
      router.invalidate();
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async (conn: { id: string; platform: string } | undefined, label: string) => {
    if (!conn) return;
    if (!confirm(`Desconectar ${label}? Todas as contas associadas serão desvinculadas dos clientes.`)) return;
    setBusy(conn.id);
    try {
      await disconnect({ data: { connectionId: conn.id } });
      await qc.invalidateQueries({ queryKey: ["ad-connections"] });
      await qc.invalidateQueries({ queryKey: ["ad-accounts"] });
      router.invalidate();
    } finally {
      setBusy(null);
    }
  };

  const metaStatus: "connected" | "disconnected" = metaConn ? "connected" : "disconnected";

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Integrações do cliente</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte as plataformas de anúncio e analytics deste cliente. Cada cliente tem suas próprias conexões.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* Meta Ads */}
        <IntegrationCard
          platform="meta"
          status={metaStatus}
          description="Facebook, Instagram, Messenger e WhatsApp."
          meta={
            metaConn && (
              <div className="space-y-1">
                <p className="text-xs">
                  <span className="text-muted-foreground">Conta OAuth:</span>{" "}
                  <span className="text-foreground">{metaConn.display_name ?? "Meta"}</span>
                </p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Contas vinculadas:</span>{" "}
                  <span className="text-foreground">{clientMetaAccounts.length}</span>
                </p>
                {clientMetaAccounts.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {clientMetaAccounts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-xs">
                        <span className="min-w-0 truncate text-foreground">{a.account_name}</span>
                        <button
                          onClick={() => handleAssign(a.id, null)}
                          disabled={busy === a.id}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Desvincular"
                        >
                          {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          }
          actions={
            !metaConn ? (
              <button
                onClick={handleConnectMeta}
                disabled={connecting === "meta"}
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {connecting === "meta" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Conectar
              </button>
            ) : (
              <>
                {availableMetaAccounts.length > 0 && (
                  <select
                    onChange={(e) => e.target.value && handleAssign(e.target.value, clientId)}
                    defaultValue=""
                    disabled={busy !== null}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">+ Vincular conta…</option>
                    {availableMetaAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleConnectMeta}
                  disabled={connecting === "meta"}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
                >
                  Reconectar
                </button>
                <button
                  onClick={() => handleDisconnect(metaConn, "Meta Ads")}
                  disabled={busy === metaConn.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
                >
                  Desconectar
                </button>
              </>
            )
          }
        />

        {/* Google Ads */}
        <IntegrationCard
          platform="google"
          status={googleConn ? "connected" : "disconnected"}
          description="Search, Display, YouTube e Performance Max."
          meta={
            googleConn && (
              <div className="space-y-1">
                <p className="text-xs">
                  <span className="text-muted-foreground">Conta OAuth:</span>{" "}
                  <span className="text-foreground">{googleConn.display_name ?? "Google"}</span>
                </p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Contas vinculadas:</span>{" "}
                  <span className="text-foreground">{clientGoogleAccounts.length}</span>
                </p>
                {clientGoogleAccounts.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {clientGoogleAccounts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-xs">
                        <span className="min-w-0 truncate text-foreground">{a.account_name}</span>
                        <button
                          onClick={() => handleAssign(a.id, null)}
                          disabled={busy === a.id}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Desvincular"
                        >
                          {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          }
          actions={
            !googleConn ? (
              <button
                onClick={handleConnectGoogle}
                disabled={connecting === "google"}
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {connecting === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Conectar
              </button>
            ) : (
              <>
                {availableGoogleAccounts.length > 0 && (
                  <select
                    onChange={(e) => e.target.value && handleAssign(e.target.value, clientId)}
                    defaultValue=""
                    disabled={busy !== null}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">+ Vincular conta…</option>
                    {availableGoogleAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleConnectGoogle}
                  disabled={connecting === "google"}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
                >
                  Reconectar
                </button>
                <button
                  onClick={() => handleDisconnect(googleConn, "Google Ads")}
                  disabled={busy === googleConn.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
                >
                  Desconectar
                </button>
              </>
            )
          }
        />

        {/* Instagram orgânico (via Meta) */}
        <IntegrationCard
          platform="instagram"
          status={metaConn ? "connected" : "disconnected"}
          description="Seguidores, alcance, visitas ao perfil e engajamento orgânico."
          meta={
            metaConn ? (
              <div className="space-y-1">
                <p className="text-xs">
                  <span className="text-muted-foreground">Perfis vinculados:</span>{" "}
                  <span className="text-foreground">{clientIgAccounts.length}</span>
                </p>
                {clientIgAccounts.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {clientIgAccounts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-xs">
                        <span className="min-w-0 truncate text-foreground">{a.account_name}</span>
                        <button
                          onClick={() => handleAssign(a.id, null)}
                          disabled={busy === a.id}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Desvincular"
                        >
                          {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {igMessage && <p className="mt-2 text-xs text-muted-foreground">{igMessage}</p>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Conecte o Meta Ads para habilitar. O perfil precisa ser Business/Criador e estar
                vinculado a uma Página do Facebook.
              </p>
            )
          }
          actions={
            !metaConn ? (
              <button
                onClick={handleConnectMeta}
                disabled={connecting === "meta"}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
              >
                Conectar via Meta
              </button>
            ) : (
              <>
                {availableIgAccounts.length > 0 && (
                  <select
                    onChange={(e) => e.target.value && handleAssign(e.target.value, clientId)}
                    defaultValue=""
                    disabled={busy !== null}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">+ Vincular perfil…</option>
                    {availableIgAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleSyncInstagram}
                  disabled={busy === "ig-sync"}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
                >
                  {busy === "ig-sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Buscar perfis
                </button>
              </>
            )
          }
        />

        {/* Facebook (via Meta) */}
        <IntegrationCard
          platform="facebook"
          status={metaConn ? "connected" : "disconnected"}
          description="Página, publicações e alcance orgânico."
          meta={
            metaConn ? (
              <p className="text-xs text-muted-foreground">Habilitado pela conexão do Meta.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Conecte o Meta Ads para habilitar.</p>
            )
          }
          actions={
            !metaConn ? (
              <button
                onClick={handleConnectMeta}
                disabled={connecting === "meta"}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
              >
                Conectar via Meta
              </button>
            ) : null
          }
        />

        {/* Google Analytics 4 */}
        <IntegrationCard
          platform="ga4"
          status={ga4Conn ? "connected" : "disconnected"}
          description="Sessões, usuários, canais de tráfego e conversões."
          meta={
            ga4Conn && (
              <div className="space-y-1">
                <p className="text-xs">
                  <span className="text-muted-foreground">Conta OAuth:</span>{" "}
                  <span className="text-foreground">{ga4Conn.display_name ?? "Google Analytics"}</span>
                </p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Propriedades vinculadas:</span>{" "}
                  <span className="text-foreground">{clientGa4Accounts.length}</span>
                </p>
                {clientGa4Accounts.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {clientGa4Accounts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-xs">
                        <span className="min-w-0 truncate text-foreground">{a.account_name}</span>
                        <button
                          onClick={() => handleAssign(a.id, null)}
                          disabled={busy === a.id}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Desvincular"
                        >
                          {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          }
          actions={
            !ga4Conn ? (
              <button
                onClick={handleConnectGa4}
                disabled={connecting === "ga4"}
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {connecting === "ga4" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Conectar
              </button>
            ) : (
              <>
                {availableGa4Accounts.length > 0 && (
                  <select
                    onChange={(e) => e.target.value && handleAssign(e.target.value, clientId)}
                    defaultValue=""
                    disabled={busy !== null}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">+ Vincular propriedade…</option>
                    {availableGa4Accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleConnectGa4}
                  disabled={connecting === "ga4"}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
                >
                  Reconectar
                </button>
                <button
                  onClick={() => handleDisconnect(ga4Conn, "Google Analytics")}
                  disabled={busy === ga4Conn.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
                >
                  Desconectar
                </button>
              </>
            )
          }
        />

        {/* GTM / Search Console / TikTok — placeholders */}
        {(
          [
            { p: "gtm", desc: "Contêineres, tags e triggers." },
            { p: "searchconsole", desc: "Impressões, cliques e posição no Google." },
            { p: "tiktok", desc: "Campanhas e criativos do TikTok Ads." },
          ] as { p: PlatformKey; desc: string }[]
        ).map(({ p, desc }) => (
          <IntegrationCard
            key={p}
            platform={p}
            status="coming_soon"
            description={desc}
            actions={
              <button
                disabled
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm font-medium text-muted-foreground"
              >
                Conectar
              </button>
            }
          />
        ))}

      </div>
    </div>
  );
}

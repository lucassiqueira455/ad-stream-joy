import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listAdAccounts, listConnections } from "@/lib/ads-connections.functions";
import { initialsFromName } from "@/lib/mock-data";
import { PlatformChip, type PlatformKey } from "./platform-chip";
import { RefreshCcw, Loader2, Clock, Coins, Globe2 } from "lucide-react";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Image as ImageIcon,
  Plug,
  Settings2,
} from "lucide-react";

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
      return data;
    },
  });

const connectionsQuery = queryOptions({
  queryKey: ["ad-connections"],
  queryFn: () => listConnections(),
});

const adAccountsQuery = queryOptions({
  queryKey: ["ad-accounts"],
  queryFn: () => listAdAccounts(),
});

const TAB_ORDER: {
  key: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { key: "dashboard",    label: "Dashboard",     to: "",              icon: LayoutDashboard },
  { key: "reports",      label: "Relatórios",    to: "/reports",      icon: FileText },
  { key: "campaigns",    label: "Campanhas",     to: "/campaigns",    icon: Megaphone },
  { key: "creatives",    label: "Criativos",     to: "/creatives",    icon: ImageIcon },
  { key: "integrations", label: "Integrações",   to: "/integrations", icon: Plug },
  { key: "settings",     label: "Configurações", to: "/settings",     icon: Settings2 },
];

const PLATFORM_ORDER: PlatformKey[] = [
  "meta",
  "instagram",
  "facebook",
  "google",
  "ga4",
  "gtm",
  "searchconsole",
  "tiktok",
];

export function ClientHeader({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: connections = [] } = useQuery(connectionsQuery);
  const { data: accounts = [] } = useQuery(adAccountsQuery);
  const [refreshing, setRefreshing] = useState(false);

  const clientAccounts = accounts.filter((a) => a.client_id === clientId);
  const hasMeta = clientAccounts.some((a) => a.platform === "meta");
  const hasGoogle = clientAccounts.some((a) => a.platform === "google");

  const connectedMap: Record<PlatformKey, boolean> = {
    meta: hasMeta,
    instagram: hasMeta, // Meta connection provides IG data
    facebook: hasMeta,
    google: hasGoogle,
    ga4: false,
    gtm: false,
    searchconsole: false,
    tiktok: false,
  };

  const metaConn = connections.find((c) => c.platform === "meta");
  const lastSync = metaConn?.created_at ? new Date(metaConn.created_at) : null;
  const currency = clientAccounts.find((a) => a.currency)?.currency ?? "BRL";

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["client-dashboard", clientId] }),
      qc.invalidateQueries({ queryKey: ["client-metrics", clientId] }),
      qc.invalidateQueries({ queryKey: ["ad-accounts"] }),
      qc.invalidateQueries({ queryKey: ["ad-connections"] }),
    ]);
    setTimeout(() => setRefreshing(false), 400);
  };

  if (!client) return null;

  return (
    <div className="border-b border-border/60 bg-background/40 px-6 pb-0 pt-8 backdrop-blur-sm md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 lg:flex lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-semibold text-background shadow-elevated"
              style={{ backgroundColor: client.brand_color }}
            >
              {client.logo ?? initialsFromName(client.name)}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Cliente
              </p>
              <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                {client.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {lastSync && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Sincronizado {lastSync.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {currency}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-card hover:border-primary/40 hover:bg-accent/40 disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
            ) : (
              <RefreshCcw className="h-4 w-4" strokeWidth={1.8} />
            )}
            Atualizar dados
          </button>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {PLATFORM_ORDER.map((p) => (
            <PlatformChip key={p} platform={p} connected={connectedMap[p]} />
          ))}
        </div>

        <ClientTabs clientId={clientId} />
      </div>
    </div>
  );
}

function ClientTabs({ clientId }: { clientId: string }) {
  const { location } = useRouterState();
  const base = `/app/clients/${clientId}`;
  return (
    <nav className="mt-8 -mb-px flex gap-1 overflow-x-auto">
      {TAB_ORDER.map((t) => {
        const href = `${base}${t.to}`;
        const active =
          t.to === ""
            ? location.pathname === base || location.pathname === `${base}/`
            : location.pathname === href || location.pathname.startsWith(`${href}/`);
        return (
          <Link
            key={t.key}
            to={href}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-t-xl border-b-2 px-4 py-3 text-sm font-medium ${
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" strokeWidth={1.8} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

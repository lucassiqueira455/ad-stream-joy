// Aggregates organic/analytics data for a client. Server-only.
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "./crypto.server";
import { fetchInstagramInsights, type IgInsights } from "./instagram.server";
import { fetchGa4Metrics, type Ga4Metrics } from "./ga4.server";
import { getFreshGoogleToken } from "./google-ads.server";

export interface OrganicResult {
  instagram: {
    connected: boolean;
    accounts: Array<{ id: string; name: string }>;
    insights: IgInsights[];
    errors: string[];
  };
  ga4: {
    connected: boolean;
    properties: Array<{ id: string; name: string }>;
    metrics: Ga4Metrics[];
    errors: string[];
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeOrganicMetrics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  clientId: string,
  datePreset: string,
): Promise<OrganicResult> {
  const { data: accounts } = await supabase
    .from("ad_accounts")
    .select("id, platform, external_account_id, account_name, connection_id")
    .eq("client_id", clientId)
    .in("platform", ["instagram", "ga4"]);

  const rows = accounts ?? [];
  const igRows = rows.filter((a) => a.platform === "instagram");
  const gaRows = rows.filter((a) => a.platform === "ga4");

  const { data: conns } = await supabase
    .from("ad_platform_connections")
    .select("id, platform, access_token_encrypted")
    .in("platform", ["meta", "ga4"]);
  const tokenMap = new Map<string, string>(
    (conns ?? []).map((c) => [c.id, decryptToken(c.access_token_encrypted)]),
  );

  const igErrors: string[] = [];
  const igInsights: IgInsights[] = [];
  await Promise.all(
    igRows.map(async (a) => {
      const token = tokenMap.get(a.connection_id);
      if (!token) {
        igErrors.push(`${a.account_name}: conexão Meta não encontrada`);
        return;
      }
      try {
        igInsights.push(
          await fetchInstagramInsights({ token, igId: a.external_account_id, datePreset }),
        );
      } catch (e) {
        igErrors.push(`${a.account_name}: ${e instanceof Error ? e.message : "Erro"}`);
      }
    }),
  );

  const gaErrors: string[] = [];
  const gaMetrics: Ga4Metrics[] = [];
  await Promise.all(
    gaRows.map(async (a) => {
      try {
        const accessToken = await getFreshGoogleToken(supabase, a.connection_id);
        if (!accessToken) {
          gaErrors.push(`${a.account_name}: token não encontrado`);
          return;
        }
        gaMetrics.push(
          await fetchGa4Metrics({ accessToken, propertyId: a.external_account_id, datePreset }),
        );
      } catch (e) {
        gaErrors.push(`${a.account_name}: ${e instanceof Error ? e.message : "Erro"}`);
      }
    }),
  );

  return {
    instagram: {
      connected: (conns ?? []).some((c) => c.platform === "meta"),
      accounts: igRows.map((a) => ({ id: a.id, name: a.account_name })),
      insights: igInsights,
      errors: igErrors,
    },
    ga4: {
      connected: (conns ?? []).some((c) => c.platform === "ga4"),
      properties: gaRows.map((a) => ({ id: a.id, name: a.account_name })),
      metrics: gaMetrics,
      errors: gaErrors,
    },
  };
}

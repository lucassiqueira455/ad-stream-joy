import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DATE_PRESET = z.enum([
  "today", "yesterday", "last_3d", "last_7d", "last_14d", "last_28d",
  "last_30d", "last_90d", "this_month", "last_month",
]);

/** Starts the GA4 OAuth flow (separate scope from Google Ads). */
export const startGa4OAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clientId: z.string().uuid().optional() }).optional().parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getRequestOrigin } = await import("./request-origin.server");
    const { buildGa4AuthUrl } = await import("./ga4.server");
    const { signState } = await import("./crypto.server");
    const redirectUri = `${getRequestOrigin()}/api/auth/ga4/callback`;
    const state = signState({
      uid: context.userId,
      redirectUri,
      platform: "ga4",
      clientId: data?.clientId,
    });
    return { url: buildGa4AuthUrl({ redirectUri, state }) };
  });

/** Re-imports Instagram business accounts using the existing Meta connection. */
export const syncInstagramAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { decryptToken } = await import("./crypto.server");
    const { fetchInstagramAccounts } = await import("./instagram.server");
    const { data: conn } = await context.supabase
      .from("ad_platform_connections")
      .select("id, access_token_encrypted")
      .eq("platform", "meta")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conn) return { ok: false, count: 0, error: "Conecte o Meta Ads primeiro." };
    try {
      const token = decryptToken(conn.access_token_encrypted);
      const igs = await fetchInstagramAccounts(token);
      if (igs.length > 0) {
        const rows = igs.map((ig) => ({
          user_id: context.userId,
          connection_id: conn.id,
          platform: "instagram" as const,
          external_account_id: ig.igId,
          account_name: `@${ig.username}`,
          status: "ACTIVE",
        }));
        const { error } = await context.supabase
          .from("ad_accounts")
          .upsert(rows, { onConflict: "connection_id,external_account_id" });
        if (error) throw error;
      }
      return { ok: true, count: igs.length, error: null };
    } catch (e) {
      return { ok: false, count: 0, error: e instanceof Error ? e.message : "Erro" };
    }
  });

/** Organic + analytics metrics for a client (Instagram orgânico + GA4). */
export const getOrganicMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      clientId: z.string().uuid(),
      datePreset: DATE_PRESET.default("last_30d"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { computeOrganicMetrics } = await import("./organic.server");
    return computeOrganicMetrics(context.supabase, data.clientId, data.datePreset);
  });

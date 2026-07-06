import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");

        const backTo = "/app/settings";

        if (errorParam) {
          return redirectWith(backTo, { meta: "denied" });
        }
        if (!code || !state) {
          return redirectWith(backTo, { meta: "missing_params" });
        }

        try {
          const { verifyState, encryptToken } = await import("@/lib/crypto.server");
          const {
            exchangeCodeForToken,
            exchangeForLongLivedToken,
            fetchMetaMe,
            fetchMetaAdAccounts,
            metaStatusLabel,
          } = await import("@/lib/meta.server");

          const payload = verifyState<{ uid: string; redirectUri: string }>(state);

          const shortLived = await exchangeCodeForToken({
            code,
            redirectUri: payload.redirectUri,
          });
          const longLived = await exchangeForLongLivedToken(shortLived.access_token);

          const me = await fetchMetaMe(longLived.access_token);
          const accounts = await fetchMetaAdAccounts(longLived.access_token);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const expiresAt = longLived.expires_in
            ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
            : null;

          const { data: connection, error: connErr } = await supabaseAdmin
            .from("ad_platform_connections")
            .insert({
              user_id: payload.uid,
              platform: "meta",
              external_user_id: me.id,
              display_name: me.name,
              access_token_encrypted: encryptToken(longLived.access_token),
              expires_at: expiresAt,
              scopes: ["ads_read", "business_management"],
            })
            .select("id")
            .single();

          if (connErr || !connection) {
            console.error("Insert connection failed", connErr);
            return redirectWith(backTo, { meta: "db_error" });
          }

          if (accounts.length > 0) {
            const rows = accounts.map((a) => ({
              user_id: payload.uid,
              connection_id: connection.id,
              platform: "meta" as const,
              external_account_id: a.account_id,
              account_name: a.name,
              currency: a.currency ?? null,
              timezone: a.timezone_name ?? null,
              status: metaStatusLabel(a.account_status),
            }));
            const { error: accErr } = await supabaseAdmin
              .from("ad_accounts")
              .upsert(rows, { onConflict: "connection_id,external_account_id" });
            if (accErr) console.error("Upsert ad_accounts failed", accErr);
          }

          return redirectWith(backTo, { meta: "connected", count: String(accounts.length) });
        } catch (e) {
          console.error("Meta callback error", e);
          return redirectWith(backTo, { meta: "error" });
        }
      },
    },
  },
});

function redirectWith(path: string, params: Record<string, string>): Response {
  const qs = new URLSearchParams(params).toString();
  return new Response(null, {
    status: 302,
    headers: { Location: `${path}?${qs}` },
  });
}

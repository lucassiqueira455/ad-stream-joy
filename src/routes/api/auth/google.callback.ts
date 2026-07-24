import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");

        const backTo = "/app/clients";

        if (errorParam) return redirectWith(backTo, { google: "denied" });
        if (!code || !state) return redirectWith(backTo, { google: "missing_params" });

        try {
          const { verifyState, encryptToken } = await import("@/lib/crypto.server");
          const {
            exchangeGoogleCode,
            fetchGoogleUserInfo,
            fetchAllAccessibleCustomerDetails,
            googleStatusLabel,
          } = await import("@/lib/google.server");

          const payload = verifyState<{ uid: string; redirectUri: string; clientId?: string }>(state);

          const token = await exchangeGoogleCode({
            code,
            redirectUri: payload.redirectUri,
          });

          const me = await fetchGoogleUserInfo(token.access_token);
          const customers = await fetchAllAccessibleCustomerDetails(token.access_token).catch((e) => {
            console.error("Google Ads listAccessible failed", e);
            return [];
          });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const expiresAt = token.expires_in
            ? new Date(Date.now() + token.expires_in * 1000).toISOString()
            : null;

          const { data: connection, error: connErr } = await supabaseAdmin
            .from("ad_platform_connections")
            .insert({
              user_id: payload.uid,
              platform: "google",
              external_user_id: me.sub,
              display_name: me.email ?? me.name ?? "Google Ads",
              access_token_encrypted: encryptToken(token.access_token),
              refresh_token_encrypted: token.refresh_token ? encryptToken(token.refresh_token) : null,
              expires_at: expiresAt,
              scopes: ["adwords"],
            })
            .select("id")
            .single();

          if (connErr || !connection) {
            console.error("Insert google connection failed", connErr);
            return redirectWith(backTo, { google: "db_error" });
          }

          if (customers.length > 0) {
            const rows = customers.map((c) => ({
              user_id: payload.uid,
              connection_id: connection.id,
              platform: "google" as const,
              external_account_id: c.id,
              account_name: c.descriptiveName ?? `Google Ads ${c.id}`,
              currency: c.currencyCode ?? null,
              timezone: c.timeZone ?? null,
              status: googleStatusLabel(c.status),
            }));
            const { error: accErr } = await supabaseAdmin
              .from("ad_accounts")
              .upsert(rows, { onConflict: "connection_id,external_account_id" });
            if (accErr) console.error("Upsert google ad_accounts failed", accErr);
          }

          return redirectWith(backTo, { google: "connected", count: String(customers.length) });
        } catch (e) {
          console.error("Google callback error", e);
          return redirectWith(backTo, { google: "error" });
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

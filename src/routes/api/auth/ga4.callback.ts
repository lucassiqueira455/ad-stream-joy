import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/ga4/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");
        const defaultBackTo = "/app/clients";

        if (errorParam) return redirectWith(defaultBackTo, { ga4: "denied" });
        if (!code || !state) return redirectWith(defaultBackTo, { ga4: "missing_params" });

        try {
          const { verifyState, encryptToken } = await import("@/lib/crypto.server");
          const { exchangeGoogleCode, fetchGoogleUserInfo } = await import("@/lib/google.server");
          const { listGa4Properties } = await import("@/lib/ga4.server");

          const payload = verifyState<{ uid: string; redirectUri: string; clientId?: string }>(state);
          const backTo = payload.clientId
            ? `/app/clients/${payload.clientId}/integrations`
            : defaultBackTo;

          const token = await exchangeGoogleCode({ code, redirectUri: payload.redirectUri });
          const me = await fetchGoogleUserInfo(token.access_token);

          let importError: string | null = null;
          const properties = await listGa4Properties(token.access_token).catch((e) => {
            console.error("GA4 property list failed", e);
            importError = e instanceof Error ? e.message : String(e);
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
              platform: "ga4",
              external_user_id: me.sub,
              display_name: me.email ?? me.name ?? "Google Analytics",
              access_token_encrypted: encryptToken(token.access_token),
              refresh_token_encrypted: token.refresh_token ? encryptToken(token.refresh_token) : null,
              expires_at: expiresAt,
              scopes: ["analytics.readonly"],
            })
            .select("id")
            .single();

          if (connErr || !connection) {
            console.error("Insert ga4 connection failed", connErr);
            return redirectWith(backTo, { ga4: "db_error" });
          }

          if (properties.length > 0) {
            const rows = properties.map((p) => ({
              user_id: payload.uid,
              connection_id: connection.id,
              platform: "ga4" as const,
              external_account_id: p.propertyId,
              account_name: `${p.displayName} (${p.accountName})`,
              status: "ACTIVE",
            }));
            const { error: accErr } = await supabaseAdmin
              .from("ad_accounts")
              .upsert(rows, { onConflict: "connection_id,external_account_id" });
            if (accErr) console.error("Upsert ga4 properties failed", accErr);
          }

          return redirectWith(backTo, {
            ga4: importError ? "import_error" : "connected",
            count: String(properties.length),
            ...(importError ? { msg: (importError as string).slice(0, 200) } : {}),
          });
        } catch (e) {
          console.error("GA4 callback error", e);
          return redirectWith(defaultBackTo, { ga4: "error" });
        }
      },
    },
  },
});

function redirectWith(path: string, params: Record<string, string>): Response {
  const qs = new URLSearchParams(params).toString();
  return new Response(null, { status: 302, headers: { Location: `${path}?${qs}` } });
}

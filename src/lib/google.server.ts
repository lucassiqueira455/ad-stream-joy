// Google Ads API helpers. Server-only.
// Uses OAuth2 (offline access) + Google Ads API listAccessibleCustomers.

export const GOOGLE_ADS_SCOPES = ["https://www.googleapis.com/auth/adwords"];
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v18";

export function buildGoogleAuthUrl(params: { redirectUri: string; state: string }): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_ADS_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

export async function exchangeGoogleCode(params: {
  code: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const body = new URLSearchParams({
    code: params.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json();
}

export interface GoogleUserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    // userinfo requires openid/email scope. Fall back to a synthetic identity.
    return { sub: "google", name: "Google Ads" };
  }
  return res.json();
}

function adsHeaders(accessToken: string, loginCustomerId?: string): Record<string, string> {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!devToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN is not configured");
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": devToken,
    "Content-Type": "application/json",
  };
  if (loginCustomerId) h["login-customer-id"] = loginCustomerId.replace(/-/g, "");
  return h;
}

export interface GoogleAdsCustomer {
  id: string; // customer id, digits only
  descriptiveName?: string;
  currencyCode?: string;
  timeZone?: string;
  manager?: boolean;
  testAccount?: boolean;
  status?: string;
}

export async function listAccessibleCustomers(accessToken: string): Promise<string[]> {
  const res = await fetch(`${GOOGLE_ADS_API}/customers:listAccessibleCustomers`, {
    headers: adsHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`Google Ads listAccessibleCustomers failed: ${await res.text()}`);
  const json = (await res.json()) as { resourceNames?: string[] };
  return (json.resourceNames ?? []).map((r) => r.split("/")[1]).filter(Boolean);
}

// Fetch account details via GoogleAdsService.search for a single customer.
export async function fetchCustomerDetails(
  accessToken: string,
  customerId: string,
  loginCustomerId?: string,
): Promise<GoogleAdsCustomer | null> {
  const query = `
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone,
      customer.manager,
      customer.test_account,
      customer.status
    FROM customer
    LIMIT 1
  `;
  const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: adsHeaders(accessToken, loginCustomerId ?? customerId),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    console.error(`fetchCustomerDetails ${customerId} failed`, await res.text());
    return null;
  }
  const json = (await res.json()) as {
    results?: Array<{ customer?: {
      id?: string;
      descriptiveName?: string;
      currencyCode?: string;
      timeZone?: string;
      manager?: boolean;
      testAccount?: boolean;
      status?: string;
    } }>;
  };
  const c = json.results?.[0]?.customer;
  if (!c?.id) return null;
  return {
    id: String(c.id),
    descriptiveName: c.descriptiveName,
    currencyCode: c.currencyCode,
    timeZone: c.timeZone,
    manager: c.manager,
    testAccount: c.testAccount,
    status: c.status,
  };
}

export async function fetchAllAccessibleCustomerDetails(
  accessToken: string,
): Promise<GoogleAdsCustomer[]> {
  const ids = await listAccessibleCustomers(accessToken);
  const results = await Promise.all(
    ids.map((id) => fetchCustomerDetails(accessToken, id).catch(() => null)),
  );
  return results.filter((c): c is GoogleAdsCustomer => c !== null);
}

export function googleStatusLabel(status: string | undefined): string {
  if (!status) return "unknown";
  return status.toLowerCase();
}

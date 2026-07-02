// Temporary client-side auth for Etapa 1. Replaced by Lovable Cloud auth in
// Etapa 2 when we wire Meta OAuth.

const KEY = "traffic_reports_mock_user";

export type MockUser = { email: string; name: string };

export function getMockUser(): MockUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as MockUser) : null;
}

export function signInMock(email: string) {
  const name = email.split("@")[0].replace(/[._-]/g, " ");
  const user: MockUser = { email, name };
  window.localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

export function signOutMock() {
  window.localStorage.removeItem(KEY);
}

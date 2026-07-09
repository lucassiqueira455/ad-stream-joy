// Formatting helpers used across the app. Client data now comes from Supabase.

export type Platform = "meta" | "google";

export const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const num = (n: number) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export const pct = (n: number) => `${n.toFixed(2)}%`;

export const CLIENT_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "??";
}

import type { ReactNode } from "react";

export type PlatformKey =
  | "meta"
  | "instagram"
  | "facebook"
  | "google"
  | "ga4"
  | "gtm"
  | "searchconsole"
  | "tiktok";

export const PLATFORMS: Record<
  PlatformKey,
  { label: string; short: string; colorVar: string; initials: string }
> = {
  meta:          { label: "Meta Ads",       short: "Meta",  colorVar: "var(--color-platform-meta)",          initials: "M"  },
  instagram:     { label: "Instagram",      short: "IG",    colorVar: "var(--color-platform-instagram)",     initials: "IG" },
  facebook:      { label: "Facebook",       short: "FB",    colorVar: "var(--color-platform-facebook)",      initials: "f"  },
  google:        { label: "Google Ads",     short: "Ads",   colorVar: "var(--color-platform-google)",        initials: "G"  },
  ga4:           { label: "Google Analytics", short: "GA4", colorVar: "var(--color-platform-ga4)",           initials: "GA" },
  gtm:           { label: "Tag Manager",    short: "GTM",   colorVar: "var(--color-platform-gtm)",           initials: "GT" },
  searchconsole: { label: "Search Console", short: "GSC",   colorVar: "var(--color-platform-searchconsole)", initials: "SC" },
  tiktok:        { label: "TikTok Ads",     short: "TT",    colorVar: "var(--color-platform-tiktok)",        initials: "TT" },
};

export function PlatformDot({ platform, connected }: { platform: PlatformKey; connected: boolean }) {
  const p = PLATFORMS[platform];
  return (
    <span
      title={`${p.label}${connected ? " — conectado" : " — não conectado"}`}
      aria-label={p.label}
      className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-semibold text-white/90"
      style={{
        backgroundColor: connected ? p.colorVar : "oklch(1 0 0 / 0.08)",
        color: connected ? "white" : "oklch(1 0 0 / 0.35)",
      }}
    >
      {p.initials}
    </span>
  );
}

export function PlatformChip({
  platform,
  connected,
  children,
}: {
  platform: PlatformKey;
  connected: boolean;
  children?: ReactNode;
}) {
  const p = PLATFORMS[platform];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
      style={{
        borderColor: connected ? "oklch(1 0 0 / 0.08)" : "oklch(1 0 0 / 0.05)",
        color: connected ? "oklch(0.96 0.005 260)" : "oklch(0.62 0.02 250)",
        backgroundColor: connected ? "oklch(1 0 0 / 0.02)" : "transparent",
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{
          backgroundColor: connected ? p.colorVar : "oklch(1 0 0 / 0.18)",
          boxShadow: connected ? `0 0 12px ${p.colorVar}` : "none",
        }}
      />
      {children ?? p.label}
    </span>
  );
}

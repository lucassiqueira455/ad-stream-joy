import { BrandIcon } from "@/components/brand-icon";
import { Layers } from "lucide-react";

export type PlatformFilter = "all" | "meta" | "google";

const ALL_OPTIONS: { value: PlatformFilter; label: string; brand?: "meta" | "google" }[] = [
  { value: "all", label: "Todas as plataformas" },
  { value: "meta", label: "Meta Ads", brand: "meta" },
  { value: "google", label: "Google Ads", brand: "google" },
];

export function PlatformSelector({
  value,
  onChange,
  connectedPlatforms,
}: {
  value: PlatformFilter;
  onChange: (v: PlatformFilter) => void;
  connectedPlatforms?: string[];
}) {
  const options = ALL_OPTIONS.filter(
    (o) => o.value === "all" || !connectedPlatforms || connectedPlatforms.includes(o.value),
  );
  if (options.length <= 1) return null;
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {o.brand ? (
              <BrandIcon platform={o.brand} className="h-4 w-4 rounded-[4px]" />
            ) : (
              <Layers className="h-3.5 w-3.5" />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

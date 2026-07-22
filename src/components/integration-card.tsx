import type { ReactNode } from "react";
import { PLATFORMS, type PlatformKey } from "./platform-chip";

export function IntegrationCard({
  platform,
  status,
  description,
  meta,
  actions,
}: {
  platform: PlatformKey;
  status: "connected" | "disconnected" | "coming_soon";
  description?: string;
  meta?: ReactNode;
  actions: ReactNode;
}) {
  const p = PLATFORMS[platform];
  const isConnected = status === "connected";
  const isComing = status === "coming_soon";

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-elevated">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-2xl opacity-80"
        style={{ backgroundColor: p.colorVar }}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: p.colorVar }}
          >
            {p.initials}
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight">{p.label}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isConnected
              ? "bg-success/10 text-success"
              : isComing
                ? "bg-muted text-muted-foreground"
                : "bg-muted/50 text-muted-foreground"
          }`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: isConnected ? "currentColor" : "oklch(1 0 0 / 0.2)" }}
          />
          {isConnected ? "Conectado" : isComing ? "Em breve" : "Não conectado"}
        </span>
      </div>

      {meta && <div className="mt-5 text-sm text-muted-foreground">{meta}</div>}

      <div className="mt-6 flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

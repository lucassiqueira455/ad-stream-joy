import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  icon: LucideIcon;
  hint?: string;
  accent?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-[0_1px_2px_0_rgb(0_0_0/0.04),0_4px_16px_-2px_rgb(0_0_0/0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </p>
          </div>
          <p className="font-display text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </div>
      {delta !== undefined ? (
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium">
          {positive ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-success" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className={positive ? "text-success" : "text-destructive"}>
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs. período anterior</span>
        </div>
      ) : null}
    </div>
  );
}

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
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {delta !== undefined ? (
        <div
          className={`mt-4 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            positive
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {positive ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {Math.abs(delta).toFixed(1)}% vs. período anterior
        </div>
      ) : null}
    </div>
  );
}

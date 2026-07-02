import { BarChart3 } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary text-primary-foreground shadow-glow">
        <BarChart3 className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <span className="font-display text-lg font-semibold tracking-tight">
        Tráfego<span className="text-gradient">Lab</span>
      </span>
    </div>
  );
}

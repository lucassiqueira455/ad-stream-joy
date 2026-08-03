import { useEffect, useState } from "react";

export const DATE_OPTIONS: { value: string; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_3d", label: "Últimos 3 dias" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_28d", label: "Últimos 28 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "last_90d", label: "Últimos 90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
];

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseCustom(value: string): { since: string; until: string } | null {
  if (!value.startsWith("custom:")) return null;
  const [, since, until] = value.split(":");
  if (!since || !until) return null;
  return { since, until };
}

export function periodLabel(value: string): string {
  const custom = parseCustom(value);
  if (custom) {
    const fmt = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("pt-BR");
    return `${fmt(custom.since)} – ${fmt(custom.until)}`;
  }
  return DATE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Preset select + optional custom range (custom:YYYY-MM-DD:YYYY-MM-DD). */
export function DateRangeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const custom = parseCustom(value);
  const [since, setSince] = useState(custom?.since ?? ymd(new Date(Date.now() - 7 * 86400_000)));
  const [until, setUntil] = useState(custom?.until ?? ymd(new Date()));

  useEffect(() => {
    const c = parseCustom(value);
    if (c) {
      setSince(c.since);
      setUntil(c.until);
    }
  }, [value]);

  const inputClass =
    "rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={custom ? "custom" : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "custom") onChange(`custom:${since}:${until}`);
          else onChange(v);
        }}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      >
        {DATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        <option value="custom">Período personalizado</option>
      </select>

      {custom && (
        <div className="flex flex-wrap items-center gap-1">
          <input
            type="date"
            value={since}
            max={until}
            onChange={(e) => {
              setSince(e.target.value);
              if (e.target.value) onChange(`custom:${e.target.value}:${until}`);
            }}
            className={inputClass}
          />
          <span className="text-sm text-muted-foreground">até</span>
          <input
            type="date"
            value={until}
            min={since}
            onChange={(e) => {
              setUntil(e.target.value);
              if (e.target.value) onChange(`custom:${since}:${e.target.value}`);
            }}
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}

export function LastSync({ at, fetching }: { at: number | undefined; fetching: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  if (fetching) return <span className="text-sm text-muted-foreground">Sincronizando…</span>;
  if (!at) return null;
  const mins = Math.floor((Date.now() - at) / 60_000);
  const text =
    mins < 1 ? "agora mesmo" : mins === 1 ? "há 1 minuto" : mins < 60 ? `há ${mins} minutos` : `há ${Math.floor(mins / 60)}h`;
  return <span className="text-sm text-muted-foreground">Última sincronização {text}</span>;
}

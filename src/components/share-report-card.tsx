import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Link2, Loader2, RefreshCcw, Share2 } from "lucide-react";
import {
  createOrRegenerateShare,
  getClientShare,
  setShareActive,
  setShareAllowDateChange,
} from "@/lib/shares.functions";

type Kind = "report" | "dashboard";

function LinkRow({
  label,
  url,
  onRegenerate,
  regenerating,
}: {
  label: string;
  url: string;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-[240px] flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
        />
        <button
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
        >
          {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Regenerar
        </button>
      </div>
    </div>
  );
}

export function ShareReportCard({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const fetchShare = useServerFn(getClientShare);
  const regen = useServerFn(createOrRegenerateShare);
  const toggleActive = useServerFn(setShareActive);
  const toggleAllowDate = useServerFn(setShareAllowDateChange);

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const shareQuery = useQuery({
    queryKey: ["client-share", clientId],
    queryFn: () => fetchShare({ data: { clientId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["client-share", clientId] });

  const generateMutation = useMutation({
    mutationFn: (kind: Kind | "both") => regen({ data: { clientId, kind } }),
    onSuccess: invalidate,
  });
  const activeMutation = useMutation({
    mutationFn: (active: boolean) => toggleActive({ data: { clientId, active } }),
    onSuccess: invalidate,
  });
  const dateMutation = useMutation({
    mutationFn: (allow: boolean) => toggleAllowDate({ data: { clientId, allow } }),
    onSuccess: invalidate,
  });

  const share = shareQuery.data;
  const reportUrl = share?.token ? `${origin}/report/${share.token}` : "";
  const dashboardUrl = share?.dashboard_token ? `${origin}/dashboard/${share.dashboard_token}` : "";

  const regenerate = async (kind: Kind | "both") => {
    if (share && kind !== "both" && !confirm(`Regenerar o link de ${kind === "report" ? "Relatório" : "Dashboard"} vai invalidar o atual. Continuar?`)) return;
    await generateMutation.mutateAsync(kind);
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold">Compartilhamento</h2>
        {share && (
          <span
            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
              share.active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
            }`}
          >
            {share.active ? "Ativo" : "Inativo"}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Gere links públicos (somente leitura) para o cliente ver os dados sem fazer login.
      </p>

      {shareQuery.isLoading ? (
        <div className="mt-4 grid place-items-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !share ? (
        <div className="mt-4">
          <button
            onClick={() => regenerate("both")}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Gerar links de compartilhamento
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <LinkRow
            label="Link do Relatório"
            url={reportUrl}
            onRegenerate={() => regenerate("report")}
            regenerating={generateMutation.isPending && generateMutation.variables === "report"}
          />
          <LinkRow
            label="Link do Dashboard"
            url={dashboardUrl}
            onRegenerate={() => regenerate("dashboard")}
            regenerating={generateMutation.isPending && generateMutation.variables === "dashboard"}
          />

          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <button
              onClick={() => activeMutation.mutate(!share.active)}
              disabled={activeMutation.isPending}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-60 ${
                share.active
                  ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
                  : "border-border bg-background hover:bg-accent"
              }`}
            >
              {activeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {share.active ? "Desativar compartilhamento" : "Ativar compartilhamento"}
            </button>
            <p className="text-xs text-muted-foreground">
              O cliente pode alterar o período nos links e os dados atualizam em tempo real.
            </p>

        </div>
      )}
    </section>
  );
}

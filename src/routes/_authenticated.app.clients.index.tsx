import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronRight, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import { supabase } from "@/integrations/supabase/client";
import { CLIENT_COLORS, initialsFromName } from "@/lib/mock-data";

const clientsQuery = queryOptions({
  queryKey: ["clients-with-accounts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, brand_color, logo, ad_accounts(id, platform)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const Route = createFileRoute("/_authenticated/app/clients/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(clientsQuery),
  component: ClientsList,
});

function ClientsList() {
  const { data: clients } = useSuspenseQuery(clientsQuery);
  const [open, setOpen] = useState(false);

  const totalAccounts = clients.reduce(
    (n, c) => n + (c.ad_accounts?.length ?? 0),
    0,
  );

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Clientes
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Sua carteira</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length} cliente{clients.length === 1 ? "" : "s"} • {totalAccounts} conta{totalAccounts === 1 ? "" : "s"} vinculada{totalAccounts === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <Plus className="h-4 w-4" />
          Novo cliente
        </button>
      </header>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <p className="font-display text-lg font-semibold">
            Você ainda não tem clientes
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie seu primeiro cliente e vincule uma conta de anúncio importada.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Criar cliente
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => {
            const accounts = c.ad_accounts ?? [];
            return (
              <Link
                key={c.id}
                to="/app/clients/$clientId"
                params={{ clientId: c.id }}
                className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-card transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-11 w-11 place-items-center rounded-lg text-sm font-semibold text-background"
                      style={{ backgroundColor: c.brand_color }}
                    >
                      {c.logo ?? initialsFromName(c.name)}
                    </span>
                    <div>
                      <p className="font-display text-lg font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {accounts.length} conta{accounts.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {accounts.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Nenhuma conta vinculada
                    </span>
                  ) : (
                    accounts.map((a) => (
                      <PlatformBadge
                        key={a.id}
                        platform={a.platform as "meta" | "google"}
                      />
                    ))
                  )}
                </div>
              </Link>
            );
          })}

          <button
            onClick={() => setOpen(true)}
            className="grid place-items-center rounded-xl border border-dashed border-border bg-card/40 p-6 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <div>
              <Plus className="mx-auto h-6 w-6" />
              <p className="mt-2 text-sm font-medium">Adicionar cliente</p>
            </div>
          </button>
        </div>
      )}

      {open && <NewClientModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function NewClientModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(CLIENT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Sessão expirada.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("clients").insert({
      user_id: userData.user.id,
      name: name.trim(),
      brand_color: color,
      logo: initialsFromName(name),
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["clients-with-accounts"] });
    await qc.invalidateQueries({ queryKey: ["clients"] });
    await qc.invalidateQueries({ queryKey: ["sidebar-clients"] });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-card"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Novo cliente</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block text-sm">
          <span className="text-muted-foreground">Nome do cliente</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Estúdio Nova"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            required
          />
        </label>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">Cor da marca</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CLIENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  color === c ? "border-foreground scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar cliente
          </button>
        </div>
      </form>
    </div>
  );
}

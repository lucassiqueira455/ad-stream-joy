import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CLIENT_COLORS, initialsFromName } from "@/lib/mock-data";
import { ShareReportCard } from "@/components/share-report-card";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";

const clientQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, brand_color, logo")
        .eq("id", clientId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

export const Route = createFileRoute("/_authenticated/app/clients/$clientId/settings")({
  component: SettingsTab,
});

function SettingsTab() {
  const { clientId } = Route.useParams();
  const qc = useQueryClient();
  const router = useRouter();
  const { data: client } = useSuspenseQuery(clientQuery(clientId));

  const [name, setName] = useState(client.name);
  const [color, setColor] = useState(client.brand_color);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({ name: name.trim(), brand_color: color, logo: initialsFromName(name) })
      .eq("id", clientId);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["client", clientId] });
    await qc.invalidateQueries({ queryKey: ["clients-with-accounts"] });
    await qc.invalidateQueries({ queryKey: ["sidebar-clients"] });
  };

  const deleteClient = async () => {
    if (!confirm(`Excluir cliente "${client.name}"? As contas vinculadas ficarão sem cliente.`)) return;
    setDeleting(true);
    await supabase.from("ad_accounts").update({ client_id: null }).eq("client_id", clientId);
    const { error } = await supabase.from("clients").delete().eq("id", clientId);
    setDeleting(false);
    if (error) return alert(error.message);
    await qc.invalidateQueries({ queryKey: ["clients-with-accounts"] });
    await qc.invalidateQueries({ queryKey: ["sidebar-clients"] });
    await qc.invalidateQueries({ queryKey: ["ad-accounts"] });
    router.navigate({ to: "/app/clients" });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-8 shadow-card">
        <h2 className="text-lg font-semibold tracking-tight">Detalhes do cliente</h2>
        <p className="mt-1 text-sm text-muted-foreground">Nome exibido e cor da marca.</p>

        <div className="mt-6 grid gap-5">
          <label className="block text-sm">
            <span className="text-muted-foreground">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full max-w-md rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <div>
            <p className="text-sm text-muted-foreground">Cor da marca</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CLIENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar alterações
            </button>
          </div>
        </div>
      </section>

      <ShareReportCard clientId={clientId} />

      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
        <h2 className="text-lg font-semibold tracking-tight text-destructive">Zona de risco</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Excluir o cliente é irreversível. As contas vinculadas continuam disponíveis nas Integrações.
        </p>
        <button
          onClick={deleteClient}
          disabled={deleting}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-60"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Excluir cliente
        </button>
      </section>
    </div>
  );
}

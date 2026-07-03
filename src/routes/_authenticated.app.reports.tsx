import { createFileRoute } from "@tanstack/react-router";
import { FileDown, Link2, Calendar, Plus } from "lucide-react";
import { clients } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/app/reports")({
  component: Reports,
});

const mock = clients.slice(0, 3).map((c, i) => ({
  id: `r${i}`,
  client: c,
  period: ["Nov 2025", "Out 2025", "Set 2025"][i],
  createdAt: ["12/12/2025", "05/11/2025", "03/10/2025"][i],
  type: ["PDF", "Link público", "PDF"][i],
}));

function Reports() {
  return (
    <div className="p-6 md:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Relatórios
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            Histórico de entregas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere PDFs de marca ou links compartilháveis para seus clientes.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" />
          Novo relatório
        </button>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-left font-medium">Período</th>
              <th className="px-4 py-3 text-left font-medium">Formato</th>
              <th className="px-4 py-3 text-left font-medium">Criado em</th>
              <th className="px-4 py-3 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mock.map((r) => (
              <tr key={r.id} className="hover:bg-accent/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-8 w-8 place-items-center rounded-md text-xs font-semibold text-background"
                      style={{ backgroundColor: r.client.brandColor }}
                    >
                      {r.client.logo}
                    </span>
                    <span className="font-medium">{r.client.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {r.period}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2 py-0.5 text-xs">
                    {r.type === "PDF" ? (
                      <FileDown className="h-3 w-3" />
                    ) : (
                      <Link2 className="h-3 w-3" />
                    )}
                    {r.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.createdAt}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-sm font-medium text-primary hover:underline">
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nas próximas etapas: construtor de relatório (blocos personalizáveis),
          geração de PDF e link público somente-leitura.
        </p>
      </div>
    </div>
  );
}

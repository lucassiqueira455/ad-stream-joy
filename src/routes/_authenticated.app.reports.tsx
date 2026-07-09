import { createFileRoute } from "@tanstack/react-router";
import { FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/reports")({
  component: Reports,
});

function Reports() {
  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Relatórios
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Histórico de entregas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gere PDFs de marca ou links compartilháveis para seus clientes.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
        <FileDown className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-display text-lg font-semibold">
          Em breve
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Construtor de relatórios com blocos personalizáveis, PDF de marca e links públicos.
        </p>
      </div>
    </div>
  );
}

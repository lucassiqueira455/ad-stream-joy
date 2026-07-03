import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Link2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: Settings,
});

function Settings() {
  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Integrações
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Conectar plataformas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte suas contas do Meta Ads e Google Ads para puxar dados reais.
        </p>
      </header>

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="text-warning-foreground/90">
          <p className="font-medium text-warning">Etapa 1 — Demonstração</p>
          <p className="mt-1 text-muted-foreground">
            Os dashboards estão rodando com dados de exemplo. Nas próximas
            etapas vamos configurar OAuth do Meta e do Google Ads. Você vai
            precisar criar um App no Meta for Developers e um projeto no Google
            Cloud com a Google Ads API habilitada — eu te guio nesse processo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-meta/20 text-meta">
                <Link2 className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold">Meta Ads</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Facebook, Instagram, Messenger e WhatsApp.
              </p>
            </div>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Em breve
            </span>
          </div>
          <button
            disabled
            className="mt-6 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground"
          >
            Conectar Meta Ads
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-google/20 text-google">
                <Link2 className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold">Google Ads</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Search, Display, YouTube e Performance Max.
              </p>
            </div>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Em breve
            </span>
          </div>
          <button
            disabled
            className="mt-6 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground"
          >
            Conectar Google Ads
          </button>
        </div>
      </div>
    </div>
  );
}

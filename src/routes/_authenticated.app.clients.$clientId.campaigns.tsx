import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/clients/$clientId/campaigns")({
  component: CampaignsTab,
});

function CampaignsTab() {
  const { clientId } = Route.useParams();
  return (
    <div className="grid place-items-center rounded-2xl border border-border bg-card p-16 text-center shadow-card">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Megaphone className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">Campanhas</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Uma visão dedicada de campanhas está a caminho. Enquanto isso, veja o ranking completo de campanhas no{" "}
        <Link
          to="/app/clients/$clientId"
          params={{ clientId }}
          className="text-primary underline-offset-4 hover:underline"
        >
          Dashboard
        </Link>
        .
      </p>
    </div>
  );
}

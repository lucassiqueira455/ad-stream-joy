import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { User, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, signOut, loading } = useAuth();
  const name = profile?.name ?? user?.email?.split("@")[0] ?? "Usuário";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
      <header className="mb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Configurações
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sua conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Integrações agora fazem parte de cada cliente. Acesse um cliente e vá na aba Integrações.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-8 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-lg font-semibold text-primary-foreground">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold capitalize tracking-tight">{name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Nome</dt>
            <dd className="mt-1 text-foreground">{name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Email</dt>
            <dd className="mt-1 text-foreground">{user?.email ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
          <button
            onClick={() => signOut()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
            Sair da conta
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card/60 p-8 shadow-card">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <User className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-medium">Preferências avançadas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Mais opções (notificações, times, tema) chegam em breve.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

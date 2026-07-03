import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, ArrowRight, Chrome } from "lucide-react";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — TráfegoLab" },
      { name: "description", content: "Acesse seus relatórios de tráfego pago." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate({ from: "/auth" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        navigate({ to: "/app" });
      }
    });
  }, [navigate]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos."
        : "Erro ao entrar. Tente novamente.");
      return;
    }

    navigate({ to: "/app" });
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError("Erro ao iniciar login com Google.");
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 gradient-hero" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h1 className="font-display text-2xl font-semibold">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre com e-mail ou Google para acessar seus dashboards.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Chrome className="h-4 w-4" />
            Continuar com Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleEmailSignIn}>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                E-mail
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-9 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/40"
                  placeholder="voce@agencia.com"
                  required
                  disabled={loading}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Senha
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-9 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/40"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </label>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Entrar"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Ainda não tem conta?{" "}
            <button
              type="button"
              onClick={() => navigate({ to: "/auth/signup" })}
              className="text-primary hover:underline"
            >
              Criar conta
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao entrar, você concorda com os termos e a política de privacidade.
        </p>
      </div>
    </div>
  );
}

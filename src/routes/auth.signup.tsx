import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, ArrowRight, Chrome, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Criar conta — TráfegoLab" },
      { name: "description", content: "Crie sua conta e comece a gerar relatórios de tráfego pago." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate({ from: "/auth/signup" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        navigate({ to: "/app", replace: true });
      }
    });
  }, [navigate]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError("Erro ao criar conta. Tente novamente.");
      return;
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("E-mail já cadastrado. Tente fazer login.");
      return;
    }

    navigate({ to: "/app", replace: true });
  };

  const handleGoogleSignUp = async () => {
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
      setError("Erro ao iniciar cadastro com Google.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
        <h1 className="font-display text-2xl font-semibold">Criar conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre-se com e-mail ou Google para começar.
        </p>

        <button
          type="button"
          onClick={handleGoogleSignUp}
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

        <form className="space-y-4" onSubmit={handleEmailSignUp}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Nome
            </span>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-9 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/40"
                placeholder="Seu nome"
                required
                disabled={loading}
              />
            </div>
          </label>

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
            {loading ? "Criando conta…" : "Criar conta"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={() => navigate({ to: "/auth" })}
            className="text-primary hover:underline"
          >
            Fazer login
          </button>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Ao criar sua conta, você concorda com os termos e a política de privacidade.
      </p>
    </div>
  );
}

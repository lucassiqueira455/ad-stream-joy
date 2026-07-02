import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { signInMock } from "@/lib/auth-mock";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — TráfegoLab" },
      { name: "description", content: "Acesse seus relatórios de tráfego pago." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@trafegolab.com");
  const [password, setPassword] = useState("demo1234");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    signInMock(email);
    navigate({ to: "/app" });
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
            Entre com sua conta para acessar os dashboards.
          </p>

          <div className="my-6 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Modo demonstração: qualquer e-mail funciona (dados de exemplo).
          </div>

          <form className="space-y-4" onSubmit={submit}>
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
                />
              </div>
            </label>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Entrar
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao entrar, você concorda com os termos e a política de privacidade.
        </p>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Check,
  FileText,
  Link2,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TráfegoLab — Relatórios de Meta Ads e Google Ads" },
      {
        name: "description",
        content:
          "Plataforma para agências: conecte Meta Ads e Google Ads, gere dashboards multi-cliente e relatórios em PDF ou link público.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Recursos</a>
            <a href="#integrations" className="hover:text-foreground">Integrações</a>
            <a href="#pricing" className="hover:text-foreground">Preço</a>
          </nav>
          <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
          >
            Entrar
          </Link>
          <Link
            to="/auth"
            className="rounded-lg gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
          >
            Começar grátis
          </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 gradient-hero" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Meta Ads + Google Ads em um só lugar
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Relatórios de tráfego pago que{" "}
              <span className="text-gradient">seus clientes entendem</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Conecte as contas de anúncio dos seus clientes, acompanhe custo,
              cliques, mensagens e conversões em tempo real, e envie relatórios
              de marca em PDF ou por link compartilhável.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-lg gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Entrar no dashboard
                <Zap className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-accent"
              >
                Ver recursos
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Multi-cliente • PDF de marca • Link público • Comparação de períodos
            </p>
          </div>

          <div className="mt-16 rounded-2xl border border-border bg-card/60 p-2 shadow-card backdrop-blur">
            <div className="rounded-xl gradient-surface p-6 md:p-10">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { l: "Investimento", v: "R$ 48.320" },
                  { l: "CPC médio", v: "R$ 1,42" },
                  { l: "Mensagens", v: "1.284" },
                  { l: "Conversões", v: "612" },
                ].map((k) => (
                  <div key={k.l} className="rounded-lg border border-border/60 bg-background/50 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.l}</p>
                    <p className="mt-1 font-display text-2xl font-semibold">{k.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            Tudo que sua agência precisa
          </h2>
          <p className="mt-3 text-muted-foreground">
            Da conexão da conta ao relatório entregue no cliente.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Users,
              t: "Multi-cliente",
              d: "Gerencie todos os seus clientes em um único painel, com marca e cor de cada um.",
            },
            {
              icon: BarChart3,
              t: "Métricas completas",
              d: "Custo, CPC, CPM, CTR, conversões, mensagens, ROAS. Filtre por período, campanha e criativo.",
            },
            {
              icon: FileText,
              t: "PDF de marca",
              d: "Exporte relatórios com logo e cores do cliente. Programe envio semanal ou mensal.",
            },
            {
              icon: Link2,
              t: "Link público",
              d: "URL somente-leitura pro cliente acompanhar os resultados quando quiser.",
            },
            {
              icon: Zap,
              t: "OAuth seguro",
              d: "Conecte Meta Ads e Google Ads com um clique. Tokens cifrados no banco.",
            },
            {
              icon: Sparkles,
              t: "Comparação de períodos",
              d: "Compare com período anterior automaticamente e destaque tendências.",
            },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-xl border border-border bg-card p-6 shadow-card transition-colors hover:border-primary/40"
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="integrations" className="border-y border-border bg-card/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold md:text-4xl">
                Integrações nativas
              </h2>
              <p className="mt-3 text-muted-foreground">
                Autentique uma vez, puxe os dados sempre atualizados. Suportamos
                as principais métricas de cada plataforma, incluindo mensagens
                iniciadas no WhatsApp e Instagram Direct.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Meta Ads — Facebook, Instagram, Messenger, WhatsApp",
                  "Google Ads — Search, Display, YouTube, Performance Max",
                  "Breakdown por campanha, conjunto, anúncio e criativo",
                  "Métricas de conversão, ROAS e valor gerado",
                ].map((li) => (
                  <li key={li} className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    {li}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-meta/30 bg-meta/5 p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-meta/20 text-meta">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <p className="mt-4 font-display text-lg font-semibold">Meta Ads</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Marketing API v20+
                </p>
              </div>
              <div className="rounded-xl border border-google/30 bg-google/5 p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-google/20 text-google">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <p className="mt-4 font-display text-lg font-semibold">Google Ads</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Google Ads API v17+
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">
          Pronto para acelerar seus relatórios?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Experimente agora com dados de demonstração. Depois é só conectar as
          contas reais dos seus clientes.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Entrar no dashboard
          <Zap className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TráfegoLab. Todos os direitos reservados.
      </footer>
    </div>
  );
}

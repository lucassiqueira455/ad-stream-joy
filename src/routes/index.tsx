import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  Link2,
  LineChart,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { BrandIcon } from "@/components/brand-icon";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Analizze — Relatórios de Meta Ads e Google Ads para agências" },
      {
        name: "description",
        content:
          "Analizze conecta Meta Ads e Google Ads em um só painel. Dashboards multi-cliente, comparação de períodos e relatórios brancos em PDF ou link público.",
      },
      { property: "og:title", content: "Analizze — Relatórios de tráfego pago" },
      { property: "og:description", content: "Dashboards multi-cliente, PDF de marca e links públicos para os seus clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const platforms = ["meta", "instagram", "facebook", "google", "ga4", "tiktok"] as const;

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Recursos</a>
            <a href="#integrations" className="hover:text-foreground">Integrações</a>
            <a href="#workflow" className="hover:text-foreground">Como funciona</a>
            <a href="#pricing" className="hover:text-foreground">Preço</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/auth"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block px-2"
            >
              Entrar
            </Link>
            <Link
              to="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Começar grátis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 gradient-hero" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 md:grid-cols-[1.05fr_1fr] md:items-center md:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground shadow-card">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Novo: comparação automática de períodos
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.03] tracking-tight md:text-6xl">
              Relatórios de tráfego pago{" "}
              <span className="text-gradient">brancos, rápidos e claros</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              O Analizze conecta Meta Ads, Google Ads, Instagram e mais em um só painel.
              Compartilhe dashboards em tempo real com seu cliente por link — sem planilha,
              sem exportação manual, sem retrabalho.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/auth/signup"
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Começar grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-accent"
              >
                Ver recursos
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Sem cartão</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Multi-cliente</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Link público white-label</span>
            </div>

            <div className="mt-10">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Conecta com</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {platforms.map((p) => (
                  <div
                    key={p}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card shadow-card"
                  >
                    <BrandIcon platform={p} className="h-6 w-6" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product mockup */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-primary/5 blur-2xl" />
            <div className="rounded-2xl border border-border bg-card p-3 shadow-elevated">
              <div className="flex items-center gap-1.5 px-2 pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-3 text-[11px] text-muted-foreground">analizze.app / dashboard</span>
              </div>
              <div className="rounded-xl gradient-surface p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Cliente ativo</p>
                    <p className="mt-0.5 font-display text-base font-semibold">Loja Aurora — Últimos 30 dias</p>
                  </div>
                  <div className="flex -space-x-1">
                    {(["meta", "instagram", "google"] as const).map((p) => (
                      <div key={p} className="grid h-7 w-7 place-items-center rounded-full ring-2 ring-card bg-background">
                        <BrandIcon platform={p} className="h-4 w-4" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { l: "Investimento", v: "R$ 48.320", d: "+12%" },
                    { l: "CPC médio", v: "R$ 1,42", d: "−8%" },
                    { l: "Conversões", v: "1.284", d: "+31%" },
                    { l: "ROAS", v: "4,7×", d: "+0,6" },
                  ].map((k) => (
                    <div key={k.l} className="rounded-lg border border-border bg-card/70 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</p>
                      <p className="mt-1 font-display text-lg font-semibold">{k.v}</p>
                      <p className="text-[10px] font-medium text-success">{k.d}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-border bg-card/70 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold">Investimento por dia</p>
                    <span className="text-[10px] text-muted-foreground">Meta + Google</span>
                  </div>
                  <svg viewBox="0 0 300 90" className="h-24 w-full" preserveAspectRatio="none" aria-hidden>
                    <defs>
                      <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 70 L30 55 L60 60 L90 40 L120 45 L150 30 L180 35 L210 20 L240 28 L270 15 L300 22 L300 90 L0 90 Z"
                      fill="url(#area)"
                    />
                    <path
                      d="M0 70 L30 55 L60 60 L90 40 L120 45 L150 30 L180 35 L210 20 L240 28 L270 15 L300 22"
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-border bg-muted/40 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 text-xs uppercase tracking-wider text-muted-foreground">
          <span>Feito para agências e gestores de tráfego</span>
          <span className="hidden h-3 w-px bg-border md:block" />
          <span>+50 métricas nativas</span>
          <span className="hidden h-3 w-px bg-border md:block" />
          <span>Atualização em tempo real</span>
          <span className="hidden h-3 w-px bg-border md:block" />
          <span>Link público white-label</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Recursos</p>
          <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            Tudo que sua agência precisa
          </h2>
          <p className="mt-3 text-muted-foreground">
            Da conexão da conta ao relatório entregue no cliente — sem atrito.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { icon: Users, t: "Multi-cliente", d: "Gerencie todos os clientes em um único painel, com marca e cor de cada um." },
            { icon: BarChart3, t: "Métricas completas", d: "CPC, CPM, CTR, conversões, ROAS. Filtre por período, campanha e criativo." },
            { icon: FileText, t: "Relatórios em PDF", d: "Exporte com logo e cores do cliente. Programe envio semanal ou mensal." },
            { icon: Link2, t: "Link público", d: "URL somente-leitura para o cliente acompanhar em tempo real." },
            { icon: LineChart, t: "Comparação de períodos", d: "Compare com o período anterior automaticamente e veja tendências." },
            { icon: ShieldCheck, t: "OAuth seguro", d: "Conecte Meta e Google com um clique. Tokens cifrados no banco." },
          ].map((f) => (
            <div
              key={f.t}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="border-y border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Integrações</p>
              <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
                Conecte uma vez, dados sempre atualizados
              </h2>
              <p className="mt-4 text-muted-foreground">
                Suportamos as principais métricas de cada plataforma, incluindo conversões
                de WhatsApp, formulários e mensagens.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Meta Ads — Facebook, Instagram, Messenger, WhatsApp",
                  "Google Ads — Search, Display, YouTube, Performance Max",
                  "Breakdown por campanha, conjunto e criativo",
                  "Conversões unificadas com custo por resultado",
                ].map((li) => (
                  <li key={li} className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    {li}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {platforms.map((p) => (
                <div
                  key={p}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-6 shadow-card"
                >
                  <BrandIcon platform={p} className="h-10 w-10" />
                  <p className="mt-2 text-sm font-medium capitalize">{p === "ga4" ? "Analytics" : p === "google" ? "Google Ads" : p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Como funciona</p>
          <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            3 passos para entregar o relatório
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { n: "01", t: "Conecte a conta", d: "OAuth com Meta e Google em um clique. Sem CSV, sem token manual." },
            { n: "02", t: "Escolha as métricas", d: "Selecione o que importa por cliente. Comparação de período automática." },
            { n: "03", t: "Compartilhe o link", d: "Envie um link white-label ao cliente. Ele acompanha em tempo real." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <p className="font-display text-3xl font-bold text-gradient">{s.n}</p>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="mx-auto max-w-4xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-elevated md:p-14">
          <div className="pointer-events-none absolute inset-0 gradient-hero opacity-70" />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold md:text-4xl">
              Pronto para entregar relatórios melhores?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Comece grátis, sem cartão. Depois é só conectar as contas reais dos seus clientes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth/signup"
                className="inline-flex items-center gap-2 rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Criar conta grátis
                <Zap className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
              >
                Entrar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Analizze. Todos os direitos reservados.
      </footer>
    </div>
  );
}

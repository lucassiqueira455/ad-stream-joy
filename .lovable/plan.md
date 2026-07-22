# Redesign Premium — Página de Cliente

Um redesign completo transformando a página de Cliente em uma experiência SaaS premium (Linear/Stripe/Vercel style), com integrações movidas para dentro de cada cliente e navegação interna dedicada.

---

## 1. Tipografia — Inter

- Trocar Sora + Manrope por **Inter Variable** (headings e body) via `@fontsource-variable/inter`.
- Manter `--font-display` e `--font-sans` apontando para Inter, com tracking mais apertado (`-0.02em` em headings, `-0.01em` em body) — estilo Apple/Stripe.
- Remover `@fontsource-variable/sora` e `@fontsource-variable/manrope`.

## 2. Design tokens (src/styles.css)

- Bordas mais suaves: radius base `16px` (14~18px conforme o componente).
- Sombras suaves multi-camada (estilo Vercel/Linear): `--shadow-elevated`, `--shadow-hover`.
- Reduzir intensidade de bordas (`--border` mais sutil, quase invisível).
- Cores oficiais de plataforma como tokens:
  - `--platform-meta` (azul Meta)
  - `--platform-instagram` (gradiente roxo/rosa)
  - `--platform-facebook` (azul FB)
  - `--platform-google` (verde)
  - `--platform-ga4` (laranja)
  - `--platform-gtm` (azul escuro)
  - `--platform-tiktok` (preto/cyan)
  - `--platform-search-console` (verde escuro)

## 3. Sidebar principal — simplificar

`src/components/app-shell.tsx`:
- Menu principal reduzido para: **Dashboard, Clientes, Relatórios, Configurações**.
- Remover item "Integrações" do menu global.
- Lista de clientes na sidebar: avatar colorido + nome + linha de bolinhas indicando plataformas conectadas (Meta/Google/GA4 etc.).
- Mais respiro, tipografia Inter, hover elegante.

## 4. Página de Cliente — nova estrutura

Substituir a página monolítica `_authenticated.app.clients.$clientId.tsx` por um **layout com sub-rotas**:

```
src/routes/_authenticated.app.clients.$clientId.tsx          → layout (header + tabs + <Outlet/>)
src/routes/_authenticated.app.clients.$clientId.index.tsx    → redireciona para /dashboard
src/routes/_authenticated.app.clients.$clientId.dashboard.tsx
src/routes/_authenticated.app.clients.$clientId.reports.tsx
src/routes/_authenticated.app.clients.$clientId.campaigns.tsx
src/routes/_authenticated.app.clients.$clientId.creatives.tsx
src/routes/_authenticated.app.clients.$clientId.integrations.tsx
src/routes/_authenticated.app.clients.$clientId.settings.tsx
```

### Header do cliente (compartilhado)
- Avatar grande (56px, radius 16), nome (Inter 28/32 semibold, tracking apertado).
- Linha de chips de plataformas com dot verde/cinza:
  - Meta Ads, Instagram, Facebook, Google Ads, GA4, GTM, Search Console, TikTok Ads.
- Meta-info à direita: última sincronização, fuso horário, moeda.
- Botão primário: **Atualizar dados** (dispara refetch das queries + `updateAdAccountsForConnection`).
- Botão secundário: excluir cliente (movido para /settings do cliente).

### Sub-navegação (tabs premium)
Linha de pills sticky abaixo do header:
- 📊 Dashboard · 📄 Relatórios · 📢 Campanhas · 🎨 Criativos · 🔗 Integrações · ⚙️ Configurações
- Estilo: pills sem borda, indicador ativo com bg sutil, transição suave.

## 5. Aba Dashboard

- Manter todo o comportamento atual de `client-dashboard.tsx`.
- Aumentar `gap` entre grupos (from 6 → 10), padding interno de cards (from 4/5 → 6/8).
- Aplicar novos tokens de shadow/radius, cards mais altos, tipografia maior nos KPIs.

## 6. Aba Relatórios

Renderiza `<ClientMetrics/>` existente com o mesmo tratamento visual (mais respiro, cards maiores).

## 7. Aba Campanhas

Nova página focada em tabela/rankings de campanhas (extrai a lógica de rankings já existente em `client-dashboard.tsx` em um componente reutilizável — fase inicial pode simplesmente redirecionar a seção do dashboard).

## 8. Aba Criativos

Grid de top ads (thumbnails maiores, estilo galeria) — reaproveita `fetchAdAccountAds` + `computeClientDashboard`.

## 9. Aba Integrações (por cliente)

Move todo o conteúdo de `_authenticated.app.settings.tsx` para dentro do cliente, filtrando por `client_id`. Cards individuais por plataforma:

- **Meta Ads** — status, contas vinculadas ao cliente, última sync, botões [Sincronizar]/[Reconectar]/[Conectar].
- **Instagram**, **Facebook** — placeholders "Em breve" com botão desabilitado.
- **Google Ads**, **GA4**, **GTM**, **Search Console**, **TikTok Ads** — cards "Não conectado" com CTA [Conectar] desabilitado (placeholders).

Cada card usa cor da plataforma no header/ícone; hover suave; radius 16.

O fluxo real hoje só existe para Meta — mantemos isso; as outras plataformas são cards visuais "coming soon" para completar a experiência.

## 10. Aba Configurações do cliente

- Editar nome, cor, logo/inicial.
- Excluir cliente (movido do header antigo).
- Share links (mover `ShareReportCard` para cá).

## 11. Página global de Configurações (sidebar)

Passa a conter apenas: perfil do usuário, preferências, logout. Remover cards de integração daqui.

## 12. Página de Clientes (lista)

`_authenticated.app.clients.index.tsx`: cards de cliente com avatar grande, nome, chips de plataformas conectadas, contagem de contas — visual premium.

## 13. Responsividade

- Header do cliente: grid responsivo, meta-info empilha em mobile.
- Sub-nav: scroll horizontal em telas pequenas.
- Sidebar já colapsa em mobile — manter comportamento.

---

## Detalhes técnicos

**Nova dependência:** `@fontsource-variable/inter` (via `bun add`); remover `@fontsource-variable/sora` e `@fontsource-variable/manrope`.

**Reestruturação de rotas:** transformar `_authenticated.app.clients.$clientId.tsx` em layout com `<Outlet/>`. Criar arquivos irmãos por aba. `src/routeTree.gen.ts` regenera automaticamente.

**Componentes novos:**
- `src/components/client-header.tsx` — header compartilhado + linha de plataformas + botão atualizar.
- `src/components/client-tabs.tsx` — sub-nav pills.
- `src/components/platform-chip.tsx` — chip com dot status + cor oficial.
- `src/components/integration-card.tsx` — card individual de integração.

**Fetch de status de plataformas:** query única que lê `ad_platform_connections` + `ad_accounts` para o cliente e monta o estado dos chips (por enquanto só Meta reflete estado real; demais retornam `connected: false`).

**Design tokens:** todas as cores de plataforma definidas em `src/styles.css` como CSS vars; nenhum hex hardcoded em componentes.

**Botão Atualizar Dados:** chama `updateAdAccountsForConnection` para cada conexão Meta do cliente + `invalidateQueries` das keys de métricas/campaigns/ads/daily.

**Manter compatibilidade:** rotas públicas `/report/$token` e `/dashboard/$token` permanecem inalteradas.

---

## Ordem de implementação

1. Fontes (Inter) + tokens de design + cores de plataforma.
2. Sidebar simplificada + lista de clientes com chips.
3. Layout do cliente com header novo + sub-nav + rotas filhas.
4. Migrar Dashboard e Relatórios para dentro das novas abas (só reembrulhar).
5. Nova aba Integrações (por cliente) — move Meta, adiciona placeholders.
6. Abas Campanhas / Criativos / Configurações.
7. Ajustes finais de espaçamento no dashboard.

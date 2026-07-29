## Objetivo

Evoluir Analizze para plataforma multi-fonte com dashboard/relatório unificados, personalização por cliente e visual premium.

## Fase 1 — Google Ads: sincronização e métricas

**Novo módulo `src/lib/google-ads.server.ts`** com queries GAQL para o período selecionado (mesmo `datePreset` de Meta):

- `campaign` + `metrics.*` + `segments.date` → campanhas
- `ad_group` → grupos de anúncios
- `ad_group_ad` + `ad_group_ad.ad.*` → anúncios (com preview URL quando possível)

Campos coletados por linha: `impressions`, `clicks`, `cost_micros` (÷1e6), `ctr`, `average_cpc`, `average_cpm`, `conversions`, `cost_per_conversion`, `conversions_value`, `value_per_conversion` (ROAS = value/cost).

**Extensão de `metrics.server.ts`**:
- `computeGoogleAdsMetrics(supabase, clientId, datePreset)` — espelha o formato de `computeClientMetrics` (Meta) mas com dados Google.
- `computeGoogleAdsDashboard(...)` — espelha `computeClientDashboard` (série diária, top campanhas, top anúncios).

**Novo serverFn**: `getGoogleAdsMetrics` / `getGoogleAdsDashboard` em `ads-connections.functions.ts`.

Tokens: refresh automático via `refreshGoogleAccessToken` quando `expires_at` < now.

## Fase 2 — Camada de agregação multi-plataforma

**Novo arquivo `src/lib/platform-aggregator.server.ts`**:

```
getUnifiedDashboard(clientId, datePreset, platform: 'all' | 'meta' | 'google')
getUnifiedMetrics(clientId, datePreset, platform)
```

Quando `platform='all'`: chama ambas em paralelo, soma KPIs (spend, clicks, impressions, conversions, revenue), recalcula derivadas (CTR, CPC, CPM, CPA, ROAS) e concatena séries diárias/rankings marcando `platform` em cada item.

Quando específico: retorna apenas dessa plataforma. Se cliente não tem conta conectada dessa plataforma, retorna estrutura vazia coerente.

**ServerFns novos**: `getUnifiedDashboard`, `getUnifiedReport` (substituem chamadas atuais).

## Fase 3 — Seletor de plataforma (UI)

Componente `PlatformSelector` no topo de:
- `client-dashboard.tsx`
- `client-metrics.tsx` (relatório)
- Rotas públicas `/dashboard/$token` e `/report/$token`

Opções: Todas | Meta Ads | Google Ads. Estado via search param (`?platform=all|meta|google`) para deep-link. Só mostra opções cujas contas estão conectadas ao cliente.

## Fase 4 — Personalização por cliente

**Nova tabela `dashboard_layouts`**:

```sql
id uuid pk, client_id uuid fk, user_id uuid,
view text check (view in ('dashboard','report')),
blocks jsonb, -- [{id, visible, order}]
unique(client_id, view)
```

com GRANTs + RLS (`user_id = auth.uid()` ou owner do client).

Blocos disponíveis: `summary`, `charts`, `campaigns`, `creatives`, `ranking`, `insights`, `meta`, `google`, `comparativos`.

**Componente `LayoutEditor`** (drawer): checkboxes + drag & drop via `@dnd-kit/core` (leve, já no ecossistema).

Dashboard/Report leem `blocks` e renderizam na ordem, escondendo os não marcados. Layout público (share) usa o layout salvo do dono do cliente.

**ServerFns**: `getClientLayout`, `saveClientLayout`.

## Fase 5 — Redesign visual "premium"

Refatorar `metric-card.tsx`:
- Fundo `bg-card` sólido (branco no light), borda `border-border/60`, sem `bg-accent` no ícone.
- Linha superior 2px em `accent-color` opcional (prop `accentColor`).
- Ícone colorido (sem background circular).
- Espaçamento generoso: `p-6`, gap maior entre label/valor.
- Tipografia: label `text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground/70`, valor `text-3xl font-semibold tracking-tight`.
- Delta em texto simples com seta pequena, sem pill colorida forte.

Ajustes de tokens em `styles.css` se necessário para atingir estética Stripe/Linear (sombras muito sutis, borders mais claras).

## Fase 6 — Arquitetura para futuras integrações

Formalizar interface `PlatformAdapter`:

```ts
interface PlatformAdapter {
  id: 'meta' | 'google' | 'ga4' | 'gtm' | ...
  fetchMetrics(ctx, datePreset): Promise<UnifiedMetrics>
  fetchDashboard(ctx, datePreset): Promise<UnifiedDashboard>
}
```

`platform-aggregator.server.ts` itera pelos adapters registrados que o cliente tem conectados. Adicionar nova plataforma = criar um adapter + registrar. UI de integrações já lista placeholders (GA4, GTM, IG, TikTok etc.) — manter cards em "Em breve" até o adapter estar pronto.

## Ordem de entrega

1. Migration da tabela `dashboard_layouts`.
2. Fase 1 (Google Ads sync + serverFns).
3. Fase 2 (aggregator + adapter interface — Fase 6 embutida aqui).
4. Fase 3 (seletor UI + search params).
5. Fase 4 (editor de layout com dnd-kit).
6. Fase 5 (redesign dos metric cards e ajustes visuais).

## Escopo NÃO incluído (confirmar depois)

- Persistência histórica dos dados (hoje é fetch on-demand com cache curto). Se quiser histórico próprio, precisa job + tabelas `insights_daily` — grande projeto separado.
- Adapters reais para GA4/GTM/IG/TikTok — só a arquitetura fica pronta, cada um é um trabalho dedicado.
- Editor drag&drop dos gráficos internos (só ordem/visibilidade dos blocos macro).

Confirma para eu começar pela Fase 1 (Google Ads sync)?

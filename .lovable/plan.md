## 1. Modelo de dados

Adicionar coluna `dashboard_token` em `client_shares` (o `token` atual continua sendo o do Relatório). Cada cliente passa a ter dois tokens independentes:

- `/report/<token>` → Relatório (mantém como hoje)
- `/dashboard/<dashboard_token>` → Dashboard (novo)

Regenerar/desativar são independentes por link. Ambos usam o campo `active` compartilhado — botão único de ativar/desativar compartilhamento vale pros dois.

Migration:
```
ALTER TABLE public.client_shares
  ADD COLUMN dashboard_token text UNIQUE;
UPDATE public.client_shares SET dashboard_token = encode(gen_random_bytes(32),'base64') ...;
```

## 2. Backend

`src/lib/meta.server.ts`: adicionar duas novas funções (usa Graph API v21):
- `fetchAdAccountDaily(token, externalAccountId, datePreset)` → série diária `[{ date, spend, impressions, clicks, ctr, cpc, conversions }]` via `/insights?time_increment=1`.
- `fetchAdAccountCampaigns(token, externalAccountId, datePreset)` → top campanhas com `spend, ctr, conversions, cpa` via `/insights?level=campaign` + `fields=campaign_name,...`.
- `fetchAdAccountAds(token, externalAccountId, datePreset)` → top ads com criativo (thumbnail via `ad.creative{thumbnail_url}`) + métricas via `/insights?level=ad`.

`src/lib/metrics.server.ts`: adicionar `computeClientDashboard(supabase, clientId, datePreset)` que agrega das contas (mesmo padrão de `computeClientMetrics`) mas retorna `{ totals, currency, series, topCampaigns, topAds, lastSyncedAt }`.

`src/lib/shares.functions.ts`:
- Novo `getPublicDashboard({ token, datePreset })` — valida `dashboard_token`, chama `computeClientDashboard`.
- Estender `createOrRegenerateShare` para aceitar `kind: "report" | "dashboard"` e regenerar só o token pedido.
- `getClientShare` retorna também `dashboard_token`.

`ads-connections.functions.ts`: novo `getClientDashboard({ clientId, datePreset })` autenticado.

## 3. Frontend

### Página do cliente (admin)

Em `_authenticated.app.clients.$clientId.tsx`, envolver `<ClientMetrics />` num container de abas:

```
[ Relatório | Dashboard ]
```

- Aba **Relatório** → `<ClientMetrics />` atual (nada muda).
- Aba **Dashboard** → novo componente `<ClientDashboardView />`.

Atualizar `ShareReportCard` para mostrar dois blocos: "Link do Relatório" e "Link do Dashboard", cada um com Copiar / Regenerar próprios. Um único toggle Ativar/Desativar para ambos + toggle de permitir mudar período.

### Novo componente `src/components/client-dashboard.tsx`

Layout limpo, focado em visual:
- Header com "Atualizado há X min" (calcular de `lastSyncedAt`).
- Seletor de período (se `allowDateChange`).
- Grade de cards: Investimento, Conversões, Custo/Conversão, Impressões, Alcance, Cliques, CTR, CPC, CPM. Reusa `MetricCard`.
- 4 gráficos (Recharts, `LineChart` / `AreaChart`): Investimento diário, Conversões diárias, CTR diário, CPC diário.
- Tabela **Melhores campanhas** — nome, conversões, CPA, investimento, CTR, ordenado por conversões desc.
- Tabela **Melhores anúncios** — thumbnail (img), nome, conversões, CPA, CTR, investimento.

### Nova rota pública `src/routes/dashboard.$token.tsx`

Mesmo padrão de `report.$token.tsx` (`ssr:false`, sem AppShell, header minimalista com logo do cliente + plataforma). Renderiza `<ClientDashboardView publicToken={token} allowDateChange=... />`.

## 4. Segurança

- Tokens de 32 bytes aleatórios (crypto.randomBytes), base64url.
- Regenerar dashboard não afeta relatório e vice-versa.
- Endpoints públicos `getPublicReport`/`getPublicDashboard` sem auth, validam token via `supabaseAdmin` antes de qualquer read.
- Nenhuma escrita a partir dos endpoints públicos.

## 5. Arquivos

Novos:
- `supabase/migrations/<ts>_client_shares_dashboard_token.sql`
- `src/components/client-dashboard.tsx`
- `src/routes/dashboard.$token.tsx`

Editados:
- `src/lib/meta.server.ts` (novas fetchers)
- `src/lib/metrics.server.ts` (`computeClientDashboard`)
- `src/lib/shares.functions.ts` (dashboard token + `getPublicDashboard`)
- `src/lib/ads-connections.functions.ts` (`getClientDashboard`)
- `src/components/share-report-card.tsx` (dois blocos)
- `src/routes/_authenticated.app.clients.$clientId.tsx` (tabs)

## Notas técnicas

- "Atualizado há X min": como o app não guarda cache no banco, `lastSyncedAt = Date.now()` no momento da chamada (a Meta responde ao vivo). Suficiente pra UX pedida.
- Top ads: campo `creative{thumbnail_url,image_url}` na Meta Ads API. Se `thumbnail_url` faltar, cai para placeholder.
- Reaproveita `datePreset` e formatação já existentes.

Confirma pra eu implementar?

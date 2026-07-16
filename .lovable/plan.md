
## 1. Simplificar métricas

Remover as métricas **Leads** e **Mensagens** do painel — apenas "Conversões" permanece como métrica unificada.

- `src/components/client-metrics.tsx`: remover entradas `leads` e `messaging` de `METRICS`, remover ícones não usados. Manter o breakdown detalhado (que já mostra origem) intacto.
- `src/lib/ads-connections.functions.ts` / `src/lib/meta.server.ts`: manter os campos no backend (usados no breakdown), só ocultar na UI. Não mexer na lógica de agregação.

## 2. Compartilhamento público de relatórios por link

### Modelo de dados (nova migration)

Nova tabela `public.client_shares`:

```
id uuid pk
client_id uuid fk clients(id) on delete cascade
user_id uuid  -- dono (para RLS admin)
token text unique not null  -- 32+ bytes, base64url
active boolean default true
allow_date_change boolean default true
created_at, updated_at
```

- RLS: admin (dono) gerencia via `auth.uid() = user_id`.
- **Sem** política pública na tabela — leitura pública passa pelo servidor via service role, validando token + active.
- GRANTs padrão + `service_role` all.

### Backend (server functions em `src/lib/shares.functions.ts`)

Autenticadas (admin gerencia):
- `getClientShare({ clientId })` — retorna share existente (cria on-demand? não: cria só via createShare)
- `createOrRegenerateShare({ clientId })` — gera novo token (crypto.randomBytes(32) → base64url), upsert por clientId, invalidando anterior
- `setShareActive({ clientId, active })`
- `setShareAllowDateChange({ clientId, allow })`

Rota pública (server route) `src/routes/api/public/report/$token.ts`:
- Valida token via `supabaseAdmin`; se inativo/inexistente → 404.
- Retorna `{ client: {id,name,logo,brand_color}, allowDateChange }`.

Server function pública (sem `requireSupabaseAuth`) `getPublicReport({ token, datePreset })`:
- Valida token via `supabaseAdmin`, resolve `clientId`, chama a mesma lógica de agregação já usada em `getClientMetrics` (extrair função pura `computeClientMetrics(supabase, clientId, datePreset)` compartilhada; a versão pública usa `supabaseAdmin`, contornando RLS somente após validar o token).
- Se `allow_date_change` é false, força `datePreset` do banco (armazenar? — não pedido; deixamos default `last_30d` quando desabilitado).

### Rotas frontend

- **Admin**: em `_authenticated.app.clients.$clientId.tsx`, adicionar seção "Compartilhamento":
  - Status ativo/inativo (badge)
  - Campo readonly com URL `${origin}/report/<token>`
  - Botões: Copiar Link, Regenerar Link (confirmação — invalida antigo), Desativar/Ativar, Toggle "Permitir alterar período"
- **Público** (fora de `_authenticated`): novo arquivo `src/routes/report.$token.tsx`
  - **Sem** `AppShell`. Layout próprio minimalista:
    - Header: logo da plataforma + logo/nome do cliente + período
    - Seletor de período (somente se `allowDateChange`)
    - Reusa `ClientMetrics` em modo "público" (nova prop `publicToken?: string` que troca o server fn de `getClientMetrics` para `getPublicReport`)
  - Sem menu, sem navegação admin, somente leitura.

### Segurança

- Token 32 bytes aleatórios via `crypto.randomBytes` (server).
- Validação server-side em toda chamada pública.
- Sem IDs sequenciais na URL.
- `supabaseAdmin` só é carregado dentro do handler após validar token.
- Nenhuma escrita pelo endpoint público.

## 3. Arquivos afetados

Novos:
- `supabase/migrations/<ts>_client_shares.sql`
- `src/lib/shares.functions.ts`
- `src/lib/metrics.server.ts` (extrai `computeClientMetrics` de `ads-connections.functions.ts`)
- `src/routes/report.$token.tsx`
- `src/components/share-report-card.tsx` (UI admin do compartilhamento)

Editados:
- `src/components/client-metrics.tsx` (remover leads/messaging; aceitar prop opcional para usar server fn público)
- `src/lib/ads-connections.functions.ts` (usar `computeClientMetrics`)
- `src/routes/_authenticated.app.clients.$clientId.tsx` (montar `ShareReportCard`)

## Notas técnicas

- O client store `client-metrics-selection-v2` continua servindo; leads/messaging desaparecem naturalmente pois filtro `METRICS.some(m => m.key === k)` remove chaves órfãs.
- `getPublicReport` é uma `createServerFn` **sem** middleware de auth — é um endpoint público válido (o token é a autenticação).
- O `origin` para copiar link vem de `window.location.origin` no cliente.

Pronto para implementar?

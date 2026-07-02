
# Plano — Plataforma de Relatórios de Tráfego Pago

Um app estilo Reportei/Criativvo: você cria clientes, conecta as contas de anúncio de Meta Ads e Google Ads de cada um, e gera dashboards + relatórios em PDF ou link público.

## Antes de começar — o que você precisa providenciar

As APIs de Meta e Google Ads não são abertas: cada agência precisa de um App próprio aprovado. Vou te guiar em cada passo depois, mas em resumo:

**Meta Ads (Facebook/Instagram)**
1. Criar conta em `developers.facebook.com` e criar um **App** do tipo "Business".
2. Adicionar o produto **Marketing API** ao app.
3. Guardar o `App ID` e o `App Secret`.
4. Configurar a **URL de callback OAuth** (eu te dou depois de criar o app).
5. Para uso além das suas próprias contas, o app precisa passar por **App Review** pedindo a permissão `ads_read` (leva alguns dias). Enquanto isso, funciona para contas em que você é admin ou está listado como tester.

**Google Ads**
1. Criar projeto no `console.cloud.google.com`, habilitar a **Google Ads API**.
2. Criar credenciais OAuth 2.0 (Client ID + Client Secret) e cadastrar a URL de callback.
3. Solicitar um **Developer Token** em `ads.google.com` (aba API Center) — vem em modo teste primeiro; para produção precisa de "Basic access" (formulário rápido).
4. Idealmente ter uma **Manager Account (MCC)** para acessar contas dos clientes.

**No app, você vai salvar como secrets:** `META_APP_ID`, `META_APP_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`.

## Arquitetura

- **Auth**: e-mail/senha + Google (Lovable Cloud).
- **Multi-tenant leve**: cada usuário logado é dono dos próprios clientes e conexões.
- **Modelo de dados** (tabelas principais):
  - `profiles` — dados do usuário logado.
  - `clients` — clientes da agência (nome, logo, cor de marca).
  - `ad_accounts` — conta de anúncio vinculada a um cliente (`platform`: meta/google, `external_id`, `name`, `access_token` cifrado, `refresh_token`, `expires_at`).
  - `reports` — relatórios salvos (cliente, período, métricas escolhidas, layout).
  - `report_shares` — token público para link somente-leitura.
- **RLS**: tudo escopado por `owner_user_id`; `report_shares` acessível por token sem auth.

## Escopo do MVP (o que entrego)

### Etapa 1 — Fundação (esta primeira leva)
1. Design system escuro/moderno estilo dashboard analytics.
2. Auth (login/cadastro/Google).
3. CRUD de clientes (nome, logo, cor).
4. Layout do app: sidebar com lista de clientes, área principal do dashboard.
5. Dashboard funcionando com **dados mock** para você validar a UX antes de plugar as APIs.

Nessa etapa não vou pedir os secrets ainda — primeiro validamos o produto.

### Etapa 2 — Integração Meta Ads
1. Fluxo OAuth do Meta (conectar conta de anúncio a um cliente).
2. Server functions que puxam da Marketing API:
   - Campanhas, conjuntos, anúncios
   - Métricas: gasto, impressões, alcance, cliques, CPC, CPM, CTR, frequência
   - Conversões e eventos (mensagens iniciadas, leads, compras, valor de conversão, ROAS)
   - Breakdown por dia, por posicionamento, por dispositivo, por idade/gênero
3. Cache das métricas em tabela `metrics_daily` para não estourar rate limit.

### Etapa 3 — Integração Google Ads
1. OAuth do Google Ads + seleção de conta (via MCC).
2. Server functions puxando via GAQL:
   - Campanhas, grupos de anúncios, palavras-chave
   - Métricas: custo, cliques, impressões, CTR, CPC médio, conversões, custo/conversão, valor de conversão, ROAS
   - Search terms, quality score
3. Mesmo cache em `metrics_daily`.

### Etapa 4 — Relatórios
1. Construtor de relatório: escolher cliente, período, quais blocos incluir (visão geral, campanhas, criativos, funil, etc.).
2. **Exportar PDF** (renderização server-side com layout de marca do cliente).
3. **Link público compartilhável** (`/r/:token`) com view somente-leitura.
4. Comparação de período (vs. período anterior).

## Detalhes técnicos

- Stack: TanStack Start + Lovable Cloud (Postgres + Auth + Storage para logos/PDFs).
- OAuth callbacks: rotas em `src/routes/api/auth/meta/callback.ts` e `src/routes/api/auth/google/callback.ts`.
- Tokens de acesso ficam **cifrados** no banco (chave em secret `TOKEN_ENCRYPTION_KEY`).
- Refresh automático de tokens em cada chamada.
- Chamadas às APIs Meta/Google feitas em `createServerFn` — nunca do browser.
- PDF: gerado via HTML→PDF em server route (biblioteca compatível com Workers).
- Rate-limit e retry com backoff nas chamadas externas.

## O que quero confirmar antes de começar

Se estiver tudo certo, começo agora pela **Etapa 1** (fundação + design + mocks). Depois que você validar a cara do produto, ativamos Lovable Cloud, cria a auth e as tabelas, e passamos pra Etapa 2 (Meta) — nesse momento eu te mando o passo a passo para criar o App no Meta for Developers e te peço os secrets via formulário seguro. Idem para Google na Etapa 3.

Confirma que posso seguir?

## Objetivo

Corrigir dados de "Visitas ao Perfil" e reestruturar o Dashboard para agrupar campanhas automaticamente por **objetivo**, com rankings, gráficos e tooltips independentes por grupo. Nada de comparação entre objetivos diferentes.

---

## 1. Dados: puxar corretamente Visitas ao Perfil da Meta

Hoje `fetchAdAccountCampaigns` só lê `actions`/`conversions` e infere Visitas ao Perfil via `maxActionValueWhere(isProfileVisitType)`. Isso diverge do Gerenciador de Anúncios quando a Meta reporta o resultado no campo `results` (com `indicator` = `profile_visit_view`) e o custo em `cost_per_result` — exatamente o número que aparece na coluna "Resultados" do Ads Manager.

Ajustes em `src/lib/meta.server.ts`:

- Em `fetchAdAccountCampaigns`:
  - Adicionar `results`, `cost_per_result` aos `fields` do insights por campanha.
  - Adicionar `objective`, `optimization_goal`, `destination_type`, `effective_status` ao GET `/campaigns`.
  - Prioridade para `profile_visits`:
    1. `results` onde `indicator` corresponde a `profile_visit*` (usar `resultValue`).
    2. `maxActionValueWhere(isProfileVisitType)` como fallback.
  - Prioridade para `cost_per_profile_visit`:
    1. `cost_per_result` no mesmo indicador (média ponderada por `profile_visits`).
    2. `spend / profile_visits`.
- `CampaignRow` ganha: `objective`, `optimization_goal`, `destination_type`.
- Fazer o mesmo em `fetchAdAccountAds` (herdar `objective` da campanha via um `campaignMetaMap`).

## 2. Classificação automática por objetivo

Novo helper `classifyCampaign(c: CampaignRow)` retornando uma `GroupKey`:

- `profile_visits` — `destination_type` contém `INSTAGRAM_PROFILE`/`ON_PAGE` **ou** `optimization_goal` = `PROFILE_VISIT`/`VISIT_INSTAGRAM_PROFILE` **ou** `profile_visits > 0 && profile_visits >= conversions`.
- `leads` — `objective` casa `LEAD|MESSAGE|CONVERSATION|CONVERSIONS`.
- `sales` — `objective` casa `SALES|CATALOG|PURCHASE`.
- `traffic` — `objective` casa `TRAFFIC|LINK_CLICKS`.
- `video` — `objective` casa `VIDEO_VIEWS`.
- `engagement` — `objective` casa `ENGAGEMENT|POST|PAGE_LIKES`.
- `awareness` — `objective` casa `AWARENESS|REACH`.
- fallback: infere pelos dados (`conversions>0`→leads, `clicks>0`→traffic, senão `other`).

Cada grupo tem metadata (label, emoji, cor, métrica primária, métrica de custo, sort primário/secundário).

Ex.: `leads` → primário "Resultado" (conversions), custo "Custo por Resultado", ordenar por conversions desc, custo asc. `profile_visits` → primário "Visitas", custo "Custo por Visita". `sales` → "Compras", "ROAS", "CPA". `traffic` → "Cliques no link", "CPC". `engagement` → "Engajamentos", "Custo por Engajamento". `video` → "Visualizações", "Custo por View".

## 3. Redesenho do `ClientDashboardView`

Manter blocos globais (KPIs, insights, funil, heatmap, comparativo entre períodos) porque agregam a conta inteira. **Substituir** as seções de "Distribuição", "Rankings", "Comparativos entre campanhas", "Investimento vs Resultados" e "Destaques" por uma nova estrutura:

```text
┌─ [emoji] Nome do grupo · N campanhas · Objetivo Meta ─┐
│  KPIs mínimos: Investimento, Resultado, Custo, CTR   │
│  ┌──────────────┬──────────────┬─────────────┐       │
│  │ Donut Invest │ Barras Result│ Pizza Result│       │
│  └──────────────┴──────────────┴─────────────┘       │
│  Ranking de campanhas (do grupo, top 10)             │
│  Ranking de criativos (do grupo, top 10)             │
└───────────────────────────────────────────────────────┘
```

Renderizar uma seção dessas por grupo presente na conta. Ordem: leads → sales → profile_visits → traffic → engagement → video → awareness → other.

## 4. Tooltips completos

Criar `<CampaignTooltip>` (Recharts custom `content`) usado em **todos** os gráficos que plotam campanhas (donut, barras, pizza, stacked). Mostra:

- Nome completo da campanha
- Objetivo (rótulo em pt-BR)
- Resultado principal do grupo (com label)
- Investimento
- Custo por resultado
- Participação no total (%) do dataset atual

Passar o dataset com os objetos completos (não só `{name, value}`) para que o tooltip tenha contexto. Para o donut de investimento, `value = spend`; a `share` é calculada sobre `sum(spend)`.

## 5. Ajustes secundários

- `Highlights`, `WeekdayHeatmap`, `PeriodComparison`, `Funnel` continuam a nível de conta — mantidos.
- `StackedCompare` removido do topo (comparava campanhas de objetivos diferentes); pode reaparecer dentro de cada grupo como opção futura, mas fora do escopo agora.
- `ComparisonBars` de CTR/CPC também sai de fora dos grupos; nada é comparado entre objetivos.

## Arquivos afetados

- `src/lib/meta.server.ts` — extensão de `CampaignRow`/`AdRow`, fetchers, priorização de `results`/`cost_per_result` para visitas.
- `src/lib/metrics.server.ts` — passar novos campos adiante (nenhuma mudança de lógica agregada).
- `src/components/client-dashboard.tsx` — novo agrupamento, componente `<ObjectiveGroup>`, `<CampaignTooltip>`, remover comparativos cross-objetivo.

Sem migrations. Sem novas rotas. Sem novos server functions.

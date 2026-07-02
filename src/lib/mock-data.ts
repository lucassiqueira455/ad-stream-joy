// Mock data for the Etapa 1 (UI validation). Replace with real Meta / Google
// Ads API calls in Etapa 2 and 3.

export type Platform = "meta" | "google";

export type Client = {
  id: string;
  name: string;
  brandColor: string;
  logo: string; // initials shown as avatar
  accounts: { platform: Platform; accountName: string; accountId: string }[];
};

export const clients: Client[] = [
  {
    id: "loja-verde",
    name: "Loja Verde",
    brandColor: "oklch(0.78 0.19 155)",
    logo: "LV",
    accounts: [
      { platform: "meta", accountName: "Loja Verde • Meta", accountId: "act_1029384756" },
      { platform: "google", accountName: "Loja Verde • Google Ads", accountId: "123-456-7890" },
    ],
  },
  {
    id: "estudio-nova",
    name: "Estúdio Nova",
    brandColor: "oklch(0.7 0.2 285)",
    logo: "EN",
    accounts: [
      { platform: "meta", accountName: "Estúdio Nova", accountId: "act_5544332211" },
    ],
  },
  {
    id: "clinica-vitta",
    name: "Clínica Vitta",
    brandColor: "oklch(0.72 0.19 45)",
    logo: "CV",
    accounts: [
      { platform: "google", accountName: "Clínica Vitta • Search", accountId: "987-654-3210" },
      { platform: "meta", accountName: "Clínica Vitta • Awareness", accountId: "act_7788990011" },
    ],
  },
  {
    id: "kombi-cafe",
    name: "Kombi Café",
    brandColor: "oklch(0.75 0.18 25)",
    logo: "KC",
    accounts: [
      { platform: "meta", accountName: "Kombi Café", accountId: "act_2211334455" },
    ],
  },
];

export type DailyPoint = {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  messages: number;
};

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function buildDaily(clientId: string, days = 30): DailyPoint[] {
  const rand = seeded(
    clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
  );
  const out: DailyPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const base = 200 + rand() * 400;
    out.push({
      date: d.toISOString().slice(0, 10),
      spend: Math.round(base * (0.8 + rand() * 0.6)),
      clicks: Math.round(base * (1.5 + rand() * 1.2)),
      impressions: Math.round(base * (40 + rand() * 30)),
      conversions: Math.round(base * (0.03 + rand() * 0.04)),
      messages: Math.round(base * (0.08 + rand() * 0.06)),
    });
  }
  return out;
}

export type Metrics = {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  messages: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
};

export function aggregate(daily: DailyPoint[]): Metrics {
  const t = daily.reduce(
    (acc, d) => {
      acc.spend += d.spend;
      acc.clicks += d.clicks;
      acc.impressions += d.impressions;
      acc.conversions += d.conversions;
      acc.messages += d.messages;
      return acc;
    },
    { spend: 0, clicks: 0, impressions: 0, conversions: 0, messages: 0 },
  );
  return {
    ...t,
    ctr: t.impressions ? (t.clicks / t.impressions) * 100 : 0,
    cpc: t.clicks ? t.spend / t.clicks : 0,
    cpm: t.impressions ? (t.spend / t.impressions) * 1000 : 0,
    cpa: t.conversions ? t.spend / t.conversions : 0,
  };
}

export function getClient(id: string) {
  return clients.find((c) => c.id === id);
}

export type Campaign = {
  name: string;
  platform: Platform;
  status: "active" | "paused";
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
};

export function buildCampaigns(clientId: string): Campaign[] {
  const rand = seeded(clientId.length * 17 + 3);
  const names = [
    "Remarketing — Carrinho",
    "Prospecção — Lookalike 1%",
    "Search — Marca",
    "Search — Genéricos",
    "Awareness — Reels",
    "Mensagens — WhatsApp",
    "Display — Retargeting",
  ];
  return names.map((n, i) => {
    const base = 800 + rand() * 3000;
    return {
      name: n,
      platform: i % 2 === 0 ? "meta" : "google",
      status: rand() > 0.15 ? "active" : "paused",
      spend: Math.round(base),
      clicks: Math.round(base * (1.2 + rand())),
      impressions: Math.round(base * (30 + rand() * 40)),
      conversions: Math.round(base * (0.02 + rand() * 0.05)),
    };
  });
}

export const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const num = (n: number) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export const pct = (n: number) => `${n.toFixed(2)}%`;

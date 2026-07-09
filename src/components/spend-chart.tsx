import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/mock-data";

export type DailyPoint = {
  date: string;
  spend: number;
};

export function SpendChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.22 250)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="oklch(0.55 0.22 250)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="oklch(0.28 0.03 250)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="oklch(0.65 0.02 250)"
            fontSize={11}
            tickFormatter={(d: string) => d.slice(5)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="oklch(0.65 0.02 250)"
            fontSize={11}
            tickFormatter={(v: number) => `R$${Math.round(v / 100) / 10}k`}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            cursor={{ stroke: "oklch(0.55 0.22 250)", strokeWidth: 1 }}
            contentStyle={{
              background: "oklch(0.18 0.03 250)",
              border: "1px solid oklch(0.28 0.03 250)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "oklch(0.65 0.02 250)" }}
            formatter={(v: number) => [money(v), "Investimento"]}
          />
          <Area
            type="monotone"
            dataKey="spend"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth={2}
            fill="url(#spendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { data } from "@/lib/data";

type Row = (typeof data.europe.countries)[number] & { pct: number };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const r = payload[0]?.payload;
  if (!r) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm">
      {r.name}: <span className="font-mono tabular-nums">{r.pct}%</span> of the top European
      country's Smeg searches
    </div>
  );
}

export function EuropeChart() {
  const sorted = [...data.europe.countries].sort((a, b) => b.actual - a.actual);
  const lead = sorted[0]?.actual || 1;
  const rows = sorted.map((r) => ({ ...r, pct: Math.round((r.actual / lead) * 100) }));
  return (
    <div style={{ height: rows.length * 30 + 40 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          layout="vertical"
          data={rows}
          margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)", fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 14, fill: "var(--foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<Tip />} cursor={{ fill: "var(--muted)" }} />
          <Bar
            dataKey="pct"
            fill="var(--pine)"
            barSize={14}
            radius={[0, 4, 4, 0]}
            animationDuration={300}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

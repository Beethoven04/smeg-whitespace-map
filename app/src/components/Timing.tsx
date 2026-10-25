import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { data } from "@/lib/data";
import { SourceChip } from "./SourceChip";
import { ChartNote } from "./ChartNote";

const MODEL_LABEL: Record<string, string> = {
  seasonal_naive: "Same week last year (baseline)",
  train_mean: "Average (baseline)",
  holt_winters_damped: "Holt-Winters seasonal model",
  stl_arima: "STL + AR(1)",
};

/** Seasonal demand in Sweden: 2 years of weekly Smeg search interest + 12-week forecast (80% band). */
export function Timing() {
  const t = data.timing;
  const chosen = t.holdout.metrics.find((m) => m.model === t.chosen_model);
  const naive = t.holdout.metrics.find((m) => m.model === "seasonal_naive");
  const gain = chosen && naive ? Math.round((1 - chosen.mae / naive.mae) * 100) : 0;
  const bfYears = t.peak_weeks_by_year.filter((p) => p.contains_black_friday).length;
  const nov = t.monthly_profile.find((m) => m.month === 11);
  const low = [...t.monthly_profile].sort((a, b) => a.pct_vs_annual_mean - b.pct_vs_annual_mean)[0];
  const rows = [
    ...t.history.map((h) => ({ date: h.date, actual: h.value })),
    ...(t.beats_seasonal_naive
      ? t.forecast.map((f) => ({
          date: f.date,
          forecast: f.mean,
          band: [f.lo80, f.hi80] as [number, number],
        }))
      : []),
  ];

  return (
    <div className="space-y-10">
      <p className="max-w-3xl font-display text-3xl leading-snug">
        Smeg demand in Sweden peaks in Black Friday week, in {bfYears} of{" "}
        {t.peak_weeks_by_year.length} years. November runs{" "}
        <span className="text-pine">+{Math.round(nov?.pct_vs_annual_mean ?? 0)}%</span> above the
        yearly average; {low?.name} is the low point ({Math.round(low?.pct_vs_annual_mean ?? 0)}%).
      </p>

      <div className="grid grid-cols-[1fr_340px] gap-12">
        <div>
          <div className="mb-3 flex gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-[3px] w-5 bg-pine" />
              Weekly search interest, Sweden
            </span>
            {t.beats_seasonal_naive && (
              <span className="flex items-center gap-2">
                <span className="h-3 w-5 rounded-sm bg-pine/15" />
                Forecast, 12 weeks (80% range)
              </span>
            )}
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(0, 7)}
                  minTickGap={48}
                  tick={{
                    fontSize: 12,
                    fill: "var(--muted-foreground)",
                    fontFamily: "JetBrains Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  width={32}
                  tick={{
                    fontSize: 12,
                    fill: "var(--muted-foreground)",
                    fontFamily: "JetBrains Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, borderColor: "var(--border)", fontSize: 13 }}
                  formatter={(v: number | number[]) => (Array.isArray(v) ? `${v[0]}–${v[1]}` : v)}
                />
                <Area
                  dataKey="band"
                  stroke="none"
                  fill="var(--pine)"
                  fillOpacity={0.12}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="actual"
                  stroke="var(--pine)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="forecast"
                  stroke="var(--pine)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            {t.target} <SourceChip id={t.source_id} label={t.source_id} />
          </p>
          <ChartNote
            shows={
              <>
                Solid line: how much Swedes searched for Smeg each week. The biggest spikes are late
                November (Black Friday week) and the week before Christmas. Dashed line: our
                forecast for the next 12 weeks; the shaded band is where the real value should land
                8 times out of 10.
              </>
            }
            soWhat={
              <>
                The same peak comes every year, so campaigns and stock can be planned months ahead
                instead of reacting.
              </>
            }
          />
        </div>

        <aside className="space-y-8">
          <div>
            <h3 className="font-display text-2xl">Campaign calendar</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Each bar = how far that month is above (dark) or below (light) a normal month,
              averaged over 5 years. Hover for the %.
            </p>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={t.monthly_profile}
                  margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tickFormatter={(n: string) => n.slice(0, 1)}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(v: number) => `${v > 0 ? "+" : ""}${v}%`}
                    contentStyle={{ borderRadius: 8, borderColor: "var(--border)", fontSize: 13 }}
                  />
                  <Bar dataKey="pct_vs_annual_mean" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                    {t.monthly_profile.map((m) => (
                      <Cell
                        key={m.month}
                        fill={m.pct_vs_annual_mean >= 0 ? "var(--pine)" : "var(--border)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <ul className="divide-y divide-border border-y border-border text-[15px]">
            <li className="py-2.5">
              <b>Late October:</b> start campaigns before the November ramp.
            </li>
            <li className="py-2.5">
              <b>Black Friday week:</b> demand is already at its peak, so availability matters more
              than discounts.
            </li>
            <li className="py-2.5">
              <b>Week before Christmas:</b> second peak (+
              {Math.round(t.top_iso_weeks.find((w) => w.iso_week === 52)?.pct_vs_annual_mean ?? 0)}
              %).
            </li>
            <li className="py-2.5">
              <b>{low?.name}:</b> lowest search interest of the year; avoid launching new products
              then.
            </li>
          </ul>
        </aside>
      </div>

      <div className="max-w-2xl">
        <h3 className="mb-3 font-display text-2xl">
          Forecast test: last {t.holdout.weeks} weeks, not seen by the model
        </h3>
        <table className="w-full text-[15px]">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 font-medium">Method</th>
              <th className="py-2 text-right font-medium">Avg. error (MAE)</th>
              <th className="py-2 text-right font-medium">MAPE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border border-y border-border">
            {t.holdout.metrics.map((m) => (
              <tr
                key={m.model}
                className={m.model === t.chosen_model ? "font-medium" : "text-muted-foreground"}
              >
                <td className="py-2.5">
                  {MODEL_LABEL[m.model] ?? m.model}
                  {m.model === t.chosen_model && " ✓"}
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums">{m.mae}</td>
                <td className="py-2.5 text-right font-mono tabular-nums">{m.mape_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm text-muted-foreground">
          We hid the last year from every method, let each predict it, and measured the average miss
          in points on the 0–100 scale (lower is better).{" "}
          {t.beats_seasonal_naive
            ? `The chosen model is ${gain}% more accurate than "same week last year". The forecast uses a fixed 52-week season, so read the peak as "late November", not an exact week.`
            : "No model beat the simple baseline, so no forecast is shown."}
        </p>
      </div>
    </div>
  );
}

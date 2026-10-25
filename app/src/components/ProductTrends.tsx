import trends from "@/data/product_trends.json";
import { SourceChip } from "./SourceChip";
import { ChartNote } from "./ChartNote";

const pct = (n: number | null) => (n === null ? "–" : `${n > 0 ? "+" : ""}${n.toFixed(0)}%`);

/** Which Smeg products are rising or falling in Swedish search demand, plus the fastest-rising related queries. */
export function ProductTrends() {
  const products = trends.products;
  const up = products.filter((p) => (p.change_pct ?? 0) > 0);
  const down = products.filter((p) => (p.change_pct ?? 0) < 0);
  const max = Math.max(...products.map((p) => p.avg_interest_last_12m));

  return (
    <div className="space-y-8">
      <p className="max-w-3xl font-display text-3xl leading-snug">
        Rising: {up.map((p) => p.product.toLowerCase()).join(", ")}.{" "}
        {down.length > 0 && <>Falling: {down.map((p) => p.product.toLowerCase()).join(", ")}.</>}
      </p>
      <div className="grid grid-cols-[1.3fr_1fr] gap-12">
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <table className="w-full text-[15px]">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Search interest, last 12 months</th>
                <th className="px-5 py-3 text-right font-medium">vs previous 12 months</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.query} className="border-b border-border last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium">{p.product}</div>
                    <div className="font-mono text-xs text-muted-foreground">“{p.query}”</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-32 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-pine"
                          style={{ width: `${(p.avg_interest_last_12m / max) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono tabular-nums">{p.avg_interest_last_12m}</span>
                    </div>
                  </td>
                  <td
                    className={`px-5 py-4 text-right font-mono tabular-nums ${(p.change_pct ?? 0) >= 0 ? "text-success" : "text-danger"}`}
                  >
                    {pct(p.change_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="font-display text-2xl">Rising searches around Smeg</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Fastest-growing related queries in Sweden, past 5 years. “Breakout” = more than +5,000%.
          </p>
          <ul className="divide-y divide-border border-y border-border">
            {trends.rising_queries.slice(0, 10).map((q) => (
              <li key={q.query} className="flex justify-between py-2 text-[15px]">
                <span>{q.query}</span>
                <span className="font-mono tabular-nums text-success">{q.change}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ChartNote
        shows={
          <>
            Left: how much Swedes search for each Smeg product (all five on one scale) and how that
            changed over the last 12 months. Right: the searches around Smeg that grew fastest over
            5 years.
          </>
        }
        soWhat={
          <>
            Put campaign money behind the growing small appliances (
            {up.map((p) => p.product.toLowerCase()).join(", ")}). The right-hand list shows what
            shoppers look for next: check it against Smeg's range before the next assortment
            decision.
          </>
        }
      />
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {trends.note} <SourceChip id={trends.source_id} label={trends.source_id} />
      </p>
    </div>
  );
}

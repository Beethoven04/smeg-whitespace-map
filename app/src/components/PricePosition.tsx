import { data } from "@/lib/data";
import { SourceChip } from "./SourceChip";

const fmt = (n: number) => `${n.toLocaleString("sv-SE")} kr`;

/** Smeg vs all brands on Prisjakt: popularity rank and price premium per category. */
export function PricePosition() {
  const { categories, note, source_id } = data.prices;
  const leaders = categories.filter((c) => c.smeg_best_rank <= 10);
  const laggards = categories.filter((c) => c.smeg_best_rank > 10);
  const premiums = leaders.map((c) => c.premium_x);

  return (
    <div className="space-y-8">
      {leaders.length > 0 && (
        <p className="max-w-3xl font-display text-3xl leading-snug">
          In {leaders.map((c) => c.category + "s").join(", ")}, Smeg is among the most popular
          products while costing{" "}
          <span className="text-pine">
            {Math.min(...premiums)}–{Math.max(...premiums)}×
          </span>{" "}
          the category median price.
          {laggards.length > 0 && (
            <> In {laggards.map((c) => c.category + "s").join(" and ")}, Smeg is barely visible.</>
          )}
        </p>
      )}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        <table className="w-full text-[15px]">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Smeg best popularity rank</th>
              <th className="px-5 py-3 font-medium">Smeg median price</th>
              <th className="px-5 py-3 font-medium">Category median</th>
              <th className="px-5 py-3 font-medium">Premium</th>
              <th className="px-5 py-3 font-medium">Most popular rivals</th>
              <th className="px-5 py-3 font-medium">Reading</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.category} className="border-b border-border align-top last:border-0">
                <td className="px-5 py-4 font-medium capitalize">{c.category}</td>
                <td className="px-5 py-4 font-mono tabular-nums">
                  #{c.smeg_best_rank}{" "}
                  <span className="text-muted-foreground">of {c.n_products}</span>
                </td>
                <td className="px-5 py-4 font-mono tabular-nums">{fmt(c.smeg_median_sek)}</td>
                <td className="px-5 py-4 font-mono tabular-nums text-muted-foreground">
                  {fmt(c.category_median_sek)}
                </td>
                <td className="px-5 py-4 font-mono tabular-nums">×{c.premium_x}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">
                  {c.top_rivals.map((r) => `${r.brand} ${fmt(r.price_sek)}`).join(" · ")}
                </td>
                <td
                  className={`px-5 py-4 text-sm ${c.smeg_best_rank <= 10 ? "text-success" : "text-warning"}`}
                >
                  {c.smeg_best_rank <= 10
                    ? "Premium accepted: hold price, protect availability"
                    : "Low visibility: push placement before cutting price"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {note} <SourceChip id={source_id} label={source_id} />
      </p>
    </div>
  );
}

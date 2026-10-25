import { data, type County } from "@/lib/data";
import { countyOpportunity, formatSek } from "@/lib/value";

/** County ranking as a decision table: demand, store coverage vs Sweden, SEK value and the action. */
export function CountyTable({ onSelect }: { onSelect: (c: County) => void }) {
  const { sweden, value } = data;
  const national = sweden.national_retailers_per_100k_hh;
  const rows = [...sweden.counties].sort((a, b) => a.rank - b.rank);
  const sorted = [...sweden.counties].map((c) => c.demand_index).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  return (
    <div>
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        <table className="w-full text-[15px]">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">County</th>
              <th className="px-5 py-3 font-medium">Smeg searches vs typical county</th>
              <th className="px-5 py-3 font-medium">Smeg stores per household vs Sweden</th>
              <th className="px-5 py-3 text-right font-medium">Extra revenue / year</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => {
              const diff = Math.round((c.retailers_per_100k_hh / national - 1) * 100);
              const gap = diff < 0;
              const sek = countyOpportunity(c, value, national, value.capture_rate_default);
              return (
                <tr
                  key={c.code}
                  onClick={() => onSelect(c)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="animate-in fade-in slide-in-from-bottom-1 cursor-pointer border-b border-border fill-mode-both duration-300 last:border-0 hover:bg-muted"
                >
                  <td className="px-5 py-4 font-mono tabular-nums text-muted-foreground">
                    {String(c.rank).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4 font-medium">{c.name}</td>
                  <td className="px-5 py-4">
                    {(() => {
                      const d = Math.round((c.demand_index / median - 1) * 100);
                      return (
                        <span
                          className={`font-mono tabular-nums ${d > 0 ? "text-pine" : "text-muted-foreground"}`}
                        >
                          {d > 0 ? "+" : d === 0 ? "±" : ""}
                          {d}%
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-4 font-mono tabular-nums">
                    <span className={gap ? "text-danger" : "text-muted-foreground"}>
                      {diff > 0 ? "+" : diff === 0 ? "±" : ""}
                      {diff}%
                    </span>
                    <span className="ml-2 font-sans text-sm text-muted-foreground">
                      {c.retailers} stores
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-mono tabular-nums">
                    {sek > 0 ? formatSek(sek) : <span className="text-muted-foreground">–</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${gap ? "bg-pine text-pine-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {gap ? "Add retailer / pop-up" : "Protect share"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Extra revenue / year: if the county had as many Smeg stores per household as Sweden (
        {national} per 100,000), counting half of the new sales (assumption). Searches: Google
        Trends; stores: Smeg's store locator.
      </p>
    </div>
  );
}

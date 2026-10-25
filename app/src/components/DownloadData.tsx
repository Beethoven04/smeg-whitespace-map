import { data } from "@/lib/data";
import { countyOpportunity } from "@/lib/value";

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** County ranking as CSV (opens in Excel, Power BI, Sheets) and the full dataset as JSON. */
function countiesCsv() {
  const { sweden, value } = data;
  const national = sweden.national_retailers_per_100k_hh;
  const header = [
    "rank",
    "county",
    "whitespace_score",
    "search_interest_0_100",
    "expected_interest",
    "smeg_retailers",
    "retailers_per_100k_households",
    "national_retailers_per_100k_households",
    "households",
    "new_dwellings_per_1000",
    `revenue_opportunity_sek_at_${Math.round(value.capture_rate_default * 100)}pct_capture`,
    "recommended_action",
  ];
  const rows = [...sweden.counties]
    .sort((a, b) => a.rank - b.rank)
    .map((c) => [
      c.rank,
      c.name,
      c.score,
      c.demand_index,
      c.expected,
      c.retailers,
      c.retailers_per_100k_hh,
      national,
      c.households,
      c.dwellings_per_1000,
      Math.round(countyOpportunity(c, value, national, value.capture_rate_default)),
      c.action,
    ]);
  const esc = (v: string | number) =>
    typeof v === "string" && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v);
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function DownloadData() {
  const day = data.generated_at.slice(0, 10);
  const btn =
    "rounded-[10px] border border-border bg-card px-4 py-2 text-sm font-medium transition-colors duration-150 hover:border-pine";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={btn}
        onClick={() => download(`smeg-counties-${day}.csv`, "text/csv", countiesCsv())}
      >
        Download county ranking (CSV)
      </button>
      <button
        type="button"
        className={btn}
        onClick={() =>
          download(`smeg-whitespace-${day}.json`, "application/json", JSON.stringify(data, null, 2))
        }
      >
        Download all data (JSON)
      </button>
      <span className="text-sm text-muted-foreground">
        Opens in Excel, Power BI or Google Sheets. Sources included.
      </span>
    </div>
  );
}

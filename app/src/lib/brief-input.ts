import { data, type County } from "@/lib/data";

/** The exact facts the AI brief may use. Same county always gives the same string (needed for the demo cache). */
export function briefInput(c: County) {
  const counties = data.sweden.counties;
  const sorted = [...counties].map((x) => x.demand_index).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return JSON.stringify({
    county: c.name,
    rank_of_21: c.rank,
    whitespace_score_0_to_1: c.score,
    smeg_search_interest_0_100: { value: c.demand_index, sweden_median: median, source: "S1" },
    model_expected_interest: {
      value: c.expected,
      note: "ridge model, out-of-sample",
      source: "S1, S2, S3, S4",
    },
    smeg_retailers: {
      count: c.retailers,
      per_100k_households: c.retailers_per_100k_hh,
      national_per_100k_households: data.sweden.national_retailers_per_100k_hh,
      source: "S5",
    },
    households: { value: c.households, source: "S2" },
    median_household_disposable_income_ksek_2024: { value: c.income_median_tkr, source: "S3" },
    new_dwellings_per_1000_residents_2025: { value: c.dwellings_per_1000, source: "S4" },
  });
}

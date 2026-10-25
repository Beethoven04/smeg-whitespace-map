import { describe, it, expect } from "vitest";
import { revenueOpportunity } from "@/lib/value";

const v = { smeg_se_revenue_sek: 1_000_000, se_households: 1000, top_n: 2 };

describe("revenueOpportunity", () => {
  it("sums households × rev/hh × coverage gap × capture over top_n by rank", () => {
    const counties = [
      { rank: 2, households: 100, retailers_per_100k_hh: 1 }, // 100*1000*0.5*0.5 = 25000
      { rank: 1, households: 200, retailers_per_100k_hh: 0 }, // 200*1000*1*0.5 = 100000
      { rank: 3, households: 999, retailers_per_100k_hh: 0 }, // excluded
    ];
    expect(revenueOpportunity(counties, v, 2, 0.5)).toBe(125000);
  });
  it("gives zero for counties above the national retailer level", () => {
    expect(
      revenueOpportunity([{ rank: 1, households: 100, retailers_per_100k_hh: 5 }], v, 2, 1),
    ).toBe(0);
  });
});

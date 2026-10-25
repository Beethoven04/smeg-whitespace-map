export type ValueCounty = { rank: number; households: number; retailers_per_100k_hh: number };
export type ValueInputs = { smeg_se_revenue_sek: number; se_households: number; top_n: number };

/** Revenue per household × households × coverage gap × capture rate, summed over topGapCounties. */
export function countyOpportunity(
  c: ValueCounty,
  v: ValueInputs,
  national: number,
  capture: number,
) {
  if (!v.se_households || !national) return 0;
  const perHh = v.smeg_se_revenue_sek / v.se_households;
  const gap = Math.max(0, 1 - c.retailers_per_100k_hh / national);
  return c.households * perHh * gap * capture;
}

export function revenueOpportunity(
  counties: ValueCounty[],
  v: ValueInputs,
  national: number,
  capture: number,
) {
  return topGapCounties(counties, v.top_n, national).reduce(
    (s, c) => s + countyOpportunity(c, v, national, capture),
    0,
  );
}

/** The top_n counties by rank that have a real retail gap (below the national retailer density). */
export function topGapCounties<T extends ValueCounty>(
  counties: T[],
  topN: number,
  national: number,
) {
  return [...counties]
    .filter((c) => c.retailers_per_100k_hh < national)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, topN);
}

export function formatSek(n: number) {
  if (n >= 1e9) return `SEK ${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `SEK ${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `SEK ${Math.round(n / 1e3)}k`;
  return `SEK ${Math.round(n)}`;
}

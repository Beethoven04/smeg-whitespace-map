# Economic value: revenue opportunity from closing Smeg's retail gaps in Sweden

All inputs are open data. The calculation runs in the app (`src/lib/value.ts`) from `data/clean/app_data.json`, which `scripts/20_build_app_data.py` produces.

## Formula

For each of the **top 3 ranked counties that have fewer Smeg retailers per household than the national level**:

```
opportunity_c = households_c
              × (Smeg Sweden revenue ÷ Swedish households)        revenue per household
              × max(0, 1 − retailers_per_100k_hh_c ÷ national)     retail coverage gap
              × capture rate                                       assumption
```

Total = the sum over those 3 counties.

## Inputs

| Input | Value | Source |
|---|---|---|
| Smeg Sweden revenue | 470,292 kSEK (SMEG Nordic AB total revenue, 2025) | Allabolag / Bolagsverket (C1) |
| Swedish households | 5,002,567 (sum of 21 counties, 2025) | SCB HE0111 (S2) |
| Revenue per household | SEK 94.01 | computed |
| Smeg retailers | 503 of 504 stores mapped to a county | Smeg store locator (R1) + OpenStreetMap (R2) |
| National retailer density | 10.05 per 100k households | computed |
| Capture rate | **50% (assumption)**, adjustable slider from 10% to 100% | none, labelled as an assumption |

## Result (capture 50%)

| County | Households | Retailers / 100k hh | Opportunity |
|---|---|---|---|
| Stockholm | 1,127,801 | 6.92 | SEK 16.5M |
| Uppsala | 193,944 | 7.22 | SEK 2.6M |
| Kronoberg | 95,795 | 7.31 | SEK 1.2M |
| **Total** | | | **≈ SEK 20.3M per year** |

## Assumptions and limits

1. **Same spend per household:** a county with average retail coverage generates average Smeg revenue per household. Closing the coverage gap moves the county toward that average.
2. **Capture rate:** not every new retailer adds full sales. Some sales move from other shops or online. 50% is a cautious middle value. The slider shows the whole range.
3. **Revenue scope:** SMEG Nordic AB revenue is used as Swedish revenue. It may include some sales outside Sweden, so this is an upper bound for revenue per household. The figure is total revenue (Omsättning); net sales (469,978 kSEK) would lower the result by 0.07 %.
4. **Demand proxy:** search interest (Google Trends) ranks the counties. It is a proxy for demand, not sales.
5. **Purpose:** the estimate is for prioritisation, not a forecast.

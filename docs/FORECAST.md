# Smeg Sweden: seasonal demand forecast

Script: `scripts/11_forecast.py` (seed 42). Output: `data/clean/forecast_se.json`.

## What is forecast
Weekly Google Trends interest in the Smeg topic in Sweden, 5 years (2021-10-24 to 2026-10-11, 260 complete weeks; the partial week 2026-10-18 is dropped).
This is **relative search interest, a proxy for demand, not sales**. Google rescales the whole series so its highest week = 100. So 50 means "half the busiest week in this 5-year window", not a count of searches.

## Holdout test (last 52 weeks, 2025-10-19 to 2026-10-11)
Models were trained on the first 208 weeks and scored on the last 52. The model was chosen by MAE only.

| Model | MAE | MAPE | RMSE | Beats seasonal naive |
|---|---|---|---|---|
| Seasonal naive (same week last year), baseline | 5.33 | 11.3% | 7.02 | (baseline) |
| Training mean, baseline | 10.02 | 18.6% | 15.83 | no |
| **Holt-Winters, damped additive trend + additive seasonality (52 weeks)** | **4.09** | **8.3%** | **6.72** | **yes** |
| STL + AR(1) | 9.11 | 20.4% | 10.40 | no |

Holt-Winters beats seasonal naive by 23% on MAE. It is the chosen model. It was then refit on all 260 weeks to forecast 12 weeks ahead (2026-10-18 to 2027-01-03).

**80% interval:** 2000 simulated future paths from the fitted Holt-Winters model, with additive errors drawn from the fitted residual variance. Lower and upper bounds = 10th and 90th percentile. Clipped to 0-100.

## Seasonality (descriptive, all 5 years)
- Annual mean index: 36.3.
- **Peak months: November +54% and December +38% vs the annual mean.** January is slightly above average (+6%).
- **Trough: June -21%.** March to July are all 10-21% below average.
- **Peak week: the Black Friday week every year.** ISO week 47 averages +88% vs the annual mean, week 48 +78%. A second, smaller peak is the week before Christmas (ISO week 52, +72%).
- The yearly peak is the same each year: the week containing Black Friday in 2022 (w47, index 55), 2023 (w47, 77), 2024 (w48, 80), 2025 (w48, 100). The ISO week moves only because Black Friday moves in the calendar.

## Year over year
Last 52 weeks mean vs previous 52 weeks mean: **+9.3%**. The 2025 Black Friday week was the all-time high (100).

## Limitations
- Proxy, not sales. Search interest can rise without purchases.
- Values are relative within this one query. A new download can rescale and slightly change all values.
- **Data check: the "worldwide" file is byte-identical to the Sweden file.** One of the two downloads is mislabelled or the fetch used the same geo twice. We assume the Sweden file is correct, but the geo is not verified. No Sweden vs worldwide comparison was done.
- Holt-Winters uses a fixed 52-week season. Black Friday moves by a few days each year, so the model puts the 2026 peak in the week of 2026-11-15 (74, 80% range 68-81). The real peak is more likely the week of 2026-11-22, which contains Black Friday 2026 (27 Nov). Read the forecast as "the peak is in the second half of November", not as an exact week.
- Only 4 full seasons of training data before the holdout. Interval widths assume errors stay like the past; shocks (campaigns, stock-outs) are not modelled.

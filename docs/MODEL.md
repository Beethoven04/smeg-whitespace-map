# Model: expected Smeg interest per region (demand proxy)

Scripts: `scripts/04_build_model_inputs.py` (join), `scripts/10_model.py` (model). Fixed seed 42. Re-run both to reproduce every number below.

## What we model
- **Target (proxy, not sales):** Google Trends interest in the topic "Smeg", past 5 years, 0-100 (`trends_5y`). Source G1 (countries), G2 (Swedish counties) in `docs/SOURCES.md`.
- **Expected value:** what interest a region "should" have given its economic and housing structure.
- **Residual = actual - expected (out-of-fold).** Negative = less interest than its structure predicts (candidate under-served). Positive = over-performing. `gap_pct = residual / expected * 100`.

## Features (max 4, small n)
| Scope | Feature | Source file |
|---|---|---|
| Europe | log GDP per capita (PPS), log household consumption per capita (PPS), log population density, dwelling permits per 1,000 inhabitants | `data/clean/europe_features.csv` (Eurostat E1-E5, 2024) |
| Sweden | log median household disposable income, log households, households per capita, dwellings completed per 1,000 | `data/clean/sweden_county_features.csv` (SCB S1-S4) |

Joins: Europe on ISO2 (31 of 31 matched Trends). Sweden: ISO 3166-2:SE letter code to SCB 2-digit code, explicit table `data/clean/se_iso_scb_map.csv`; all 21 names checked against `se_county_map.csv` (assert passes).

Missing values: Switzerland, Iceland and the UK lack GDP/consumption/permits in Eurostat. We **drop** them (no imputation), so Europe n = 28.

## Method
- Mean baseline vs RidgeCV (alphas 10^-3..10^3, 25 values) in an sklearn Pipeline with StandardScaler. Scaling and alpha choice happen inside each training fold; the held-out region is never used for tuning.
- Leave-one-out CV: every "expected" value is predicted by a model that never saw that region.
- Stability: 200 bootstrap resamples (seed 42); refit, predict all regions, count how often each region is in the top 5 most negative (under-served) and top 5 most positive (over-performing) residuals.
- Momentum (descriptive only): `momentum = trends_12m - trends_5y`. The two windows are separate queries with their own 0-100 scale, so raw momentum is mostly a scale shift. `momentum_index` = (12m/5y) / median(12m/5y); above 1 means interest rose more than in the median region.

## Results (out-of-fold)
| Scope | n | Baseline MAE | Ridge MAE | Ridge R² | alpha | Beats baseline |
|---|---|---|---|---|---|---|
| Europe | 28 | 13.25 | 12.58 | 0.04 | 31.6 | yes, barely |
| Sweden | 21 | 7.36 | 6.41 | 0.27 | 10 | yes |

Plain reading:
- **Europe:** the model is only 5% better than guessing the average, and explains about 4% of the variation. Structure (income, density, housing) does **not** explain why Sweden, Belgium, Portugal and the Netherlands search for Smeg so much. Treat European "expected" values as weak; brand history and distribution likely matter more than economics.
- **Sweden:** 13% lower error than the baseline, R² 0.27. Modest but real. More households and higher income go with more interest; a higher households-per-capita ratio (smaller households) goes with less.

Standardized coefficients (full fit; LOO min..max):
- Europe: log GDP pc +2.2 (1.8..3.2), log consumption pc +2.7 (2.3..3.5), log density +0.8 (0.1..2.1), permits per 1,000 -0.8 (-2.0..-0.2).
- Sweden: log income +2.0 (**-4.9..2.3, sign unstable**), log households +2.0 (1.1..3.8), households per capita -3.2 (-9.4..-2.7), dwellings per 1,000 +0.6 (0.2..3.3).

## Top 5 under-served (most negative residual)
Europe: Luxembourg -17.1 (in top 5 in 49% of bootstraps), Austria -15.2 (94%), Romania -14.4 (81%), Hungary -13.8 (50%), Cyprus -13.1 (34%). Slovenia (67%) and Germany (56%) are almost as often in the top 5: the Europe order beyond Austria and Romania is unstable.

Sweden: Västernorrland -11.8 (86.5%), Västerbotten -10.3 (91%), Jönköping -8.3 (80.5%), Dalarna -5.9 (64%), Västmanland -5.7 (57%).

Over-performing: Europe Sweden +37.5, Belgium +28.7, Portugal +20.4; Sweden Stockholm +20.9, Gotland +15.3, Skåne +15.2.

Full tables: `data/clean/model_europe.csv`, `data/clean/model_sweden.csv`; metrics: `data/clean/model_metrics.json`.

## Limitations
- **Proxy, not sales.** Search interest is not purchases. It includes people searching for spare parts, reviews, or news.
- **Relative scales.** Country values are normalized within one worldwide query (100 = the highest country worldwide); county values are normalized within Sweden only (Stockholm = 100). Europe and Sweden numbers cannot be compared with each other. Small regions with low search volume are noisier, and Google rounds to integers.
- **Small n** (28 and 21). Coefficients have wide ranges; rankings beyond the top 2-3 shift between bootstraps. Bootstrap shares use in-sample residuals of each refit, so they measure ranking stability, not prediction error.
- **Dropped countries:** CH, IS, UK are not modelled (missing Eurostat features).
- **Residual is not whitespace on its own.** Whitespace needs the retail-presence gap too (PLAN.md score). A negative residual can also mean low brand awareness or a weak market, not unmet demand.

# Data audit

> This is the independent audit as it was run on 24 Oct 2026, 13:58-14:05, kept unchanged as a record. Every FAIL below was fixed the same afternoon. See [Resolution](#resolution) at the end. File paths refer to the original two-repo layout (`team/` is now `pipeline/`, `~/bling/app` is now `app/`).

Auditor run: 2026-10-24 13:58-14:05. Team repo at `2783c78`, app repo at `1e3b13b`.
Scripts 01, 02, 03, 05 were not re-run (network). Scripts 04, 06, 10, 20 were re-run in a scratch copy of the repo.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | SOURCES.md covers every raw/clean file | **FAIL** |
| 1b | Live spot-checks (SCB, Eurostat, allabolag, Smeg locator) | PASS (1 warning) |
| 2 | Clean files reproducible (04, 06, 10, 20) | PASS |
| 3 | No hand-typed data numbers in scripts | PASS (1 warning) |
| 4 | Model: OOF metrics, baseline, scaler in CV, seed, metrics match MODEL.md | PASS (1 warning) |
| 5 | Region joins, no silent drops | PASS |
| 6 | Economic value: assumptions named, arithmetic recomputed | **FAIL** (docs) / PASS (arithmetic) |
| 7 | app_data.json in app identical to team copy | PASS |
| 8 | Store to county mapping plausible | PASS |
| 9 | App text claims supported by data (`app/src/routes/index.tsx`) | **FAIL** |

## 1. SOURCES.md coverage: FAIL

`docs/SOURCES.md` has no row for these files. The `_meta_` SCB files count as covered by "(+ _meta_)".

Raw files (manual uploads):
- `data/raw/gtrends_smeg_se_by_county_12m.csv.xlsx`, `gtrends_smeg_se_by_county_5y.csv.xlsx`, `gtrends_smeg_se_over_time_5y.csv.xlsx`, `gtrends_smeg_se_related_top_5y.csv.xlsx`, `gtrends_smeg_se_topics_rising_5y.csv.xlsx`, `gtrends_smeg_se_topics_top_5y.csv.xlsx`
- `data/raw/smeg_espresso_machines_se.csv`, `smeg_kettles_se.csv`, `smeg_refrigerators_se.csv`, `smeg_stand_mixers_se.csv`, `smeg_toasters_se.csv` (Prisjakt data; removed from the public repo)
- `data/raw/smeg_group_revenue.csv`

Clean files:
- `data/clean/smeg-retailer-listings_v2.md` (manual upload, no source; removed from the public repo)
- Derived files with no row: `app_data.json`, `europe_features.csv`, `model_input_europe.csv`, `model_input_sweden.csv`, `model_europe.csv`, `model_sweden.csv`, `model_metrics.json`, `se_county_map.csv`, `se_iso_scb_map.csv`, `sweden_county_features.csv`. MODEL.md names some of them. Add a "derived files" section to SOURCES.md that lists script and inputs.

None of the unlisted manual uploads are read by scripts 04-20, so they do not reach the app.

## 1b. Live spot-checks: PASS

| Value | Our file | Live source | Match |
|---|---|---|---|
| Stockholm households 2025 (SCB HE0111 HushallT26, 01/TOT/TOTAL) | 1,127,801 | 1,127,801 (API POST, table updated 2026-04-17) | yes |
| Skåne population 2025 (SCB BE0101 BefolkningCKM, 12/TotSA) | 1,433,083 | 1,433,083 | yes |
| Sweden population 1 Jan 2024 (Eurostat tps00001) | 10,551,707 | 10,551,707 | yes |
| SMEG Nordic AB 2025, allabolag | 470,292 tkr | Omsättning 470,292; Nettoomsättning 469,978 | yes, see warning |
| Store: ELON Storuman | Järnvägsgatan 6, 92331 Storuman | same, page exists | yes |
| Store: Kök och Vitvaror i Falun AB | Åsgatan 8, 79171 Falun | same, page exists | yes |
| Store: Elgiganten Lidköping | Änghagsgatan 1, 53140 Lidköping | same, page exists | yes |

Warning: `data/raw/smeg_nordic_ab.csv` (`revenue_ksek` 470,292) is allabolag "Omsättning", which includes other operating income. Net sales (Nettoomsättning) is 469,978 tkr, the figure in `data/raw/smeg_se_company.csv`. The two raw files disagree on what "revenue" is. Effect on value: -0.07% (SEK 20.65M instead of 20.66M). Prefer net sales and say so in SOURCES.md C1.

## 2. Reproducibility: PASS

Re-run of 04, 06 (cache), 10, 20 in a scratch copy. Every file in `data/clean/` is byte-identical except `app_data.json`, which differs only in `generated_at`. Script 10 output matches `docs/MODEL.md` (Europe MAE 13.25 / 12.58, R² 0.037; Sweden 7.36 / 6.41, R² 0.27; alpha 31.6 / 10).

## 3. Hand-typed numbers: PASS (warning)

No literal data arrays. `scripts/04_build_model_inputs.py:19` `ISO_TO_SCB` is a code table, checked by an assert against `se_county_map.csv`. Constants are named (`SEED`, `N_BOOT`, `TOP_K`, `TARGET_YEAR`).
Warning: `scripts/20_build_app_data.py` hardcodes `"capture_rate_default": 0.5` and `"top_n": 3` inline. The UI labels the capture rate as an assumption, but there is no named constant and no entry in VALUE.md.

## 4. Model: PASS (warning)

`scripts/10_model.py:29-31`: StandardScaler and RidgeCV in one Pipeline, LOO `cross_val_predict`, mean DummyRegressor baseline, seed 42. Features do not use the target (momentum is descriptive only).
Warning: MODEL.md says Västernorrland is in the top 5 in "87%" of bootstraps. `model_sweden.csv` has 0.865, `20_build_app_data.py` rounds it to 0.86, and the app shows "86%". Use the same rounding in both places.

## 5. Joins: PASS

Europe 31/31 joined to Trends, then 28 after dropping CH, IS, GB (documented). Sweden 21/21, the assert passes. Stores: 504 scraped, 503 mapped, 1 unmatched ("Lagan", Elgiganten Ljungby, postcode 34150, actually Kronobergs län). This store is excluded from the counts silently in the UI.

## 6. Economic value

Docs: **FAIL**. `docs/VALUE.md` contains only the placeholder line. No formula, assumptions or result are written there.

Arithmetic: PASS. Current rule (`app/src/lib/value.ts` `topGapCounties`, app commit 1e3b13b): top 3 by rank with `retailers_per_100k_hh < national`, so Stockholm, Uppsala and Kronoberg.
- Revenue per household = 470,292,000 / 5,002,567 = SEK 94.01
- Stockholm 1,127,801 × 94.01 × (1 − 6.9/10.1) × 0.5 = SEK 16.79M
- Uppsala 193,944 × 94.01 × (1 − 7.2/10.1) × 0.5 = SEK 2.62M
- Kronoberg 95,795 × 94.01 × (1 − 7.3/10.1) × 0.5 = SEK 1.25M
- **Total SEK 20,661,877. The app shows SEK 20.7M. Confirmed.** (The old rule, top 3 by rank including Skåne with gap 0, gave SEK 19.4M.)

Warning: the app computes the gap from values rounded to 1 decimal (national 10.1 instead of 10.055, county densities rounded). With unrounded values the total is **SEK 20.35M**, so the screen overstates it by 1.5%. Fix: export unrounded density values for the calculation, or compute the value in script 20.

## 7. App copy: PASS

`cmp data/clean/app_data.json ~/bling/app/src/data/app_data.json` reports the files are identical.

## 8. Store to county mapping: PASS

10 random stores (seed 7) checked by hand, all plausible: Storuman→Västerbotten, Sveavägen Stockholm→Stockholm, Sollefteå→Västernorrland, Askersund→Örebro, Umeå→Västerbotten, Täby→Stockholm, Åmål→Västra Götaland, Klippan→Skåne, Falun→Dalarna, Västra Frölunda→Västra Götaland.
Systematic check: every store has the same county as the most common county for its 3-digit postcode prefix. 0 outliers.

## 9. App text claims (`~/bling/app/src/routes/index.tsx`): FAIL

- Line 84: "explain only ~4% of the differences between countries (R² 0.04)". The number matches `model_metrics.json` (0.037, n = 28). But it is hardcoded text: Europe metrics are not in `app_data.json`, so the line will not update if the model changes. It also says "countries" while the page shows 31 and the model used 28.
- Line 84: "Smeg's strength is brand-driven, not wealth-driven". **The data does not support this.** A low R² shows that these 4 features do not explain interest. Brand was not measured. MODEL.md says only "brand history and distribution *likely* matter more". Change to "is not explained by wealth or housing".
- Line 94: "{stores_total} Smeg stores from Smeg's store locator" shows 503. The locator has 504; 1 is unmatched. Say "503 of 504 stores mapped to a county".
- Line 20 (og:description): "Pick Smeg's next region in under 2 minutes" is not measured. This is low risk, but it is a claim.
- Lines 128-135: the value formula text matches the code and the data (see 6).

## Resolution

| Check | Fix |
|---|---|
| 1. SOURCES.md coverage | Every file has a row; a "Derived files" table lists each script and its inputs. Unused manual uploads were removed from the public repo. |
| 1b. Net sales vs Omsättning | Kept total revenue (Omsättning, 470,292 kSEK). Net sales (469,978 kSEK) would lower the value by 0.07 %; this is stated in VALUE.md. |
| 3. Hand-typed constants | `CAPTURE_RATE_DEFAULT` and `TOP_N` are named constants in `20_build_app_data.py` and documented in VALUE.md. |
| 4. 86 % vs 87 % | MODEL.md gives the exact bootstrap share (86.5 %); the app rounds the exported 0.86 to 86 %. |
| 5. Unmatched store | The app says "503 of 504 mapped". |
| 6. VALUE.md / rounding | VALUE.md written; densities exported unrounded, so the app shows SEK 20.3M (unrounded), not 20.7M. |
| 9. App claims | "brand-driven" replaced by "not explained by wealth or housing"; Europe R² and n are read from `app_data.json`. |

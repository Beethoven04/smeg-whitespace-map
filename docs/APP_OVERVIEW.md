# Smeg Whitespace Map: what it does and how it works

Built at the BLING Builds hackathon (Malmö, 24 Oct 2026). Use case: "How can a company like Smeg make better and faster business decisions using only open data?"

---

## 1. In one sentence

A web app that tells Smeg **where in Sweden to sell next, at what price position, and when**, and how much money that is worth. It uses **only free, public data**, and every number links to its source.

## 2. Who uses it, and for which decision

**User:** a Smeg Nordic retail or expansion manager.

**Decisions it supports:**
1. **Where** to sign new retailers or open a pop-up. This is the main decision, and it drives the SEK value.
2. **Where** to spend marketing instead of opening stores (awareness gaps).
3. **How** to price per category: hold the premium, or work on visibility.
4. **When** to run campaigns during the year.

---

## 3. What the app shows (9 pages, sidebar navigation)

| # | Section | What you see | The answer it gives |
|---|---|---|---|
| Hero | "Where should Smeg sell next?" | Source chips, 3 key numbers, the big SEK figure | 31 countries analysed, 21 counties ranked, ≈ SEK 20.3M opportunity |
| 01 | **Europe** | Smeg search interest per country (5 years), "Strongest markets", "Rising fastest" | Sweden is #1 in Europe (61), then Belgium (58) and the Netherlands (49). Rising fastest: Slovakia, Croatia, Czechia. Income and housing explain only 4% of the differences between countries (R² 0.04), so Smeg's popularity is not driven by wealth. |
| 02 | **Sweden** | All 21 counties ranked by a "whitespace score"; click a county to open its drawer | **Store gaps:** high demand but few Smeg stores. #1 Stockholm: highest interest (100/100), but only 6.9 Smeg retailers per 100,000 households vs 10.1 nationally. **Awareness gaps:** counties that search less than their size and income predict (Västernorrland, Västerbotten, Jönköping, Dalarna, Västmanland), so the action there is marketing. |
| 02 → drawer | **County detail** | Drivers with source links, a recommended action, and an **AI brief** | A 4-line decision brief written by AI from **only** that county's facts, with source ids |
| 03 | **Value** | The big SEK number, a capture-rate slider, and the formula written out | Closing the retail gap in the top 3 under-covered counties (Stockholm, Uppsala, Kronoberg) ≈ **SEK 20.3M per year** at 50% capture |
| 04 | **Price position** | Smeg vs all brands on Prisjakt, per category | Kettles and toasters: Smeg is the **#1 most popular** product while costing **2.5–3.1×** the category median, so hold the price. Espresso machines and fridges: Smeg is barely visible (rank 46 and 58), so the issue is placement, not price. |
| 05 | **Timing** | Weekly demand for 2 years + a 12-week forecast, a monthly campaign calendar, and the forecast test | Demand peaks in **Black Friday week in 4 of 4 years**. November is +54% vs the yearly average, the week before Christmas +72%, June −21%. Demand is up 9.3% year on year. |
| B2B | **New builds (B2B)** (`/new-builds`) | 9 Malmö housing/hotel projects from public planning decisions and press (team research), with stage, size, developer and source links | 1,604 dwellings with known size × SEK 24,841 per Smeg kitchen (50% of sourced retail prices) = SEK 39.8M upper bound; at a 10% win rate ≈ **SEK 4.0M one-time**. Win rate and project price are labelled assumptions with sliders. |
| 06 | **Method & sources** | Model vs baseline, limitations, full source list | Every number can be traced |
| 07 | **Use it in your systems** (`/integrate`) | Download (CSV/JSON), an embed snippet, and the MCP server for AI assistants | The same numbers inside Excel, Power BI, an intranet page or an AI assistant |

---

## 4. How it works (the pipeline)

```
Public sources  →  Python scripts (pipeline/)  →  app_data.json  →  Web app (app/, React)
                    fetch → clean → model → build                  one data file, no hand-typed numbers
```

All scripts are in `pipeline/scripts/`. Each one writes raw files to `pipeline/data/raw/` and cleaned files to `pipeline/data/clean/`. `pipeline/run_all.sh` runs them in order and copies the result into the app.

| Step | Script | What it does |
|---|---|---|
| 1 | `01_fetch_eurostat.py` | Population, GDP per capita, households, density, building permits for 31 European countries (Eurostat API) |
| 2 | `02_fetch_scb.py` | Population, households, income, new dwellings for the 21 Swedish counties (SCB API) |
| 3 | `03_fetch_gtrends.py` | Google Trends search interest in the **Smeg topic**: by country, by Swedish county, and weekly over 5 years. We use the topic, not the word "smeg", which also matches unrelated searches. |
| 4 | `04_build_model_inputs.py` | Joins search interest with the statistics; checks that all 21 counties match |
| 5 | `05_fetch_smeg_stores.py` | All **504 Smeg stores in Sweden** from Smeg's own store locator |
| 6 | `06_geocode_localities.py` | Places each store in its county with OpenStreetMap (503 of 504 matched) |
| 7 | `07_fetch_prisjakt.py` | 450 products in 5 categories from Prisjakt: price, number of shops, popularity rank |
| 8 | `08_fetch_product_trends.py` | Google Trends for the 5 most-searched Smeg products in Sweden, on one shared scale |
| 9 | `10_model.py` | Demand model per county (see 5a) |
| 10 | `11_forecast.py` | Seasonal forecast (see 5c) |
| 11 | `20_build_app_data.py` | Builds `app_data.json`: rankings, value inputs, prices, timing, sources |

The app reads only `app_data.json` (and `product_trends.json`). The value is **computed in the app** (`app/src/lib/value.ts`), so the capture-rate slider updates it live.

---

## 5. The data science, in plain words

### 5a. "Expected" demand per county (awareness gaps)
- **Question:** how much should a county search for Smeg, given its size, income and new housing?
- **Model:** ridge regression (a simple, stable linear model) on 4 features: household income, number of households, households per person, and new dwellings per 1,000 residents.
- **Fair test:** leave-one-out. The model predicts each county without having seen it.
- **Result:** average error 6.41 vs 7.36 for a simple average baseline (13% better, R² 0.27).
- **Use:** counties far *below* their expected value are awareness gaps.
- **Europe:** the same test explained only 4% (R² 0.04). We say so openly and show actual interest and momentum instead of a weak prediction.

### 5b. Whitespace score (store gaps)
- Score = **50% search interest + 50% low retailer density**, both standardised, scaled 0 to 1.
- Retailer density = Smeg stores per 100,000 households, compared with the national 10.05.

### 5c. Seasonal forecast (timing)
- 5 years of weekly search interest in Sweden.
- **Fair test:** trained on the first 4 years, tested on the last 52 weeks it never saw.

| Method | Avg. error (MAE) | MAPE |
|---|---|---|
| Same week last year (baseline) | 5.33 | 11.3% |
| Average (baseline) | 10.02 | 18.6% |
| **Holt-Winters seasonal model (chosen)** | **4.09** | **8.3%** |
| STL + AR(1) | 9.11 | 20.4% |

- The chosen model is 23% more accurate than "same week last year". It forecasts 12 weeks ahead with an 80% range.

### 5d. AI brief
- **Provider chain:** Lovable AI first, then Gemini, then Groq.
- **Input:** only the county's facts, each with its source id.
- **Prompt rule:** "Use ONLY the numbers in the input. Never add facts." The app shows which AI wrote it and how long it took.

---

## 6. The money: how we get ≈ SEK 20.3M per year

```
opportunity per county = households
                       × (Smeg Sweden revenue ÷ Swedish households)
                       × retail coverage gap   (1 − county stores per household ÷ national)
                       × capture rate          (assumption, 50%, slider 10–100%)
```

| Input | Value | Source |
|---|---|---|
| Smeg Sweden revenue | 470.3 MSEK (SMEG Nordic AB total revenue, 2025) | Allabolag / Bolagsverket |
| Swedish households | 5,002,567 | SCB |
| Revenue per household | SEK 94 | computed |
| National store density | 10.05 per 100k households | Smeg store locator + SCB |

**Result:** Stockholm SEK 16.5M + Uppsala SEK 2.6M + Kronoberg SEK 1.2M = **≈ SEK 20.3M/year**.

Full details are in `docs/VALUE.md`.

---

## 7. Sources (all public)

| Id | Source | Used for |
|---|---|---|
| S1 | Google Trends, Smeg topic | Demand proxy: countries, counties, weekly |
| S2–S4 | SCB (Statistics Sweden) | Households, income, new dwellings per county |
| S5 | Smeg store locator (smeg.com/se) | The 504 stores = Smeg's retail footprint |
| S6 | Allabolag / Bolagsverket | SMEG Nordic AB revenue |
| S7 | Eurostat | European country statistics |
| S8 | OpenStreetMap Nominatim | Store town → county |
| S9 | Prisjakt.nu | Prices, number of shops, popularity |

Full list with URLs and access times: `docs/SOURCES.md`. Independent check: `docs/AUDIT.md`.

---

## 8. Honest limits

1. Google search interest is a **proxy for demand, not sales**.
2. SMEG Nordic AB revenue may include some sales outside Sweden, so the SEK value is an **upper-bound** estimate.
3. Capture rate (50%) is an **assumption**, shown with a slider.
4. Prisjakt prices are **one snapshot** (24 Oct 2026). Price trends over time are not included.
5. Country and county search scores come from separate queries and **cannot be compared** with each other.
6. **Not built, on purpose:**
   - Restock quantities: these need Smeg's internal sales data.
   - Blocket second-hand data: Blocket forbids automated collection.

## 9. What Smeg can do on Monday

1. **Stockholm:** sign new retailers or test a pop-up. It has the highest demand in Sweden and 31% fewer stores per household than the national level.
2. **Västernorrland, Västerbotten, Jönköping:** run local marketing, not new stores.
3. **Kettles and toasters:** don't discount; protect availability. **Espresso machines and fridges:** work on shelf placement and visibility.
4. **Campaigns:** start in late October, be fully stocked for Black Friday week, and add a second push before Christmas.

## 10. How to run it

See the root `README.md` (Quick start). In short:

- **App:** `cd app && npm install && npm run dev`, then open http://localhost:8080.
- **Data:** `cd pipeline && pip install -r requirements.txt && ./run_all.sh` (or `./run_all.sh --offline` to rebuild from the files in the repo).
- **Re-run:** each fetch script re-downloads the latest public data, so the analysis can be refreshed weekly.

"""Build app_data.json for the Smeg Whitespace Map app from clean data only.

Inputs (all in data/clean/ or data/raw/, see docs/SOURCES.md):
  model_input_europe.csv, model_sweden.csv, model_input_sweden.csv, model_metrics.json,
  smeg_stores_se.csv (scripts 05+06), raw/smeg_se_company.csv (allabolag).
Output: data/clean/app_data.json (copied into the app at src/data/app_data.json).

Two Swedish lists (decision 13:48):
  store gaps     = high real search interest + few Smeg retailers per household -> drives SEK value
  awareness gaps = interest below what county size/income predict (model residual) -> marketing action
"""
import csv
import json
from datetime import datetime, timezone

import pandas as pd

C = "data/clean/"

# Value assumptions (shown in the app and in docs/VALUE.md)
CAPTURE_RATE_DEFAULT = 0.5  # assumption: share of the retail gap Smeg could win; adjustable slider in the app
TOP_N = 3  # number of ranked counties with a real retail gap that are summed

# ---------- Europe: actual interest + momentum (model too weak to show, R2 0.04) ----------
eu = pd.read_csv(C + "model_input_europe.csv")
eu_mod = pd.read_csv(C + "model_europe.csv")[["region", "momentum_index"]]
eu = eu.merge(eu_mod, left_on="iso2", right_on="region", how="left")
countries = [
    {
        "iso2": r.iso2,
        "name": r.country_name if "country_name" in eu.columns else r.region_name,
        "actual": int(r.trends_5y),
        "recent": int(r.trends_12m),
        "momentum_index": round(float(r.momentum_index), 3) if pd.notna(r.momentum_index) else None,
    }
    for r in eu.itertuples()
    if pd.notna(r.trends_5y)
]
countries.sort(key=lambda x: -x["actual"])

# ---------- Sweden ----------
feat = pd.read_csv(C + "model_input_sweden.csv", dtype={"county_code": str})
mod = pd.read_csv(C + "model_sweden.csv", dtype={"region": str})
stores = pd.read_csv(C + "smeg_stores_se.csv", dtype={"county_code": str})
unmatched = int(stores["county_code"].isna().sum())
unmatched_names = stores.loc[stores["county_code"].isna(), "store_name"].tolist()
n_stores = int(stores["county_code"].notna().sum())
per_county = stores.dropna(subset=["county_code"]).groupby("county_code").size()

se = feat.merge(mod[["region", "expected_oof", "residual", "share_top5_underserved"]], left_on="county_code", right_on="region")
assert len(se) == 21, len(se)
se["retailers"] = se["county_code"].map(per_county).fillna(0).astype(int)
se["retailers_per_100k_hh"] = se["retailers"] / se["households"] * 1e5
national = n_stores / se["households"].sum() * 1e5


def z(s):
    return (s - s.mean()) / s.std(ddof=0)


# Store-gap score: equal weights, shown in the UI.
se["raw_score"] = 0.5 * z(se["trends_5y"]) + 0.5 * z(-se["retailers_per_100k_hh"])
se["score"] = (se["raw_score"] - se["raw_score"].min()) / (se["raw_score"].max() - se["raw_score"].min())
se = se.sort_values("raw_score", ascending=False).reset_index(drop=True)
se["rank"] = se.index + 1
median_interest = se["trends_5y"].median()


def short(name):
    return name.replace(" län", "").removesuffix("s") if name.endswith("s län") else name.replace(" län", "")


counties = []
for r in se.itertuples():
    nm = short(r.county_name)
    counties.append(
        {
            "code": r.county_code,
            "name": nm,
            "rank": int(r.rank),
            "score": round(float(r.score), 2),
            "demand_index": int(r.trends_5y),
            "expected": round(float(r.expected_oof), 1),
            "residual": round(float(r.residual), 1),
            "retailers": int(r.retailers),
            "retailers_per_100k_hh": round(float(r.retailers_per_100k_hh), 2),
            "households": int(r.households),
            "income_median_tkr": float(r.hh_disp_income_median_tkr),
            "dwellings_per_1000": round(float(r.dwellings_completed_per_1000), 1),
            "drivers": [
                {"label": "Smeg search interest (Sweden median = %d)" % median_interest, "value": f"{int(r.trends_5y)} / 100", "source_id": "S1"},
                {"label": "Smeg retailers per 100k households (national %.1f)" % national, "value": f"{r.retailers_per_100k_hh:.1f} ({int(r.retailers)} stores)", "source_id": "S5"},
                {"label": "New dwellings completed per 1,000 residents, 2025", "value": f"{r.dwellings_completed_per_1000:.1f}", "source_id": "S4"},
                {"label": "Median household disposable income, 2024", "value": f"{r.hh_disp_income_median_tkr:.0f} kSEK", "source_id": "S3"},
            ],
            "action": (
                f"Sign new retailers or test a pop-up in {nm}: interest is {'above' if r.trends_5y >= median_interest else 'near'} the Swedish median "
                f"but Smeg has {r.retailers_per_100k_hh:.1f} retailers per 100k households vs {national:.1f} nationally."
                if r.retailers_per_100k_hh < national
                else f"{nm} already has at least the national retailer density; protect share rather than expand."
            ),
        }
    )

aw = se.sort_values("residual").head(5)
awareness = [
    {
        "code": r.county_code,
        "name": short(r.county_name),
        "actual": int(r.trends_5y),
        "expected": round(float(r.expected_oof), 1),
        "residual": round(float(r.residual), 1),
        "stability": round(float(r.share_top5_underserved), 2),
    }
    for r in aw.itertuples()
]

# ---------- Price position (Prisjakt, all brands, most popular first) ----------
import glob
import re

pj = pd.read_csv(sorted(glob.glob("data/raw/prisjakt_categories_*.csv"))[-1]).drop_duplicates("url")
# Bundles ("Frukostpaket", several model codes in one listing) are not single products.
is_bundle = pj["product"].str.contains(r"paket|\+", case=False) | (pj["product"].str.count(r"\b[A-Z]{2,4}\d{2}") >= 2)
pj = pj[~is_bundle & pj["lowest_price_sek"].notna()]
price_rows = []
for cat, g in pj.groupby("category"):
    sm = g[g["brand"] == "SMEG"].sort_values("popularity_rank")
    if sm.empty:
        continue
    med = float(g["lowest_price_sek"].median())
    sm_med = float(sm["lowest_price_sek"].median())
    top10 = g.sort_values("popularity_rank").head(10)
    price_rows.append({
        "category": cat,
        "n_products": int(len(g)),
        "category_median_sek": round(med),
        "smeg_median_sek": round(sm_med),
        "premium_x": round(sm_med / med, 1),
        "smeg_best_rank": int(sm["popularity_rank"].iloc[0]),
        "smeg_in_top10": int((top10["brand"] == "SMEG").sum()),
        "smeg_products": [
            {"product": r.product, "price_sek": int(r.lowest_price_sek), "shops": int(r.num_shops) if pd.notna(r.num_shops) else None, "rank": int(r.popularity_rank), "url": r.url}
            for r in sm.head(4).itertuples()
        ],
        "top_rivals": [
            {"brand": r.brand.title(), "product": r.product, "price_sek": int(r.lowest_price_sek), "rank": int(r.popularity_rank)}
            for r in top10[top10["brand"] != "SMEG"].head(3).itertuples()
        ],
    })
price_rows.sort(key=lambda x: x["smeg_best_rank"])

# ---------- Timing: seasonal forecast (scripts/11_forecast.py) ----------
fc = json.load(open(C + "forecast_se.json"))
timing = {
    "source_id": "S1",
    "target": fc["target"],
    "holdout": {"weeks": fc["holdout"]["weeks"], "metrics": fc["holdout"]["metrics"]},
    "chosen_model": fc["chosen_model"],
    "beats_seasonal_naive": fc["beats_seasonal_naive"],
    "interval_method": fc["interval_method"],
    "history": fc["history"],
    "forecast": fc["forecast"],
    "monthly_profile": fc["monthly_profile"],
    "top_iso_weeks": fc["top_iso_weeks"][:3],
    "peak_weeks_by_year": fc["peak_weeks_by_year"],
    "yoy_change_pct": fc["yoy_change_pct"],
}

# ---------- Value inputs ----------
co = pd.read_csv("data/raw/smeg_se_company.csv", encoding="utf-8-sig")
latest = co.sort_values("year").iloc[-1]
all_metrics = json.load(open(C + "model_metrics.json"))
metrics = all_metrics["sweden"]
eu_metrics = all_metrics["europe"]

sources = [
    {"id": "S1", "short": "Google Trends", "name": "Google Trends – Smeg topic, interest by country and Swedish county (5 y, 12 m)", "publisher": "Google", "url": "https://trends.google.com/trends/explore?date=today%205-y&q=%2Fg%2F11cnkj_9n2", "accessed": "2026-10-24"},
    {"id": "S2", "short": "SCB households", "name": "Households per county 2025 (HE0111)", "publisher": "SCB", "url": "https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__HE__HE0111/", "accessed": "2026-10-24"},
    {"id": "S3", "short": "SCB income", "name": "Household disposable income per county 2024 (HE0110)", "publisher": "SCB", "url": "https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__HE__HE0110/", "accessed": "2026-10-24"},
    {"id": "S4", "short": "SCB housing", "name": "Completed new dwellings per county 2022–2025 (BO0101)", "publisher": "SCB", "url": "https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__BO__BO0101/", "accessed": "2026-10-24"},
    {"id": "S5", "short": "Smeg store locator", "name": f"Smeg store locator Sweden ({n_stores + unmatched} stores, {n_stores} mapped to a county)", "publisher": "Smeg", "url": "https://www.smeg.com/se/stores-locator", "accessed": "2026-10-24"},
    {"id": "S6", "short": "Allabolag", "name": f"SMEG Nordic AB annual accounts {int(latest.year)}, total revenue (omsättning) (org. 556661-1454)", "publisher": "Allabolag / Bolagsverket", "url": latest.source_url, "accessed": "2026-10-24"},
    {"id": "S7", "short": "Eurostat", "name": "GDP per capita, households, density, permits (nama_10_pc, lfst_hhnhtych, tps00003, sts_cobp_a)", "publisher": "Eurostat", "url": "https://ec.europa.eu/eurostat/databrowser/", "accessed": "2026-10-24"},
    {"id": "S9", "short": "Prisjakt", "name": "Prisjakt.nu category listings: kettles, toasters, espresso machines, drip coffee makers, fridges (top 88 by popularity)", "publisher": "Prisjakt", "url": "https://www.prisjakt.nu/c/vattenkokare", "accessed": "2026-10-24"},
    {"id": "S8", "short": "OpenStreetMap", "name": "Store locality to county (Nominatim geocoder)", "publisher": "OpenStreetMap", "url": "https://nominatim.openstreetmap.org", "accessed": "2026-10-24"},
]

app = {
    "is_sample": False,
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "sources": sources,
    "europe": {
        "target_label": "Google search interest in Smeg, past 5 years (0–100, relative to the top country worldwide). Proxy for brand demand, not sales.",
        "countries": countries,
        "model_r2": eu_metrics["model_r2"],
        "model_n": eu_metrics["n"],
    },
    "prices": {
        "source_id": "S9",
        "note": "Lowest listed price (SEK, excl. shipping) on Prisjakt.nu, most popular products per category, all brands; bundles excluded.",
        "categories": price_rows,
    },
    "timing": timing,
    "model": {
        "scope": "Swedish counties",
        "target": "Google search interest in Smeg (5 y)",
        "features": metrics["features"],
        "n": metrics["n"],
        "baseline_mae": metrics["baseline_mae"],
        "model_mae": metrics["model_mae"],
        "model_r2": metrics["model_r2"],
        "cv": "leave-one-out",
        "beats_baseline": metrics["beats_baseline"],
    },
    "sweden": {
        "national_retailers_per_100k_hh": round(float(national), 2),
        "stores_total": n_stores + unmatched,
        "stores_mapped": n_stores,
        "stores_unmatched": unmatched,
        "stores_unmatched_names": unmatched_names,
        "score_formula": "50% Smeg search interest (z-score) + 50% low retailer density (z-score), scaled 0–1",
        "counties": counties,
        "awareness": awareness,
    },
    "value": {
        "smeg_se_revenue_sek": int(latest.revenue_ksek) * 1000,
        "revenue_year": int(latest.year),
        "se_households": int(se["households"].sum()),
        "revenue_source_id": "S6",
        "capture_rate_default": CAPTURE_RATE_DEFAULT,
        "top_n": TOP_N,
    },
}
json.dump(app, open(C + "app_data.json", "w"), ensure_ascii=False, indent=1)
print("counties", len(counties), "stores", n_stores, "unmatched", unmatched, "national/100k", round(national, 2))
for c in counties[:5]:
    print(c["rank"], c["name"], c["score"], c["demand_index"], c["retailers"], c["retailers_per_100k_hh"])
print("awareness", [(a["name"], a["residual"]) for a in awareness])

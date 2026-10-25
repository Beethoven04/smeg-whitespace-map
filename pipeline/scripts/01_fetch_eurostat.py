"""Fetch European country-level structural features from the Eurostat API.

Output:
  data/raw/eurostat_<content>_20261024.csv   raw SDMX-CSV responses, unchanged
  data/raw/eurostat_geo_labels_20261024.json raw JSON-stat response (country names)
  data/clean/europe_features.csv            one row per country

Schema of data/clean/europe_features.csv:
  region_code   Eurostat geo code (EL = Greece, UK = United Kingdom)
  iso2          ISO 3166-1 alpha-2 (EL->GR, UK->GB, else same as geo)
  region_name   English name from Eurostat labels
  year          reference year targeted for all features (see <feature>_year)
  population                 persons on 1 January (tps00001)
  gdp_pc_pps                 GDP per capita, current prices, PPS (EU27_2020) (nama_10_pc B1GQ)
  hh_consumption_pc_pps      household final consumption expenditure per capita, PPS (nama_10_pc P31_S14)
  households                 number of private households (lfst_hhnhtych, thousands * 1000)
  pop_density_km2            persons per km2 (tps00003)
  dwelling_permits           dwellings in residential buildings (excl. communities) covered by
                             building permits, count (sts_cobp_a BPRM_DW CPA_F41001_X_410014 THS * 1000)
  dwelling_permits_per_1000  dwelling_permits / population * 1000 (computed)
  <feature>_year             year of the value used
Missing values stay NaN. UK has only population in recent Eurostat data; other UK features are NaN.
"""
import json
import sys
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
CLEAN = ROOT / "data" / "clean"
STAMP = "20261024"
SDMX = "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/{ds}/?format=SDMX-CSV&startPeriod=2019"
JSONSTAT = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tps00001?format=JSON&lang=EN&sinceTimePeriod=2019"
TARGET_YEAR = 2024

EU27 = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "HR", "HU",
        "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"]
COUNTRIES = EU27 + ["NO", "CH", "IS", "UK"]
ISO_FIX = {"EL": "GR", "UK": "GB"}

# feature -> (dataset, raw file content tag, filter dict, multiplier)
FEATURES = {
    "population": ("tps00001", "population", {"indic_de": "JAN"}, 1),
    "gdp_pc_pps": ("nama_10_pc", "nama_10_pc", {"unit": "CP_PPS_EU27_2020_HAB", "na_item": "B1GQ"}, 1),
    "hh_consumption_pc_pps": ("nama_10_pc", "nama_10_pc", {"unit": "CP_PPS_EU27_2020_HAB", "na_item": "P31_S14"}, 1),
    "households": ("lfst_hhnhtych", "households", {"phhcomp": "TOTAL", "n_child": "TOTAL", "agechild": "TOTAL", "unit": "THS_HH"}, 1000),
    "pop_density_km2": ("tps00003", "pop_density", {"unit": "PER_KM2"}, 1),
    "dwelling_permits": ("sts_cobp_a", "building_permits", {"indic_bt": "BPRM_DW", "cpa2_1": "CPA_F41001_X_410014", "unit": "THS", "s_adj": "NSA"}, 1000),
}


def fetch(url: str, path: Path) -> Path:
    if not path.exists():
        r = requests.get(url, timeout=180)
        r.raise_for_status()
        path.write_bytes(r.content)
        print(f"downloaded {path.name} ({len(r.content)} bytes)")
    return path


def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    CLEAN.mkdir(parents=True, exist_ok=True)

    labels_path = fetch(JSONSTAT, RAW / f"eurostat_geo_labels_{STAMP}.json")
    labels = json.loads(labels_path.read_text())["dimension"]["geo"]["category"]["label"]

    out = pd.DataFrame({"region_code": COUNTRIES})
    out["iso2"] = out.region_code.map(lambda g: ISO_FIX.get(g, g))
    out["region_name"] = out.region_code.map(labels)
    out.loc[out.region_code == "UK", "region_name"] = out.loc[out.region_code == "UK", "region_name"].fillna("United Kingdom")
    out["year"] = TARGET_YEAR

    for feat, (ds, tag, flt, mult) in FEATURES.items():
        raw = fetch(SDMX.format(ds=ds), RAW / f"eurostat_{tag}_{STAMP}.csv")
        df = pd.read_csv(raw)
        for k, v in flt.items():
            df = df[df[k].astype(str) == v]
        df = df[df.geo.isin(COUNTRIES) & df.OBS_VALUE.notna() & (df.TIME_PERIOD <= TARGET_YEAR)]
        # one common year per feature: TARGET_YEAR if it covers >= 90% of the 30 non-UK
        # countries, else the latest year that does
        cov = df.groupby("TIME_PERIOD").geo.nunique()
        ok = cov[cov >= 0.9 * (len(COUNTRIES) - 1)]
        year = int(ok.index.max()) if len(ok) else int(cov.idxmax())
        vals = (df[df.TIME_PERIOD == year].set_index("geo").OBS_VALUE * mult).round(3)
        out[feat] = out.region_code.map(vals)
        out[f"{feat}_year"] = year
        print(f"{feat}: {ds} year {year}, {out[feat].notna().sum()}/{len(out)} countries")

    out["dwelling_permits_per_1000"] = (out.dwelling_permits / out.population * 1000).round(3)
    out["dwelling_permits_per_1000_year"] = out["dwelling_permits_year"]

    feats = list(FEATURES) + ["dwelling_permits_per_1000"]
    cols = ["region_code", "iso2", "region_name", "year"] + feats + [f"{f}_year" for f in feats]
    out = out[cols]
    out.to_csv(CLEAN / "europe_features.csv", index=False)
    print(f"wrote {len(out)} rows; missing per column:")
    print(out[feats].isna().sum().to_string())
    return 0


if __name__ == "__main__":
    sys.exit(main())

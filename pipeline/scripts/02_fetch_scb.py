"""Fetch Swedish county (län) features from the SCB PxWeb API.

Output:
  data/raw/scb_<content>_20261024.json   raw PxWeb JSON responses (metadata + data), unchanged
  data/clean/sweden_county_features.csv one row per county (21 län)
  data/clean/se_county_map.csv          county code, Swedish name, Google Trends English name

Schema of data/clean/sweden_county_features.csv:
  county_code              SCB 2-digit county code
  county_name              Swedish name from SCB metadata
  population               folkmängd 31 Dec (BE0101 BefolkningCKM)
  households               number of households, all tenure types (HE0111 HushallT26, TOT/TOTAL)
  hh_disp_income_median_tkr  median disposable income per household, all households, 18+,
                           SEK thousands, constant prices (HE0110G TabVX4bDispInkN)
  hh_disp_income_mean_tkr  same, mean
  dwellings_completed_<y>  completed dwellings in newly built houses, flerbostadshus + småhus
                           (BO0101 LghReHustypAr), latest year and the 3 years before
  dwellings_completed_per_1000  latest year completions / population * 1000 (computed)
  accommodation_beds       available beds in hotels, cabins and hostels (NV1701T5BAR);
                           SCB series ends 2021, so this is 2021 data
  <feature>_year           year of the value used
Missing values stay NaN.
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
API = "https://api.scb.se/OV0104/v1/doris/sv/ssd/"

# content tag -> (table path, fixed selections {variable: [values]}, years to take)
TABLES = {
    "population": ("BE/BE0101/BE0101A/BefolkningCKM",
                   {"Civilstand": ["SC"], "Alder": ["TotSA"], "Kon": ["TotSa"], "ContentsCode": ["000007ME"]}, 1),
    "households": ("HE/HE0111/HE0111A/HushallT26",
                   {"Boendeform": ["TOT"], "Hushallsstorlek": ["TOTAL"], "ContentsCode": ["HE0111BZ"]}, 1),
    "hh_disp_income": ("HE/HE0110/HE0110G/TabVX4bDispInkN",
                       {"Hushallstyp": ["E90"], "Alder": ["18+"], "ContentsCode": ["000006SY", "000006SW"]}, 1),
    "dwellings_completed": ("BO/BO0101/BO0101A/LghReHustypAr",
                            {"Hustyp": ["FLERBO", "SMÅHUS"], "ContentsCode": ["BO0101A5"]}, 4),
    "accommodation_capacity": ("NV/NV1701/NV1701A/NV1701T5BAR",
                               {"ContentsCode": ["00000205"]}, 1),
}


def get_json(url, path, query=None):
    if not path.exists():
        r = requests.post(url, json=query, timeout=120) if query else requests.get(url, timeout=60)
        r.raise_for_status()
        path.write_bytes(r.content)
        print(f"downloaded {path.name}")
    return json.loads(path.read_text(encoding="utf-8-sig"))


def fetch_table(tag, table, fixed, n_years):
    meta = get_json(API + table, RAW / f"scb_{tag}_meta_{STAMP}.json")
    var = {v["code"]: v for v in meta["variables"]}
    region = var["Region"]
    counties = [c for c in region["values"] if len(c) == 2 and c != "00"]
    years = var["Tid"]["values"][-n_years:]
    query = {"query": [{"code": "Region", "selection": {"filter": "item", "values": counties}},
                       {"code": "Tid", "selection": {"filter": "item", "values": years}}]
             + [{"code": k, "selection": {"filter": "item", "values": v}} for k, v in fixed.items()],
             "response": {"format": "json"}}
    data = get_json(API + table, RAW / f"scb_{tag}_{STAMP}.json", query)
    keys = [c["code"] for c in data["columns"] if c["type"] in ("d", "t")]
    vals = [c["code"] for c in data["columns"] if c["type"] == "c"]
    rows = []
    for rec in data["data"]:
        row = dict(zip(keys, rec["key"]))
        for code, v in zip(vals, rec["values"]):
            row[code] = pd.to_numeric(v, errors="coerce")  # SCB uses ".." for missing
        rows.append(row)
    names = dict(zip(region["values"], region["valueTexts"]))
    return pd.DataFrame(rows), names, counties, years


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    CLEAN.mkdir(parents=True, exist_ok=True)

    pop, names, counties, (pop_year,) = fetch_table("population", *TABLES["population"])
    out = pd.DataFrame({"county_code": counties})
    out["county_name"] = out.county_code.map(names)
    out["population"] = out.county_code.map(pop.set_index("Region")["000007ME"])
    out["population_year"] = int(pop_year)

    hh, _, _, (hh_year,) = fetch_table("households", *TABLES["households"])
    out["households"] = out.county_code.map(hh.set_index("Region")["HE0111BZ"])
    out["households_year"] = int(hh_year)

    inc, _, _, (inc_year,) = fetch_table("hh_disp_income", *TABLES["hh_disp_income"])
    inc = inc.set_index("Region")
    out["hh_disp_income_median_tkr"] = out.county_code.map(inc["000006SY"])
    out["hh_disp_income_mean_tkr"] = out.county_code.map(inc["000006SW"])
    out["hh_disp_income_year"] = int(inc_year)

    dw, _, _, dw_years = fetch_table("dwellings_completed", *TABLES["dwellings_completed"])
    dw_sum = dw.groupby(["Region", "Tid"])["BO0101A5"].sum(min_count=1).unstack("Tid")
    for y in dw_years:
        out[f"dwellings_completed_{y}"] = out.county_code.map(dw_sum[y])
    latest = dw_years[-1]
    out["dwellings_completed_per_1000"] = (out[f"dwellings_completed_{latest}"] / out.population * 1000).round(3)
    out["dwellings_completed_per_1000_year"] = int(latest)

    acc, _, _, (acc_year,) = fetch_table("accommodation_capacity", *TABLES["accommodation_capacity"])
    out["accommodation_beds"] = out.county_code.map(acc.set_index("Region")["00000205"])
    out["accommodation_beds_year"] = int(acc_year)

    out.to_csv(CLEAN / "sweden_county_features.csv", index=False)
    print(f"wrote sweden_county_features.csv: {len(out)} rows; missing per column:")
    print(out.isna().sum()[lambda s: s > 0].to_string() or "  none")

    # Google Trends English name: SCB name minus " län", minus the genitive "s"
    # (e.g. "Stockholms län" -> "Stockholm County", "Skåne län" -> "Skåne County").
    def gt_name(sv):
        base = sv.removesuffix(" län") if hasattr(sv, "removesuffix") else sv[:-4]
        if base.endswith("s"):
            base = base[:-1]
        return f"{base} County"

    m = out[["county_code", "county_name"]].rename(columns={"county_name": "county_name_sv"})
    m["gtrends_name_en"] = m.county_name_sv.map(gt_name)
    m.to_csv(CLEAN / "se_county_map.csv", index=False)
    print(m.to_string(index=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Join Google Trends (Smeg topic, 5y and 12m) to structural features.

Inputs:
  data/clean/europe_features.csv, data/clean/sweden_county_features.csv, data/clean/se_county_map.csv
  data/raw/pytrends_smeg_topic_by_country_{5y,12m}_20261024.csv
  data/raw/pytrends_smeg_topic_se_by_county_{5y,12m}_20261024.csv
Outputs:
  data/clean/se_iso_scb_map.csv, data/clean/model_input_europe.csv, data/clean/model_input_sweden.csv
"""
import unicodedata
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CLEAN, RAW = ROOT / "data/clean", ROOT / "data/raw"

# Standard ISO 3166-2:SE letter code <-> SCB 2-digit lanskod
ISO_TO_SCB = {
    "SE-AB": "01", "SE-C": "03", "SE-D": "04", "SE-E": "05", "SE-F": "06", "SE-G": "07",
    "SE-H": "08", "SE-I": "09", "SE-K": "10", "SE-M": "12", "SE-N": "13", "SE-O": "14",
    "SE-S": "17", "SE-T": "18", "SE-U": "19", "SE-W": "20", "SE-X": "21", "SE-Y": "22",
    "SE-Z": "23", "SE-AC": "24", "SE-BD": "25",
}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return s.lower().replace("county", "").replace(" ", "").strip()


def trends(path: Path, col: str) -> pd.DataFrame:
    df = pd.read_csv(path, dtype={"geoCode": str})
    return df.rename(columns={"smeg_interest": col})


def europe() -> None:
    feat = pd.read_csv(CLEAN / "europe_features.csv", dtype={"iso2": str, "region_code": str},
                       keep_default_na=False, na_values=[""])
    t5 = trends(RAW / "pytrends_smeg_topic_by_country_5y_20261024.csv", "trends_5y")
    t12 = trends(RAW / "pytrends_smeg_topic_by_country_12m_20261024.csv", "trends_12m")
    t = t5.merge(t12[["geoCode", "trends_12m"]], on="geoCode", how="outer")
    print(f"[europe] features rows: {len(feat)}; trends rows: {len(t)}")
    out = feat.merge(t[["geoCode", "geoName", "trends_5y", "trends_12m"]],
                     left_on="iso2", right_on="geoCode", how="left")
    missing = out[out["trends_5y"].isna()]["iso2"].tolist()
    print(f"[europe] after join: {len(out)} rows; without Trends 5y: {missing or 'none'}")
    out = out[out["trends_5y"].notna()].drop(columns=["geoCode"])
    print(f"[europe] kept {len(out)} rows with Trends 5y")
    out.to_csv(CLEAN / "model_input_europe.csv", index=False)


def sweden() -> None:
    cmap = pd.read_csv(CLEAN / "se_county_map.csv", dtype={"county_code": str})
    t5 = trends(RAW / "pytrends_smeg_topic_se_by_county_5y_20261024.csv", "trends_5y")
    t12 = trends(RAW / "pytrends_smeg_topic_se_by_county_12m_20261024.csv", "trends_12m")

    m = pd.DataFrame(sorted(ISO_TO_SCB.items(), key=lambda kv: kv[1]),
                     columns=["iso_3166_2", "county_code"])
    m = m.merge(cmap, on="county_code", how="left").merge(
        t5[["geoCode", "geoName"]].rename(columns={"geoCode": "iso_3166_2", "geoName": "gtrends_geoName"}),
        on="iso_3166_2", how="left")
    m["name_match"] = [norm(a) == norm(b) for a, b in zip(m["gtrends_name_en"], m["gtrends_geoName"])]
    bad = m[~m["name_match"]]
    assert len(m) == 21 and m["county_code"].is_unique, "mapping must have 21 unique counties"
    assert bad.empty, f"name mismatch:\n{bad}"
    print("[sweden] ISO<->SCB mapping: all 21 county names match se_county_map.csv")
    m.to_csv(CLEAN / "se_iso_scb_map.csv", index=False)

    feat = pd.read_csv(CLEAN / "sweden_county_features.csv", dtype={"county_code": str})
    t = t5.merge(t12[["geoCode", "trends_12m"]], on="geoCode", how="outer")
    t["county_code"] = t["geoCode"].map(ISO_TO_SCB)
    print(f"[sweden] features rows: {len(feat)}; trends rows: {len(t)}")
    out = feat.merge(t[["county_code", "geoCode", "trends_5y", "trends_12m"]], on="county_code", how="left")
    missing = out[out["trends_5y"].isna()]["county_code"].tolist()
    print(f"[sweden] after join: {len(out)} rows; without Trends 5y: {missing or 'none'}")
    assert not missing
    out = out.rename(columns={"geoCode": "iso_3166_2"})
    out.to_csv(CLEAN / "model_input_sweden.csv", index=False)


if __name__ == "__main__":
    europe()
    sweden()

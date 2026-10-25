"""Smeg product demand in Sweden from Google Trends.

1. Weekly interest over 5 years for the 5 most-searched Smeg products, fetched in ONE
   payload so the five series share one 0-100 scale and are comparable.
2. Top and rising search queries containing Smeg (team's Google Trends export, 24 Oct 2026).

Output: data/raw/pytrends_smeg_products_se_5y_<date>.csv, data/clean/product_trends.json
"""
import json
import re
from datetime import date

import pandas as pd
from pytrends.request import TrendReq

# The 5 top Smeg product queries in Sweden (data/raw/gtrends_smeg_se_topics_top_5y.csv.xlsx).
TERMS = {"brödrost smeg": "Toaster", "vattenkokare smeg": "Kettle", "kaffebryggare smeg": "Drip coffee maker",
         "kylskåp smeg": "Fridge", "smeg spis": "Cooker"}
STAMP = date.today().strftime("%Y%m%d")


def fetch_series():
    pt = TrendReq(hl="sv-SE", tz=-120, timeout=(10, 25))
    pt.build_payload(list(TERMS), timeframe="today 5-y", geo="SE")
    df = pt.interest_over_time().drop(columns=["isPartial"], errors="ignore")
    df.to_csv(f"data/raw/pytrends_smeg_products_se_5y_{STAMP}.csv")
    return df


def growth(df):
    out = []
    end = df.index.max()
    last = df[df.index > end - pd.Timedelta(days=365)]
    prev = df[(df.index <= end - pd.Timedelta(days=365)) & (df.index > end - pd.Timedelta(days=730))]
    for term, label in TERMS.items():
        a, b = last[term].mean(), prev[term].mean()
        out.append({"product": label, "query": term, "avg_interest_last_12m": round(a, 1), "avg_interest_prev_12m": round(b, 1),
                    "change_pct": round((a / b - 1) * 100, 1) if b else None, "avg_interest_5y": round(df[term].mean(), 1)})
    return sorted(out, key=lambda r: -r["avg_interest_5y"])


def read_export(path):
    """Google Trends CSV export (saved as xlsx): 'TOP' block then 'RISING' block."""
    df = pd.read_excel(path, header=None)
    top, rising, block = [], [], None
    def fix(x):  # the export's UTF-8 text was saved as Windows-1252 (mojibake like "BrÃ¶drost")
        try:
            return x.encode("cp1252").decode("utf-8") if isinstance(x, str) else x
        except (UnicodeEncodeError, UnicodeDecodeError):
            return x

    for q, v in zip(df[0].map(fix), df[1].map(fix)):
        if q in ("TOP", "RISING"):
            block = q
            continue
        if block is None or pd.isna(q):
            continue
        v = str(v).strip()
        if block == "TOP":
            top.append({"query": q, "index": int(float(v))})
        else:
            digits = re.sub(r"\D", "", v)
            rising.append({"query": q, "change": f"+{int(digits):,}%" if "%" in v and digits else "Breakout"})
    return top, rising


if __name__ == "__main__":
    df = fetch_series()
    top, rising = read_export("data/raw/gtrends_smeg_se_topics_top_5y.csv.xlsx")
    result = {
        "source_id": "S1",
        "note": "Google Trends, Sweden, past 5 years. Relative search interest (0-100), a demand proxy, not sales. "
                "Products are compared in one query, so their numbers share one scale. 'Breakout' = growth above 5,000%.",
        "products": growth(df),
        "top_queries": top,
        "rising_queries": rising,
        "generated": STAMP,
    }
    with open("data/clean/product_trends.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print(json.dumps(result["products"], ensure_ascii=False, indent=1))
    print("top", len(top), "rising", len(rising), rising[:8])

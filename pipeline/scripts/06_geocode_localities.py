"""Map each store locality to its Swedish county (län) with OpenStreetMap Nominatim (open data, ODbL).

Input: latest data/raw/smeg_stores_se_*.csv. One query per unique locality, 1.1 s apart (Nominatim policy).
Cache: data/raw/nominatim_localities_se_<date>.json (raw responses, kept as evidence).
Output: data/clean/smeg_stores_se.csv with county_code (SCB) and county_name.
"""
import csv
import glob
import json
import os
import time
from datetime import date

import requests

STAMP = date.today().strftime("%Y%m%d")
src = sorted(glob.glob("data/raw/smeg_stores_se_*.csv"))[-1]
stores = list(csv.DictReader(open(src, encoding="utf-8")))
cache_path = f"data/raw/nominatim_localities_se_{STAMP}.json"
cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}

HEAD = {"User-Agent": "smeg-whitespace-map/1.0 (github.com/Beethoven04/smeg-whitespace-map)"}
for loc in sorted({s["locality"] for s in stores}):
    if loc in cache:
        continue
    r = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": loc, "countrycodes": "se", "format": "jsonv2", "addressdetails": 1, "limit": 1},
        headers=HEAD,
        timeout=30,
    )
    cache[loc] = r.json()
    time.sleep(1.1)
json.dump(cache, open(cache_path, "w"), ensure_ascii=False, indent=1)

# Nominatim returns the ISO 3166-2 county code; map it to the SCB county code.
iso_map = list(csv.DictReader(open("data/clean/se_iso_scb_map.csv", encoding="utf-8")))
unmatched = []
for s in stores:
    hit = cache.get(s["locality"]) or []
    addr = hit[0]["address"] if hit else {}
    iso = addr.get("ISO3166-2-lvl4", "")
    s["county_name"] = addr.get("county", "")
    s["county_code"] = next((m["county_code"] for m in iso_map if m["iso_3166_2"] == iso), "")
    if not s["county_code"]:
        unmatched.append((s["locality"], iso))

with open("data/clean/smeg_stores_se.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(stores[0].keys()))
    w.writeheader()
    w.writerows(stores)
print("stores", len(stores), "localities", len(cache), "unmatched", len(unmatched), sorted(set(unmatched))[:20])

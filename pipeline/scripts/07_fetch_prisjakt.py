"""Fetch Prisjakt.nu category listings (most popular first, all brands) for Smeg vs competitor price position.

Each category page embeds its product list as JSON (window.__REACT_QUERY_STATE__).
Per product we keep: name, brand (first word of the name), lowest price (SEK, excl. shipping), number of shops.
Raw HTML is saved in data/raw/prisjakt/. Polite: 1.5 s between requests.
"""
import csv
import json
import os
import re
import time
from datetime import datetime

import requests

CATEGORIES = {
    "vattenkokare": "kettle",
    "brodrostar": "toaster",
    "espressomaskiner": "espresso machine",
    "kaffebryggare": "drip coffee maker",
    "kylskap": "fridge",
}
PAGES = 2  # 44 products per page, sorted by Prisjakt popularity (default order)
HEAD = {"User-Agent": "Mozilla/5.0 (smeg-whitespace-map research; open data)"}
NOW = datetime.now()
STAMP = NOW.strftime("%Y%m%d")
os.makedirs("data/raw/prisjakt", exist_ok=True)


def products_in(page_html):
    m = re.search(r"window.__REACT_QUERY_STATE__ = JSON.parse\('(.*?)'\);", page_html, re.S)
    state = json.loads(m.group(1).encode("latin-1", "backslashreplace").decode("unicode_escape"))
    found = []

    def walk(o):
        if isinstance(o, dict):
            if "pathName" in o and "priceSummary" in o and "name" in o:
                found.append(o)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(state)
    return found


rows = []
for slug, label in CATEGORIES.items():
    for page in range(PAGES):
        url = f"https://www.prisjakt.nu/c/{slug}" + (f"?offset={page * 44}" if page else "")
        html = requests.get(url, headers=HEAD, timeout=30).text
        open(f"data/raw/prisjakt/{slug}_p{page + 1}_{STAMP}.html", "w", encoding="utf-8").write(html)
        prods = products_in(html)
        for rank, p in enumerate(prods, start=page * 44 + 1):
            ps = p.get("priceSummary") or {}
            rows.append({
                "category": label,
                "popularity_rank": rank,
                "brand": p["name"].split()[0].upper(),
                "product": p["name"],
                "lowest_price_sek": ps.get("regular"),
                "num_shops": ps.get("count"),
                "url": "https://www.prisjakt.nu" + p["pathName"],
                "collected_at": NOW.strftime("%Y-%m-%d %H:%M"),
            })
        print(slug, page + 1, len(prods))
        time.sleep(1.5)

out = f"data/raw/prisjakt_categories_{STAMP}.csv"
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)
print("wrote", out, len(rows), "smeg rows:", sum(r["brand"] == "SMEG" for r in rows))

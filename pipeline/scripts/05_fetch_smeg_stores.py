"""Scrape Smeg's official Swedish store locator (public page) into a retailer list.

List page: https://www.smeg.com/se/stores-locator groups stores by locality (data-province).
Each store page gives its address line ("street, postcode, city").
Raw HTML of the list page is kept in data/raw/. Polite: 0.3 s between requests.
"""
import csv
import html
import re
import time
from datetime import date

import requests

BASE = "https://www.smeg.com"
LIST_URL = BASE + "/se/stores-locator"
STAMP = date.today().strftime("%Y%m%d")
HEAD = {"User-Agent": "Mozilla/5.0 (smeg-whitespace-map research; open data)"}

page = requests.get(LIST_URL, headers=HEAD, timeout=30).text
open(f"data/raw/smeg_stores_locator_se_{STAMP}.html", "w", encoding="utf-8").write(page)
s = html.unescape(page)

rows = []
for block in re.split(r'<div class="grid" data-province="', s)[1:]:
    locality = block[: block.index('"')]
    for url, name in re.findall(r'<a href="(/se/stores/[^"]+\.html)">\s*<h3>([^<]*)</h3>', block):
        kind = re.search(r"-([a-z]+)\.html$", url).group(1)
        rows.append({"store_name": name.strip(), "locality": locality, "type": kind, "url": BASE + url})
print("stores on list page:", len(rows))

for i, r in enumerate(rows):
    try:
        d = html.unescape(requests.get(r["url"], headers=HEAD, timeout=30).text)
        m = re.search(r'store-header__info__contact">\s*<span>\s*(.*?)\s*</span>', d, re.S)
        addr = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""
    except requests.RequestException as e:
        addr = ""
        print("fail", r["url"], e)
    r["address_line"] = addr
    pc = re.search(r"\b(\d{3}\s?\d{2})\b", addr)
    r["postcode"] = pc.group(1).replace(" ", "") if pc else ""
    if i % 50 == 0:
        print(i, r["store_name"], "|", addr)
    time.sleep(0.3)

out = f"data/raw/smeg_stores_se_{STAMP}.csv"
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["store_name", "locality", "type", "address_line", "postcode", "url"])
    w.writeheader()
    w.writerows(rows)
print("wrote", out, len(rows), "missing address:", sum(1 for r in rows if not r["address_line"]))

"""Fetch Google Trends interest for the Smeg topic (/g/11cnkj_9n2) via pytrends.

Topic, not search term: the plain term "smeg" also matches unrelated searches.
Outputs raw CSVs in data/raw/ (pytrends_*). Values are Google's 0-100 relative index.
"""
import time
from datetime import date
from pytrends.request import TrendReq

KW = "/g/11cnkj_9n2"  # Google Trends topic "Smeg" (from pytrends.suggestions("Smeg"))
STAMP = date.today().strftime("%Y%m%d")
pt = TrendReq(hl="en-US", tz=-120, timeout=(10, 25))


def by_region(geo, resolution, timeframe, name):
    pt.build_payload([KW], timeframe=timeframe, geo=geo)
    df = pt.interest_by_region(resolution=resolution, inc_low_vol=True, inc_geo_code=True)
    df = df.rename(columns={KW: "smeg_interest"})
    df.to_csv(f"data/raw/pytrends_{name}_{STAMP}.csv")
    print(name, len(df))
    time.sleep(5)


def over_time(geo, timeframe, name):
    # Fresh client per call: reusing one client returned the previous geo's series (bug found 14:40).
    pt = TrendReq(hl="en-US", tz=-120, timeout=(10, 25))
    pt.build_payload([KW], timeframe=timeframe, geo=geo)
    df = pt.interest_over_time().rename(columns={KW: "smeg_interest"})
    df.to_csv(f"data/raw/pytrends_{name}_{STAMP}.csv")
    print(name, len(df))
    time.sleep(5)


if __name__ == "__main__":
    by_region("", "COUNTRY", "today 5-y", "smeg_topic_by_country_5y")
    by_region("", "COUNTRY", "today 12-m", "smeg_topic_by_country_12m")
    by_region("SE", "REGION", "today 5-y", "smeg_topic_se_by_county_5y")
    by_region("SE", "REGION", "today 12-m", "smeg_topic_se_by_county_12m")
    over_time("", "today 5-y", "smeg_topic_worldwide_over_time_5y")
    over_time("SE", "today 5-y", "smeg_topic_se_over_time_5y")

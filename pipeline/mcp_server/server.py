"""Smeg Whitespace Map as an MCP server.

Exposes the same open-data results as the web app (data/clean/app_data.json) as
tools, so any MCP client (Claude, Copilot Studio, an internal agent) can ask
"where should Smeg sell next?" and get sourced numbers back.

Run (stdio):  mcp_server/.venv/bin/python mcp_server/server.py
"""

import json
from pathlib import Path

from mcp.server import MCPServer

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "clean" / "app_data.json"

mcp = MCPServer(
    name="smeg-whitespace",
    instructions=(
        "Open-data decision support for Smeg Nordic: where to sell, price position, campaign timing. "
        "Every number comes from public sources; source ids (S1..S9) are listed by list_sources. "
        "Use ONLY numbers returned by these tools and cite their source ids. "
        "Search interest is a demand proxy (Google Trends), not sales."
    ),
)


def _data() -> dict:
    # Re-read on every call so a refreshed pipeline is picked up without a restart.
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def _county_opportunity(c: dict, value: dict, national: float, capture: float) -> float:
    # Same formula as the web app (src/lib/value.ts).
    per_hh = value["smeg_se_revenue_sek"] / value["se_households"]
    gap = max(0.0, 1 - c["retailers_per_100k_hh"] / national)
    return c["households"] * per_hh * gap * capture


def _county_row(c: dict, national: float) -> dict:
    return {
        "rank": c["rank"],
        "county": c["name"],
        "whitespace_score_0_1": c["score"],
        "search_interest_0_100": c["demand_index"],
        "expected_interest_model": c["expected"],
        "smeg_retailers": c["retailers"],
        "retailers_per_100k_households": c["retailers_per_100k_hh"],
        "national_retailers_per_100k_households": national,
        "households": c["households"],
        "new_dwellings_per_1000": c["dwellings_per_1000"],
        "recommended_action": c["action"],
        "sources": ["S1", "S2", "S4", "S5"],
    }


@mcp.tool()
def get_county_ranking(top_n: int = 21) -> dict:
    """Swedish counties ranked by whitespace score: high Smeg search interest but few Smeg retailers per household."""
    d = _data()
    sw = d["sweden"]
    national = sw["national_retailers_per_100k_hh"]
    rows = sorted(sw["counties"], key=lambda c: c["rank"])[: max(1, min(top_n, 21))]
    return {"score_formula": sw["score_formula"], "counties": [_county_row(c, national) for c in rows]}


@mcp.tool()
def get_county(name: str) -> dict:
    """Full facts for one Swedish county (e.g. 'Stockholm'): score, drivers with source ids, recommended action."""
    sw = _data()["sweden"]
    for c in sw["counties"]:
        if c["name"].lower() == name.strip().lower():
            row = _county_row(c, sw["national_retailers_per_100k_hh"])
            row["drivers"] = c["drivers"]
            return row
    return {"error": f"Unknown county '{name}'", "counties": sorted(c["name"] for c in sw["counties"])}


@mcp.tool()
def estimate_value(capture_rate: float = 0.5) -> dict:
    """Yearly SEK revenue opportunity from closing the retail gap in the top under-covered counties. capture_rate is an assumption (0.1-1.0)."""
    d = _data()
    sw, value = d["sweden"], d["value"]
    national = sw["national_retailers_per_100k_hh"]
    capture = min(1.0, max(0.1, capture_rate))
    top = sorted((c for c in sw["counties"] if c["retailers_per_100k_hh"] < national), key=lambda c: c["rank"])[: value["top_n"]]
    per_county = [{"county": c["name"], "households": c["households"], "retailers_per_100k_households": c["retailers_per_100k_hh"],
                   "opportunity_sek_per_year": round(_county_opportunity(c, value, national, capture))} for c in top]
    return {
        "total_sek_per_year": sum(r["opportunity_sek_per_year"] for r in per_county),
        "capture_rate": capture,
        "capture_rate_is_assumption": True,
        "formula": "households x (Smeg Nordic revenue / Swedish households) x max(0, 1 - county retailers per 100k hh / national) x capture rate",
        "smeg_nordic_revenue_sek": value["smeg_se_revenue_sek"],
        "revenue_year": value["revenue_year"],
        "swedish_households": value["se_households"],
        "counties": per_county,
        "sources": [value["revenue_source_id"], "S2", "S5"],
        "limits": "SMEG Nordic AB revenue may include sales outside Sweden, so this is an upper bound. For prioritisation, not a forecast.",
    }


@mcp.tool()
def get_awareness_gaps() -> dict:
    """Counties that search for Smeg less than their income and housing predict (out-of-sample model). Action: marketing, not stores."""
    d = _data()
    m = d["model"]
    return {"counties": d["sweden"]["awareness"],
            "model": {"type": "ridge regression", "cv": m["cv"], "baseline_mae": m["baseline_mae"], "model_mae": m["model_mae"], "r2": m["model_r2"]},
            "sources": ["S1", "S2", "S3", "S4"]}


@mcp.tool()
def get_price_position() -> dict:
    """Smeg vs all brands on Prisjakt per category: popularity rank, median prices, premium multiple."""
    p = _data()["prices"]
    cats = [{k: c[k] for k in ("category", "n_products", "smeg_best_rank", "smeg_median_sek", "category_median_sek", "premium_x", "smeg_in_top10")} for c in p["categories"]]
    return {"categories": cats, "note": p["note"], "sources": [p["source_id"]]}


@mcp.tool()
def get_campaign_timing() -> dict:
    """Seasonality of Smeg search demand in Sweden: monthly profile, yearly peaks, and forecast accuracy vs baselines."""
    t = _data()["timing"]
    return {
        "monthly_vs_annual_mean_pct": {m["name"]: m["pct_vs_annual_mean"] for m in t["monthly_profile"]},
        "peak_weeks_by_year": t["peak_weeks_by_year"],
        "yoy_change_pct": t["yoy_change_pct"],
        "forecast_test_52_weeks": t["holdout"]["metrics"],
        "chosen_model": t["chosen_model"],
        "target": t["target"],
        "sources": [t["source_id"]],
    }


@mcp.tool()
def get_europe_markets() -> dict:
    """Smeg search interest per European country (5 years) and momentum (last 12 months vs 5 years, relative to median country)."""
    e = _data()["europe"]
    return {"countries": sorted(e["countries"], key=lambda c: -c["actual"]), "note": e["target_label"],
            "model_r2_income_housing": e["model_r2"], "sources": ["S1", "S7"]}


@mcp.tool()
def get_product_trends() -> dict:
    """Which Smeg products are rising or falling in Swedish search demand (last 12 months vs previous 12), and the fastest-rising related searches."""
    return json.loads((DATA_PATH.parent / "product_trends.json").read_text(encoding="utf-8"))


@mcp.tool()
def list_sources() -> list:
    """All public data sources with URL and access date."""
    return _data()["sources"]


if __name__ == "__main__":
    mcp.run()

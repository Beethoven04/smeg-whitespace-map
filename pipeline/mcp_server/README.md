# Smeg Whitespace Map: MCP server

Lets any MCP-compatible assistant or agent (Claude Desktop, Claude Code, Microsoft Copilot Studio, custom agents) query the same open-data results as the web app. For example: "Where should Smeg sign the next retailer?" or "What is the value at 30% capture?"

It reads `data/clean/app_data.json`, which the pipeline scripts produce. Re-run the pipeline and the server serves the new numbers without a restart.

## Tools

| Tool | Answers |
|---|---|
| `get_county_ranking(top_n)` | Swedish counties ranked by whitespace score |
| `get_county(name)` | One county: drivers with source ids, recommended action |
| `estimate_value(capture_rate)` | Yearly SEK opportunity, formula, inputs, per county (same formula as the app) |
| `get_awareness_gaps()` | Counties under-searching vs model, plus model accuracy |
| `get_price_position()` | Smeg vs all brands on Prisjakt per category |
| `get_campaign_timing()` | Monthly seasonality, yearly peaks, forecast test |
| `get_europe_markets()` | Search interest and momentum per country |
| `get_product_trends()` | Smeg products rising or falling (12m vs prior 12m) and rising related searches |
| `list_sources()` | All sources with URLs and access dates |

Every response carries source ids (S1–S9). The server tells the client to use only returned numbers.

## Install (Python 3.10+)

```bash
cd pipeline && python3.12 -m venv mcp_server/.venv
mcp_server/.venv/bin/pip install -r mcp_server/requirements.txt
```

## Connect

Claude Code:
```bash
claude mcp add smeg-whitespace -- /ABSOLUTE/PATH/smeg-whitespace-map/pipeline/mcp_server/.venv/bin/python /ABSOLUTE/PATH/smeg-whitespace-map/pipeline/mcp_server/server.py
```

Claude Desktop (`claude_desktop_config.json`):
```json
{ "mcpServers": { "smeg-whitespace": { "command": "/ABSOLUTE/PATH/smeg-whitespace-map/pipeline/mcp_server/.venv/bin/python", "args": ["/ABSOLUTE/PATH/smeg-whitespace-map/pipeline/mcp_server/server.py"] } } }
```

The server uses stdio. For a hosted, shared deployment (e.g. Copilot Studio), run it with the streamable HTTP transport (`mcp.run(transport="streamable-http")`) behind the company's auth. That deployment is not built yet.

## Limits

- Not included: the New builds (B2B) projects, which live in the app code (`../../app/src/lib/b2b/`).
- Data refresh is manual: run `pipeline/run_all.sh` (see the root README).

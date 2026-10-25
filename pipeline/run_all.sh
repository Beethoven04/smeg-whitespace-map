#!/usr/bin/env bash
# Rebuild every dataset and the app's data file from the public sources.
#   ./run_all.sh            fetch everything again, then model and build
#   ./run_all.sh --offline  skip the fetch steps; rebuild from the files in data/
set -euo pipefail
cd "$(dirname "$0")"
PY="${PYTHON:-python3}"

FETCH=(01_fetch_eurostat 02_fetch_scb 03_fetch_gtrends 05_fetch_smeg_stores 06_geocode_localities 07_fetch_prisjakt 08_fetch_product_trends)
BUILD=(04_build_model_inputs 10_model 11_forecast 20_build_app_data)

if [[ "${1:-}" != "--offline" ]]; then
  for s in "${FETCH[@]}"; do echo "== $s"; "$PY" "scripts/$s.py"; done
fi
for s in "${BUILD[@]}"; do echo "== $s"; "$PY" "scripts/$s.py"; done

cp data/clean/app_data.json data/clean/product_trends.json ../app/src/data/
echo "Done: app/src/data/app_data.json and product_trends.json updated."

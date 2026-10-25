"""Seasonal demand forecast for Smeg in Sweden (Google Trends proxy).

Input : data/raw/pytrends_smeg_topic_se_over_time_5y_20261024.csv
Output: data/clean/forecast_se.json
Holdout = last 52 complete weeks. Model choice by holdout MAE only.
"""
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.forecasting.stl import STLForecast
from statsmodels.tsa.arima.model import ARIMA

warnings.filterwarnings("ignore")
SEED = 42
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data/raw/pytrends_smeg_topic_se_over_time_5y_20261024.csv"
SRC_WW = ROOT / "data/raw/pytrends_smeg_topic_worldwide_over_time_5y_20261024.csv"
OUT = ROOT / "data/clean/forecast_se.json"
H_TEST, H_FC, P = 52, 12, 52


def load(path):
    df = pd.read_csv(path, parse_dates=["date"])
    if "isPartial" in df.columns:
        df = df[~df["isPartial"].astype(str).str.lower().eq("true")]
    s = df.set_index("date")["smeg_interest"].astype(float)
    s.index.freq = "W-SUN"
    return s


def metrics(y, f):
    y, f = np.asarray(y), np.asarray(f)
    e = y - f
    return {
        "mae": round(float(np.mean(np.abs(e))), 2),
        "mape_pct": round(float(np.mean(np.abs(e) / y) * 100), 2),
        "rmse": round(float(np.sqrt(np.mean(e ** 2))), 2),
    }


def fit_hw(train):
    return ExponentialSmoothing(train, trend="add", damped_trend=True,
                                seasonal="add", seasonal_periods=P,
                                initialization_method="estimated").fit()


def fit_stl(train):
    return STLForecast(train, ARIMA, model_kwargs={"order": (1, 0, 0), "trend": "c"},
                       period=P, robust=True).fit()


s = load(SRC)
train, test = s.iloc[:-H_TEST], s.iloc[-H_TEST:]

fc = {
    "seasonal_naive": s.shift(P).iloc[-H_TEST:].values,
    "train_mean": np.repeat(train.mean(), H_TEST),
    "holt_winters_damped": fit_hw(train).forecast(H_TEST).values,
    "stl_arima": fit_stl(train).forecast(H_TEST).values,
}
table = []
for name, f in fc.items():
    m = metrics(test.values, f)
    table.append({"model": name, "kind": "baseline" if name in ("seasonal_naive", "train_mean") else "model", **m})
sn_mae = next(r["mae"] for r in table if r["model"] == "seasonal_naive")
models = [r for r in table if r["kind"] == "model"]
best = min(models, key=lambda r: r["mae"])
beats = best["mae"] < sn_mae
for r in table:
    r["beats_seasonal_naive"] = r["mae"] < sn_mae if r["model"] != "seasonal_naive" else None

# Refit chosen model on all data; 80% interval by simulation
rng = np.random.default_rng(SEED)
fut_idx = pd.date_range(s.index[-1] + pd.Timedelta(weeks=1), periods=H_FC, freq="W-SUN")
if best["model"] == "holt_winters_damped":
    full = fit_hw(s)
    mean = full.forecast(H_FC).values
    sims = full.simulate(H_FC, repetitions=2000, error="add", anchor="end",
                         random_state=SEED).values
    lo, hi = np.percentile(sims, 10, axis=1), np.percentile(sims, 90, axis=1)
    interval_method = ("Holt-Winters simulate(): 2000 future paths with additive errors "
                       "drawn from N(0, fitted residual variance); 10th-90th percentile.")
else:
    full = fit_stl(s)
    pred = full.get_prediction(start=len(s), end=len(s) + H_FC - 1)
    mean = pred.predicted_mean.values
    ci = pred.conf_int(alpha=0.2).values
    lo, hi = ci[:, 0], ci[:, 1]
    interval_method = ("STL + AR(1): analytic 80% interval of the AR model on the "
                       "seasonally adjusted series; seasonal component treated as fixed.")
mean = np.clip(mean, 0, 100); lo = np.clip(lo, 0, 100); hi = np.clip(hi, 0, 100)

# Seasonality (descriptive, full complete years of data)
d = s.to_frame("v")
d["month"] = d.index.month
# Trends weekly dates are the Sunday that starts the week; use Wednesday for ISO week
d["isoweek"] = (d.index + pd.Timedelta(days=3)).isocalendar().week.astype(int).values
d["year"] = d.index.year
annual = d["v"].mean()
mon = d.groupby("month")["v"].mean()
month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
monthly_profile = [{"month": int(m), "name": month_names[m - 1], "avg_index": round(float(v), 1),
                    "pct_vs_annual_mean": round(float((v / annual - 1) * 100), 1)} for m, v in mon.items()]
wk = d.groupby("isoweek")["v"].mean()
top_weeks = wk.sort_values(ascending=False).head(5)
peak_week_profile = [{"iso_week": int(w), "avg_index": round(float(v), 1),
                      "pct_vs_annual_mean": round(float((v / annual - 1) * 100), 1)} for w, v in top_weeks.items()]

peak_by_year = []
for y, g in d.groupby("year"):
    if len(g) < 50:  # skip partial calendar years
        continue
    i = g["v"].idxmax()
    nov = pd.date_range(f"{y}-11-01", f"{y}-11-30", freq="D")
    black_friday = nov[nov.weekday == 3][3] + pd.Timedelta(days=1)  # day after 4th Thursday of November
    peak_by_year.append({"year": int(y), "peak_date": i.strftime("%Y-%m-%d"),
                         "contains_black_friday": bool(i <= black_friday < i + pd.Timedelta(days=7)),
                         "iso_week": int(g.loc[i, "isoweek"]), "value": float(g.loc[i, "v"]),
                         "peak_month": month_names[i.month - 1]})

yoy = (s.iloc[-52:].mean() / s.iloc[-104:-52].mean() - 1) * 100

ww_identical = SRC_WW.read_bytes() == SRC.read_bytes()

out = {
    "source": SRC.name,
    "target": "Google Trends relative search interest (0-100), Smeg topic, Sweden, weekly. Demand PROXY, not sales.",
    "n_weeks": int(len(s)), "first_week": s.index[0].strftime("%Y-%m-%d"), "last_week": s.index[-1].strftime("%Y-%m-%d"),
    "holdout": {"weeks": H_TEST, "start": test.index[0].strftime("%Y-%m-%d"), "end": test.index[-1].strftime("%Y-%m-%d"),
                "metrics": table},
    "chosen_model": best["model"] if beats else None,
    "best_model_by_holdout_mae": best["model"],
    "beats_seasonal_naive": bool(beats),
    "interval_method": interval_method,
    "history": [{"date": i.strftime("%Y-%m-%d"), "value": float(v)} for i, v in s.iloc[-104:].items()],
    "forecast": [{"date": i.strftime("%Y-%m-%d"), "mean": round(float(m), 1), "lo80": round(float(l), 1),
                  "hi80": round(float(h), 1)} for i, m, l, h in zip(fut_idx, mean, lo, hi)],
    "annual_mean_index": round(float(annual), 1),
    "monthly_profile": monthly_profile,
    "top_iso_weeks": peak_week_profile,
    "peak_weeks_by_year": peak_by_year,
    "yoy_change_pct": round(float(yoy), 1),
    "worldwide_file_identical_to_se": ww_identical,
    "notes": [
        "Google Trends is relative search interest, rescaled 0-100 within this query; a proxy for demand, not sales.",
        "Re-downloading the series can change values (sampling, rescaling).",
        "Model chosen by MAE on the last 52 weeks only; then refit on all data.",
        "Data check: the worldwide file is byte-identical to the Sweden file, so the geo of the series is not verified; worldwide comparison was not done." if ww_identical else "Worldwide file differs from Sweden file.",
        "If beats_seasonal_naive is false, show only the seasonal profile, not the forecast.",
    ],
}
OUT.write_text(json.dumps(out, indent=2))
print(pd.DataFrame(table).to_string(index=False))
print("chosen:", out["chosen_model"], "beats SN:", beats)
print(pd.DataFrame(monthly_profile).to_string(index=False))
print("top weeks:", peak_week_profile)
print("peak by year:", peak_by_year)
print("yoy:", out["yoy_change_pct"], "ww identical:", ww_identical)
print("forecast:", out["forecast"][:3], "...", out["forecast"][-1])

"""Expected Smeg demand-proxy model (Google Trends 5y interest) per region.

Mean baseline vs RidgeCV (StandardScaler inside Pipeline), leave-one-out CV.
Residual = actual - out-of-fold expected. Bootstrap (200, seed 42) stability of residual ranks.
Inputs:  data/clean/model_input_europe.csv, data/clean/model_input_sweden.csv
Outputs: data/clean/model_europe.csv, data/clean/model_sweden.csv, data/clean/model_metrics.json
Missing features (Europe: CH, GB, IS): rows are DROPPED, not imputed (documented in docs/MODEL.md).
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import RidgeCV
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import LeaveOneOut, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

SEED = 42
N_BOOT = 200
TOP_K = 5
ALPHAS = np.logspace(-3, 3, 25)
ROOT = Path(__file__).resolve().parents[1]
CLEAN = ROOT / "data/clean"


def make_model() -> Pipeline:
    # RidgeCV picks alpha with efficient LOO on the TRAINING rows only (never the held-out row).
    return Pipeline([("scale", StandardScaler()), ("ridge", RidgeCV(alphas=ALPHAS))])


def prep_europe() -> tuple[pd.DataFrame, list[str]]:
    df = pd.read_csv(CLEAN / "model_input_europe.csv", keep_default_na=False, na_values=[""])
    df["log_gdp_pc_pps"] = np.log(df["gdp_pc_pps"])
    df["log_hh_consumption_pc_pps"] = np.log(df["hh_consumption_pc_pps"])
    df["log_pop_density_km2"] = np.log(df["pop_density_km2"])
    feats = ["log_gdp_pc_pps", "log_hh_consumption_pc_pps", "log_pop_density_km2", "dwelling_permits_per_1000"]
    dropped = df[df[feats].isna().any(axis=1)]["iso2"].tolist()
    print(f"[europe] rows {len(df)}; dropped for missing features: {dropped}")
    df = df.dropna(subset=feats).reset_index(drop=True)
    df["region"], df["region_name_out"] = df["iso2"], df["region_name"]
    return df, feats, dropped


def prep_sweden() -> tuple[pd.DataFrame, list[str]]:
    df = pd.read_csv(CLEAN / "model_input_sweden.csv", dtype={"county_code": str})
    df["log_hh_disp_income_median_tkr"] = np.log(df["hh_disp_income_median_tkr"])
    df["log_households"] = np.log(df["households"])
    df["households_per_capita"] = df["households"] / df["population"]
    feats = ["log_hh_disp_income_median_tkr", "log_households", "households_per_capita", "dwellings_completed_per_1000"]
    dropped = df[df[feats].isna().any(axis=1)]["county_code"].tolist()
    df = df.dropna(subset=feats).reset_index(drop=True)
    df["region"], df["region_name_out"] = df["county_code"], df["county_name"]
    return df, feats, dropped


def bootstrap_ranks(X: np.ndarray, y: np.ndarray, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """Refit on bootstrap resamples, predict every region, count top-K under/over residual ranks."""
    n = len(y)
    under, over = np.zeros(n), np.zeros(n)
    for _ in range(N_BOOT):
        idx = rng.integers(0, n, n)
        m = make_model().fit(X[idx], y[idx])
        res = y - m.predict(X)
        order = np.argsort(res)
        under[order[:TOP_K]] += 1
        over[order[-TOP_K:]] += 1
    return under / N_BOOT, over / N_BOOT


def run(scope: str, df: pd.DataFrame, feats: list[str], dropped: list[str]) -> dict:
    X, y = df[feats].to_numpy(float), df["trends_5y"].to_numpy(float)
    loo = LeaveOneOut()
    base_oof = cross_val_predict(DummyRegressor(strategy="mean"), X, y, cv=loo)
    oof = cross_val_predict(make_model(), X, y, cv=loo)
    full = make_model().fit(X, y)
    ridge = full.named_steps["ridge"]

    # Coefficient spread: refit on each LOO training set
    coefs = np.array([make_model().fit(X[tr], y[tr]).named_steps["ridge"].coef_ for tr, _ in loo.split(X)])
    rng = np.random.default_rng(SEED)
    under, over = bootstrap_ranks(X, y, rng)

    out = pd.DataFrame({
        "region": df["region"], "region_name": df["region_name_out"],
        "actual": y, "expected_oof": oof.round(2), "residual": (y - oof).round(2),
    })
    out["gap_pct"] = (out["residual"] / out["expected_oof"] * 100).round(1)
    out["residual_vs_baseline_oof"] = (y - base_oof).round(2)
    out["trends_12m"] = df["trends_12m"].to_numpy()
    out["momentum"] = df["trends_12m"].to_numpy() - y  # descriptive: 12m minus 5y, different query scales
    ratio = df["trends_12m"].to_numpy() / y
    out["momentum_index"] = (ratio / np.median(ratio)).round(3)  # >1 = rose more than the median region
    out["share_top5_underserved"] = under
    out["share_top5_overperforming"] = over
    out["rank_underserved"] = out["residual"].rank(method="first").astype(int)
    out["label"] = "proxy: Google Trends interest, not sales"
    out = out.sort_values("residual").reset_index(drop=True)
    out.to_csv(CLEAN / f"model_{scope}.csv", index=False)

    b_mae, m_mae = mean_absolute_error(y, base_oof), mean_absolute_error(y, oof)
    metrics = {
        "n": int(len(y)), "dropped_missing_features": dropped, "target": "trends_5y (Google Trends Smeg topic, 0-100, proxy)",
        "features": feats, "cv": "leave-one-out, out-of-fold", "seed": SEED, "n_bootstrap": N_BOOT,
        "baseline_mae": round(b_mae, 3), "baseline_r2": round(r2_score(y, base_oof), 3),
        "model_mae": round(m_mae, 3), "model_r2": round(r2_score(y, oof), 3),
        "alpha": float(ridge.alpha_),
        "coefficients_standardized": {
            f: {"full_fit": round(float(c), 3), "loo_mean": round(float(coefs[:, i].mean()), 3),
                "loo_min": round(float(coefs[:, i].min()), 3), "loo_max": round(float(coefs[:, i].max()), 3)}
            for i, (f, c) in enumerate(zip(feats, ridge.coef_))},
        "intercept": round(float(ridge.intercept_), 3),
        "beats_baseline": bool(m_mae < b_mae),
    }
    print(f"[{scope}] n={metrics['n']} baseline MAE={b_mae:.2f} R2={metrics['baseline_r2']} | "
          f"ridge MAE={m_mae:.2f} R2={metrics['model_r2']} alpha={ridge.alpha_:.3g} beats={metrics['beats_baseline']}")
    print(out[["region", "region_name", "actual", "expected_oof", "residual", "gap_pct",
               "share_top5_underserved", "share_top5_overperforming"]].head(TOP_K).to_string(index=False))
    return metrics


if __name__ == "__main__":
    metrics = {"europe": run("europe", *prep_europe()), "sweden": run("sweden", *prep_sweden())}
    (CLEAN / "model_metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False))
    print(json.dumps({k: {kk: v[kk] for kk in ("baseline_mae", "model_mae", "model_r2", "beats_baseline")}
                      for k, v in metrics.items()}))

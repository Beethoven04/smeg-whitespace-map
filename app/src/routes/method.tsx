import { createFileRoute } from "@tanstack/react-router";
import { data } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { ChartNote } from "@/components/ChartNote";

export const Route = createFileRoute("/method")({
  head: () => ({ meta: [{ title: "Method & sources — Smeg Whitespace Map" }] }),
  component: MethodPage,
});

function MethodPage() {
  const { sources } = data;
  const m = data.model;
  return (
    <AppShell
      eyebrow="07 — Method & sources"
      title={
        <>
          Every number, <em className="text-primary">traceable</em>
        </>
      }
      lede="Only public data. Each figure in the app links to its source; models are tested on data they never saw."
    >
      <div className="grid grid-cols-2 gap-16">
        <div className="space-y-10">
          <div>
            <h3 className="mb-3 font-display text-2xl">Model vs baseline (out-of-sample)</h3>
            <p className="mb-3 text-[15px] text-muted-foreground">
              {m.scope}, n = {m.n}. Target: {m.target}. Ridge regression on {m.features.join(", ")}.
            </p>
            <table className="w-full text-[15px]">
              <tbody className="divide-y divide-border border-y border-border">
                {[
                  ["Baseline MAE", m.baseline_mae],
                  ["Model MAE", m.model_mae],
                  ["Model R²", m.model_r2],
                  ["Cross-validation", m.cv],
                ].map(([k, v]) => (
                  <tr key={k as string}>
                    <td className="py-2.5 text-muted-foreground">{k}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ChartNote
              shows={
                <>
                  MAE = average miss in search-interest points when each county is predicted by a
                  model that never saw it. The baseline just guesses the average county.
                </>
              }
              soWhat={
                <>
                  The model misses by {m.model_mae} vs {m.baseline_mae} for the guess (
                  {Math.round((1 - m.model_mae / m.baseline_mae) * 100)}% better), so its "expected
                  demand" is good enough to flag awareness gaps. R² {m.model_r2}: it explains part,
                  not all, of the differences.
                </>
              }
            />
            {!m.beats_baseline && (
              <p className="mt-3 text-[15px] text-warning">
                Model did not beat the baseline; ranking uses the transparent score only.
              </p>
            )}
          </div>
          <div>
            <h3 className="mb-3 font-display text-2xl">Limitations</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-muted-foreground">
              <li>Google search interest is a proxy for demand, not sales.</li>
              <li>Retail footprint comes from Smeg's public store locator on 24 Oct 2026.</li>
              <li>Estimates are for prioritisation, not forecasts.</li>
              <li>
                Prisjakt prices are one snapshot (24 Oct 2026, lowest listed price); price trends
                over time are not included.
              </li>
              <li>
                SMEG Nordic AB revenue is used as Swedish revenue; it may include some sales outside
                Sweden, so the SEK value is an upper-bound estimate.
              </li>
              <li>
                Country and county search scores come from separate queries and cannot be compared
                with each other.
              </li>
            </ul>
          </div>
        </div>
        <div>
          <h3 className="mb-3 font-display text-2xl">Sources</h3>
          <ul className="divide-y divide-border border-y border-border text-[15px]">
            {sources.map((s) => (
              <li key={s.id} className="flex items-baseline gap-3 py-2.5">
                <span className="font-mono text-muted-foreground">{s.id}</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-border underline-offset-4 hover:decoration-pine"
                >
                  {s.name}
                </a>
                <span className="text-muted-foreground">{s.publisher}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {s.accessed}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

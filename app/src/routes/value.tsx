import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { data } from "@/lib/data";
import { revenueOpportunity, countyOpportunity, formatSek, topGapCounties } from "@/lib/value";
import { AppShell } from "@/components/AppShell";
import { NumberTicker } from "@/components/NumberTicker";
import { SourceChip } from "@/components/SourceChip";
import { Slider } from "@/components/ui/slider";
import { HowToRead } from "@/components/HowToRead";

export const Route = createFileRoute("/value")({
  head: () => ({ meta: [{ title: "Value — Smeg Whitespace Map" }] }),
  component: ValuePage,
});

function ValuePage() {
  const { sweden, value } = data;
  const national = sweden.national_retailers_per_100k_hh;
  const [capture, setCapture] = useState(value.capture_rate_default);
  const opp = revenueOpportunity(sweden.counties, value, national, capture);
  const top = topGapCounties(sweden.counties, value.top_n, national);
  const perHh = value.se_households ? value.smeg_se_revenue_sek / value.se_households : 0;
  return (
    <AppShell
      eyebrow="06 — Value"
      title={
        <>
          What it is <em className="text-primary">worth</em>
        </>
      }
      lede="Revenue Smeg could add per year by closing the retail gap in the top under-covered counties. Every input is sourced; the one assumption has a slider."
    >
      <div className="grid grid-cols-2 gap-16">
        <div>
          <div className="text-sm uppercase tracking-widest text-muted-foreground">
            Revenue opportunity / year
          </div>
          <NumberTicker
            value={opp}
            format={formatSek}
            className="mt-2 block font-display text-[96px] leading-none text-primary"
          />
          <div className="mt-10 max-w-md">
            <div className="mb-3 flex justify-between text-[15px]">
              <span>
                Capture rate <span className="text-muted-foreground">(assumption)</span>
              </span>
              <span className="font-mono tabular-nums">{Math.round(capture * 100)}%</span>
            </div>
            <Slider
              min={0.1}
              max={1}
              step={0.01}
              value={[capture]}
              onValueChange={(v) => setCapture(v[0] ?? capture)}
              aria-label="Capture rate"
            />
          </div>
        </div>
        <div className="space-y-4 text-[15px] leading-relaxed">
          <p>
            For each of the top <b className="font-mono">{value.top_n}</b> ranked counties with
            fewer Smeg retailers per household than the national level:
          </p>
          <p>
            households × (SMEG Nordic AB total revenue {value.revenue_year}{" "}
            <span className="font-mono">{formatSek(value.smeg_se_revenue_sek)}</span>{" "}
            <SourceChip id={value.revenue_source_id} label={value.revenue_source_id} /> ÷ Swedish
            households <span className="font-mono">{value.se_households.toLocaleString("en")}</span>{" "}
            <SourceChip id="S2" label="S2" /> ={" "}
            <span className="font-mono">SEK {perHh.toFixed(1)}</span> per household) × coverage gap
            (1 − county retailers ÷ national <span className="font-mono">{national}</span> per 100k
            hh) <SourceChip id="S5" label="S5" /> × capture rate{" "}
            <span className="font-mono">{Math.round(capture * 100)}%</span>{" "}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-warning">
              assumption
            </span>
          </p>
          <ul className="divide-y divide-border border-y border-border">
            {top.map((c) => (
              <li key={c.code} className="flex justify-between py-2.5">
                <span>
                  {c.name}{" "}
                  <span className="font-mono text-muted-foreground">
                    · {c.households.toLocaleString("en")} hh · {c.retailers_per_100k_hh}/100k
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  {formatSek(countyOpportunity(c, value, national, capture))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-14">
        <HowToRead
          items={[
            {
              term: "Revenue per household",
              text: (
                <>
                  Smeg Nordic earns about SEK {Math.round(perHh)} per Swedish household a year
                  (total revenue ÷ all households).
                </>
              ),
            },
            {
              term: "Coverage gap",
              text: (
                <>
                  How far a county is below the national number of Smeg stores per household.{" "}
                  {top[0]?.name}:{" "}
                  {top[0] ? Math.round((1 - top[0].retailers_per_100k_hh / national) * 100) : 0}%
                  below.
                </>
              ),
            },
            {
              term: "Capture rate (our assumption)",
              text: (
                <>
                  Not every sale in a new store is new: some buyers would have bought online or
                  elsewhere. At {Math.round(capture * 100)}% we count only that share as extra
                  revenue. Move the slider to test it.
                </>
              ),
            },
            {
              term: "In one sentence",
              text: (
                <>
                  If these counties had as many Smeg stores per household as the rest of Sweden,
                  they would buy like the rest of Sweden: {formatSek(opp)} a year,{" "}
                  {((opp / value.smeg_se_revenue_sek) * 100).toFixed(1)}% of Smeg Nordic's revenue.
                </>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}

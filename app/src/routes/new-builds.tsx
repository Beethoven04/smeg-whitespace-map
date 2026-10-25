import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { NumberTicker } from "@/components/NumberTicker";
import { Slider } from "@/components/ui/slider";
import { formatSek } from "@/lib/value";
import { ChartNote } from "@/components/ChartNote";
import { getSeedProjects } from "@/lib/b2b/seed";
import { STAGE_LABELS } from "@/lib/b2b/types";
import {
  KITCHEN_PRODUCTS,
  PRICE_ACCESSED_DATE,
  ASSUMPTION_LABEL,
  DEFAULT_PROJECT_PRICE_PERCENT,
  getPipelineValue,
  orderValue,
  orderValueExcluded,
} from "@/lib/b2b/value";

export const Route = createFileRoute("/new-builds")({
  head: () => ({ meta: [{ title: "New builds (B2B) — Smeg Whitespace Map" }] }),
  component: NewBuildsPage,
});

const PROJECTS = getSeedProjects();

function NewBuildsPage() {
  const [pricePct, setPricePct] = useState(DEFAULT_PROJECT_PRICE_PERCENT);
  const [winPct, setWinPct] = useState(10);
  const pipe = getPipelineValue(PROJECTS, pricePct);
  const won = pipe.smegRevenueAssumedTotal * (winPct / 100);

  return (
    <AppShell
      eyebrow="05 — New builds (B2B)"
      title={
        <>
          New kitchens, <em className="text-primary">before</em> they are built
        </>
      }
      lede="Residential and hotel projects in Malmö taken from public planning decisions and press. Each fact links to its source; unknowns are shown, never guessed."
    >
      <div className="grid grid-cols-[1fr_1fr_1.4fr] divide-x divide-border border-y border-border">
        <Kpi label="Projects tracked">
          <span className="font-display text-6xl tabular-nums">{PROJECTS.length}</span>
        </Kpi>
        <Kpi label={`Dwellings with known size (${pipe.projectsWithKnownUnits} projects)`}>
          <span className="font-display text-6xl tabular-nums">
            {pipe.knownUnits.toLocaleString("en")}
          </span>
        </Kpi>
        <Kpi label={`Kitchen value Smeg could win at ${winPct}% win rate (one-time)`}>
          <NumberTicker
            value={won}
            format={formatSek}
            className="font-display text-7xl leading-none text-primary"
          />
        </Kpi>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-12">
        <div className="space-y-6">
          <SliderRow
            label="Share of these kitchens Smeg wins"
            value={winPct}
            min={1}
            max={50}
            onChange={setWinPct}
          />
          <SliderRow
            label="Smeg project price, % of retail"
            value={pricePct}
            min={20}
            max={100}
            onChange={setPricePct}
          />
        </div>
        <div className="space-y-2 text-[15px] leading-relaxed">
          <p>
            {pipe.knownUnits.toLocaleString("en")} dwellings × SEK{" "}
            {pipe.perKitchenAssumed.toLocaleString("en")} per kitchen ={" "}
            <span className="font-mono">{formatSek(pipe.smegRevenueAssumedTotal)}</span> if every
            kitchen were Smeg (upper bound) × win rate {winPct}% ={" "}
            <span className="font-mono">{formatSek(won)}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Kitchen = oven, induction hob, integrated dishwasher, integrated fridge/freezer at
            Swedish retail prices ({PRICE_ACCESSED_DATE}); cooker hood excluded (no verified price).
            Win rate and project price are{" "}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-warning">
              {ASSUMPTION_LABEL}
            </span>
            . Projects with unknown size and the hotel are not valued.
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {KITCHEN_PRODUCTS.map((p) => (
              <li key={p.product}>
                <a
                  href={p.lowSource}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-border underline-offset-4 hover:decoration-pine"
                >
                  {p.product}
                </a>{" "}
                <span className="font-mono text-muted-foreground">
                  {p.retailLow.toLocaleString("en")}–{p.retailHigh.toLocaleString("en")} kr
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2 className="mt-14 font-display text-3xl">Project pipeline</h2>
      <div className="mt-5 overflow-hidden rounded-[14px] border border-border bg-card">
        <table className="w-full text-[15px]">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Project</th>
              <th className="px-5 py-3 font-medium">Stage</th>
              <th className="px-5 py-3 font-medium">Size</th>
              <th className="px-5 py-3 font-medium">Developer</th>
              <th className="px-5 py-3 font-medium">Kitchen value (upper bound)</th>
              <th className="px-5 py-3 font-medium">Sources</th>
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => {
              const v = orderValue(p, pricePct);
              const why = orderValueExcluded(p);
              return (
                <tr key={p.id} className="border-b border-border align-top last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {p.district}
                      {p.planId ? ` · ${p.planId}` : ""} · {p.projectType}
                    </div>
                    {p.nextMilestone && (
                      <div className="mt-1 text-sm text-pine">{p.nextMilestone}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {STAGE_LABELS[p.stage]}
                    {p.stageDate && (
                      <div className="font-mono text-xs text-muted-foreground">{p.stageDate}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono tabular-nums">
                    {p.units.value !== null ? (
                      <>
                        {p.units.status === "approximate" ? "≈" : ""}
                        {p.units.value}{" "}
                        <span className="font-sans text-sm text-muted-foreground">
                          {p.units.kind === "hotel_rooms" ? "rooms" : "dwellings"}
                        </span>
                      </>
                    ) : (
                      <span className="font-sans text-sm text-muted-foreground">Unknown</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {p.developer.verified && p.developer.name ? (
                      p.developer.name
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono tabular-nums">
                    {v ? (
                      formatSek(v.smegRevenueAssumed)
                    ) : (
                      <span className="font-sans text-sm text-muted-foreground">{why}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {p.sources.map((s) => (
                      <a
                        key={s.id}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block underline decoration-border underline-offset-4 hover:decoration-pine"
                      >
                        {s.publisher}: {s.title}
                      </a>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ChartNote
        shows={
          <>
            Each row is a real planned building in Malmö: how far it is in planning, how many homes,
            who builds it, and what its kitchens would be worth if all were Smeg.
          </>
        }
        soWhat={
          <>
            Developers choose kitchen suppliers early. Projects at the plan or permit stage are the
            ones to call now; the sliders above turn the list into a realistic SEK figure.
          </>
        }
      />
      <p className="mt-3 text-sm text-muted-foreground">
        Project research by the team from Malmö stad planning documents (Stadsbyggnadsnämnden 26 Aug
        2026), malmo.se plan pages and press. Accessed 24 Oct 2026. A project being planned does not
        mean it will buy Smeg.
      </p>
    </AppShell>
  );
}

function Kpi({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-8 py-8 first:pl-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="max-w-md">
      <div className="mb-3 flex justify-between text-[15px]">
        <span>
          {label} <span className="text-muted-foreground">(assumption)</span>
        </span>
        <span className="font-mono tabular-nums">{value}%</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? value)}
        aria-label={label}
      />
    </div>
  );
}

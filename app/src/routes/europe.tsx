import { createFileRoute } from "@tanstack/react-router";
import { data } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { EuropeChart } from "@/components/EuropeChart";
import { ChartNote } from "@/components/ChartNote";

export const Route = createFileRoute("/europe")({
  head: () => ({ meta: [{ title: "Europe — Smeg Whitespace Map" }] }),
  component: EuropePage,
});

function EuropePage() {
  const { europe } = data;
  const byActual = [...europe.countries].sort((a, b) => b.actual - a.actual);
  const lead = byActual[0]!;
  const vsLead = (v: number) => Math.round((v / lead.actual) * 100);
  const byMomentum = [...europe.countries]
    .filter((c) => c.momentum_index !== null)
    .sort((a, b) => (b.momentum_index ?? 0) - (a.momentum_index ?? 0));
  return (
    <AppShell
      eyebrow="02 — Europe"
      title={
        <>
          Where Smeg is <em className="text-primary">strongest</em>
        </>
      }
      lede="How popular Smeg is in each country: the share of all Google searches that are about Smeg, compared with the most Smeg-interested country in Europe, over 5 years."
    >
      <div className="grid grid-cols-[1fr_320px] gap-12">
        <div>
          <div className="mb-3 flex gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-3 w-5 rounded-sm bg-pine" />
              Smeg searches, % of {lead.name}'s level (past 5 years)
            </span>
          </div>
          <EuropeChart />
          <p className="mt-3 text-sm text-muted-foreground">
            Source: Google Trends, Smeg topic. Search interest is a demand signal, not sales.
          </p>
          <ChartNote
            shows={
              <>
                {lead.name} searches for Smeg more than any other European country.{" "}
                {byActual[1]?.name} is at {vsLead(byActual[1]?.actual ?? 0)}% of {lead.name}'s
                level; most countries are below half.
              </>
            }
            soWhat={
              <>
                {lead.name} is a mature market: grow through better coverage (see Where to sell).
                The fast risers (
                {byMomentum
                  .slice(0, 3)
                  .map((r) => r.name)
                  .join(", ")}
                ) start from a low base and are candidates for distributor talks or online-first
                tests.
              </>
            }
          />
        </div>
        <aside className="space-y-10">
          <MarketList
            title="Strongest markets"
            note={`Smeg searches, % of ${lead.name}'s level`}
            rows={byActual
              .slice(0, 3)
              .map((r) => ({ iso2: r.iso2, name: r.name, value: `${vsLead(r.actual)}%` }))}
          />
          <MarketList
            title="Rising fastest"
            note="How much faster Smeg searches grew in the past year than in a typical country"
            rows={byMomentum.slice(0, 3).map((r) => ({
              iso2: r.iso2,
              name: r.name,
              value: `+${Math.round(((r.momentum_index ?? 1) - 1) * 100)}% faster`,
            }))}
          />
          <p className="text-[15px] text-muted-foreground">
            Income, density and housing explain only {Math.round(europe.model_r2 * 100)}% of the
            differences between {europe.model_n} countries (R² {europe.model_r2.toFixed(2)},
            out-of-sample): Smeg’s popularity is not explained by wealth or housing.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}

function MarketList({
  title,
  note,
  rows,
}: {
  title: string;
  note: string;
  rows: { iso2: string; name: string; value: string }[];
}) {
  return (
    <div>
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mb-3 text-sm text-muted-foreground">{note}</p>
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((r) => (
          <li key={r.iso2} className="flex justify-between py-2.5 text-[15px]">
            <span>
              <span className="mr-2 font-mono text-muted-foreground">{r.iso2}</span>
              {r.name}
            </span>
            <span className="font-mono tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

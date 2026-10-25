import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { data } from "@/lib/data";
import { revenueOpportunity, formatSek, topGapCounties } from "@/lib/value";
import { AppShell } from "@/components/AppShell";
import { NumberTicker } from "@/components/NumberTicker";
import { SourceChip } from "@/components/SourceChip";
import { getSeedProjects } from "@/lib/b2b/seed";
import { getPipelineValue } from "@/lib/b2b/value";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smeg Whitespace Map — where to sell next" },
      {
        name: "description",
        content:
          "Open-data decision tool: where Smeg should sell next in Sweden, at what price position and when.",
      },
      { property: "og:title", content: "Smeg Whitespace Map" },
      { property: "og:description", content: "Pick Smeg's next region using only open data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { europe, sweden, value, sources, prices, timing } = data;
  const national = sweden.national_retailers_per_100k_hh;
  const opp = revenueOpportunity(sweden.counties, value, national, value.capture_rate_default);
  const top = [...sweden.counties].sort((a, b) => a.rank - b.rank)[0]!;
  const leaders = prices.categories.filter((c) => c.smeg_best_rank <= 10);
  const gapCounties = topGapCounties(sweden.counties, value.top_n, national);
  const gaps = gapCounties.map((c) => Math.round((1 - c.retailers_per_100k_hh / national) * 100));
  const nov = timing.monthly_profile.find((m) => m.month === 11);
  const bf = timing.peak_weeks_by_year.filter((p) => p.contains_black_friday).length;
  const firstEu = [...europe.countries].sort((a, b) => b.actual - a.actual)[0]!;
  const b2b = getSeedProjects();
  const pipe = getPipelineValue(b2b);
  const topNames = topGapCounties(sweden.counties, value.top_n, national)
    .map((c) => c.name)
    .join(", ")
    .replace(/, ([^,]*)$/, " and $1");

  return (
    <AppShell
      eyebrow="00 — Overview"
      title={
        <>
          Where should Smeg sell <em className="text-primary">next?</em>
        </>
      }
      lede="One clear answer from free public data, re-runnable every week. Start with the three steps below."
    >
      <div className="grid grid-cols-3 gap-6">
        <Step n="1" title="The problem">
          Smeg has to choose where to sell, at what price and when. Public data on what people
          search, buy and build already shows where demand is not being served, but it is rarely
          used in these decisions.
        </Step>
        <Step n="2" title="What we found">
          <b className="text-foreground">{top.name}</b> searches for Smeg more than any other county
          in Sweden, yet has{" "}
          <b className="text-foreground">
            {Math.round((1 - top.retailers_per_100k_hh / national) * 100)}% fewer Smeg stores
          </b>{" "}
          per household than the Swedish average.
        </Step>
        <Step n="3" title="What Smeg should do">
          Sign new retailers or test pop-ups in {topNames}. Closing the store gap there is worth
          <Link to="/value" className="mt-3 block">
            <NumberTicker
              value={opp}
              format={formatSek}
              className="font-display text-6xl leading-none text-primary"
            />
          </Link>
          <span className="mt-2 block text-sm">
            per year, if half of those sales are new (assumption, adjustable on the Value page).
          </span>
        </Step>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          to="/sweden"
          className="rounded-[10px] bg-pine px-5 py-3 text-[15px] font-medium text-pine-foreground transition-opacity duration-150 hover:opacity-90"
        >
          See where to sell →
        </Link>
        <span className="text-sm text-muted-foreground">
          Built only from public data ({europe.countries.length} countries, {sweden.stores_mapped}{" "}
          Smeg stores, {sources.length} sources):
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {sources.map((s) => (
          <SourceChip key={s.id} id={s.id} label={s.short} />
        ))}
      </div>

      <h2 className="mt-14 font-display text-3xl">Five decisions, one place</h2>
      <div className="mt-6 grid grid-cols-2 gap-5">
        <Card to="/sweden" tag="Where to sell" stat={`${gapCounties.length} counties`}>
          {gapCounties.map((c) => c.name).join(", ")} have strong demand for Smeg but{" "}
          {Math.min(...gaps)}–{Math.max(...gaps)}% fewer Smeg stores per household than Sweden
          overall. Add retailers there.
        </Card>
        <Card
          to="/pricing"
          tag="Pricing"
          stat={`${leaders.length} of ${prices.categories.length} categories`}
        >
          In {leaders.length} of the {prices.categories.length} product categories we checked, a
          Smeg product is among the 10 most popular on Prisjakt even though Smeg costs more than the
          typical product. Hold the price there.
        </Card>
        <Card
          to="/timing"
          tag="Timing"
          stat={`+${Math.round(nov?.pct_vs_annual_mean ?? 0)}% in November`}
        >
          Swedes search for Smeg {Math.round(nov?.pct_vs_annual_mean ?? 0)}% more in November than
          in an average month, peaking in Black Friday week in {bf} of the last{" "}
          {timing.peak_weeks_by_year.length} years. Start campaigns in late October.
        </Card>
        <Card
          to="/new-builds"
          tag="New builds (B2B)"
          stat={`${pipe.knownUnits.toLocaleString("en")} new homes`}
        >
          New homes in the {pipe.projectsWithKnownUnits} of {b2b.length} planned Malmö projects with
          a published size, from public planning decisions: kitchens Smeg can offer to developers
          before they are built.
        </Card>
        <Card to="/europe" tag="Europe" stat={`${firstEu.name} #1 of ${europe.countries.length}`}>
          Of {europe.countries.length} European countries, {firstEu.name} searches for Smeg the
          most. A country's wealth explains only {Math.round(europe.model_r2 * 100)}% of the
          differences, so income alone does not explain where Smeg is popular.
        </Card>
      </div>
    </AppShell>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-6">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {n} — {title}
      </div>
      <div className="mt-3 text-[16px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

function Card({
  to,
  tag,
  stat,
  children,
}: {
  to: "/sweden" | "/pricing" | "/timing" | "/europe" | "/new-builds";
  tag: string;
  stat: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group rounded-[14px] border border-border bg-card p-6 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-pine"
    >
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {tag}
      </div>
      <div className="mt-3 font-display text-4xl">{stat}</div>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{children}</p>
      <div className="mt-4 text-sm font-medium text-pine">Open {tag.toLowerCase()} →</div>
    </Link>
  );
}

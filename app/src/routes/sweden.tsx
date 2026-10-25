import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { data, type County } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { CountyTable } from "@/components/CountyTable";
import { CountyDrawer } from "@/components/CountyDrawer";
import { DownloadData } from "@/components/DownloadData";

export const Route = createFileRoute("/sweden")({
  head: () => ({ meta: [{ title: "Where to sell — Smeg Whitespace Map" }] }),
  component: SwedenPage,
});

function SwedenPage() {
  const { sweden } = data;
  const [selected, setSelected] = useState<County | null>(null);
  return (
    <AppShell
      eyebrow="01 — Where to sell"
      title={
        <>
          Where Smeg is <em className="text-primary">under-sold</em>
        </>
      }
      lede="Counties where many people search for Smeg but there are few Smeg stores per household. Click a county for the reasons and sources."
    >
      <div>
        <CountyTable onSelect={setSelected} />
      </div>
      <div className="mt-4">
        <DownloadData />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Ranking: half search demand, half lack of stores. {sweden.stores_mapped} of{" "}
        {sweden.stores_total} Smeg stores from Smeg’s store locator mapped to a county (unmatched:{" "}
        {sweden.stores_unmatched_names.join(", ")}).
      </p>
      <div className="mt-14">
        <h2 className="font-display text-3xl">Where to market instead</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">
          These counties search for Smeg less than their income and housing would predict. The
          answer there is local marketing, not a new store.
        </p>
        <ul className="mt-5 divide-y divide-border border-y border-border">
          {sweden.awareness.map((a) => (
            <li key={a.code} className="flex items-baseline justify-between py-3 text-[15px]">
              <span className="font-medium">{a.name}</span>
              <span>
                <span className="font-mono tabular-nums text-danger">
                  {Math.round((a.actual / a.expected - 1) * 100)}%
                </span>{" "}
                <span className="text-muted-foreground">fewer Smeg searches than expected</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <CountyDrawer county={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}

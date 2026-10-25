import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Timing } from "@/components/Timing";

export const Route = createFileRoute("/timing")({
  head: () => ({ meta: [{ title: "Timing — Smeg Whitespace Map" }] }),
  component: () => (
    <AppShell
      eyebrow="04 — Timing"
      title={
        <>
          When Sweden <em className="text-primary">wants</em> Smeg
        </>
      }
      lede="Five years of weekly search interest, a 12-week forecast tested on data it never saw, and a campaign calendar."
    >
      <Timing />
    </AppShell>
  ),
});

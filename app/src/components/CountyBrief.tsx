import { useEffect } from "react";
import type { County } from "@/lib/data";
import { useAi } from "@/hooks/use-ai";
import { briefInput } from "@/lib/brief-input";

type Brief = { headline: string; why: string[]; action: string; risk: string };

function isBrief(d: unknown): d is Brief {
  const b = d as Brief;
  return (
    !!b &&
    typeof b.headline === "string" &&
    Array.isArray(b.why) &&
    typeof b.action === "string" &&
    typeof b.risk === "string"
  );
}

export function CountyBrief({ county }: { county: County }) {
  const { start, result, error, loading } = useAi();
  const input = briefInput(county);

  useEffect(() => {
    void start(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  if (loading || (!result && !error)) {
    return (
      <ul className="space-y-2 rounded-[14px] border border-border bg-card p-5 text-[15px] text-muted-foreground">
        <li>Reading {county.name}'s 6 open-data facts…</li>
        <li className="animate-pulse">Writing a 4-line brief from those facts only…</li>
      </ul>
    );
  }
  if (error || !result || !isBrief(result.data)) {
    return (
      <div className="rounded-[14px] border border-border bg-card p-5 text-[15px]">
        <p className="text-muted-foreground">
          {error ?? "The brief came back in an unexpected format."}
        </p>
        <button
          onClick={() => void start(input)}
          className="mt-3 rounded-full border border-border px-4 py-1.5 text-sm hover:border-pine"
        >
          Try again
        </button>
      </div>
    );
  }
  const b = result.data;
  return (
    <div className="space-y-4 rounded-[14px] border border-border bg-card p-5 text-[15px] leading-relaxed">
      <p className="font-display text-2xl leading-snug">{b.headline}</p>
      <ul className="list-disc space-y-1.5 pl-5">
        {b.why.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <p>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Next 90 days{" "}
        </span>
        {b.action}
      </p>
      <p className="text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-widest">Caveat </span>
        {b.risk}
      </p>
      <p className="font-mono text-xs text-muted-foreground">
        AI-written from the facts above ·{" "}
        {result.cached
          ? "replay (offline)"
          : `${result.provider} · ${(result.ms / 1000).toFixed(1)} s`}
      </p>
    </div>
  );
}

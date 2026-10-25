import type { ReactNode } from "react";

/** Plain-language note under a chart or table: what it shows, and what Smeg should do with it. */
export function ChartNote({ shows, soWhat }: { shows: ReactNode; soWhat: ReactNode }) {
  return (
    <div className="mt-4 space-y-1 border-l-2 border-pine pl-4 text-[15px] leading-relaxed">
      <p>
        <span className="font-medium">What this shows: </span>
        <span className="text-muted-foreground">{shows}</span>
      </p>
      <p>
        <span className="font-medium">So what: </span>
        <span className="text-muted-foreground">{soWhat}</span>
      </p>
    </div>
  );
}

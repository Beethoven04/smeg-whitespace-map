import type { ReactNode } from "react";

/** Plain-language key for the numbers on a page: one term, one sentence. */
export function HowToRead({ items }: { items: { term: string; text: ReactNode }[] }) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-6">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        How to read this
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-10 gap-y-4 text-[15px] leading-relaxed">
        {items.map((i) => (
          <div key={i.term}>
            <dt className="font-medium">{i.term}</dt>
            <dd className="text-muted-foreground">{i.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

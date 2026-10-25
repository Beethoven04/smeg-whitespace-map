import { data } from "@/lib/data";

export function SampleBadge() {
  if (!data.is_sample) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-warning" />
      Sample data
    </span>
  );
}

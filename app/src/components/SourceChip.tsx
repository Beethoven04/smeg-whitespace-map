import { sourceById } from "@/lib/data";

export function SourceChip({ id, label }: { id: string; label?: string }) {
  const s = sourceById(id);
  if (!s) return null;
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noreferrer"
      title={`${s.name} — ${s.publisher}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors duration-150 hover:border-pine hover:text-pine"
    >
      <span className="font-mono text-muted-foreground">{s.id}</span>
      {label !== s.id && <span>{label ?? s.name}</span>}
    </a>
  );
}

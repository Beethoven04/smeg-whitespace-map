import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { County } from "@/lib/data";
import { SourceChip } from "./SourceChip";
import { SampleBadge } from "./SampleBadge";
import { CountyBrief } from "./CountyBrief";

export function CountyDrawer({ county, onClose }: { county: County | null; onClose: () => void }) {
  return (
    <Sheet open={!!county} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-[480px] overflow-y-auto bg-background sm:max-w-[480px]"
      >
        {county && (
          <div className="space-y-8 pt-2">
            <SheetHeader className="space-y-2 p-0 text-left">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground">#{county.rank}</span>
                <SampleBadge />
              </div>
              <SheetTitle className="font-display text-5xl font-normal">{county.name}</SheetTitle>
              <SheetDescription className="text-[15px]">
                Whitespace score{" "}
                <span className="font-mono tabular-nums text-foreground">
                  {county.score.toFixed(2)}
                </span>
              </SheetDescription>
            </SheetHeader>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Drivers
              </h3>
              <ul className="divide-y divide-border border-y border-border">
                {county.drivers.map((d) => (
                  <li
                    key={d.label}
                    className="flex items-center justify-between gap-3 py-3 text-[15px]"
                  >
                    <span>{d.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono tabular-nums">{d.value}</span>
                      <SourceChip id={d.source_id} label={d.source_id} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[14px] bg-pine p-5 text-pine-foreground">
              <div className="text-xs uppercase tracking-widest opacity-80">Recommended action</div>
              <div className="mt-2 font-display text-2xl">{county.action}</div>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                AI brief
              </h3>
              <CountyBrief key={county.code} county={county} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

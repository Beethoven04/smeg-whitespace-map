import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { data } from "@/lib/data";
import { SampleBadge } from "./SampleBadge";

const NAV = [
  { to: "/", label: "Overview", hint: "The answer in one screen" },
  { to: "/sweden", label: "Where to sell", hint: "21 counties ranked" },
  { to: "/europe", label: "Europe", hint: "Strongest & rising markets" },
  { to: "/pricing", label: "Pricing", hint: "Smeg vs all brands" },
  { to: "/timing", label: "Timing", hint: "Season & forecast" },
  { to: "/new-builds", label: "New builds (B2B)", hint: "Malmö project pipeline" },
  { to: "/value", label: "Value", hint: "SEK opportunity" },
  { to: "/method", label: "Method & sources", hint: "How every number is made" },
  { to: "/integrate", label: "Use it in your systems", hint: "Download, embed, AI assistant" },
] as const;

/** Sidebar app layout shared by every page. One page = one decision. */
export function AppShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-border px-6 py-8">
        <Link to="/" className="block">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Smeg Nordic
          </div>
          <div className="mt-1 font-display text-3xl leading-none">Whitespace Map</div>
        </Link>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((n, i) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="group rounded-[10px] px-3 py-2.5 transition-colors duration-150 hover:bg-muted"
              activeProps={{ className: "bg-card shadow-[inset_0_0_0_1px_var(--border)]" }}
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(i).padStart(2, "0")}
                </span>
                <span className="text-[15px] font-medium">{n.label}</span>
              </div>
              <div className="pl-[30px] text-xs text-muted-foreground">{n.hint}</div>
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1 text-xs text-muted-foreground">
          <div>Only open data · {data.sources.length} sources</div>
          <div className="font-mono">Updated {data.generated_at.slice(0, 10)}</div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-14 pb-24 pt-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-4 flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {eyebrow}
            </span>
            <SampleBadge />
          </div>
          <h1 className="font-display text-[64px] leading-[0.95] tracking-tight">{title}</h1>
          {lede && <p className="mt-5 max-w-3xl text-lg text-muted-foreground">{lede}</p>}
          <div className="mt-10 border-t border-border pt-10">{children}</div>
        </div>
      </main>
    </div>
  );
}

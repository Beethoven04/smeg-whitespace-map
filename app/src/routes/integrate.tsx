import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { DownloadData } from "@/components/DownloadData";

export const Route = createFileRoute("/integrate")({
  head: () => ({ meta: [{ title: "Use it in your systems — Smeg Whitespace Map" }] }),
  component: IntegratePage,
});

const MCP_CMD =
  "claude mcp add smeg-whitespace -- <path>/pipeline/mcp_server/.venv/bin/python <path>/pipeline/mcp_server/server.py";

function IntegratePage() {
  // The embed snippet points at wherever this app is served from (local, preview or published).
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const embed = `<iframe src="${origin}/sweden" width="100%" height="900" style="border:0" title="Smeg Whitespace Map"></iframe>`;

  return (
    <AppShell
      eyebrow="08 — Use it in your systems"
      title={
        <>
          Plug it in, <em className="text-primary">safely</em>
        </>
      }
      lede="Three ways to use these results inside Smeg's own tools, easiest first. None of them needs Smeg's internal data or any password."
    >
      <div className="grid grid-cols-3 gap-6">
        <Way n="1" title="Download" who="Anyone · works today · no IT needed">
          <p>
            The county ranking as CSV, or every number in the app as JSON, with its sources. Opens
            in Excel, Power BI or Google Sheets.
          </p>
          <div className="mt-4">
            <DownloadData />
          </div>
        </Way>
        <Way n="2" title="Embed on the intranet or website" who="Web team · one line of HTML">
          <p>
            Paste this snippet into any intranet or web page (SharePoint, CMS) to show the live
            ranking. It works once the app is published at a public address.
          </p>
          <Code>{embed}</Code>
        </Way>
        <Way n="3" title="Ask from an AI assistant" who="IT / data team · MCP server, built">
          <p>
            Our MCP server lets AI assistants that support MCP (e.g. Claude) ask questions such as
            “Where should Smeg sign the next retailer?” and get sourced numbers back. 9 tools,
            read-only. Runs locally today.
          </p>
          <Code>{MCP_CMD}</Code>
          <p className="mt-2 text-sm">
            Code and setup: <span className="font-mono">pipeline/mcp_server/README.md</span> in the
            repository.
          </p>
        </Way>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6">
        <div className="rounded-[14px] bg-pine p-6 text-pine-foreground">
          <div className="text-xs uppercase tracking-widest opacity-80">Why it is safe</div>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px]">
            <li>
              Only public data goes in: Google Trends, SCB, Eurostat, Smeg's public store list,
              Prisjakt, public planning documents.
            </li>
            <li>
              Read-only: nothing writes to Smeg's systems, and no Smeg or customer data leaves the
              company.
            </li>
            <li>No passwords or API keys are needed to read the results.</li>
            <li>Every number carries its source id, so anyone can check it.</li>
          </ul>
        </div>
        <div className="rounded-[14px] border border-border bg-card p-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Next steps (not built yet)
          </div>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-muted-foreground">
            <li>
              Hosted, login-protected API and MCP server, so Power BI or Copilot Studio can connect
              directly.
            </li>
            <li>Weekly automatic refresh of the public data, with dated snapshots.</li>
            <li>A weekly “top 3 changes” message to a Teams or Slack channel.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function Way({
  n,
  title,
  who,
  children,
}: {
  n: string;
  title: string;
  who: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[14px] border border-border bg-card p-6 text-[15px] leading-relaxed text-muted-foreground">
      <div className="font-mono text-xs uppercase tracking-widest">
        {n} — {who}
      </div>
      <h3 className="mt-2 mb-3 font-display text-2xl text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-[10px] bg-muted p-3 font-mono text-xs text-foreground">
        {children}
      </pre>
      <button
        type="button"
        className="mt-2 text-sm font-medium text-pine"
        onClick={() =>
          navigator.clipboard
            ?.writeText(children)
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
        }
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// React hook around the runAi server function. Copy to app/src/hooks/use-ai.ts.
// Falls back to the demo cache ONLY when the call failed AND the input is the demo input.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runAi, type AiOk, type Json } from "@/lib/ai.functions";
import demoCache from "@/data/demo-cache.json";

export type AiResult = AiOk & { cached: boolean };

export function useAi() {
  const run = useServerFn(runAi);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start(input: string): Promise<AiResult | null> {
    setLoading(true);
    setError(null);
    try {
      const r = await run({ data: { input } });
      const out = { ...r, cached: false };
      setResult(out);
      return out;
    } catch (e) {
      const cache = demoCache as { input?: string; data?: Json };
      if (cache.input && cache.data !== undefined && cache.input.trim() === input.trim()) {
        const out = {
          data: cache.data,
          provider: "cache",
          model: "demo-cache",
          ms: 0,
          cached: true,
        };
        setResult(out);
        return out;
      }
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again, or use the sample.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { start, result, error, loading };
}

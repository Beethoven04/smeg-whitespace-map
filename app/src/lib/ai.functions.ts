// AI server function with a provider fallback chain: Lovable AI -> Gemini -> Groq.
// Stack: Lovable "tanstack_start_ts_current" template (TanStack Start server functions, not Supabase edge functions).
// Copy to app/src/lib/ai.functions.ts. Change ONLY: SYSTEM_PROMPT, OUTPUT_SCHEMA, TEMPERATURE, the input validator.
// Call from a component: const run = useServerFn(runAi); const r = await run({ data: { input } });
import { createServerFn } from "@tanstack/react-start";

const SYSTEM_PROMPT = `You write a short decision brief for a Smeg Nordic retail expansion manager about one Swedish county.
You get the county's facts as JSON: Google search interest in Smeg (0-100, a proxy for demand), Smeg retailers per 100k households vs the national level, new dwellings, income, the model's expected interest, and the open-data source id of each fact.
Rules:
- Use ONLY the numbers and facts in the input. Never add facts, numbers, competitors, store names or cities that are not in the input.
- Write plain English for a non-technical manager. Each bullet at most 25 words.
- "headline": one sentence with the decision.
- "why": exactly 3 bullets, each citing one number from the input followed by its source id in brackets, e.g. "(S5)".
- "action": one concrete next step for the next 90 days.
- "risk": one honest caveat (e.g. search interest is a proxy, not sales).
Return ONLY valid JSON matching the schema.`;

// JSON schema of the answer. Lovable AI enforces it; Gemini/Groq get it in the prompt.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    why: { type: "array", items: { type: "string" } },
    action: { type: "string" },
    risk: { type: "string" },
  },
  required: ["headline", "why", "action", "risk"],
  additionalProperties: false,
} as const;

const TEMPERATURE = 0.3;
const TIMEOUT_MS = 25_000;
const MAX_INPUT = 20_000;

// Server function results must be serializable, so `unknown` is not allowed here.
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type AiOk = { data: Json; provider: string; model: string; ms: number };

type Attempt = { provider: string; status: number; detail: string };

// Models sometimes wrap JSON in ``` fences or add a sentence around it.
function parseJson(text: string): Json {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("no JSON object in model output");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

async function withTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Lovable AI gateway, Responses API with streaming (same call shape Lovable generates).
async function callLovable(input: string): Promise<{ data: Json; model: string }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw Object.assign(new Error("not configured"), { status: -1 });
  const model = "openai/gpt-6-astra";
  const res = await withTimeout("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions: SYSTEM_PROMPT,
      input,
      text: {
        format: { type: "json_schema", name: "result", strict: true, schema: OUTPUT_SCHEMA },
      },
    }),
  });
  if (!res.ok || !res.body) {
    throw Object.assign(new Error((await res.text()).slice(0, 200)), { status: res.status });
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      try {
        const ev = JSON.parse(p);
        if (ev.type === "response.output_text.delta") out += ev.delta;
      } catch {
        /* ignore partial line */
      }
    }
  }
  return { data: parseJson(out), model };
}

// Gemini and Groq both speak the OpenAI chat completions format.
async function callChat(
  url: string,
  keyName: string,
  model: string,
  input: string,
): Promise<{ data: Json; model: string }> {
  const key = process.env[keyName];
  if (!key) throw Object.assign(new Error("not configured"), { status: -1 });
  const res = await withTimeout(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: TEMPERATURE,
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\nJSON schema:\n${JSON.stringify(OUTPUT_SCHEMA)}`,
        },
        { role: "user", content: input },
      ],
    }),
  });
  if (!res.ok) {
    throw Object.assign(new Error((await res.text()).slice(0, 200)), { status: res.status });
  }
  const json = await res.json();
  return { data: parseJson(json?.choices?.[0]?.message?.content ?? ""), model };
}

const PROVIDERS: {
  name: string;
  call: (input: string) => Promise<{ data: Json; model: string }>;
}[] = [
  { name: "lovable", call: callLovable },
  {
    name: "gemini",
    call: (i) =>
      callChat(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "GEMINI_API_KEY",
        "gemini-3.5-flash",
        i,
      ),
  },
  {
    name: "groq",
    call: (i) =>
      callChat(
        "https://api.groq.com/openai/v1/chat/completions",
        "GROQ_API_KEY",
        "openai/gpt-oss-120b",
        i,
      ),
  },
];

export const runAi = createServerFn({ method: "POST" })
  .inputValidator((d: { input: string }) => {
    if (typeof d?.input !== "string" || !d.input.trim())
      throw new Error("Please add some input first.");
    return { input: d.input.slice(0, MAX_INPUT) };
  })
  .handler(async ({ data }): Promise<AiOk> => {
    const started = Date.now();
    const tried: Attempt[] = [];
    for (const p of PROVIDERS) {
      try {
        const r = await p.call(data.input);
        return { data: r.data, provider: p.name, model: r.model, ms: Date.now() - started };
      } catch (e) {
        const status = (e as { status?: number }).status ?? 0;
        const detail = e instanceof Error ? e.message : String(e);
        tried.push({ provider: p.name, status, detail });
        console.error(`[ai] ${p.name} failed`, status, detail);
      }
    }
    console.error("[ai] all providers failed", JSON.stringify(tried));
    throw new Error(
      "All AI providers are busy right now. Try again in a minute, or use the sample.",
    );
  });

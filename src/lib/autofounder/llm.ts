import Anthropic from "@anthropic-ai/sdk";
import type { GenerationMode } from "./types";

/**
 * Tiered model access. Per the canonical brief:
 *   - reasoning/orchestration/code  -> Opus
 *   - bulk content                  -> Sonnet
 *   - cheap classify/validate       -> Haiku
 */
export type ModelTier = "reasoning" | "bulk" | "cheap";

export const MODELS: Record<ModelTier, string> = {
  reasoning: "claude-opus-4-8",
  bulk: "claude-sonnet-4-6",
  cheap: "claude-haiku-4-5-20251001",
};

const PLACEHOLDER_KEYS = new Set(["", "your_api_key_here", "sk-ant-xxx"]);

/** Whether a live API key looks usable at all (does NOT verify credit). */
export function hasUsableKey(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  return !PLACEHOLDER_KEYS.has(key) && key.startsWith("sk-ant-");
}

/**
 * Resolve the starting mode for a run.
 * GENERATION_MODE = "live" | "mock" | "auto" (default "auto").
 * "auto" => live if a key is present, otherwise mock. A live run may still
 * degrade to mock at runtime if a call fails (e.g. no credit).
 */
export function resolveStartMode(): GenerationMode {
  const forced = process.env.GENERATION_MODE?.trim().toLowerCase();
  if (forced === "live") return "live";
  if (forced === "mock") return "mock";
  return hasUsableKey() ? "live" : "mock";
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmError";
  }
}

/** Extract the first balanced JSON object/array from a model response. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new LlmError("No JSON found in model response");
  // Walk to the matching closing bracket.
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return candidate.slice(start, i + 1);
    }
  }
  throw new LlmError("Unterminated JSON in model response");
}

/**
 * Call Claude and parse a JSON object of type T. Throws LlmError on any
 * failure (network, auth, no credit, bad JSON) so the orchestrator can decide
 * whether to fall back to mock.
 */
export async function generateJson<T>(opts: {
  tier: ModelTier;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<{ data: T; model: string }> {
  const model = MODELS[opts.tier];
  try {
    const res = await client().messages.create({
      model,
      max_tokens: opts.maxTokens ?? 1500,
      system: `${opts.system}\n\nReturn ONLY valid JSON. No prose, no markdown fences.`,
      messages: [{ role: "user", content: opts.prompt }],
    });
    const text = res.content[0]?.type === "text" ? res.content[0].text : "";
    const data = JSON.parse(extractJson(text)) as T;
    return { data, model };
  } catch (err) {
    if (err instanceof LlmError) throw err;
    // Anthropic SDK errors carry status + message; surface concisely.
    const msg =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
    throw new LlmError(msg);
  }
}

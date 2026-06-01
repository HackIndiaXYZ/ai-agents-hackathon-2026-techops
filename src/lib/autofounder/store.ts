/**
 * File-backed run store. Each GenerationContext is one JSON document under
 * `.runs/<runId>.json`. Writing after every agent step is what makes a run
 * durable: if the process dies mid-run, the context (with completed tasks and
 * artifacts) survives, and the orchestrator resumes from the next pending step.
 *
 * This is the M1 stand-in for Postgres + Temporal event history. The interface
 * (load / save / create) is deliberately small so it can be swapped for a real
 * datastore without touching the orchestrator.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AGENT_LABELS,
  PIPELINE,
  type GenerationContext,
  type GenerationMode,
} from "./types";

const RUNS_DIR = join(process.cwd(), ".runs");

async function ensureDir() {
  await mkdir(RUNS_DIR, { recursive: true });
}

function runPath(runId: string) {
  return join(RUNS_DIR, `${runId}.json`);
}

/** Short, URL-safe, time-sortable-ish id (no external deps). */
export function newRunId(seed: number): string {
  const ts = seed.toString(36);
  let rnd = "";
  // Derive a few pseudo-random chars from the seed deterministically enough.
  let x = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < 6; i++) {
    x = (Math.imul(x, 1597334677) + 1) >>> 0;
    rnd += "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36];
  }
  return `r_${ts}${rnd}`;
}

export function createContext(
  runId: string,
  idea: string,
  mode: GenerationMode,
  now: number,
  seed: number
): GenerationContext {
  return {
    runId,
    idea: idea.trim(),
    status: "queued",
    mode,
    seed,
    createdAt: now,
    updatedAt: now,
    tasks: PIPELINE.map((role) => ({
      role,
      label: AGENT_LABELS[role],
      status: "pending",
    })),
  };
}

export async function saveContext(ctx: GenerationContext): Promise<void> {
  await ensureDir();
  ctx.updatedAt = Date.now();
  await writeFile(runPath(ctx.runId), JSON.stringify(ctx, null, 2), "utf8");
}

export async function loadContext(
  runId: string
): Promise<GenerationContext | null> {
  try {
    const raw = await readFile(runPath(runId), "utf8");
    return JSON.parse(raw) as GenerationContext;
  } catch {
    return null;
  }
}

export async function listRunIds(): Promise<string[]> {
  try {
    const files = await readdir(RUNS_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

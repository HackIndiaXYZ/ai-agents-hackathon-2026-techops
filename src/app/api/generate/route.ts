import { runPipeline } from "@/lib/autofounder/orchestrator";
import {
  createContext,
  loadContext,
  newRunId,
  saveContext,
} from "@/lib/autofounder/store";
import { resolveStartMode } from "@/lib/autofounder/llm";
import type { ProgressEvent } from "@/lib/autofounder/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/generate
 * body: { idea: string, runId?: string }
 * Streams ProgressEvents as SSE. If runId refers to an existing incomplete run,
 * the pipeline resumes from the first pending agent instead of starting over.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    idea?: string;
    runId?: string;
  };

  // Resolve or create the run context.
  let ctx = body.runId ? await loadContext(body.runId) : null;
  if (!ctx) {
    const idea = body.idea?.trim();
    if (!idea) {
      return new Response(JSON.stringify({ error: "An idea is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const now = Date.now();
    const runId = newRunId(now);
    // Per-run seed: fresh entropy each run so the same idea yields a different
    // bespoke design every time (M2 uniqueness requirement).
    const seed = (now ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    ctx = createContext(runId, idea, resolveStartMode(), now, seed);
    await saveContext(ctx);
  }

  const context = ctx;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: ProgressEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          /* controller already closed */
        }
      };
      try {
        await runPipeline(context, emit);
      } catch (err) {
        emit({ type: "error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

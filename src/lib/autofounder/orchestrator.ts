/**
 * The CEO router. Sequences the M1 pipeline over the blackboard, checkpointing
 * after every agent so the run is durable and resumable. Emits ProgressEvents
 * for the live cockpit.
 *
 * Resume semantics: any task already marked "succeeded" in the loaded context
 * is skipped, so re-invoking runPipeline on a partially-complete run continues
 * from the first pending agent — without re-spending on completed work.
 *
 * Resilience: in "live" mode, if an agent's API call fails (no credit, network,
 * bad output), the run degrades to deterministic mock for that step and all
 * subsequent steps, so a run always completes with a viewable site.
 */
import { AGENTS, type AgentResult } from "./agents";
import { LlmError } from "./llm";
import { saveContext } from "./store";
import {
  PIPELINE,
  type GenerationContext,
  type ProgressEvent,
} from "./types";

export type Emit = (e: ProgressEvent) => void;

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** Visible pacing in mock mode so the cockpit is watchable; none when live. */
function pace(ctx: GenerationContext): Promise<void> {
  return ctx.mode === "mock" ? sleep(650) : Promise.resolve();
}

export async function runPipeline(
  ctx: GenerationContext,
  emit: Emit
): Promise<GenerationContext> {
  ctx.status = "running";
  await saveContext(ctx);
  emit({ type: "run", ctx });

  for (const role of PIPELINE) {
    const task = ctx.tasks.find((t) => t.role === role)!;
    if (task.status === "succeeded") {
      // Resume: already done in a prior (possibly crashed) attempt.
      continue;
    }

    const agent = AGENTS[role];
    task.status = "running";
    task.startedAt = Date.now();
    emit({ type: "phase", phase: `${task.label} is working…` });
    emit({ type: "task", task });
    await saveContext(ctx);
    await pace(ctx);

    let result: AgentResult;
    try {
      if (ctx.mode === "live") {
        try {
          result = await agent.runLive(ctx);
        } catch (err) {
          // Degrade gracefully to mock for this and all later steps.
          ctx.mode = "mock";
          ctx.degraded = true;
          const why =
            err instanceof LlmError ? err.message : String(err);
          emit({
            type: "phase",
            phase: `Live API unavailable (${truncate(why)}) — continuing in demo mode`,
          });
          result = agent.runMock(ctx);
        }
      } else {
        result = agent.runMock(ctx);
      }
    } catch (err) {
      // Mock should never throw, but be safe.
      task.status = "failed";
      task.finishedAt = Date.now();
      task.note = String(err);
      ctx.status = "failed";
      ctx.error = String(err);
      await saveContext(ctx);
      emit({ type: "error", message: String(err), ctx });
      return ctx;
    }

    Object.assign(ctx, result.patch);
    task.status = "succeeded";
    task.finishedAt = Date.now();
    task.model = result.model;
    task.note = result.note;
    await saveContext(ctx);
    emit({ type: "task", task });
    emit({ type: "artifact", role, ctx });
  }

  ctx.status = "succeeded";
  await saveContext(ctx);
  emit({ type: "complete", ctx });
  return ctx;
}

function truncate(s: string, n = 80): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

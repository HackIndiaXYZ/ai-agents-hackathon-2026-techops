import { loadContext } from "@/lib/autofounder/store";

export const runtime = "nodejs";

/**
 * GET /api/runs/:id — fetch a run's full GenerationContext (for resume and for
 * the site preview route to render the component tree).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await loadContext(id);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(ctx), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

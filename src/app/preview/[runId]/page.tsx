import Link from "next/link";
import { loadContext } from "@/lib/autofounder/store";
import { SiteRenderer } from "@/lib/site/SiteRenderer";

export const dynamic = "force-dynamic";

/**
 * Full-bleed preview of a generated startup site. This is the deployable
 * artifact a user reviews — rendered by owned, token-driven components so it
 * looks bespoke to its brand, not like the AutoFounder platform.
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const ctx = await loadContext(runId);

  if (!ctx || !ctx.brand || !ctx.tree || !ctx.design) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 text-center text-white">
        <p className="text-lg">This site isn&apos;t ready yet.</p>
        <p className="text-sm text-gray-400">
          Run <code className="font-mono">{runId}</code> hasn&apos;t finished generating.
        </p>
        <Link href="/" className="text-sm text-amber-400 hover:underline">
          ← Back to AutoFounder
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Floating control to return to the cockpit (not part of the site). */}
      <Link
        href={`/?run=${runId}`}
        className="fixed left-4 top-4 z-50 rounded-full border border-white/15 bg-black/60 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/80"
      >
        ← Back to AutoFounder
      </Link>
      <SiteRenderer
        brand={ctx.brand}
        design={ctx.design}
        tree={ctx.tree}
        primaryCta={ctx.product?.primaryCta ?? "Get started"}
      />
    </div>
  );
}

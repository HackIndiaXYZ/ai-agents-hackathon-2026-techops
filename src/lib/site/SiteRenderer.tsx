/**
 * Renders a generated site from a BrandKit + DesignSpec (tokens) + ComponentTree.
 * Every visual property — color, type scale, radius, density, layout variant —
 * is derived from the run's tokens and exposed as CSS variables, so two runs of
 * the same idea produce structurally different sites.
 */
import type {
  BrandKit,
  ComponentTree,
  DesignSpec,
} from "@/lib/autofounder/types";
import { FONT_PAIRINGS } from "./fonts";
import { SECTION_COMPONENTS, SiteNav, type RenderCtx } from "./sections";

export function SiteRenderer({
  brand,
  design,
  tree,
  primaryCta = "Get started",
}: {
  brand: BrandKit;
  design: DesignSpec;
  tree: ComponentTree;
  primaryCta?: string;
}) {
  const t = design.tokens;
  const p = t.palette;
  const font = FONT_PAIRINGS[t.font] ?? FONT_PAIRINGS.grotesk;

  // Modular type scale derived from base size + ratio.
  const r = t.scaleRatio;
  const fsH1 = Math.min(78, Math.round(t.baseSize * Math.pow(r, 5)));
  const fsH2 = Math.round(t.baseSize * Math.pow(r, 3.1));
  const fsH3 = Math.round(t.baseSize * Math.pow(r, 1.4));
  const sectionPy = t.spacing >= 6 ? "5.5rem" : "4.5rem";

  const styleVars = {
    "--bg": p.bg,
    "--surface": p.surface,
    "--text": p.text,
    "--muted": p.muted,
    "--border": p.border,
    "--primary": p.primary,
    "--primary-fg": p.primaryFg,
    "--accent": p.accent,
    "--font-display": font.display,
    "--font-body": font.body,
    "--radius": `${t.radius}px`,
    "--radius-lg": `${Math.round(t.radius * 1.6)}px`,
    "--fs-h1": `${fsH1}px`,
    "--fs-h2": `${fsH2}px`,
    "--fs-h3": `${fsH3}px`,
    "--section-py": sectionPy,
  } as React.CSSProperties;

  const rc: RenderCtx = {
    heroVariant: design.heroVariant,
    featuresCols: design.featuresCols,
    logoSvg: brand.logoSvg,
  };

  return (
    <div
      style={{ ...styleVars, background: p.bg, color: p.text, fontFamily: "var(--font-body)" }}
      className="min-h-screen w-full"
    >
      <style>{`@import url('${font.importUrl}');`}</style>

      <SiteNav name={brand.name} cta={primaryCta} rc={rc} />

      {tree.sections.map((s) => {
        const Comp = SECTION_COMPONENTS[s.type];
        if (!Comp) return null;
        return <Comp key={s.id} c={s.content} name={brand.name} rc={rc} />;
      })}
    </div>
  );
}

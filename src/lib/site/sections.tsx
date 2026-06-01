/**
 * Owned, token-driven section components. Color, type size, radius and layout
 * variant come ONLY from CSS variables / the RenderCtx set by <SiteRenderer>,
 * so the same components render a structurally different site for every run.
 */
import type { ReactNode } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type C = Record<string, any>;

export interface RenderCtx {
  heroVariant: "centered" | "left";
  featuresCols: 2 | 3;
  logoSvg?: string;
}

type SectionProps = { c: C; name: string; rc: RenderCtx };

const Section = ({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <section className={`w-full px-6 ${className}`} style={{ paddingTop: "var(--section-py)", paddingBottom: "var(--section-py)", ...style }}>
    <div className="mx-auto w-full max-w-6xl">{children}</div>
  </section>
);

const h1 = { fontFamily: "var(--font-display)", color: "var(--text)", fontSize: "var(--fs-h1)", lineHeight: 1.05, letterSpacing: "-0.02em" } as React.CSSProperties;
const h2 = { fontFamily: "var(--font-display)", color: "var(--text)", fontSize: "var(--fs-h2)", lineHeight: 1.1, letterSpacing: "-0.01em" } as React.CSSProperties;

function Logo({ rc, name }: { rc: RenderCtx; name: string }) {
  if (rc.logoSvg) {
    return (
      <span
        className="inline-flex items-center [&>svg]:h-7 [&>svg]:w-7"
        dangerouslySetInnerHTML={{ __html: rc.logoSvg }}
        aria-label={`${name} logo`}
      />
    );
  }
  return (
    <span
      className="flex h-7 w-7 items-center justify-center text-sm font-bold"
      style={{ background: "var(--primary)", color: "var(--primary-fg)", borderRadius: "var(--radius)" }}
    >
      {name[0]}
    </span>
  );
}

function FeatureIcon({ name }: { name?: string }) {
  const common = {
    width: 22, height: 22, viewBox: "0 0 24 24", fill: "none",
    stroke: "var(--primary)", strokeWidth: 1.8,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  const paths: Record<string, ReactNode> = {
    bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
    shield: <path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" />,
    spark: <path d="M12 3v6m0 6v6m9-9h-6M9 12H3m13.5-6.5L14 8m-4 8-2.5 2.5m9 0L14 16m-4-8L7.5 5.5" />,
    chart: <path d="M4 20V10m6 10V4m6 16v-7m6 7H2" />,
    layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return <svg {...common}>{paths[name ?? "spark"] ?? paths.spark}</svg>;
}

export function SiteNav({ name, cta, rc }: { name: string; cta: string; rc: RenderCtx }) {
  return (
    <div
      className="sticky top-0 z-20 w-full px-6 backdrop-blur"
      style={{ background: "color-mix(in oklab, var(--bg) 80%, transparent)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
        <span className="flex items-center gap-2.5">
          <Logo rc={rc} name={name} />
          <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}>
            {name}
          </span>
        </span>
        <nav className="hidden items-center gap-7 text-sm md:flex" style={{ color: "var(--muted)" }}>
          <span>Product</span><span>Features</span><span>Pricing</span><span>FAQ</span>
        </nav>
        <button className="px-4 py-2 text-sm font-semibold" style={{ background: "var(--primary)", color: "var(--primary-fg)", borderRadius: "var(--radius)" }}>
          {cta}
        </button>
      </div>
    </div>
  );
}

function Hero({ c, rc }: SectionProps) {
  const left = rc.heroVariant === "left";
  return (
    <Section
      className={left ? "text-left" : "text-center"}
      style={{ background: "radial-gradient(60rem 40rem at 50% -10%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)" }}
    >
      <div className={left ? "max-w-2xl" : "mx-auto max-w-3xl"}>
        {c.eyebrow && (
          <span className="mb-5 inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide" style={{ border: "1px solid var(--border)", color: "var(--primary)", background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}>
            {c.eyebrow}
          </span>
        )}
        <h1 style={h1}>{c.headline ?? "Build something people love"}</h1>
        {c.subhead && (
          <p className={`mt-6 text-lg leading-relaxed ${left ? "" : "mx-auto max-w-xl"}`} style={{ color: "var(--muted)" }}>
            {c.subhead}
          </p>
        )}
        <div className={`mt-9 flex flex-wrap items-center gap-3 ${left ? "" : "justify-center"}`}>
          <button className="px-6 py-3 text-sm font-semibold shadow-sm" style={{ background: "var(--primary)", color: "var(--primary-fg)", borderRadius: "var(--radius)" }}>
            {c.primaryCta ?? "Get started"}
          </button>
          {c.secondaryCta && (
            <button className="px-6 py-3 text-sm font-semibold" style={{ border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius)" }}>
              {c.secondaryCta}
            </button>
          )}
        </div>
        {c.note && <p className="mt-5 text-xs" style={{ color: "var(--muted)" }}>{c.note}</p>}
      </div>
    </Section>
  );
}

function TrustBar({ c }: SectionProps) {
  const logos: string[] = c.logos ?? [];
  return (
    <Section style={{ paddingTop: "2.5rem", paddingBottom: "2.5rem" }}>
      {c.label && <p className="mb-6 text-center text-xs uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>{c.label}</p>}
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
        {logos.map((l, i) => (
          <span key={i} className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}>{l}</span>
        ))}
      </div>
    </Section>
  );
}

function Features({ c, rc }: SectionProps) {
  const items: C[] = c.items ?? [];
  const cols = rc.featuresCols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <Section>
      <div className="mb-12 max-w-2xl">
        <h2 style={h2}>{c.title ?? "Features"}</h2>
        {c.subtitle && <p className="mt-3 text-lg" style={{ color: "var(--muted)" }}>{c.subtitle}</p>}
      </div>
      <div className={`grid gap-5 ${cols}`}>
        {items.map((f, i) => (
          <div key={i} className="p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center" style={{ background: "color-mix(in oklab, var(--primary) 12%, transparent)", borderRadius: "var(--radius)" }}>
              <FeatureIcon name={f.icon} />
            </div>
            <h3 className="mb-2 font-semibold" style={{ color: "var(--text)", fontSize: "var(--fs-h3)" }}>{f.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function HowItWorks({ c }: SectionProps) {
  const steps: C[] = c.steps ?? [];
  return (
    <Section>
      <h2 className="mb-12" style={h2}>{c.title ?? "How it works"}</h2>
      <div className="grid gap-8 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={i}>
            <div className="mb-4 flex h-10 w-10 items-center justify-center text-sm font-bold" style={{ background: "var(--primary)", color: "var(--primary-fg)", borderRadius: "var(--radius)" }}>{i + 1}</div>
            <h3 className="mb-2 font-semibold" style={{ color: "var(--text)", fontSize: "var(--fs-h3)" }}>{s.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Metrics({ c }: SectionProps) {
  const items: C[] = c.items ?? [];
  return (
    <Section style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
      <div className="grid gap-8 px-8 py-12 sm:grid-cols-2 lg:grid-cols-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
        {items.map((m, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--primary)" }}>{m.value}</div>
            <div className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{m.label}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Testimonial({ c }: SectionProps) {
  return (
    <Section className="text-center">
      <blockquote className="mx-auto max-w-3xl leading-snug" style={{ ...h2, fontSize: "calc(var(--fs-h2) * 0.92)" }}>
        “{c.quote}”
      </blockquote>
      <div className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>{c.author}</span>
        {c.role ? ` · ${c.role}` : ""}
      </div>
    </Section>
  );
}

function Pricing({ c }: SectionProps) {
  const tiers: C[] = c.tiers ?? [];
  return (
    <Section>
      <div className="mb-12 text-center">
        <h2 style={h2}>{c.title ?? "Pricing"}</h2>
        {c.subtitle && <p className="mt-3 text-lg" style={{ color: "var(--muted)" }}>{c.subtitle}</p>}
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {tiers.map((t, i) => {
          const hot = !!t.highlighted;
          return (
            <div key={i} className="flex flex-col p-7" style={{ background: hot ? "color-mix(in oklab, var(--primary) 10%, var(--surface))" : "var(--surface)", border: hot ? "1.5px solid var(--primary)" : "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
              <div className="mb-1 text-sm font-semibold" style={{ color: "var(--muted)" }}>{t.name}</div>
              <div className="mb-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}>{t.price}</span>
                <span className="text-sm" style={{ color: "var(--muted)" }}>{t.period}</span>
              </div>
              <ul className="mb-7 flex-1 space-y-2.5 text-sm">
                {(t.features ?? []).map((f: string, j: number) => (
                  <li key={j} className="flex items-start gap-2">
                    <span style={{ color: "var(--primary)" }}>✓</span>
                    <span style={{ color: "var(--muted)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <button className="px-4 py-2.5 text-sm font-semibold" style={hot ? { background: "var(--primary)", color: "var(--primary-fg)", borderRadius: "var(--radius)" } : { border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius)" }}>
                {t.cta ?? "Choose"}
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function Faq({ c }: SectionProps) {
  const items: C[] = c.items ?? [];
  return (
    <Section>
      <h2 className="mb-10" style={h2}>{c.title ?? "FAQ"}</h2>
      <div className="mx-auto max-w-3xl divide-y" style={{ borderColor: "var(--border)" }}>
        {items.map((q, i) => (
          <details key={i} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium" style={{ color: "var(--text)" }}>
              {q.q}
              <span style={{ color: "var(--muted)" }} className="transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{q.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function Cta({ c }: SectionProps) {
  return (
    <Section>
      <div className="px-8 py-16 text-center" style={{ background: "var(--primary)", borderRadius: "var(--radius-lg)" }}>
        <h2 className="mx-auto max-w-2xl" style={{ ...h2, color: "var(--primary-fg)" }}>{c.headline ?? "Get started today"}</h2>
        {c.subhead && <p className="mx-auto mt-4 max-w-xl text-base" style={{ color: "color-mix(in oklab, var(--primary-fg) 80%, transparent)" }}>{c.subhead}</p>}
        <button className="mt-8 px-7 py-3 text-sm font-semibold" style={{ background: "var(--primary-fg)", color: "var(--primary)", borderRadius: "var(--radius)" }}>{c.cta ?? "Start free"}</button>
      </div>
    </Section>
  );
}

function Footer({ c, name, rc }: SectionProps) {
  const cols: C[] = c.columns ?? [];
  return (
    <footer className="w-full px-6 pt-16 pb-10" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <span className="flex items-center gap-2.5">
            <Logo rc={rc} name={name} />
            <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}>{name}</span>
          </span>
          {c.tagline && <p className="mt-3 max-w-xs text-sm" style={{ color: "var(--muted)" }}>{c.tagline}</p>}
        </div>
        {cols.map((col, i) => (
          <div key={i}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text)" }}>{col.title}</div>
            <ul className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
              {(col.links ?? []).map((l: string, j: number) => <li key={j}>{l}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-6xl text-xs" style={{ color: "var(--muted)" }}>{c.copyright ?? `© ${name}`}</div>
    </footer>
  );
}

export const SECTION_COMPONENTS: Record<string, (props: SectionProps) => ReactNode> = {
  hero: (p) => <Hero {...p} />,
  trustbar: (p) => <TrustBar {...p} />,
  features: (p) => <Features {...p} />,
  howItWorks: (p) => <HowItWorks {...p} />,
  metrics: (p) => <Metrics {...p} />,
  testimonial: (p) => <Testimonial {...p} />,
  pricing: (p) => <Pricing {...p} />,
  faq: (p) => <Faq {...p} />,
  cta: (p) => <Cta {...p} />,
  footer: (p) => <Footer {...p} />,
};

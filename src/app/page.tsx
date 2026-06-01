"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  AgentRole,
  GenerationContext,
  ProgressEvent,
} from "@/lib/autofounder/types";

const AGENT_META: Record<AgentRole, { icon: string; blurb: string; color: string }> = {
  ceo: { icon: "◆", blurb: "Frames strategy & positioning", color: "#a78bfa" },
  pm: { icon: "▤", blurb: "Plans pages & sections", color: "#60a5fa" },
  brand: { icon: "✦", blurb: "Names it, sets brand direction", color: "#f472b6" },
  uiux: { icon: "◈", blurb: "Generates unique design tokens", color: "#22d3ee" },
  copy: { icon: "✍", blurb: "Writes every word", color: "#34d399" },
  frontend: { icon: "⌘", blurb: "Assembles the live site", color: "#fbbf24" },
  critic: { icon: "✓", blurb: "Scores quality, forces revisions", color: "#fb7185" },
};

const EXAMPLES = [
  "A SaaS platform that helps gym owners manage memberships",
  "An app that connects dog owners with trusted local walkers",
  "A tool for indie restaurants to manage online reservations",
  "A fintech app that helps freelancers automate their taxes",
];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [ctx, setCtx] = useState<GenerationContext | null>(null);
  const [phase, setPhase] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Resume / open an existing run via ?run=<id>
  useEffect(() => {
    if (startedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const runId = params.get("run");
    if (!runId) return;
    startedRef.current = true;
    (async () => {
      const res = await fetch(`/api/runs/${runId}`);
      if (res.ok) {
        const loaded = (await res.json()) as GenerationContext;
        setCtx(loaded);
        setIdea(loaded.idea);
      }
    })();
  }, []);

  async function stream(body: object) {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "Request failed");
        throw new Error(msg);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const evt = JSON.parse(line.slice(6)) as ProgressEvent;
          if (evt.type === "phase") setPhase(evt.phase);
          else if ("ctx" in evt && evt.ctx) setCtx(evt.ctx);
          if (evt.type === "error") setError(evt.message);
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsRunning(false);
      setPhase("");
    }
  }

  const handleGenerate = () => {
    if (!idea.trim() || isRunning) return;
    setCtx(null);
    setError(null);
    stream({ idea });
  };

  const handleResume = () => {
    if (!ctx || isRunning) return;
    stream({ runId: ctx.runId });
  };

  const hasStarted = !!ctx || isRunning;
  const done = ctx?.status === "succeeded";
  const incomplete = ctx && ctx.status !== "succeeded" && !isRunning;

  return (
    <div className="af-canvas af-grain min-h-screen text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-600 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
              AF
            </div>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight">AutoFounder</p>
              <p className="text-[11px] text-muted-foreground">
                Idea → production website, autonomously
              </p>
            </div>
          </div>
          {ctx && <ModeBadge ctx={ctx} />}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        {/* Hero */}
        {!hasStarted && (
          <section className="af-rise mb-10 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[13px] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              An AI company that builds your startup
            </div>
            <h1 className="af-display mx-auto max-w-3xl text-5xl leading-[1.05] tracking-tight sm:text-7xl">
              Describe your startup.
              <br />
              <span className="af-shimmer-text italic">Watch it get built.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              A team of AI agents — strategist, PM, brand designer, copywriter, and
              engineer — collaborate to turn one sentence into a complete, custom-designed
              website. In real time.
            </p>
          </section>
        )}

        {/* Idea intake */}
        <section
          className={`af-rise af-glass rounded-2xl p-2 ${hasStarted ? "mb-8" : "mx-auto mb-6 max-w-2xl"}`}
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your startup idea…  e.g. “A SaaS platform that helps gym owners manage memberships”"
              disabled={isRunning}
              className="min-h-[56px] flex-1 resize-none border-0 bg-transparent px-3 text-[15px] leading-relaxed text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <Button
              onClick={handleGenerate}
              disabled={isRunning || !idea.trim()}
              className="group h-12 shrink-0 gap-2 rounded-xl bg-gradient-to-b from-primary to-amber-600 px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 disabled:opacity-40 disabled:shadow-none"
            >
              {isRunning ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Building
                </>
              ) : (
                <>
                  Build it
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </>
              )}
            </Button>
          </div>
          {!hasStarted && (
            <div className="flex flex-wrap gap-2 px-2 pb-1.5 pt-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setIdea(ex)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.08] hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Resume banner */}
        {incomplete && (
          <div className="af-rise mb-6 flex items-center justify-between rounded-xl border border-amber-400/30 bg-amber-500/[0.08] px-4 py-3 text-sm">
            <span className="text-amber-200">
              This run stopped before finishing. Its progress was saved — you can resume
              exactly where it left off.
            </span>
            <Button
              size="sm"
              onClick={handleResume}
              className="ml-3 h-8 gap-1.5 rounded-lg bg-amber-500 text-amber-950 hover:bg-amber-400"
            >
              ↻ Resume
            </Button>
          </div>
        )}

        {/* Workspace */}
        {hasStarted && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Cockpit — agent pipeline */}
            <div className="lg:col-span-2">
              <div className="af-glass rounded-2xl p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full ${done ? "bg-emerald-400" : "bg-primary"} ${isRunning ? "animate-ping opacity-75" : ""}`}
                    />
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${done ? "bg-emerald-400" : "bg-primary"}`} />
                  </span>
                  <h2 className="text-sm font-medium tracking-tight">The AI Founding Team</h2>
                  {done && (
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs text-emerald-300">
                      ✓ Shipped
                    </span>
                  )}
                </div>

                <ol className="space-y-2.5">
                  {(ctx?.tasks ?? []).map((t) => {
                    const m = AGENT_META[t.role];
                    return (
                      <li
                        key={t.role}
                        className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                          t.status === "running"
                            ? "border-primary/40 bg-primary/[0.06]"
                            : t.status === "succeeded"
                              ? "border-white/[0.08] bg-white/[0.02]"
                              : "border-white/[0.05] bg-transparent opacity-60"
                        }`}
                      >
                        <div
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                          style={{ background: `${m.color}22`, color: m.color }}
                        >
                          {m.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold">{t.label}</span>
                            {t.model && t.status === "succeeded" && (
                              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                                {t.model === "mock" ? "demo" : t.model.replace("claude-", "")}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[12px] text-muted-foreground">
                            {t.note ?? m.blurb}
                          </p>
                        </div>
                        <StatusDot status={t.status} />
                      </li>
                    );
                  })}
                </ol>

                {isRunning && phase && (
                  <p className="mt-4 flex items-center gap-2 px-1 text-xs italic text-muted-foreground">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                    </span>
                    {phase}
                  </p>
                )}

                {error && (
                  <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/[0.08] px-3 py-2 text-xs text-rose-300">
                    {error}
                  </p>
                )}

                {ctx?.brand && <BrandCard ctx={ctx} />}
                {ctx?.critique && <CriticCard ctx={ctx} />}
              </div>
            </div>

            {/* Output — live site preview */}
            <div className="lg:col-span-3">
              <div className="af-glass flex h-full min-h-[560px] flex-col overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                      {ctx?.brand?.name
                        ? `${ctx.brand.name.toLowerCase().replace(/\s+/g, "")}.com`
                        : "your-startup.com"}
                    </span>
                  </div>
                  {done && (
                    <a
                      href={`/preview/${ctx!.runId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.1]"
                    >
                      Open full site ↗
                    </a>
                  )}
                </div>

                <div className="relative flex-1 bg-black/20">
                  {done && ctx ? (
                    <iframe
                      key={ctx.runId}
                      src={`/preview/${ctx.runId}`}
                      title="Generated site"
                      className="h-full min-h-[510px] w-full"
                    />
                  ) : (
                    <div className="flex h-full min-h-[510px] flex-col items-center justify-center px-8 text-center">
                      <div className="mb-4 grid w-full max-w-[260px] gap-2.5">
                        {[90, 70, 80, 55, 65].map((w, i) => (
                          <div
                            key={i}
                            className="h-3 rounded-full"
                            style={{
                              width: `${w}%`,
                              backgroundImage:
                                "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.08) 50%, transparent 80%)",
                              backgroundColor: "rgba(255,255,255,0.04)",
                              backgroundSize: "200% 100%",
                              animation: isRunning ? "af-shimmer 1.6s linear infinite" : "none",
                              animationDelay: `${i * 110}ms`,
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isRunning
                          ? "Your website is being designed and written…"
                          : "The generated website will render here."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "running")
    return <span className="mt-1.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />;
  if (status === "succeeded")
    return (
      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-[10px] text-emerald-300">
        ✓
      </span>
    );
  if (status === "failed")
    return (
      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-400/20 text-[10px] text-rose-300">
        ✕
      </span>
    );
  return <span className="mt-1.5 h-4 w-4 shrink-0 rounded-full border border-white/15" />;
}

function ModeBadge({ ctx }: { ctx: GenerationContext }) {
  if (ctx.degraded)
    return (
      <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
        Demo mode (live API unavailable)
      </span>
    );
  if (ctx.mode === "live")
    return (
      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
        Live AI generation
      </span>
    );
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground">
      Demo mode · add API credit for live AI
    </span>
  );
}

function BrandCard({ ctx }: { ctx: GenerationContext }) {
  const b = ctx.brand!;
  const tokens = ctx.design?.tokens;
  const pal = tokens?.palette;
  const swatches: [string, string][] = pal
    ? [
        ["bg", pal.bg],
        ["surface", pal.surface],
        ["primary", pal.primary],
        ["accent", pal.accent],
        ["text", pal.text],
      ]
    : [];
  return (
    <div className="af-msg-in mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        Brand identity
      </p>
      <div className="flex items-center gap-2.5">
        {b.logoSvg && (
          <span
            className="inline-flex [&>svg]:h-8 [&>svg]:w-8"
            dangerouslySetInnerHTML={{ __html: b.logoSvg }}
          />
        )}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="af-display text-xl leading-none">{b.name}</span>
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
              {tokens?.font ?? b.font}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">{b.tagline}</p>
        </div>
      </div>
      {swatches.length > 0 && (
        <>
          <div className="mt-3 flex gap-1.5">
            {swatches.map(([label, color]) => (
              <span
                key={label}
                className="h-7 w-7 rounded-md border border-white/10"
                style={{ background: color }}
                title={`${label}: ${color}`}
              />
            ))}
          </div>
          {tokens && (
            <p className="mt-2.5 font-mono text-[10px] text-muted-foreground/70">
              {tokens.mode} · scale {tokens.scaleRatio.toFixed(2)} · radius {tokens.radius}px ·
              fingerprint <span className="text-foreground/80">#{tokens.fingerprint}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function CriticCard({ ctx }: { ctx: GenerationContext }) {
  const cr = ctx.critique!;
  const rounds = ctx.design?.revisionRounds ?? 0;
  const subs: [string, number, number][] = [
    ["Contrast (WCAG)", cr.subscores.contrast, 30],
    ["Bespokeness", cr.subscores.bespokeness, 30],
    ["Hierarchy", cr.subscores.hierarchy, 25],
    ["Original copy", cr.subscores.aiTell, 15],
  ];
  return (
    <div className="af-msg-in mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Design Critic
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            cr.passed
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-amber-400/15 text-amber-300"
          }`}
        >
          {cr.total}/100 {cr.passed ? "· passed" : "· best effort"}
        </span>
      </div>
      <div className="space-y-2">
        {subs.map(([label, val, max]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{label}</span>
              <span className="font-mono">
                {val}/{max}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(val / max) * 100}%`,
                  background: val / max >= 0.66 ? "#34d399" : val / max >= 0.4 ? "#fbbf24" : "#fb7185",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {rounds > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-300/90">
          <span>↻</span>
          Self-revised {rounds}× to pass the gate
          {cr.history && (
            <span className="font-mono text-muted-foreground">
              ({cr.history.map((h) => h.total).join(" → ")})
            </span>
          )}
        </p>
      )}
    </div>
  );
}

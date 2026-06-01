/**
 * The agents. Each reads the slice of GenerationContext it needs and produces
 * exactly one artifact (live via Claude, or deterministic mock). The orchestrator
 * merges the returned patch into the blackboard and checkpoints.
 *
 * M2 adds two agents:
 *   - uiux:   runs the token engine → DesignSpec (unique per run) + the SVG logo.
 *   - critic: scores the candidate and self-revises up to 2 rounds (the gate).
 */
import { generateJson, type ModelTier } from "./llm";
import { scoreDesign } from "./critic";
import { generateLogoSvg } from "./logo";
import { generateTokens, reviseTokens } from "./tokens";
import {
  mockBrand,
  mockBrief,
  mockContent,
  mockProduct,
  mockTree,
} from "./mock";
import type {
  AgentRole,
  BrandKit,
  ComponentTree,
  ContentModel,
  CritiqueScore,
  DesignSpec,
  GenerationContext,
  ProductSpec,
  StrategyBrief,
} from "./types";

export interface AgentResult {
  patch: Partial<GenerationContext>;
  note: string;
  model: string; // model id, or "mock"/engine label
}

export interface Agent {
  role: AgentRole;
  tier: ModelTier;
  runLive(ctx: GenerationContext): Promise<AgentResult>;
  runMock(ctx: GenerationContext): AgentResult;
}

const FONT_IDS = "editorial | grotesk | humanist | modern | classic";

/* ---------------- CEO (router / framing) ---------------- */

const ceo: Agent = {
  role: "ceo",
  tier: "reasoning",
  async runLive(ctx) {
    const { data, model } = await generateJson<StrategyBrief>({
      tier: this.tier,
      system:
        "You are the CEO + Chief Strategist of an autonomous startup-website builder. Given a one-sentence startup idea, produce a tight strategy brief that frames the whole build. Be specific and decisive.",
      prompt: `Startup idea: "${ctx.idea}"

Produce JSON:
{ "industry": "", "audience": "one-line ICP", "positioning": "one-line", "valueProps": ["3"], "siteGoals": ["3"] }`,
    });
    return { patch: { brief: data }, note: `Framed strategy for ${data.industry}`, model };
  },
  runMock(ctx) {
    const brief = mockBrief(ctx.idea);
    return { patch: { brief }, note: `Framed strategy for ${brief.industry}`, model: "mock" };
  },
};

/* ---------------- Product Manager (page + section plan) ---------------- */

const pm: Agent = {
  role: "pm",
  tier: "reasoning",
  async runLive(ctx) {
    const { data, model } = await generateJson<ProductSpec>({
      tier: this.tier,
      system:
        "You are a Product Manager defining a startup marketing site's structure for maximum conversion.",
      prompt: `Brief:
${JSON.stringify(ctx.brief, null, 2)}

Section types MUST come from: ["hero","trustbar","features","howItWorks","metrics","testimonial","pricing","faq","cta","footer"]. Start with hero, end with footer.
Produce JSON: { "pages": [{ "slug": "/", "kind": "landing", "sections": ["hero", ...] }], "primaryCta": "", "secondaryCta": "" }`,
    });
    const page = data.pages?.[0];
    if (page) {
      const set = page.sections.filter((s) => s !== "footer");
      if (set[0] !== "hero") set.unshift("hero");
      page.sections = [...new Set(set)];
      page.sections.push("footer");
    }
    return {
      patch: { product: data },
      note: `Planned ${page?.sections.length ?? 0} sections`,
      model,
    };
  },
  runMock(ctx) {
    const product = mockProduct(ctx.brief!);
    return {
      patch: { product },
      note: `Planned ${product.pages[0].sections.length} sections`,
      model: "mock",
    };
  },
};

/* ---------------- Brand (name, voice, font, hue) ---------------- */

const brand: Agent = {
  role: "brand",
  tier: "reasoning",
  async runLive(ctx) {
    const { data, model } = await generateJson<BrandKit>({
      tier: this.tier,
      system:
        "You are a world-class brand designer. Invent a memorable, brandable startup name and a brand direction. Pick a brand hue (0-360) that feels bespoke to the industry — avoid generic indigo/blue (~217-270).",
      prompt: `Brief:
${JSON.stringify(ctx.brief, null, 2)}

Produce JSON:
{ "name": "1-2 words, brandable", "tagline": "short", "voice": "tone descriptor", "font": "${FONT_IDS}", "hue": 0-360 }`,
    });
    return { patch: { brand: data }, note: `Named it "${data.name}"`, model };
  },
  runMock(ctx) {
    const b = mockBrand(ctx.idea, ctx.brief!);
    return { patch: { brand: b }, note: `Named it "${b.name}"`, model: "mock" };
  },
};

/* ---------------- UI/UX (token engine → DesignSpec + logo) ---------------- */
/* Deterministic in both modes: the token engine is the differentiator and runs
 * the same offline. (A live vision pass refines this in M3.) */

const uiux: Agent = {
  role: "uiux",
  tier: "reasoning",
  async runLive(ctx) {
    return this.runMock(ctx);
  },
  runMock(ctx) {
    const b = ctx.brand!;
    // Fully run-seeded: every run of the same idea gets a distinct palette,
    // font, scale, radius and layout — the core M2 uniqueness guarantee.
    const tokens = generateTokens(ctx.seed);
    const heroVariant = ctx.seed % 2 === 0 ? "centered" : "left";
    const featuresCols = Math.floor(ctx.seed / 3) % 2 === 0 ? 3 : 2;
    const logoSvg = generateLogoSvg(ctx.seed, b.name, tokens.palette.primary, tokens.palette.accent);
    const design: DesignSpec = { tokens, heroVariant, featuresCols, revisionRounds: 0 };
    return {
      patch: { design, brand: { ...b, logoSvg } },
      note: `${tokens.mode} theme · radius ${tokens.radius} · #${tokens.fingerprint}`,
      model: ctx.mode === "live" ? "token-engine" : "mock",
    };
  },
};

/* ---------------- Copywriting (content per section) ---------------- */

const copy: Agent = {
  role: "copy",
  tier: "bulk",
  async runLive(ctx) {
    const sections = ctx.product?.pages[0]?.sections ?? [];
    const { data, model } = await generateJson<ContentModel>({
      tier: this.tier,
      system: `You are an elite SaaS copywriter. Write specific, benefit-led copy in this brand voice: "${ctx.brand?.voice}". Avoid clichés ("revolutionize", "seamless", "cutting-edge", "supercharge", "game-changer"). Reference the real product.`,
      prompt: `Brand: ${ctx.brand?.name} — ${ctx.brand?.tagline}
Idea: "${ctx.idea}"
Sections: ${JSON.stringify(sections)}

Produce JSON:
{
  "seo": { "title": "<=60 chars", "description": "<=155 chars" },
  "sections": {
    "hero": { "eyebrow": "", "headline": "", "subhead": "", "primaryCta": "", "secondaryCta": "", "note": "" },
    "trustbar": { "label": "", "logos": ["5 names"] },
    "features": { "title": "", "subtitle": "", "items": [{ "title": "", "body": "", "icon": "bolt|shield|spark|chart|layers|clock" }] },
    "howItWorks": { "title": "", "steps": [{ "title": "", "body": "" }] },
    "metrics": { "items": [{ "value": "", "label": "" }] },
    "testimonial": { "quote": "", "author": "", "role": "" },
    "pricing": { "title": "", "subtitle": "", "tiers": [{ "name": "", "price": "$X", "period": "/mo", "features": [""], "cta": "", "highlighted": true }] },
    "faq": { "title": "", "items": [{ "q": "", "a": "" }] },
    "cta": { "headline": "", "subhead": "", "cta": "" },
    "footer": { "tagline": "", "columns": [{ "title": "", "links": [""] }], "copyright": "" }
  }
}
Only include section keys present in the sections list.`,
      maxTokens: 3500,
    });
    return {
      patch: { content: data },
      note: `Wrote copy for ${Object.keys(data.sections ?? {}).length} sections`,
      model,
    };
  },
  runMock(ctx) {
    const content = mockContent(ctx.idea, ctx.brief!, ctx.product!, ctx.brand!);
    return {
      patch: { content },
      note: `Wrote copy for ${Object.keys(content.sections).length} sections`,
      model: "mock",
    };
  },
};

/* ---------------- Frontend (assemble component tree) ---------------- */

const frontend: Agent = {
  role: "frontend",
  tier: "reasoning",
  async runLive(ctx) {
    return this.runMock(ctx);
  },
  runMock(ctx) {
    const tree: ComponentTree = mockTree(ctx.product!, ctx.content!);
    return {
      patch: { tree },
      note: `Assembled ${tree.sections.length}-section site`,
      model: ctx.mode === "live" ? "assembler" : "mock",
    };
  },
};

/* ---------------- Design Critic (gate + self-revision loop) ---------------- */

const critic: Agent = {
  role: "critic",
  tier: "reasoning",
  async runLive(ctx) {
    return this.runMock(ctx);
  },
  runMock(ctx) {
    let tokens = ctx.design!.tokens;
    const content = ctx.content!;
    const tree = ctx.tree!;
    const history: { round: number; total: number }[] = [];

    let round = 0;
    let critique: CritiqueScore = scoreDesign(tokens, content, tree, 0);
    history.push({ round: 0, total: critique.total });
    const changes: string[] = [];

    while (!critique.passed && round < 2) {
      round++;
      const revised = reviseTokens(tokens, critique);
      tokens = revised.tokens;
      changes.push(...revised.changes);
      critique = scoreDesign(tokens, content, tree, round);
      history.push({ round, total: critique.total });
    }
    critique.history = history;
    if (changes.length) critique.notes.push(`Revisions: ${changes.join("; ")}`);

    const design: DesignSpec = { ...ctx.design!, tokens, revisionRounds: round };
    const note = critique.passed
      ? `Passed ${critique.total}/100${round ? ` after ${round} revision${round > 1 ? "s" : ""}` : ""}`
      : `Shipped at ${critique.total}/100 (best effort, ${round} revisions)`;

    return { patch: { design, critique }, note, model: ctx.mode === "live" ? "rubric" : "mock" };
  },
};

export const AGENTS: Record<AgentRole, Agent> = {
  ceo,
  pm,
  brand,
  uiux,
  copy,
  frontend,
  critic,
};

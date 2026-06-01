/**
 * AutoFounder AI — core domain types (M1: The Spine).
 *
 * The GenerationContext is the typed "blackboard" every agent reads from and
 * writes to. It is the single source of truth for one generation run and is
 * persisted (checkpointed) after each agent completes so a run can resume.
 *
 * In production this blackboard lives in Postgres + R2 and is driven by a
 * Temporal workflow; in M1 it is a single JSON document persisted to disk by
 * the file-backed run store. The agent/blackboard contract is identical either
 * way, so the orchestrator is the only thing that changes when Temporal lands.
 */

export type GenerationMode = "live" | "mock";

export type RunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

export type TaskStatus = "pending" | "running" | "succeeded" | "failed";

export type AgentRole =
  | "ceo"
  | "pm"
  | "brand"
  | "uiux"
  | "copy"
  | "frontend"
  | "critic";

export type ColorMode = "light" | "dark";
export type Motion = "calm" | "crisp" | "lively";

/** Section kinds the renderer knows how to draw (M1 set). */
export type SectionType =
  | "hero"
  | "trustbar"
  | "features"
  | "howItWorks"
  | "metrics"
  | "testimonial"
  | "pricing"
  | "faq"
  | "cta"
  | "footer";

/** ---- Artifacts (each produced by exactly one agent) ---- */

export interface StrategyBrief {
  industry: string;
  audience: string; // ICP, one line
  positioning: string; // the one-line positioning statement
  valueProps: string[]; // 3 crisp value propositions
  siteGoals: string[]; // what the site must accomplish
}

export interface PageSpec {
  slug: string; // "/" for landing
  kind: string; // "landing"
  /** Ordered list of sections this page should contain. */
  sections: SectionType[];
}

export interface ProductSpec {
  pages: PageSpec[];
  primaryCta: string; // e.g. "Start free trial"
  secondaryCta?: string;
}

/** A small, token-ish brand palette. M1 = thin; M2 expands into full tokens. */
export interface BrandPalette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryFg: string;
  accent: string;
}

/** Allowed display/body font pairings (loaded by the preview route). */
export type FontPairingId =
  | "editorial" // Instrument Serif / Geist
  | "grotesk" // Space Grotesk / Inter
  | "humanist" // Sora / IBM Plex Sans
  | "modern" // Clash-like Bricolage / Geist
  | "classic"; // Fraunces / Mulish

/**
 * Brand direction. The concrete render palette now lives in DesignTokens
 * (produced by the UI/UX agent's token engine); the Brand agent sets identity
 * + a hue hint + the chosen font, and the logo is filled in once a palette
 * exists.
 */
export interface BrandKit {
  name: string;
  tagline: string;
  voice: string; // tone descriptor, e.g. "confident, precise, warm"
  font: FontPairingId;
  hue: number; // 0-360 preferred brand hue (biases the token engine)
  logoSvg?: string; // generated SVG logomark
}

/** Full design-token set — the bespokeness fingerprint of one run. */
export interface DesignTokens {
  mode: ColorMode;
  palette: BrandPalette;
  font: FontPairingId;
  baseSize: number; // body base px
  scaleRatio: number; // modular type scale
  radius: number; // base corner radius px
  spacing: number; // density unit px
  motion: Motion;
  fingerprint: string; // short hash proving uniqueness
}

export interface DesignSpec {
  tokens: DesignTokens;
  heroVariant: "centered" | "left";
  featuresCols: 2 | 3;
  revisionRounds: number;
}

export interface CritiqueScore {
  total: number; // 0-100
  passed: boolean; // >= threshold and no AA contrast veto
  round: number; // which attempt produced this score
  subscores: {
    contrast: number;
    bespokeness: number;
    hierarchy: number;
    aiTell: number;
  };
  notes: string[];
  history?: { round: number; total: number }[];
}

/**
 * Content for each section, keyed by a stable section id. Loosely typed on
 * purpose — the renderer reads defensively so partial content still renders.
 */
export interface ContentModel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sections: Record<string, Record<string, any>>;
  seo: {
    title: string;
    description: string;
  };
}

/** A resolved section in render order, content already bound. */
export interface RenderSection {
  id: string;
  type: SectionType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
}

export interface ComponentTree {
  sections: RenderSection[];
}

/** ---- Run + task records ---- */

export interface AgentTaskRecord {
  role: AgentRole;
  label: string; // human-facing, e.g. "Product Manager"
  status: TaskStatus;
  model?: string; // model id used (live) or "mock"
  note?: string; // short summary of what it produced
  startedAt?: number;
  finishedAt?: number;
}

export interface GenerationContext {
  runId: string;
  idea: string;
  status: RunStatus;
  mode: GenerationMode;
  /** Per-run entropy — guarantees two runs of the same idea differ. */
  seed: number;
  /** Set when a live run had to fall back to mock mid-flight. */
  degraded?: boolean;
  createdAt: number;
  updatedAt: number;

  // Artifacts (populated as the pipeline advances)
  brief?: StrategyBrief;
  product?: ProductSpec;
  brand?: BrandKit;
  design?: DesignSpec;
  content?: ContentModel;
  tree?: ComponentTree;
  critique?: CritiqueScore;

  // Per-agent execution records (drives the live cockpit + resume)
  tasks: AgentTaskRecord[];

  error?: string;
}

/** ---- Progress events streamed to the client over SSE ---- */

export type ProgressEvent =
  | { type: "run"; ctx: PublicContext }
  | { type: "phase"; phase: string }
  | { type: "task"; task: AgentTaskRecord }
  | { type: "artifact"; role: AgentRole; ctx: PublicContext }
  | { type: "complete"; ctx: PublicContext }
  | { type: "error"; message: string; ctx?: PublicContext };

/** What we send to the browser (currently the whole context — no secrets in it). */
export type PublicContext = GenerationContext;

export const AGENT_LABELS: Record<AgentRole, string> = {
  ceo: "CEO",
  pm: "Product Manager",
  brand: "Brand",
  uiux: "UI/UX",
  copy: "Copywriting",
  frontend: "Frontend",
  critic: "Design Critic",
};

/** The ordered pipeline (CEO routes; the rest are specialists). */
export const PIPELINE: AgentRole[] = [
  "ceo",
  "pm",
  "brand",
  "uiux",
  "copy",
  "frontend",
  "critic",
];

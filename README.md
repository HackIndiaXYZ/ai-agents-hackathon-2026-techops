# AutoFounder AI

> Describe your startup in a sentence. A team of AI agents collaborates to generate a complete, custom-designed website for it — brand, copy, design system, and a live multi-section site — in real time.

AutoFounder is an **autonomous startup-website builder**. You type a plain-English idea
("a SaaS platform that helps gym owners manage memberships") and a pipeline of specialized
agents — strategist, product manager, brand designer, UI/UX/token engineer, copywriter,
frontend assembler, and a design critic — turn it into a bespoke, production-style website.

The north-star constraint: generated sites must **not** look templated or AI-generic. Every
run produces a unique design fingerprint (palette, type scale, radius, layout) and must clear
a programmatic **quality gate** before it ships.

---

## Highlights

- **Multi-agent pipeline** over a typed `GenerationContext` "blackboard": `CEO → PM → Brand → UI/UX → Copy → Frontend → Design Critic`.
- **Token engine** — every run derives a unique design-token set (HSL-generated palette, modular type scale, radius, spacing, motion) with a short fingerprint, deliberately steering away from generic indigo/blue.
- **Design Critic gate** — scores each candidate 0–100 (WCAG contrast, bespokeness, hierarchy, AI-tell copy heuristics) and **self-revises up to 2 rounds** until it passes, with a hard veto on sub-AA contrast.
- **Durable & resumable** — run state is checkpointed after every agent, so a killed run resumes from the last completed step. (Local file store stands in for the Temporal + Postgres design in the blueprint.)
- **Live cockpit** — watch agents work in real time over SSE, with the brand identity, critic scorecard, and an embedded preview of the generated site.
- **Token-driven renderer** — owned section components read color/typography/shape from CSS variables, so the same components render a structurally different site per brand.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Anthropic Claude SDK (tiered Opus/Sonnet/Haiku).

## Getting started

```bash
npm install
# add your key to .env.local:  ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open <http://localhost:3000>, type an idea, and hit **Build it**.

### Generation modes

Set `ANTHROPIC_API_KEY` in `.env.local`. The app picks a mode automatically:

| `GENERATION_MODE` | Behavior |
| --- | --- |
| `auto` (default) | Live Claude generation if a working key is present; otherwise a deterministic offline generator. If a live call fails mid-run (e.g. no credit), it degrades to the offline path transparently. |
| `live` | Force live Claude calls. |
| `mock` | Force the deterministic offline generator — fully functional with no API key, great for demos. |

The offline generator is seeded so output is stable per idea but **varies every run**, which is
how the "two runs of the same idea look different" property is demonstrated without the API.

## How it works

```
Idea ─▶ CEO (strategy brief) ─▶ PM (page + section plan) ─▶ Brand (name, voice, hue, logo)
     ─▶ UI/UX (token engine → unique design tokens) ─▶ Copy (per-section content)
     ─▶ Frontend (component tree) ─▶ Design Critic (score → revise ≤2× → gate)
     ─▶ rendered, token-driven multi-section site at /preview/<runId>
```

Key modules (`src/lib/autofounder/`):

| File | Role |
| --- | --- |
| `types.ts` | `GenerationContext` blackboard + artifact/agent types |
| `llm.ts` | tiered Claude calls + mode resolution |
| `mock.ts` | deterministic offline generators |
| `color.ts` | HSL ↔ hex + WCAG contrast math |
| `tokens.ts` | per-run token engine + revision fixer |
| `critic.ts` | Design Critic rubric (0–100) |
| `logo.ts` | seeded SVG logomark |
| `agents.ts` | the seven agents |
| `store.ts` | durable run persistence (checkpoint/resume) |
| `orchestrator.ts` | CEO-routed pipeline + revision loop |

The rendered site lives in `src/lib/site/` (token-driven `SiteRenderer` + owned section components),
served full-bleed at `/preview/[runId]`.

## Architecture & roadmap

The full product/system/agent architecture, database schema, and milestone roadmap live in
[`docs/`](./docs/README.md). Current status: **M1 (the autonomous pipeline spine)** and
**M2 (the token engine + Design Critic + self-revision loop)** are implemented. M3 (exemplar
retrieval, generated imagery, SEO, real deploy) is next.

## A note on how this was built

This project was built with heavy AI assistance (Claude). The interesting work is in the
system design — the agent/blackboard contract, the token engine, and the quality gate — which
stands on its own regardless of how the code was typed.

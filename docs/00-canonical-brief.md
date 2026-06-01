# AutoFounder AI — Canonical Decision Brief

> Source of truth. Every other document conforms to this.

## AutoFounder AI — Canonical Decision Brief (v1.0)

**Status:** Source of truth. Every other architecture doc MUST conform. Conflicts resolve in favor of this document. Date: 2026-05-31.

---

### 1. Product Name + Positioning
**Name:** **Forge.** &nbsp;**Positioning:** *Describe your startup in a sentence. Forge ships a Stripe-quality website — brand, copy, design, and production code — autonomously.*
*Rationale: "Forge" connotes craftsmanship + creation, signaling bespoke output over template assembly.*

---

### 2. Canonical Tech Stack (one choice each)

| Layer | Decision | Rationale |
|---|---|---|
| Frontend framework (platform) | **Next.js 15 (App Router)** | RSC + streaming for live agent/job UIs; one ecosystem for platform and generated sites. |
| Language | **TypeScript everywhere** | One language across agents, pipeline, frontend; shared types. |
| Styling | **Tailwind CSS + design tokens** | Token-driven utility CSS maps cleanly to per-brand generated themes. |
| Component strategy (platform) | **shadcn/ui (owned source)** | Editable primitives, not a locked dependency. |
| Backend runtime | **Node.js (TypeScript) on Fastify** | Shared types with frontend; Fastify for throughput. |
| API style | **tRPC (internal) + REST webhooks (external)** | End-to-end typesafety internally; REST for Stripe/deploy callbacks. |
| Primary DB | **PostgreSQL (Supabase)** | Relational integrity for entities + RLS + managed auth. |
| Vector / search store | **pgvector (in Postgres)** | Avoids a second datastore; brand/design-exemplar retrieval co-located. |
| Queue / orchestration layer | **Temporal** | Durable, resumable long-running agent workflows with retries/signals — the core requirement. |
| Object storage | **Cloudflare R2** | Zero egress fees for generated assets and site bundles. |
| Auth | **Supabase Auth (OAuth + email)** | Bundled with DB + RLS. |
| Payments | **Stripe (Billing + metered usage)** | Subscriptions + usage metering for generation credits. |
| LLM — orchestration/reasoning tier | **Claude Opus 4.x** | Top-tier reasoning for CEO/PM/debate/code. |
| LLM — bulk/content tier | **Claude Sonnet 4.x** | Cost-efficient for copy, SEO, structured drafts. |
| LLM — cheap/classify tier | **Claude Haiku 4.x** | Routing, validation, extraction. |
| Image generation | **Flux (via Replicate) + programmatic SVG/logo synthesis** | Photoreal hero/imagery from Flux; logos/icons generated as crisp SVG, not raster. |
| Deployment — platform | **Vercel (frontend) + Fly.io (Fastify/Temporal workers)** | Vercel for edge UI; Fly for stateful long-running workers. |
| Deployment — generated sites | **Cloudflare Pages (per-site project)** | Cheap, fast, isolated tenant deploys with custom domains. |

---

### 3. Agent Orchestration Model
- **Topology:** **Temporal workflow as a directed state machine** (the "Studio" workflow). The **CEO agent is the orchestrator/router**; the other 9 are activities/child-workflows. *Rationale: durability + deterministic replay beats a free-form message bus for resumable multi-hour jobs.*
- **Shared state:** A **typed blackboard artifact** (the `GenerationContext`, persisted in Postgres + R2) that every agent reads/writes — single source of truth per project run.
- **Debate/consensus:** **Structured critique rounds.** A proposing agent emits a candidate; a designated **Critic role + Director (CEO/PM) arbitration** scores against a rubric. Max 2 debate rounds, then Director decides. *Rationale: bounded debate prevents infinite loops while improving quality.*
- **Human-in-the-loop:** Clarifying questions are **Temporal signals** — the workflow pauses at a `WaitForUser` state, surfaces ≤3 batched questions, resumes on answer. Defaults are auto-chosen after timeout so jobs never stall.
- **Job tracking/resume:** **Temporal handles durability natively** — every step is checkpointed; a crashed run resumes from last completed activity. Users see live progress via workflow query → streamed to UI.

---

### 4. Website Generation Pipeline (canonical artifact flow)
**Idea → Brief → Brand Kit → Design Spec → Content Model → Component Tree → Code → Deployed Site.**

| Artifact | Produced by | Definition |
|---|---|---|
| **Strategy Brief** | CEO + Market Research + PM | ICP, positioning, value props, site goals. |
| **Brand Kit** | Brand agent | Name, logo (SVG), color system, type pairing, voice — emitted as **design tokens**. |
| **Design Spec** | UI/UX agent | Layout system, section blueprints, motion rules — references tokens, never hardcoded styles. |
| **Content Model** | Copy + SEO | Typed content per page/section (headlines, body, meta, schema.org). |
| **Component Tree** | Frontend agent | Composition of owned components bound to content + tokens. |
| **Code Bundle** | Frontend + Backend | Production Next.js project + backend stubs, in R2. |

**Anti-generic enforcement (NOT templating):**
1. **Token-driven, not template-driven** — every site derives a *unique* token set; components consume tokens so no two sites share a palette/type/spacing fingerprint.
2. **Exemplar retrieval (pgvector)** — design choices are grounded in curated Stripe/Linear/Notion-class references retrieved by industry, not generic defaults.
3. **Automated quality gate** — a **Design Critic agent + Lighthouse/visual-diff check** scores bespokeness, contrast, hierarchy, and "AI-tell" heuristics; below threshold → forced revision loop before deploy.

---

### 5. Core Data Entities
- **User** — account owner/operator.
- **Organization** — billing + workspace tenant.
- **Project** — one startup idea → one generated site.
- **GenerationRun** — a single end-to-end pipeline execution (maps to a Temporal workflow).
- **AgentTask** — one agent's unit of work within a run.
- **Artifact** — versioned intermediate output (brief, brand kit, spec, content, code).
- **BrandKit** — canonical brand tokens for a project.
- **DesignSpec** — layout/design system for a project.
- **ContentModel** — structured page/section content.
- **Deployment** — a published site instance + domain + status.
- **Subscription** — Stripe plan + usage state.
- **CreditLedger** — generation-credit debits/credits.
- **Exemplar** — curated reference embeddings for retrieval.

---

### 6. Monetization Model
**Usage credits + subscription tiers.** Generation consumes credits (gated by LLM/image cost); tiers gate *capability and limits*.

| Tier | Gates |
|---|---|
| **Free** | 1 project, watermarked preview, no export/deploy, low credits. |
| **Pro** | Code export, deploy to Cloudflare, custom domain, more credits. |
| **Business** | Multi-seat org, A/B variants, higher concurrency, priority queue, API access. |
| **Scale (usage)** | Metered overage credits + white-label + SLA. |

*Rationale: aligns price with true marginal LLM/render cost while keeping a real free funnel.*

---

### 7. Three Hardest Risks + Mitigations
1. **Output looks AI-generated/generic.** → **Token uniqueness + pgvector exemplar grounding + a hard Design Critic quality gate** with mandatory revision loops; nothing deploys below the bespokeness threshold.
2. **Long, expensive multi-agent jobs failing/stalling mid-run.** → **Temporal durable workflows** (checkpoint/resume), bounded debate rounds, per-tier model routing, and **credit budgets that cap cost per run**.
3. **Generated code is insecure/broken at deploy.** → **Sandboxed build + automated gate**: typecheck, lint, build, Lighthouse, and security lint run before publish; failures route back to the Frontend/Backend agents, never to the user.


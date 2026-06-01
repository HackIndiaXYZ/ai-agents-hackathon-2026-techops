# User Flows

All flows operate against the canonical entity set (`Project`, `GenerationRun`, `AgentTask`, `Artifact`, `Deployment`, `Subscription`, `CreditLedger`) and the **Temporal "Studio" workflow** (CEO-orchestrated state machine). `GenerationRun.status` is the master FSM; the UI subscribes via `workflow.query()` → tRPC subscription → RSC stream. Convention below: 🟢 **user acts**, ⏳ **user waits** (live progress streamed), 🤖 **autonomous**.

### Canonical `GenerationRun.status` FSM

```
QUEUED → BRIEFING → WAIT_FOR_USER → BRANDING → DESIGN_SPEC → CONTENT
       → COMPONENT_TREE → CODEGEN → QUALITY_GATE → READY_PREVIEW
       → DEPLOYING → DEPLOYED
   �‹ FAILED / RETRYING (from any state) · REVISING (gate/iteration loop)
```

---

### Flow 1 — Golden Path: Idea → Deploy

```mermaid
sequenceDiagram
    actor U as User
    participant W as Web (Next.js RSC)
    participant T as Temporal Studio WF
    participant A as Agents (CEO→9)
    participant Q as Quality Gate
    participant CF as Cloudflare Pages
    U->>W: 🟢 Submit idea (≤500 chars) + industry hint
    W->>T: startWorkflow(StudioWF, projectId)  [debit 1 credit hold]
    T->>A: 🤖 CEO+MR+PM → Strategy Brief artifact v1
    T-->>W: status=BRIEFING (≤25s)
    A->>T: signal WaitForUser (≤3 batched Qs)
    T-->>W: status=WAIT_FOR_USER
    U->>W: 🟢 Answer Qs (or 90s timeout→defaults)
    W->>T: signal answers
    Note over T,A: ⏳ BRANDING→DESIGN_SPEC→CONTENT→COMPONENT_TREE→CODEGEN
    A->>Q: 🤖 Design Critic + Lighthouse + tsc/lint/build
    Q-->>T: bespokeness≥0.78 & a11y pass
    T-->>W: status=READY_PREVIEW (sandbox URL, watermarked if Free)
    U->>W: 🟢 Review live preview, click Deploy
    W->>CF: createDeployment (Pro+ only)
    CF-->>W: status=DEPLOYED + *.forge.site URL
```

| Stage | Wait/Act | Latency budget | Credits |
|---|---|---|---|
| Brief + clarifying | 🟢 act once | ~25s + answer | 0 (held) |
| Brand→Code | ⏳ wait | 90–180s streamed | 8–15 |
| Quality gate | ⏳ wait | 20–40s | 1 |
| Review | 🟢 act | user-paced | 0 |
| Deploy | 🟢 act → ⏳ | 30–60s | 1 (Pro+) |

**Key decision:** credit is **held** at start, **committed** only on `READY_PREVIEW`; a `FAILED` run before gate refunds the hold to `CreditLedger`. User never pays for a broken run.

---

### Flow 2 — Section Regeneration / Iteration Loop

Scoped re-run: only the targeted section's `AgentTask` subtree re-executes via a Temporal **child workflow**, reusing the existing `GenerationContext` blackboard so brand tokens stay locked (no palette drift).

```mermaid
flowchart LR
  A[🟢 User selects section\nedit hero/pricing] --> B{Prompt or dial?}
  B -->|free-text| C[🤖 SectionRegenWF\nCopy+UI/UX+Frontend only]
  B -->|token dial: bolder/calmer| C
  C --> D[🤖 Design Critic diff\nvs prior version]
  D -->|pass| E[⏳ stream new section\ninto live preview]
  D -->|fail x2| F[Director picks best candidate]
  E --> G[🟢 Accept ➜ Artifact v+1\nor Revert ➜ prior version]
```

- **State:** parent `GenerationRun` stays `DEPLOYED`/`READY_PREVIEW`; child run = `REVISING`. New `Artifact` row, `version=n+1`, `parent_version` set — full version tree retained for one-click revert.
- **Cost:** 2–4 credits (section-only, not full run). Max 2 debate rounds enforced.
- **User:** 🟢 trigger + accept; ⏳ waits ~20–40s.

---

### Flow 3 — Manual Override / Direct Edit

User bypasses agents to hand-edit an artifact (copy string, hex token, swap logo SVG). Edits write directly to the typed artifact JSON and **pin** the field so future regenerations don't overwrite it.

| Artifact | Editor surface | Persistence |
|---|---|---|
| ContentModel | inline rich-text on preview | patch JSON, `field.locked=true` |
| BrandKit token | color/type picker | token override, re-derives dependent CSS vars |
| Logo (SVG) | upload or SVG code edit | replaces asset in R2, bumps version |
| Code Bundle | Monaco diff (Business+) | branch in R2, re-runs build gate only |

```mermaid
flowchart LR
  A[🟢 Edit field] --> B[Optimistic UI update]
  B --> C[tRPC patchArtifact\nlock field]
  C --> D{Code edit?}
  D -->|yes| E[🤖 sandbox build+lint gate]
  D -->|no| F[✅ saved, version+1]
  E -->|pass| F
  E -->|fail| G[🟢 show error inline\nrevert option]
```

**Decision:** locked fields are excluded from agent write-scope on subsequent runs (merge policy: user-pin > agent output). Editing code re-runs **only** the security/build gate, never the design critic.

---

### Flow 4 — Onboarding & First-Run

```mermaid
flowchart TD
  A[🟢 Supabase Auth: OAuth/email] --> B[Auto-create Organization\n+ Free Subscription + 20 credits]
  B --> C[🟢 Single input: 'Describe your startup']
  C --> D[🤖 Haiku classifies industry\n→ exemplar retrieval primed]
  D --> E[⏳ First run = guided\nprogress narration per agent]
  E --> F[READY_PREVIEW watermarked]
  F --> G{Deploy/Export?}
  G -->|Free blocked| H[Paywall ➜ Flow 5]
```

- **No empty dashboard.** First screen is the idea box; org/credits provisioned silently. Time-to-first-preview is the activation metric (<3 min target).
- First run shows **per-agent narration** ("Brand agent chose Söhne + cobalt because…") to build trust; suppressible on later runs.

---

### Flow 5 — Upgrade / Paywall Moment

Paywall fires at **intent-to-extract** (Deploy/Export/custom-domain), not at signup — the user has already seen Stripe-quality output.

```mermaid
sequenceDiagram
    actor U as User
    participant W as Web
    participant S as Stripe Billing
    U->>W: 🟢 Click Deploy (Free)
    W-->>U: ⏳ Modal: preview = full quality,\nPro unlocks deploy+export+domain+200cr
    U->>W: 🟢 Select Pro
    W->>S: Checkout session (subscription)
    S-->>W: webhook checkout.session.completed
    W->>W: Subscription.tier=Pro, grant credits
    W-->>U: ✅ resume original Deploy intent
```

| Trigger | Gate | Upsell |
|---|---|---|
| Deploy / Export | Free → Pro | $/mo + 200 credits |
| Credits exhausted mid-run | hold fails | top-up or upgrade tier |
| A/B variants, API | Pro → Business | seats + concurrency |

**Decision:** the blocked action is **stashed** and auto-resumed post-`checkout.session.completed` webhook — no re-navigation. Watermark removed on tier flip without re-generation.

---

### Flow 6 — Failure / Retry Path

Temporal owns durability: each activity is checkpointed, so a worker crash resumes from the last completed `AgentTask` — invisible to the user.

```mermaid
flowchart TD
  A[Activity fails] --> B{Failure class}
  B -->|transient: LLM 429/timeout| C[🤖 Temporal retry\n3x expo backoff]
  B -->|gate fail: bespokeness<0.78\nor build error| D[🤖 REVISING ➜ route back\nto Frontend/Backend agent, max 2x]
  B -->|credit budget exceeded| E[⏸ pause ➜ 🟢 user top-up signal]
  B -->|fatal: poison/agent loop| F[FAILED ➜ refund held credits]
  C -->|exhausted| F
  D -->|still failing| F
  F --> G[🟢 User: Retry run / edit idea\n/ contact — full run log shown]
```

- **User never sees raw stack traces or broken code** — gate failures loop back to agents autonomously; only terminal `FAILED` surfaces, with a plain-language cause and one-click **Retry** (re-runs from `QUEUED`, reusing prior valid artifacts via blackboard).
- **State:** `GenerationRun.failure_reason` + `last_completed_activity` persisted for resumable retry. Credit hold auto-refunded on `FAILED` before commit.
- **Wait/act:** ⏳ during all auto-retry/revision; 🟢 only on budget top-up or terminal retry decision.


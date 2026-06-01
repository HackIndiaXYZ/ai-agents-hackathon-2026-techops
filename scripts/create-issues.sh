#!/usr/bin/env bash
#
# create-issues.sh — bootstrap GitHub milestones, labels, and issues for the
# M3 and M4 roadmap stages (see docs/10-mvp-roadmap.md).
#
# Requires the GitHub CLI (`gh`) authenticated against your repo:
#   gh auth login
#
# Usage (from the project root, after `git remote add origin <url>`):
#   bash scripts/create-issues.sh
#
set -euo pipefail
command -v gh >/dev/null || { echo "Install the GitHub CLI: https://cli.github.com" >&2; exit 1; }

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Repo: $REPO"

# --- milestones (idempotent: ignore 'already_exists') ---
mk_milestone() {
  gh api "repos/$REPO/milestones" -f title="$1" -f description="$2" >/dev/null 2>&1 \
    && echo "milestone: $1" || echo "milestone exists: $1"
}
mk_milestone "M3 — Grounded & Deployable" "Exemplar retrieval, imagery, SEO, real deploy."
mk_milestone "M4 — Product" "Auth, billing, human-in-the-loop, hardening."

# --- labels (idempotent) ---
mk_label() { gh label create "$1" --color "$2" --description "$3" >/dev/null 2>&1 \
  && echo "label: $1" || echo "label exists: $1"; }
mk_label "M3" "1d76db" "Milestone 3 — Grounded & Deployable"
mk_label "M4" "0e8a16" "Milestone 4 — Product"
mk_label "agent" "5319e7" "Agent behavior"
mk_label "infra" "b60205" "Infrastructure / pipeline"

# --- issue helper ---
issue() { # $1 title  $2 milestone  $3 label  $4 body
  gh issue create --title "$1" --milestone "$2" --label "$3" --body "$4" >/dev/null
  echo "  + $1"
}

echo "Creating M3 issues…"
issue "Exemplar corpus + pgvector retrieval" "M3 — Grounded & Deployable" "infra" \
"Ground design decisions in curated, industry-tagged references.

**Acceptance criteria**
- [ ] 50–100 curated Stripe/Linear/Notion-class references stored with embeddings (pgvector)
- [ ] Retrieval-by-industry returns top-k exemplars for a brief
- [ ] UI/UX agent consumes retrieved exemplars when generating tokens
- [ ] Measurable lift in Critic bespokeness score vs. heuristic-only baseline"

issue "Market Research agent (web-grounded)" "M3 — Grounded & Deployable" "agent" \
"Add the Market Research agent producing a competitor/positioning report.

**Acceptance criteria**
- [ ] Agent runs after CEO, before Brand
- [ ] Produces ICP, 3 competitors, and a differentiation angle
- [ ] Output feeds positioning + copy
- [ ] Degrades cleanly to offline mock when no web/API access"

issue "Hero imagery pipeline (Flux via Replicate)" "M3 — Grounded & Deployable" "infra" \
"Generate real hero/section imagery.

**Acceptance criteria**
- [ ] Image agent calls Flux (Replicate) with brand-aware prompts
- [ ] Assets stored and referenced by the renderer
- [ ] Deterministic placeholder when no provider key is set
- [ ] Per-run cost stays within the run budget"

issue "SEO agent: metadata + schema.org" "M3 — Grounded & Deployable" "agent" \
"Produce SEO metadata and structured data.

**Acceptance criteria**
- [ ] Per-page title/description within length limits
- [ ] schema.org JSON-LD emitted in the generated site
- [ ] Semantic heading hierarchy validated
- [ ] Lighthouse SEO ≥ 95 on generated sites"

issue "Full SVG logo system" "M3 — Grounded & Deployable" "agent" \
"Upgrade the thin M2 logomark into a small but real identity system.

**Acceptance criteria**
- [ ] Wordmark + mark variants generated as crisp SVG
- [ ] Logo colors derive from tokens and pass contrast on light/dark
- [ ] Favicon/OG mark exported"

issue "Backend agent: stubs & schema" "M3 — Grounded & Deployable" "agent" \
"Emit backend scaffolding for the generated site.

**Acceptance criteria**
- [ ] Contact/newsletter form endpoints stubbed
- [ ] Suggested data schema + env template produced
- [ ] Generated stubs typecheck"

issue "Full build & quality gate" "M3 — Grounded & Deployable" "infra" \
"Extend the Critic gate with a real build + perf/a11y pass.

**Acceptance criteria**
- [ ] tsc + eslint + next build run in a sandbox per candidate
- [ ] Lighthouse perf ≥ 90, a11y ≥ 95 enforced before publish
- [ ] Failures route back to the relevant agent, never to the user"

issue "Deploy generated site to a public URL" "M3 — Grounded & Deployable" "infra" \
"Publish a generated site to a real, shareable URL.

**Acceptance criteria**
- [ ] One-click deploy of the generated bundle
- [ ] Returns a working public URL
- [ ] Isolated per run; safe to tear down"

echo "Creating M4 issues…"
issue "Auth + multi-tenant data (Supabase + RLS)" "M4 — Product" "infra" \
"Introduce accounts and tenant isolation.

**Acceptance criteria**
- [ ] Email + OAuth sign-in
- [ ] Projects/runs scoped per org via RLS
- [ ] No cross-tenant reads possible"

issue "Billing + credit metering (Stripe)" "M4 — Product" "infra" \
"Meter generation cost and gate by plan.

**Acceptance criteria**
- [ ] Stripe subscriptions wired to plan tiers
- [ ] Append-only credit ledger; per-run budget enforced
- [ ] Webhooks deduped and idempotent"

issue "Free vs Pro gating" "M4 — Product" "infra" \
"Differentiate free and paid output.

**Acceptance criteria**
- [ ] Free: watermarked preview, no export/deploy
- [ ] Pro: export + deploy + custom domain
- [ ] Upgrade flow unlocks features without re-running generation"

issue "Human-in-the-loop clarifying questions" "M4 — Product" "agent" \
"Let the CEO agent ask up to 3 batched questions, with timeout defaults.

**Acceptance criteria**
- [ ] Run pauses at a WaitForUser point; UI collects answers
- [ ] Auto-selects sensible defaults after timeout so runs never stall
- [ ] Answers recorded on the run for reproducibility"

issue "Growth agent: conversion copy + analytics events" "M4 — Product" "agent" \
"Add the Growth agent.

**Acceptance criteria**
- [ ] CTA/variant copy + analytics event map produced
- [ ] OG/social cards generated
- [ ] Events wired into the generated site scaffold"

issue "Hardening: 10 agents stable + observability" "M4 — Product" "infra" \
"Stabilize the full roster and add tracing/metrics.

**Acceptance criteria**
- [ ] All 10 agents reliable under load
- [ ] Per-run traces with model + token + cost spans
- [ ] Critic pass-rate and cost-per-run dashboards"

echo "Done. View: gh issue list --milestone \"M3 — Grounded & Deployable\""

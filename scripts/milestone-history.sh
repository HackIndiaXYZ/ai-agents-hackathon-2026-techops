#!/usr/bin/env bash
#
# milestone-history.sh — build AutoFounder's git history as real, buildable
# milestone stages:  M0 scaffold  →  M1 "The Spine" (tag v0.1.0)  →
# M2 "Bespoke" (tag v0.2.0)  →  docs/README.
#
# HONEST by design:
#   • Real, current commit dates. Nothing is backdated.
#   • Each tag checks out as a working, type-checking app — because M1's
#     pre-token-engine snapshot is reconstructed (under .history/m1, authored
#     ahead of time) rather than faked. This mirrors how the project was
#     actually built (M1 first, then M2 layered on top).
#   • Commits credit Claude via a Co-Authored-By trailer. Set TRAILER="" to omit
#     (your repo, your call) — but this script will not fabricate a timeline.
#
# It works by overlaying the M1 snapshot for the v0.1.0 stage, then restoring
# the real M2 files (saved under .history/m2) for the v0.2.0 stage. Your git
# does all the committing; this script only stages and tags.
#
# Usage (from the project root, e.g. Git Bash on Windows):
#   bash scripts/milestone-history.sh
#   VERIFY=1 bash scripts/milestone-history.sh   # also runs `npm run build` per tag
#
set -euo pipefail

TRAILER="Co-Authored-By: Claude <noreply@anthropic.com>"
VERIFY="${VERIFY:-0}"

# ---- preflight ----
[ -f package.json ] && [ -d src/lib/autofounder ] || { echo "Run from the autofounder/ project root." >&2; exit 1; }
[ -d .history/m1 ] && [ -d .history/m2 ] || { echo "Missing .history/m1 and .history/m2 snapshots. They must exist before running." >&2; exit 1; }

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [ -n "$(git rev-list -n1 --all 2>/dev/null || true)" ]; then
    echo "This repo already has commits — aborting so nothing is overwritten." >&2
    exit 1
  fi
else
  git init -q
fi
git symbolic-ref HEAD refs/heads/main 2>/dev/null || git branch -M main 2>/dev/null || true

git config user.email >/dev/null 2>&1 || { echo "Set your git identity first: git config user.name \"You\"; git config user.email you@example.com" >&2; exit 1; }
git check-ignore -q .env.local 2>/dev/null || { echo "WARNING: .env.local is not gitignored. Fix .gitignore before continuing." >&2; exit 1; }

# ---- file groups ----
# Files that differ between M1 and M2 (live in both snapshots):
SHARED=(
  src/lib/autofounder/types.ts src/lib/autofounder/mock.ts src/lib/autofounder/agents.ts
  src/lib/autofounder/store.ts src/lib/autofounder/orchestrator.ts
  src/lib/site/SiteRenderer.tsx src/lib/site/sections.tsx
  src/app/page.tsx "src/app/preview/[runId]/page.tsx" src/app/api/generate/route.ts
)
# Files that exist only from M2 onward:
M2_ONLY=(
  src/lib/autofounder/color.ts src/lib/autofounder/tokens.ts
  src/lib/autofounder/critic.ts src/lib/autofounder/logo.ts
)

overlay() { # $1 = snapshot dir; copies SHARED files from it into the tree
  local base=$1 f
  for f in "${SHARED[@]}"; do
    mkdir -p "$(dirname "$f")"
    cp "$base/$f" "$f"
  done
}

commit() { # $1 = message; rest = paths to add
  local msg=$1; shift
  git add -- "$@"
  if git diff --cached --quiet; then echo "  · skip (empty): $msg"; return 0; fi
  if [ -n "$TRAILER" ]; then git commit -q -m "$msg" -m "$TRAILER"; else git commit -q -m "$msg"; fi
  echo "  ✓ $msg"
}

verify() { [ "$VERIFY" = "1" ] && { echo "  …verifying build"; npm run build >/dev/null 2>&1 && echo "  ✓ build ok" || { echo "  ✗ build FAILED at $1" >&2; exit 1; }; } || true; }

echo "==> M0: foundation"
commit "chore: scaffold Next.js app (TypeScript, Tailwind, shadcn)" \
  package.json package-lock.json tsconfig.json next.config.ts \
  eslint.config.mjs postcss.config.mjs components.json .gitignore AGENTS.md CLAUDE.md public
commit "style: base theme, fonts, and shadcn UI primitives" \
  src/app/layout.tsx src/app/globals.css src/lib/utils.ts src/components/ui

echo "==> M1: the spine (v0.1.0)"
overlay .history/m1
rm -f "${M2_ONLY[@]}"   # not part of M1; uncommitted so this is safe
commit "feat: typed GenerationContext blackboard and artifacts" src/lib/autofounder/types.ts
commit "feat: tiered Claude LLM layer with deterministic offline fallback" \
  src/lib/autofounder/llm.ts src/lib/autofounder/mock.ts
commit "feat: five generation agents (CEO, PM, Brand, Copy, Frontend)" src/lib/autofounder/agents.ts
commit "feat: durable run store and CEO-routed orchestrator with resume" \
  src/lib/autofounder/store.ts src/lib/autofounder/orchestrator.ts
commit "feat: generation API (SSE progress) and run fetch route" \
  src/app/api/generate src/app/api/runs
commit "feat: token-driven site renderer, sections, and font pairings" src/lib/site
commit "feat: full-bleed generated-site preview route" src/app/preview
commit "feat: live generation cockpit UI" src/app/page.tsx
verify "M1"
git tag -a v0.1.0 -m "M1 — The Spine: autonomous idea → multi-section site pipeline"
echo "  🏷  tagged v0.1.0"

echo "==> M2: bespoke (v0.2.0)"
overlay .history/m2
for f in "${M2_ONLY[@]}"; do cp ".history/m2/$f" "$f"; done
commit "feat(m2): HSL color and WCAG contrast utilities" src/lib/autofounder/color.ts
commit "feat(m2): per-run design-token engine and seeded SVG logo" \
  src/lib/autofounder/tokens.ts src/lib/autofounder/logo.ts
commit "feat(m2): Design Critic scoring rubric (contrast, bespokeness, hierarchy, AI-tell)" \
  src/lib/autofounder/critic.ts
commit "feat(m2): add UI/UX + Critic agents, per-run seed, and self-revision loop" \
  src/lib/autofounder/types.ts src/lib/autofounder/mock.ts src/lib/autofounder/agents.ts \
  src/lib/autofounder/store.ts src/lib/autofounder/orchestrator.ts src/app/api/generate/route.ts
commit "feat(m2): token-driven renderer (radius, type scale, layout variants, logo)" \
  src/lib/site/SiteRenderer.tsx src/lib/site/sections.tsx src/app/preview
commit "feat(m2): cockpit shows design tokens, fingerprint, and Critic scorecard" src/app/page.tsx
verify "M2"
git tag -a v0.2.0 -m "M2 — Bespoke: token engine + Design Critic + self-revision loop"
echo "  🏷  tagged v0.2.0"

echo "==> docs + README"
commit "docs: architecture blueprint and helper scripts" docs scripts README.md
git add -A && { git diff --cached --quiet || commit "chore: remaining project files" .; }

cat <<'NEXT'

Done. Review with:
  git log --oneline --decorate
  git show v0.1.0 --stat

Then publish milestone-by-milestone:
  git remote add origin <your-repo-url>
  git push -u origin main
  git push origin v0.1.0          # cut the v0.1.0 GitHub release from this tag
  git push origin v0.2.0          # then the v0.2.0 release

Tip: on GitHub, Releases → "Draft a new release" → choose the tag → write notes
per milestone (M1 = the spine, M2 = token engine + Design Critic).

The .history/ folder is staging scaffolding (gitignored). Delete it once you're
happy with the history:  rm -rf .history
NEXT

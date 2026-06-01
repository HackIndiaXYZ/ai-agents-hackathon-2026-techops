#!/usr/bin/env bash
#
# git-history.sh — commit AutoFounder into a clean, logical sequence of commits.
#
# This is the HONEST version on purpose:
#   • Commits use the real current date/time. Nothing is backdated.
#   • Authorship is your normal git identity.
#   • Each commit credits Claude via a Co-Authored-By trailer (transparent
#     attribution). To drop that, set TRAILER="" below — that's your call, but
#     this script will not fabricate a fake timeline or hide that AI was used.
#
# It simply groups the existing working tree into well-scoped commits so the
# history reads the way a careful developer would have built it.
#
# Usage (from the project root, e.g. with Git Bash on Windows):
#   bash scripts/git-history.sh
#
set -euo pipefail

# --- transparent AI attribution (set to "" to omit) ---
TRAILER="Co-Authored-By: Claude <noreply@anthropic.com>"

# --- sanity checks ---
if [ ! -f package.json ] || [ ! -d src/lib/autofounder ]; then
  echo "Run this from the autofounder/ project root." >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Initializing a new git repository…"
  git init -q
  git branch -M main
fi

if [ -n "$(git rev-list -n1 --all 2>/dev/null || true)" ]; then
  echo "This repository already has commits. Aborting so nothing is overwritten." >&2
  echo "Run this only on a fresh repo, or reset history yourself first." >&2
  exit 1
fi

if ! git config user.email >/dev/null 2>&1; then
  echo "Set your git identity first:  git config user.name \"You\"; git config user.email you@example.com" >&2
  exit 1
fi

# Safety: never commit secrets. .env* is gitignored, but assert it anyway.
if git check-ignore -q .env.local 2>/dev/null; then :; else
  echo "WARNING: .env.local is not gitignored — fix .gitignore before continuing." >&2
  exit 1
fi

# commit <message> -- <paths...>
commit() {
  local msg="$1"; shift
  # drop the literal "--" separator
  shift || true
  git add -- "$@"
  if git diff --cached --quiet; then
    echo "  (nothing staged for: $msg — skipping)"
    return 0
  fi
  if [ -n "$TRAILER" ]; then
    git commit -q -m "$msg" -m "$TRAILER"
  else
    git commit -q -m "$msg"
  fi
  echo "  ✓ $msg"
}

echo "Creating logical commit history…"

commit "chore: scaffold Next.js app (TypeScript, Tailwind, shadcn config)" -- \
  package.json package-lock.json tsconfig.json next.config.ts \
  eslint.config.mjs postcss.config.mjs components.json .gitignore \
  AGENTS.md CLAUDE.md public

commit "style: base theme, fonts, and shadcn UI primitives" -- \
  src/app/layout.tsx src/app/globals.css src/lib/utils.ts src/components/ui

commit "feat: GenerationContext blackboard and artifact types" -- \
  src/lib/autofounder/types.ts

commit "feat: HSL color + WCAG contrast utilities" -- \
  src/lib/autofounder/color.ts

commit "feat: tiered Claude LLM layer with deterministic offline fallback" -- \
  src/lib/autofounder/llm.ts src/lib/autofounder/mock.ts

commit "feat: per-run design-token engine and seeded SVG logo" -- \
  src/lib/autofounder/tokens.ts src/lib/autofounder/logo.ts

commit "feat: Design Critic scoring rubric (contrast, bespokeness, hierarchy, AI-tell)" -- \
  src/lib/autofounder/critic.ts

commit "feat: the seven generation agents (CEO, PM, Brand, UI/UX, Copy, Frontend, Critic)" -- \
  src/lib/autofounder/agents.ts

commit "feat: durable run store and CEO-routed orchestrator with revision loop" -- \
  src/lib/autofounder/store.ts src/lib/autofounder/orchestrator.ts

commit "feat: generation API (SSE progress stream) and run fetch route" -- \
  src/app/api/generate src/app/api/runs

commit "feat: token-driven site renderer and owned section components" -- \
  src/lib/site

commit "feat: full-bleed generated-site preview route" -- \
  src/app/preview

commit "feat: live generation cockpit UI" -- \
  src/app/page.tsx

commit "docs: architecture blueprint and doc-build script" -- \
  docs scripts/build-blueprint-docs.mjs

commit "docs: project README" -- \
  README.md scripts/git-history.sh

# Sweep anything not explicitly grouped above (favicon, etc.).
# .env.local stays out because it is gitignored.
git add -A
if ! git diff --cached --quiet; then
  if [ -n "$TRAILER" ]; then
    git commit -q -m "chore: remaining project files" -m "$TRAILER"
  else
    git commit -q -m "chore: remaining project files"
  fi
  echo "  ✓ chore: remaining project files"
fi

echo
echo "Done. Review with:  git log --stat"
echo "Then create a GitHub repo and:  git remote add origin <url> && git push -u origin main"

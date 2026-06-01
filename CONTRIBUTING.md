# Contributing to AutoFounder

This documents how the project is developed. It applies to solo work too — the
conventions keep history readable and releases predictable.

## Workflow

1. **One branch per unit of work**, named by type and scope:
   - `feat/m3-exemplar-retrieval`, `fix/critic-contrast-edge`, `refactor/token-engine`, `docs/readme`
2. **Open a pull request** into `main`. Even solo, the PR is the reviewable,
   dated record of a change. Keep PRs focused — one feature or fix each.
3. **CI must pass** (lint, typecheck, build) before merge — see
   `.github/workflows/ci.yml`.
4. **Squash or rebase-merge** so `main` stays linear and each merge maps to a
   coherent change.

## Commit messages — Conventional Commits

```
<type>(<optional scope>): <imperative summary>
```

Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `style`, `test`, `chore`, `ci`.

Examples:
- `feat(m3): add pgvector exemplar retrieval`
- `fix: clamp Critic contrast score below AA`
- `docs: expand token-engine notes`

Reference issues in the body or summary: `feat: SEO agent (closes #14)`.
Commit in small, honest units — a follow-up `fix:` after a `feat:` is normal.

## Issues & milestones

- Track scope as GitHub Issues grouped under a **Milestone** per roadmap stage
  (`M3 — Grounded & Deployable`, `M4 — Product`). See `docs/10-mvp-roadmap.md`.
- `scripts/create-issues.sh` bootstraps the M3/M4 milestones, labels, and issues.

## Versioning & releases

- [Semantic Versioning](https://semver.org): `vMAJOR.MINOR.PATCH`. Each completed
  milestone is a `MINOR` release while pre-1.0 (`v0.1.0` → `v0.2.0` → …).
- Update `CHANGELOG.md` in the same PR that lands a notable change.
- Cut a release per milestone:
  ```bash
  git tag -a v0.3.0 -m "M3 — Grounded & Deployable"
  git push origin v0.3.0
  gh release create v0.3.0 --notes-file docs/releases/v0.3.0.md
  ```

## Local checks before pushing

```bash
npm run lint
npx tsc --noEmit
npm run build      # builds in demo mode; no API key required
```

## Secrets

Never commit `.env.local` (it is gitignored). The app runs without a key in
demo mode (`GENERATION_MODE=mock`); set `ANTHROPIC_API_KEY` for live generation.

# Changelog

All notable changes to AutoFounder are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (M3 — Grounded & Deployable)
- pgvector exemplar retrieval to ground design choices by industry
- Generated hero imagery and richer SVG logo system
- SEO metadata + schema.org JSON-LD
- Real per-site deploy with a public URL

## [0.2.0] — Bespoke

The make-or-break milestone: make generated sites genuinely non-templated.

### Added
- **Token engine** — every run derives a unique design-token set (HSL-generated
  palette, modular type scale, radius, spacing, motion) with a fingerprint hash;
  steers away from generic indigo/blue.
- **UI/UX agent** — produces the design spec/tokens and a seeded SVG logomark.
- **Design Critic** — scores each candidate 0–100 (WCAG contrast, bespokeness,
  hierarchy, AI-tell copy heuristics) with a hard veto on sub-AA contrast.
- **Self-revision loop** — failing candidates are revised up to 2 rounds until
  they clear the gate.
- Token-driven renderer upgrades: corner radius, type scale, hero/feature layout
  variants, and the generated logo now flow from tokens.
- Cockpit surfaces design tokens, fingerprint, and the Critic scorecard.

### Changed
- `BrandKit` palette ownership moved into `DesignTokens`; pipeline grew from 5
  to 7 agents (added UI/UX and Critic); runs now carry a per-run seed.

## [0.1.0] — The Spine

The autonomous pipeline end-to-end.

### Added
- Typed `GenerationContext` blackboard and artifact model.
- Five agents — CEO, Product Manager, Brand, Copywriting, Frontend.
- Tiered Claude LLM layer with a deterministic offline fallback (demo mode).
- Durable, resumable file-backed run store + CEO-routed orchestrator.
- Generation API with SSE progress streaming and a run-fetch route.
- Token-driven site renderer with owned section components.
- Live generation cockpit and full-bleed generated-site preview.

[Unreleased]: https://github.com/your-org/autofounder/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/your-org/autofounder/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/autofounder/releases/tag/v0.1.0

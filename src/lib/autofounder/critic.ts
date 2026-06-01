/**
 * The Design Critic — M2's hard quality gate. Scores a candidate 0-100 across
 * four real, computable dimensions and decides pass/fail (threshold 80, with a
 * hard veto on sub-AA contrast). Sub-scores + notes drive the revision loop and
 * the cockpit UI.
 *
 * In production this is augmented by a vision model scoring a Playwright
 * screenshot; here the rubric is fully programmatic so it runs offline and is
 * deterministic — which is exactly what makes the self-revision loop reliable.
 */
import { contrast, ratio2 } from "./color";
import { GENERIC_HUES, hueOf } from "./tokens";
import type {
  ComponentTree,
  ContentModel,
  CritiqueScore,
  DesignTokens,
} from "./types";

const PASS_THRESHOLD = 80;

/** Generic phrases that scream "AI wrote this". */
const AI_TELL = [
  "revolutionize",
  "unlock the power",
  "in today's fast-paced world",
  "seamless",
  "game-changer",
  "game changer",
  "elevate your",
  "take it to the next level",
  "cutting-edge",
  "cutting edge",
  "harness the power",
  "synergy",
  "best-in-class",
  "world-class solution",
  "one-stop shop",
  "supercharge",
];

function hueGap(hex: string): number {
  const h = hueOf(hex);
  // Minimum angular distance to any generic anchor (0..180).
  return Math.min(
    ...GENERIC_HUES.map((g) => Math.abs(((h - g + 540) % 360) - 180))
  );
}

export function scoreDesign(
  tokens: DesignTokens,
  content: ContentModel,
  tree: ComponentTree,
  round: number
): CritiqueScore {
  const notes: string[] = [];
  const p = tokens.palette;

  /* --- Contrast (0-30) --- */
  const cText = contrast(p.text, p.bg);
  const cPrimary = contrast(p.primaryFg, p.primary);
  const cMuted = contrast(p.muted, p.bg);
  let contrastScore = 0;
  contrastScore += cText >= 7 ? 14 : cText >= 4.5 ? 10 : cText >= 3 ? 4 : 0;
  contrastScore += cPrimary >= 4.5 ? 10 : cPrimary >= 3 ? 5 : 0;
  contrastScore += cMuted >= 4.5 ? 6 : cMuted >= 3 ? 3 : 0;
  const aaFail = cText < 4.5 || cPrimary < 4.5;
  if (cText < 4.5) notes.push(`Body text contrast ${ratio2(p.text, p.bg)}:1 is below WCAG AA (4.5)`);
  if (cPrimary < 4.5) notes.push(`CTA text contrast ${ratio2(p.primaryFg, p.primary)}:1 is below WCAG AA`);
  if (cMuted < 4.5) notes.push(`Muted text contrast ${ratio2(p.muted, p.bg)}:1 is low`);

  /* --- Bespokeness (0-30) --- */
  const gap = hueGap(p.primary); // 0..180
  let bespoke = Math.round((gap / 180) * 18); // up to 18 for hue distinctiveness
  // Reward non-default radius + an off-the-shelf-avoiding scale.
  if (tokens.radius !== 8) bespoke += 4;
  if (tokens.radius >= 16 || tokens.radius === 0) bespoke += 2; // committed choices
  if (Math.abs(tokens.scaleRatio - 1.25) > 0.02) bespoke += 3;
  if (tokens.mode === "dark") bespoke += 3; // dark themes read as more crafted
  bespoke = Math.min(30, bespoke);
  if (gap < 25) notes.push("Primary hue sits close to generic indigo/blue — risks looking templated");

  /* --- Hierarchy (0-25) --- */
  let hierarchy = 0;
  if (tokens.scaleRatio >= 1.18 && tokens.scaleRatio <= 1.4) hierarchy += 12;
  else hierarchy += 5;
  const types = new Set(tree.sections.map((s) => s.type));
  for (const must of ["hero", "pricing", "cta", "footer"] as const) {
    if (types.has(must)) hierarchy += 2;
  }
  if (tree.sections.length >= 7) hierarchy += 5;
  hierarchy = Math.min(25, hierarchy);
  if (!types.has("pricing")) notes.push("No pricing section — weakens conversion hierarchy");

  /* --- AI-tell (0-15) --- */
  const blob = JSON.stringify(content).toLowerCase();
  const hits = AI_TELL.filter((t) => blob.includes(t));
  const aiTell = Math.max(0, 15 - hits.length * 3);
  if (hits.length) notes.push(`Generic phrasing detected: ${hits.slice(0, 3).join(", ")}`);

  const total = contrastScore + bespoke + hierarchy + aiTell;
  const passed = total >= PASS_THRESHOLD && !aaFail;
  if (passed) notes.unshift(`Passed at ${total}/100`);

  return {
    total,
    passed,
    round,
    subscores: {
      contrast: contrastScore,
      bespokeness: bespoke,
      hierarchy,
      aiTell,
    },
    notes,
  };
}

export { PASS_THRESHOLD };

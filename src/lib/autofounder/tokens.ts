/**
 * The token engine — the heart of M2 "bespokeness".
 *
 * Every run gets a unique random seed, so two runs of the SAME idea produce
 * different design tokens (palette + type scale + radius + spacing + motion).
 * Tokens are generated algorithmically in HSL (not picked from a fixed list),
 * so the space of outputs is effectively continuous. A short fingerprint hash
 * lets us prove two runs differ.
 *
 * reviseTokens() is what the Design Critic's revision loop calls to fix a
 * failing candidate deterministically (push contrast up, push palette away
 * from generic "AI default" anchors).
 */
import {
  bwOn,
  clamp,
  contrast,
  hslToHex,
  readableOn,
} from "./color";
import type {
  CritiqueScore,
  DesignTokens,
  FontPairingId,
} from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SCALES = [1.2, 1.25, 1.333];
const RADII = [0, 4, 8, 12, 16, 20];
const FONTS: FontPairingId[] = ["editorial", "grotesk", "humanist", "modern", "classic"];

/** Hues commonly seen in generic AI sites — bespokeness rewards distance. */
export const GENERIC_HUES = [245, 217, 270]; // indigo, blue, violet

function fingerprint(t: Omit<DesignTokens, "fingerprint">): string {
  const s = `${t.mode}|${t.palette.bg}|${t.palette.primary}|${t.palette.accent}|${t.scaleRatio}|${t.radius}|${t.spacing}|${t.baseSize}|${t.motion}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, "0").slice(0, 7);
}

export interface TokenOptions {
  /** Optional hue bias from the Brand agent (0-360). */
  hueHint?: number;
  /** Force light/dark; otherwise chosen by seed. */
  forceMode?: "light" | "dark";
  font?: FontPairingId;
}

export function generateTokens(seed: number, opts: TokenOptions = {}): DesignTokens {
  const rng = mulberry32(seed);
  const mode = opts.forceMode ?? (rng() < 0.5 ? "dark" : "light");

  // Primary hue: use hint if given, else random; jitter so hint runs still vary.
  // Then steer clear of the generic blue→violet band so baseline bespokeness is
  // high (the Critic penalizes hues near indigo/blue/violet).
  const rawHue =
    opts.hueHint != null
      ? (opts.hueHint + (rng() * 50 - 25) + 360) % 360
      : Math.floor(rng() * 360);
  const primaryHue = avoidGenericHue(rawHue);
  const primarySat = 62 + rng() * 26; // 62-88
  const primaryLight = mode === "dark" ? 56 + rng() * 8 : 44 + rng() * 8;
  const primary = hslToHex(primaryHue, primarySat, primaryLight);

  // Accent: analogous or complementary offset.
  const offset = [150, 180, 210, -45, 45][Math.floor(rng() * 5)];
  const accent = hslToHex((primaryHue + offset + 360) % 360, primarySat - 6, primaryLight + 4);

  // Neutrals subtly tinted by the primary hue for cohesion.
  const nHue = primaryHue;
  const nSat = 6 + rng() * 8;
  const palette =
    mode === "dark"
      ? {
          bg: hslToHex(nHue, nSat, 8 + rng() * 3),
          surface: hslToHex(nHue, nSat, 14 + rng() * 3),
          text: hslToHex(nHue, Math.min(nSat, 8), 95),
          muted: hslToHex(nHue, Math.min(nSat, 10), 62 + rng() * 6),
          border: hslToHex(nHue, nSat, 22 + rng() * 4),
          primary,
          primaryFg: bwOn(primary),
          accent,
        }
      : {
          bg: hslToHex(nHue, nSat, 98),
          surface: "#ffffff",
          text: hslToHex(nHue, Math.min(nSat + 6, 18), 12),
          muted: hslToHex(nHue, Math.min(nSat + 4, 16), 40 + rng() * 6),
          border: hslToHex(nHue, nSat, 90 - rng() * 3),
          primary,
          primaryFg: bwOn(primary),
          accent,
        };

  // Guarantee body text clears AAA-ish; keep it in-hue.
  if (contrast(palette.text, palette.bg) < 7) {
    palette.text = readableOn(palette.bg, nHue, mode === "dark" ? 8 : 16, 8);
  }
  if (contrast(palette.muted, palette.bg) < 4) {
    palette.muted = readableOn(palette.bg, nHue, 12, 4.2);
  }

  const base: Omit<DesignTokens, "fingerprint"> = {
    mode,
    palette,
    baseSize: rng() < 0.5 ? 16 : 17,
    scaleRatio: SCALES[Math.floor(rng() * SCALES.length)] + (rng() * 0.03 - 0.015),
    radius: RADII[Math.floor(rng() * RADII.length)],
    spacing: 4 + Math.floor(rng() * 4), // 4-7
    motion: (["calm", "crisp", "lively"] as const)[Math.floor(rng() * 3)],
    font: opts.font ?? FONTS[Math.floor(rng() * FONTS.length)],
  };

  return { ...base, fingerprint: fingerprint(base) };
}

/** Minimum hue distance to any generic anchor (0-180). Higher = more bespoke. */
export function hueDistanceFromGeneric(hex: string, hueOf: (h: string) => number): number {
  const h = hueOf(hex);
  return Math.min(
    ...GENERIC_HUES.map((g) => {
      const d = Math.abs(((h - g + 540) % 360) - 180);
      return 180 - d; // convert so 0 distance => 0 score handled by caller
    })
  );
}

/**
 * Deterministically improve a failing token set based on the critique. Used by
 * the Critic's revision loop. Never throws; always returns a (hopefully) better
 * candidate plus a fresh fingerprint.
 */
export function reviseTokens(
  tokens: DesignTokens,
  critique: CritiqueScore
): { tokens: DesignTokens; changes: string[] } {
  const changes: string[] = [];
  const p = { ...tokens.palette };
  let { scaleRatio, radius } = tokens;

  // 1) Fix contrast failures hard.
  if (critique.subscores.contrast < 24) {
    p.text =
      tokens.mode === "dark"
        ? "#f5f7fb"
        : "#0b0e16";
    p.bg = tokens.mode === "dark" ? darken(p.bg, 4) : "#ffffff";
    p.primaryFg = bwOn(p.primary);
    // If primary/primaryFg still weak, deepen the primary.
    if (contrast(p.primaryFg, p.primary) < 4.5) {
      p.primary = adjustLightnessToContrast(p.primary, p.primaryFg, 4.6);
    }
    changes.push("raised text/CTA contrast to meet WCAG AA");
  }

  // 2) Push palette to a genuinely distinctive hue if bespokeness is weak.
  if (critique.subscores.bespokeness < 22) {
    const targets = [28, 46, 150, 168, 330]; // far from the generic blue/violet band
    const target = targets[(radius + critique.round) % targets.length];
    p.primary = setHueAbs(p.primary, target);
    p.accent = setHueAbs(p.accent, (target + 170) % 360);
    p.primaryFg = bwOn(p.primary);
    radius = radius === 8 ? 14 : radius; // nudge away from the default-ish 8
    changes.push("shifted palette to a distinctive, non-generic hue");
  }

  // 3) Tighten hierarchy if needed.
  if (critique.subscores.hierarchy < 18) {
    scaleRatio = 1.28;
    changes.push("tuned type scale for clearer hierarchy");
  }

  const next: Omit<DesignTokens, "fingerprint"> = {
    ...tokens,
    palette: p,
    scaleRatio,
    radius,
  };
  return { tokens: { ...next, fingerprint: fingerprint(next) }, changes };
}

/* ---- small hex helpers (kept local; color.ts stays pure math) ---- */

import { hexToRgb, rgbToHex } from "./color";

function rgbToHsl(hex: string): [number, number, number] {
  const { r, g, b } = hexToRgb(hex);
  const R = r / 255,
    G = g / 255,
    B = b / 255;
  const max = Math.max(R, G, B),
    min = Math.min(R, G, B);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

export function hueOf(hex: string): number {
  return rgbToHsl(hex)[0];
}

function setHueAbs(hex: string, hue: number): string {
  const [, s, l] = rgbToHsl(hex);
  return hslToHex(((hue % 360) + 360) % 360, s, l);
}

/** Steer a hue out of the generic blue→violet band (~200–288°). */
function avoidGenericHue(h: number): number {
  return h >= 200 && h <= 288 ? (h + 150) % 360 : h;
}

function darken(hex: string, amt: number): string {
  const [h, s, l] = rgbToHsl(hex);
  return hslToHex(h, s, clamp(l - amt, 0, 100));
}

function adjustLightnessToContrast(color: string, against: string, target: number): string {
  const [h, s] = rgbToHsl(color);
  let best = color;
  let bestC = contrast(color, against);
  for (let l = 0; l <= 100; l += 2) {
    const c = hslToHex(h, s, l);
    const ct = contrast(c, against);
    if (ct > bestC) {
      bestC = ct;
      best = c;
    }
    if (ct >= target) return c;
  }
  return best;
}

export { rgbToHex, hexToRgb };

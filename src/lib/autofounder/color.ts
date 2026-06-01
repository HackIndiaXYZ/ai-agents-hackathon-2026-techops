/**
 * Color math for the token engine + Design Critic. HSL generation (for varied,
 * cohesive palettes) plus WCAG contrast so the Critic can score accessibility
 * with real numbers, not vibes.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(hslToRgb(h, s, l));
}

export function hexToRgb(hex: string): Rgb {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** WCAG relative luminance (0..1). */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio (1..21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Round a contrast ratio to 2dp for display. */
export function ratio2(a: string, b: string): number {
  return Math.round(contrast(a, b) * 100) / 100;
}

/**
 * Return a color of the given hue/sat whose lightness meets `target` contrast
 * against `bg`. Searches lightness toward whichever pole (dark/light) the bg
 * is farthest from, so text stays in-palette but readable.
 */
export function readableOn(
  bg: string,
  hue: number,
  sat: number,
  target = 4.5
): string {
  const bgLum = luminance(bg);
  const goDark = bgLum > 0.4; // light bg → dark text
  const range = goDark
    ? [...Array(46)].map((_, i) => 18 - i * 0.4) // 18 → 0
    : [...Array(46)].map((_, i) => 82 + i * 0.4); // 82 → 100
  let best = goDark ? "#000000" : "#ffffff";
  let bestC = 0;
  for (const l of range) {
    const c = hslToHex(hue, sat, clamp(l, 0, 100));
    const ct = contrast(c, bg);
    if (ct > bestC) {
      bestC = ct;
      best = c;
    }
    if (ct >= target) return c;
  }
  return best; // best effort if target unreachable
}

/** Pick black or white (whichever is more readable) for text on `bg`. */
export function bwOn(bg: string): string {
  return contrast("#ffffff", bg) >= contrast("#0a0a0a", bg) ? "#ffffff" : "#0a0a0a";
}

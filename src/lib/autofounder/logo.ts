/**
 * Seeded geometric logomark, emitted as a self-contained SVG string. Crisp at
 * any size (vector, not raster) per the brief. The mark shape is chosen by seed
 * and colored from the run's palette, so it feels bespoke to the brand.
 *
 * M2 ships this as a "thin" logo (◐): a strong abstract monogram/mark, not a
 * full wordmark system.
 */

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

type MarkKind = "orbit" | "stack" | "bolt" | "aperture" | "grid" | "monogram";
const MARKS: MarkKind[] = ["orbit", "stack", "bolt", "aperture", "grid", "monogram"];

export function generateLogoSvg(
  seed: number,
  name: string,
  primary: string,
  accent: string
): string {
  const rng = mulberry32(seed ^ 0x5bd1e995);
  const kind = MARKS[Math.floor(rng() * MARKS.length)];
  const letter = (name.trim()[0] ?? "A").toUpperCase();
  const s = 48;
  const r = 11; // container radius

  const container = `<rect x="0" y="0" width="${s}" height="${s}" rx="${r}" fill="${primary}"/>`;
  const fg = "#ffffff";
  let inner = "";

  switch (kind) {
    case "orbit":
      inner = `<circle cx="24" cy="24" r="11" fill="none" stroke="${fg}" stroke-width="3"/><circle cx="35" cy="16" r="4" fill="${accent}"/>`;
      break;
    case "stack":
      inner = `<g fill="${fg}"><rect x="13" y="14" width="22" height="5" rx="2.5"/><rect x="13" y="22" width="22" height="5" rx="2.5" opacity="0.75"/><rect x="13" y="30" width="14" height="5" rx="2.5" opacity="0.5"/></g>`;
      break;
    case "bolt":
      inner = `<path d="M27 11 L15 26 h8 l-2 11 12-15 h-8 z" fill="${fg}"/>`;
      break;
    case "aperture":
      inner = `<g stroke="${fg}" stroke-width="3" fill="none"><circle cx="24" cy="24" r="10"/></g><path d="M24 14 v6 M24 28 v6 M14 24 h6 M28 24 h6" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`;
      break;
    case "grid":
      inner = `<g fill="${fg}"><circle cx="18" cy="18" r="3.2"/><circle cx="30" cy="18" r="3.2"/><circle cx="18" cy="30" r="3.2"/><circle cx="30" cy="30" r="3.2" fill="${accent}"/></g>`;
      break;
    case "monogram":
    default:
      inner = `<text x="24" y="33" font-family="Georgia, serif" font-size="26" font-weight="700" text-anchor="middle" fill="${fg}">${letter}</text>`;
      break;
  }

  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name} logo">${container}${inner}</svg>`;
}

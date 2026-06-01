import type { FontPairingId } from "@/lib/autofounder/types";

export interface FontPairing {
  display: string;
  body: string;
  /** Google Fonts CSS @import URL covering both families. */
  importUrl: string;
}

const g = (families: string[]) =>
  `https://fonts.googleapis.com/css2?${families
    .map((f) => `family=${f}`)
    .join("&")}&display=swap`;

export const FONT_PAIRINGS: Record<FontPairingId, FontPairing> = {
  editorial: {
    display: "'Instrument Serif', Georgia, serif",
    body: "'Figtree', system-ui, sans-serif",
    importUrl: g(["Instrument+Serif:ital@0;1", "Figtree:wght@400;500;600;700"]),
  },
  grotesk: {
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    importUrl: g(["Space+Grotesk:wght@500;600;700", "Inter:wght@400;500;600"]),
  },
  humanist: {
    display: "'Sora', system-ui, sans-serif",
    body: "'IBM Plex Sans', system-ui, sans-serif",
    importUrl: g(["Sora:wght@600;700;800", "IBM+Plex+Sans:wght@400;500;600"]),
  },
  modern: {
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    body: "'Figtree', system-ui, sans-serif",
    importUrl: g([
      "Bricolage+Grotesque:wght@600;700;800",
      "Figtree:wght@400;500;600",
    ]),
  },
  classic: {
    display: "'Fraunces', Georgia, serif",
    body: "'Mulish', system-ui, sans-serif",
    importUrl: g(["Fraunces:ital,wght@0,500;0,600;1,500", "Mulish:wght@400;500;700"]),
  },
};

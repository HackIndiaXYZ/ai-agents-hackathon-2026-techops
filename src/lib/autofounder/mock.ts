/**
 * Deterministic, offline generators — one per artifact. Seeded by the idea so
 * output is stable per idea but varied across ideas. Used when no API key /
 * credit is available, and as the resilient fallback if a live call fails.
 *
 * These intentionally produce genuinely presentable output so the product can
 * be demoed end-to-end without the Anthropic API.
 */
import type {
  BrandKit,
  ComponentTree,
  ContentModel,
  FontPairingId,
  ProductSpec,
  RenderSection,
  StrategyBrief,
} from "./types";

/* ---------------- seeded randomness ---------------- */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(idea: string) {
  const rand = mulberry32(hash(idea.toLowerCase().trim()));
  return {
    rand,
    pick: <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)],
    int: (min: number, max: number) => min + Math.floor(rand() * (max - min + 1)),
  };
}

const STOP = new Set([
  "i", "want", "to", "a", "an", "the", "for", "of", "and", "that", "helps",
  "help", "build", "building", "create", "creating", "make", "making", "app",
  "platform", "saas", "tool", "service", "with", "my", "our", "is", "it",
  "this", "their", "them", "uber", "airbnb",
]);

function keywords(idea: string): string[] {
  return idea
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------------- fonts ---------------- */

const FONTS: FontPairingId[] = ["editorial", "grotesk", "humanist", "modern", "classic"];

const NAME_SUFFIX = ["flow", "base", "grid", "labs", "hq", "ly", "wise", "loop", "stack", "kit", "deck", "core"];
const NAME_PREFIX = ["get", "use", "go", "with"];

/* ---------------- artifact builders ---------------- */

export function mockBrief(idea: string): StrategyBrief {
  const { pick } = makeRng(idea);
  const kw = keywords(idea);
  const subject = kw[0] ?? "business"; // single clean noun, e.g. "gym"
  const industry = `${titleCase(subject)} software`;

  const audiences = [
    `${titleCase(subject)} businesses that currently rely on spreadsheets and manual workflows`,
    `${titleCase(subject)} operators who need to move faster without adding headcount`,
    `Growing ${subject} teams underserved by clunky legacy tools`,
  ];
  return {
    industry,
    audience: pick(audiences),
    positioning: `The fastest way to run your ${subject} business — without the busywork.`,
    valueProps: [
      `Set up in minutes, not weeks — no migration headaches`,
      `Everything in one place, so nothing slips through the cracks`,
      `Built for ${subject} businesses, not retrofitted from a generic tool`,
    ],
    siteGoals: [
      "Convert first-time visitors into trial signups",
      "Communicate a premium, trustworthy brand",
      "Make the core value obvious within 5 seconds",
    ],
  };
}

export function mockProduct(_brief: StrategyBrief): ProductSpec {
  return {
    pages: [
      {
        slug: "/",
        kind: "landing",
        sections: [
          "hero",
          "trustbar",
          "features",
          "howItWorks",
          "metrics",
          "testimonial",
          "pricing",
          "faq",
          "cta",
          "footer",
        ],
      },
    ],
    primaryCta: "Start free",
    secondaryCta: "Book a demo",
  };
}

export function mockBrand(idea: string, brief: StrategyBrief): BrandKit {
  const { pick, rand } = makeRng(idea + "::brand");
  const kw = keywords(idea);
  const root = (kw[0] ?? "north").replace(/s$/, "");
  const style = rand();
  let name: string;
  if (style < 0.4) name = titleCase(root) + pick(NAME_SUFFIX);
  else if (style < 0.7) name = titleCase(root.slice(0, Math.max(3, root.length - 1)) + pick(NAME_SUFFIX));
  else name = titleCase(pick(NAME_PREFIX)) + titleCase(root);

  const voices = [
    "confident, precise, quietly premium",
    "warm, direct, human",
    "bold, energetic, modern",
    "calm, trustworthy, expert",
  ];

  return {
    name,
    tagline: brief.positioning,
    voice: pick(voices),
    font: pick(FONTS),
    hue: Math.floor(rand() * 360), // brand-preferred hue; token engine varies per run
  };
}

export function mockContent(
  idea: string,
  brief: StrategyBrief,
  _product: ProductSpec,
  brand: BrandKit
): ContentModel {
  const { pick, int } = makeRng(idea + "::content");
  const kw = keywords(idea);
  const subject = kw[0] ?? "business"; // e.g. "gym"
  const domain = `${subject} business`;
  const noun = titleCase(subject);

  const featureIcons = ["bolt", "shield", "spark", "chart", "layers", "clock"];
  const features = [
    { title: `One home for your whole ${domain}`, body: `Stop juggling tabs and spreadsheets. ${brand.name} keeps your ${domain} running in a single, fast workspace.` },
    { title: "Automations that do the busywork", body: "Reminders, follow-ups, and reports run themselves — so your team focuses on the work that matters." },
    { title: "Insights you can actually act on", body: "Clear dashboards turn your day-to-day into decisions, no analyst required." },
    { title: "Set up in minutes", body: "Guided onboarding and sensible defaults mean you're live the same afternoon." },
    { title: "Secure by default", body: "Role-based access, audit logs, and encryption keep your data exactly where it belongs." },
    { title: "Scales with you", body: `From your first ${kw[1] ?? "customer"} to your thousandth, ${brand.name} keeps up.` },
  ];

  return {
    seo: {
      title: `${brand.name} — ${brief.positioning}`,
      description: `${brand.name} helps ${brief.audience}. ${brief.valueProps[0]}.`,
    },
    sections: {
      hero: {
        eyebrow: titleCase(domain),
        headline: `${noun}, finally handled.`,
        subhead: brief.positioning,
        primaryCta: "Start free",
        secondaryCta: "Book a demo",
        note: "No credit card required · 14-day trial",
      },
      trustbar: {
        label: `Trusted by fast-growing ${domain} teams`,
        logos: ["Northwind", "Lumen", "Vela", "Brightside", "Cobalt"],
      },
      features: {
        title: `Everything you need to run your ${domain}`,
        subtitle: brief.valueProps[1],
        items: features.slice(0, 6).map((f, i) => ({ ...f, icon: featureIcons[i % featureIcons.length] })),
      },
      howItWorks: {
        title: "Up and running in three steps",
        steps: [
          { title: "Tell us about your business", body: `Answer a few questions and ${brand.name} tailors itself to your ${domain} workflow.` },
          { title: "Bring your data in", body: "Import from spreadsheets or your current tool in one click — we map everything for you." },
          { title: "Go live", body: "Invite your team and start working the same day. No consultants, no setup fees." },
        ],
      },
      metrics: {
        items: [
          { value: `${int(2, 9)}×`, label: "faster than spreadsheets" },
          { value: `${int(6, 14)} hrs`, label: "saved per week" },
          { value: `${int(92, 99)}%`, label: "customer retention" },
          { value: `${int(4, 30)}k+`, label: `${subject} pros onboard` },
        ],
      },
      testimonial: {
        quote: `We replaced three tools and a mountain of spreadsheets with ${brand.name}. Our team got hours back every week — it paid for itself in the first month.`,
        author: pick(["Maya Chen", "Daniel Ortiz", "Priya Nair", "Sam Whitfield"]),
        role: `Founder, ${pick(["Brightside", "Vela", "Lumen", "Cobalt"])}`,
      },
      pricing: {
        title: "Simple, honest pricing",
        subtitle: "Start free. Upgrade when you're ready. Cancel anytime.",
        tiers: [
          { name: "Starter", price: "$0", period: "/mo", features: ["1 workspace", "Up to 3 seats", "Core features", "Community support"], cta: "Start free", highlighted: false },
          { name: "Pro", price: `$${pick([29, 39, 49])}`, period: "/mo", features: ["Unlimited workspaces", "Automations", "Advanced insights", "Priority support"], cta: "Start free trial", highlighted: true },
          { name: "Business", price: `$${pick([99, 129, 149])}`, period: "/mo", features: ["SSO & audit logs", "Custom roles", "Onboarding help", "SLA"], cta: "Contact sales", highlighted: false },
        ],
      },
      faq: {
        title: "Questions, answered",
        items: [
          { q: `Do I need technical skills to use ${brand.name}?`, a: "Not at all. If you can use a spreadsheet, you can use it — most teams are live the same day." },
          { q: "Can I import my existing data?", a: "Yes. Import from spreadsheets or your current tool in one click; we handle the mapping." },
          { q: "Is there a free plan?", a: "Yes — Starter is free forever for small teams, with no credit card required." },
          { q: "How secure is my data?", a: "We use encryption in transit and at rest, role-based access, and audit logs on every plan." },
        ],
      },
      cta: {
        headline: `Ready to put your ${domain} on autopilot?`,
        subhead: `Join the ${subject} teams running on ${brand.name}.`,
        cta: "Start free",
      },
      footer: {
        tagline: brand.tagline,
        columns: [
          { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
          { title: "Company", links: ["About", "Careers", "Blog", "Contact"] },
          { title: "Resources", links: ["Docs", "Help center", "Community", "Status"] },
          { title: "Legal", links: ["Privacy", "Terms", "Security"] },
        ],
        copyright: `© ${brand.name}. All rights reserved.`,
      },
    },
  };
}

export function mockTree(product: ProductSpec, content: ContentModel): ComponentTree {
  const page = product.pages[0];
  const sections: RenderSection[] = page.sections.map((type) => ({
    id: type,
    type,
    content: content.sections[type] ?? {},
  }));
  return { sections };
}

// One-off: parse the AutoFounder blueprint workflow output and emit docs/ files.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = process.argv[2];
const DOCS = process.argv[3];

const raw = JSON.parse(readFileSync(SRC, "utf8"));
const result = raw.result ?? raw;
const { productBrief, execSummary, sections } = result;

mkdirSync(DOCS, { join: true, recursive: true });

const write = (name, content) => {
  writeFileSync(join(DOCS, name), content.trimStart() + "\n", "utf8");
  console.log("wrote", name);
};

// Canonical decision brief
write(
  "00-canonical-brief.md",
  `# AutoFounder AI — Canonical Decision Brief\n\n> Source of truth. Every other document conforms to this.\n\n${productBrief}`
);

// Executive summary
write("01-executive-summary.md", `# AutoFounder AI — Blueprint\n\n${execSummary}`);

// Each deliverable (offset numbering by 2: brief=00, exec=01)
const ordered = [...sections].sort((a, b) => a.key.localeCompare(b.key));
const tocLines = [
  "- [Executive Summary](01-executive-summary.md)",
  "- [Canonical Decision Brief](00-canonical-brief.md)",
];
// Strip a leading duplicate "## Title" heading the agent may have emitted.
const dedupeHeading = (md, title) => {
  const re = new RegExp(`^\\s*##\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`, "i");
  return md.replace(re, "");
};

ordered.forEach((s, i) => {
  const n = String(i + 2).padStart(2, "0");
  const slug = s.key.replace(/^\d+-/, "");
  const fname = `${n}-${slug}.md`;
  write(fname, `# ${s.title}\n\n${dedupeHeading(s.markdown, s.title)}`);
  tocLines.push(`- [${s.title}](${fname})`);
});

// Combined single-file blueprint
const combined = [
  "# AutoFounder AI — Complete Architecture Blueprint",
  "",
  "_Autonomous startup website builder: a startup idea in plain English becomes a complete, production-ready, custom-designed website._",
  "",
  "---",
  "",
  execSummary,
  "",
  "---",
  "",
  productBrief,
  "",
  ...ordered.flatMap((s) => ["---", "", s.markdown, ""]),
].join("\n");
write("AUTOFOUNDER_BLUEPRINT.md", combined);

// Index
write(
  "README.md",
  `# AutoFounder AI — Architecture Docs\n\nThe full vision and design for **AutoFounder AI**, an autonomous startup website builder.\n\nStart here: **[Executive Summary](01-executive-summary.md)** · single-file version: **[AUTOFOUNDER_BLUEPRINT.md](AUTOFOUNDER_BLUEPRINT.md)**\n\n## Contents\n\n${tocLines.join("\n")}\n`
);

console.log(`\nDone. ${ordered.length} sections + brief + exec summary.`);

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { buildVault } from "../src/lib/vault";

const root = process.argv[2];
const APPLY = process.argv.includes("--apply");
const walk = (d: string, o: string[] = []): string[] => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = join(d, e.name);
    e.isDirectory() ? walk(p, o) : o.push(p);
  }
  return o;
};
const wikiFiles = walk(join(root, "wiki"));
const rawRels = walk(join(root, "raw")).map((f) => relative(root, f)).filter((r) => r.endsWith(".md"));
const v = buildVault({
  root,
  pages: wikiFiles.filter((f) => f.endsWith(".md") && relative(root, f) !== "wiki/log.md")
    .map((f) => ({ rel: relative(root, f), content: readFileSync(f, "utf8"), mtime: 0 })),
  raw: [], log: "", claude_md: "",
});

const cited = new Set<string>();
for (const p of v.pages) for (const s of p.sources) if (s.startsWith("raw/")) cited.add(s.toLowerCase().normalize("NFC"));

const norm = (s: string) =>
  s.toLowerCase().normalize("NFC")
    .replace(/\.transcript$/, "")
    .replace(/\s*\[[A-Za-z0-9_-]{6,}\]\s*$/, "")   // youtube id
    .replace(/[#:—–\-—,'"«»!?.]/g, " ")
    .replace(/\s+/g, " ").trim();

const tokens = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 2));
const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

const candidates = v.pages.filter((p) => p.zone === "resource").map((p) => ({ p, tok: tokens(p.title), file: tokens(p.file) }));

type Match = { raw: string; page: string; score: number };
const matches: Match[] = [];
for (const r of rawRels) {
  if (cited.has(r.toLowerCase().normalize("NFC"))) continue;
  const base = r.split("/").pop()!.replace(/\.md$/, "");
  if (base.startsWith("_")) continue;           // _report / _paywalled — это отчёты, не источники
  const t = tokens(base);
  let best: Match | null = null;
  for (const c of candidates) {
    const s = Math.max(jaccard(t, c.tok), jaccard(t, c.file));
    if (!best || s > best.score) best = { raw: r, page: c.p.rel, score: s };
  }
  if (best && best.score >= 0.62) matches.push(best);
}

console.log(`кандидатов на связывание: ${matches.length}\n`);
let applied = 0;
for (const m of matches.sort((a, b) => b.score - a.score)) {
  const label = `${(m.score * 100).toFixed(0)}%`;
  console.log(`${label.padStart(4)}  ${m.page.split("/").pop()}\n        ← ${m.raw.split("/").pop()}`);
  if (!APPLY) continue;
  const full = join(root, m.page);
  let s = readFileSync(full, "utf8");
  const fmEnd = s.indexOf("\n---", 4);
  if (!s.startsWith("---") || fmEnd < 0) continue;
  const fm = s.slice(0, fmEnd);
  const rest = s.slice(fmEnd);
  const entry = `"${m.raw}"`;
  if (fm.includes(m.raw)) continue;
  let newFm: string;
  if (/^sources:\s*\[/m.test(fm)) {
    newFm = fm.replace(/^sources:\s*\[(.*)\]\s*$/m, (_x, inner) =>
      inner.trim().length ? `sources: [${inner.trim()}, ${entry}]` : `sources: [${entry}]`);
  } else {
    newFm = fm.replace(/^(updated:.*)$/m, `$1\nsources: [${entry}]`);
    if (newFm === fm) newFm = fm + `\nsources: [${entry}]`;
  }
  writeFileSync(full, newFm + rest);
  applied++;
}
console.log(APPLY ? `\nприменено: ${applied}` : `\n(пробный прогон — добавьте --apply)`);

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { buildVault } from "../src/lib/vault";
import { THEMES } from "../src/lib/themes";

const root = process.argv[2];
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const files = walk(join(root, "wiki"));
const pages = files
  .filter((f) => f.endsWith(".md") && relative(root, f) !== "wiki/log.md")
  .map((f) => ({ rel: relative(root, f), content: readFileSync(f, "utf8"), mtime: Math.floor(statSync(f).mtimeMs / 1000) }));
const rawFiles = existsSync(join(root, "raw")) ? walk(join(root, "raw")) : [];
const v = buildVault({
  root,
  pages,
  raw: rawFiles.map((f) => ({ rel: relative(root, f), size: statSync(f).size, mtime: Math.floor(statSync(f).mtimeMs / 1000) })),
  log: readFileSync(join(root, "wiki/log.md"), "utf8"),
  claude_md: "",
});

const H = (s: string) => console.log(`\n${"=".repeat(4)} ${s} ${"=".repeat(Math.max(0, 60 - s.length))}`);
const themeNames = new Set(THEMES.map((t) => t.name));

H("SIZE");
console.log(`pages ${v.pages.length} · raw ${v.raw.length} · log ${v.log.length}`);
const perTheme = THEMES.map((t) => {
  const ps = v.pages.filter((p) => p.theme === t.name);
  return {
    theme: t.name,
    total: ps.length,
    resource: ps.filter((p) => p.zone === "resource").length,
    wiki: ps.filter((p) => p.zone === "wiki").length,
    person: ps.filter((p) => p.zone === "person").length,
    other: ps.filter((p) => !["resource", "wiki", "person"].includes(p.zone)).length,
  };
}).sort((a, b) => b.total - a.total);
console.table(perTheme);

H("FOLDER VIOLATIONS");
const dirs = new Set(files.map((f) => dirname(relative(root, f))));
const lowerWiki = [...dirs].filter((d) => /\/wiki$/.test(d));
const pluralRes = [...dirs].filter((d) => /\/Resources$/.test(d));
console.log("lowercase wiki/ :", lowerWiki.length ? lowerWiki : "none");
console.log("Resources/ plural:", pluralRes.length ? pluralRes : "none");
const noOverview = [...dirs].filter((d) => {
  if (d === "wiki" || d.includes("Reverend Insanity")) return false;
  const has = files.some((f) => relative(root, f) === `${d}/_Overview.md`);
  const mdCount = files.filter((f) => dirname(relative(root, f)) === d && f.endsWith(".md")).length;
  return mdCount > 0 && !has;
});
console.log(`folders with pages but no _Overview (${noOverview.length}):`);
noOverview.forEach((d) => console.log("  ", d, files.filter((f) => dirname(relative(root, f)) === d).length));

H("FRONTMATTER");
console.log("no theme:", v.pages.filter((p) => !p.theme).map((p) => p.rel));
console.log("bad theme value:", v.pages.filter((p) => p.theme && !themeNames.has(p.theme)).map((p) => `${p.rel} → ${p.theme}`));
console.log("no updated:", v.pages.filter((p) => !p.updated).length);
console.log("no created:", v.pages.filter((p) => !p.created).length);
const resNoSource = v.pages.filter((p) => p.zone === "resource" && !p.sourceUrl && !p.sources.length);
console.log(`resource pages with NO source_url and NO sources (${resNoSource.length})`);
const perThemeNoSrc: Record<string, number> = {};
resNoSource.forEach((p) => (perThemeNoSrc[p.theme ?? "∅"] = (perThemeNoSrc[p.theme ?? "∅"] ?? 0) + 1));
console.log("  by theme:", perThemeNoSrc);

H("DUPLICATES (same title, different file)");
const byTitle = new Map<string, typeof v.pages>();
for (const p of v.pages) {
  const k = p.title.toLowerCase().trim();
  byTitle.set(k, [...(byTitle.get(k) ?? []), p]);
}
const dupTitles = [...byTitle.entries()].filter(([, ps]) => ps.length > 1 && ps[0].file !== "_Overview");
console.log(`${dupTitles.length} duplicate titles`);
dupTitles.slice(0, 30).forEach(([t, ps]) => console.log(`  "${t}"\n${ps.map((p) => "     " + p.rel).join("\n")}`));

H("PEOPLE vs legacy personal folders");
const personPages = v.pages.filter((p) => p.zone === "person");
const legacy = v.pages.filter((p) => ["Friends", "Family", "Relationship"].some((x) => p.segments.includes(x)));
console.log(`person pages: ${personPages.length}, legacy Friends/Family/Relationship pages: ${legacy.length}`);
legacy.forEach((p) => {
  const match = personPages.find(
    (pp) => pp.title.toLowerCase() === p.title.toLowerCase() || pp.file.toLowerCase() === p.file.toLowerCase(),
  );
  console.log(`  ${p.rel}  ${match ? "→ DUP of " + match.rel : "(no People/ counterpart)"}`);
});

H("LINKS");
let total = 0;
for (const p of v.pages) total += p.links.length;
console.log(`links ${total} · dead ${v.deadLinks.length} (${((100 * v.deadLinks.length) / total).toFixed(1)}%)`);
const deadCount = new Map<string, number>();
for (const d of v.deadLinks) deadCount.set(d.target, (deadCount.get(d.target) ?? 0) + 1);
console.log("top dead targets:");
[...deadCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([t, n]) => console.log(`  ${n}  ${t}`));

H("ORPHANS");
const orphans = v.pages.filter((p) => p.zone === "wiki" && !(v.backlinks.get(p.rel)?.length));
console.log(`orphan wiki pages: ${orphans.length}`);
const orphanByTheme: Record<string, number> = {};
orphans.forEach((p) => (orphanByTheme[p.theme ?? "∅"] = (orphanByTheme[p.theme ?? "∅"] ?? 0) + 1));
console.log("  by theme:", orphanByTheme);

H("STALENESS (overviews)");
v.pages
  .filter((p) => p.file === "_Overview")
  .sort((a, b) => (a.updated ?? "").localeCompare(b.updated ?? ""))
  .slice(0, 15)
  .forEach((p) => console.log(`  ${p.updated ?? "—"}  ${p.rel}`));

H("RAW → INGEST COVERAGE");
const citedRaw = new Set<string>();
for (const p of v.pages) {
  for (const s of p.sources) if (s.startsWith("raw/")) citedRaw.add(s.toLowerCase());
  if (typeof p.fm.raw === "string") citedRaw.add((p.fm.raw as string).replace(/^\[\[|\]\]$/g, "").toLowerCase());
}
const rawMd = v.raw.filter((r) => r.rel.endsWith(".md"));
const uncited = rawMd.filter((r) => !citedRaw.has(r.rel.toLowerCase()));
console.log(`raw .md files: ${rawMd.length}, not cited by any page: ${uncited.length}`);
const byFolder: Record<string, number> = {};
uncited.forEach((r) => {
  const f = r.rel.split("/").slice(0, 2).join("/");
  byFolder[f] = (byFolder[f] ?? 0) + 1;
});
console.log("  uncited by folder:", byFolder);

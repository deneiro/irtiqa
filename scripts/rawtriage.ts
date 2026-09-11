import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { buildVault } from "../src/lib/vault";

const root = process.argv[2];
const walk = (d: string, o: string[] = []): string[] => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = join(d, e.name);
    e.isDirectory() ? walk(p, o) : o.push(p);
  }
  return o;
};
const wikiFiles = walk(join(root, "wiki"));
const rawFiles = walk(join(root, "raw"));
const v = buildVault({
  root,
  pages: wikiFiles.filter((f) => f.endsWith(".md") && relative(root, f) !== "wiki/log.md")
    .map((f) => ({ rel: relative(root, f), content: readFileSync(f, "utf8"), mtime: 0 })),
  raw: [], log: "", claude_md: "",
});

const cited = new Set<string>();
for (const p of v.pages) {
  for (const s of p.sources) if (s.startsWith("raw/")) cited.add(s.toLowerCase().normalize("NFC"));
  if (typeof p.fm.raw === "string") cited.add((p.fm.raw as string).replace(/^\[\[|\]\]$/g, "").toLowerCase().normalize("NFC"));
}

// stopword-light keyword extraction from a title
const STOP = new Set("the a an of to in on for and or with how why what is are you your i my me we it that this at from as by about vs".split(" "));
const keys = (s: string) => s.toLowerCase().replace(/\[[^\]]*\]/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ")
  .split(" ").filter((w) => w.length > 3 && !STOP.has(w));

const pageTitles = v.pages.map((p) => ({ t: p.title.toLowerCase(), theme: p.theme, k: new Set(keys(p.title)) }));

const uncited = rawFiles
  .map((f) => relative(root, f))
  .filter((r) => r.endsWith(".md"))
  .filter((r) => !cited.has(r.toLowerCase().normalize("NFC")))
  .map((r) => {
    const full = join(root, r);
    const size = statSync(full).size;
    const name = r.split("/").pop()!.replace(/\.md$/, "").replace(/\s*\[[A-Za-z0-9_-]{6,}\]\s*$/, "");
    const k = new Set(keys(name));
    let best = { title: "", score: 0, theme: undefined as string | undefined };
    for (const p of pageTitles) {
      let hit = 0;
      for (const w of k) if (p.k.has(w)) hit++;
      const score = k.size ? hit / k.size : 0;
      if (score > best.score) best = { title: p.t, score, theme: p.theme };
    }
    return { rel: r, folder: r.split("/").slice(0, 2).join("/"), name, size, best };
  })
  .sort((a, b) => b.best.score - a.best.score);

console.log(`необработанных .md в raw/: ${uncited.length}\n`);
console.log("### ВЕРОЯТНЫЕ ДУБЛИ (уже есть похожая страница в vault) ###");
uncited.filter((u) => u.best.score >= 0.5).forEach((u) =>
  console.log(`  ${(u.best.score * 100).toFixed(0)}%  ${u.name.slice(0, 70)}\n        ≈ ${u.best.title.slice(0, 70)}  [${u.best.theme ?? "—"}]`));
console.log("\n### ОЧЕНЬ МАЛЕНЬКИЕ (<3 KB — возможно, обрывки) ###");
uncited.filter((u) => u.size < 3000).forEach((u) => console.log(`  ${(u.size / 1024).toFixed(1)} KB  ${u.name.slice(0, 78)}`));
console.log("\n### ОСТАЛЬНЫЕ, ПО ПАПКАМ ###");
const byFolder = new Map<string, typeof uncited>();
uncited.filter((u) => u.best.score < 0.5 && u.size >= 3000).forEach((u) =>
  byFolder.set(u.folder, [...(byFolder.get(u.folder) ?? []), u]));
for (const [f, list] of [...byFolder.entries()].sort()) {
  console.log(`\n-- ${f} (${list.length}) --`);
  list.sort((a, b) => b.size - a.size).forEach((u) => console.log(`  ${(u.size / 1024).toFixed(0).padStart(4)} KB  ${u.name.slice(0, 76)}`));
}

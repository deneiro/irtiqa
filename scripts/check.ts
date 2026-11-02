import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { buildVault } from "../src/lib/vault";
import { opFamily } from "../src/lib/log";

const root = process.argv[2];
function walk(dir: string, out: string[]) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
}
const files: string[] = [];
walk(join(root, "wiki"), files);
const pages = files
  .filter((f) => f.endsWith(".md") && relative(root, f) !== "wiki/log.md")
  .map((f) => ({ rel: relative(root, f), content: readFileSync(f, "utf8"), mtime: Math.floor(statSync(f).mtimeMs / 1000) }));
const rawFiles: string[] = [];
walk(join(root, "raw"), rawFiles);
const t0 = Date.now();
const v = buildVault({
  root,
  pages,
  raw: rawFiles.map((f) => ({ rel: relative(root, f), size: statSync(f).size, mtime: 0 })),
  log: readFileSync(join(root, "wiki/log.md"), "utf8"),
  claude_md: "",
});
console.log("build ms", Date.now() - t0);
console.log("pages", v.pages.length);
const count = (arr: (string | undefined)[]) => Object.entries(arr.reduce<Record<string, number>>((a, k) => ((a[k ?? "∅"] = (a[k ?? "∅"] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
console.log("zones", count(v.pages.map((p) => p.zone)));
console.log("themes", count(v.pages.map((p) => p.theme)));
console.log("no theme:", v.pages.filter((p) => !p.theme).map((p) => p.rel));
let total = 0; for (const p of v.pages) total += p.links.length;
console.log("links total", total, "dead", v.deadLinks.length, "resolved%", (100 * (1 - v.deadLinks.length / total)).toFixed(1));
console.log("dead sample", count(v.deadLinks.map((d) => d.target)).slice(0, 15));
console.log("log entries", v.log.length, "families", count(v.log.map((e) => opFamily(e.op))));
console.log("log w/o subject", v.log.filter((e) => !e.subject).length, "first", v.log[0]?.date, "last", v.log.at(-1)?.date);
console.log("profile", v.pages.find((p) => p.type === "profile")?.rel);
console.log("overviews", v.pages.filter((p) => p.zone === "overview" && p.segments.length === 1).map((p) => p.segments[0]));
console.log("pages w/o updated", v.pages.filter((p) => !p.updated).length, "bad dates", v.pages.filter((p) => p.updated && !/^\d{4}-\d{2}-\d{2}$/.test(p.updated)).map((p) => p.updated).slice(0, 5));
console.log("fm parse fallback (empty fm):", v.pages.filter((p) => Object.keys(p.fm).length === 0).map((p) => p.rel));

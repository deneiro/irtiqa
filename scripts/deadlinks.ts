import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
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
const files = walk(join(root, "wiki"));
const v = buildVault({
  root,
  pages: files.filter((f) => f.endsWith(".md") && relative(root, f) !== "wiki/log.md")
    .map((f) => ({ rel: relative(root, f), content: readFileSync(f, "utf8"), mtime: 0 })),
  raw: [], log: "", claude_md: "",
});
const byTarget = new Map<string, string[]>();
for (const d of v.deadLinks) byTarget.set(d.target, [...(byTarget.get(d.target) ?? []), d.from.rel]);
const sorted = [...byTarget.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`dead targets: ${sorted.length}, dead link instances: ${v.deadLinks.length}\n`);
for (const [t, froms] of sorted) {
  console.log(`${String(froms.length).padStart(2)}  ${t}`);
  [...new Set(froms)].slice(0, 3).forEach((f) => console.log(`      ← ${f}`));
}

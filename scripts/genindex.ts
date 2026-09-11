/**
 * Regenerate wiki/index.md from the vault tree.
 * Usage: npx tsx scripts/genindex.ts "<vault path>" [--write]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { buildVault } from "../src/lib/vault";
import { THEMES } from "../src/lib/themes";
import type { Page } from "../src/lib/types";

const root = process.argv[2];
const WRITE = process.argv.includes("--write");
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

const today = new Date().toISOString().slice(0, 10);
const link = (p: Page) => {
  const path = p.rel.replace(/^wiki\//, "").replace(/\.md$/, "");
  return p.title === p.file ? `[[${path}]]` : `[[${path}|${p.title}]]`;
};
const out: string[] = [
  "---", "title: Index", "type: index", `updated: ${today}`, "---", "",
  "# Wiki Index", "",
  `**Сгенерированный файл — не править руками.** Перегенерация: \`npx tsx scripts/genindex.ts "<путь к vault>" --write\` из репозитория IrtiQa-Tauri.`,
  "", `Сгенерирован ${today}. Страниц: **${v.pages.length}**.`, "",
];

const section = (title: string, pages: Page[], depth = "###") => {
  if (!pages.length) return;
  out.push(`${depth} ${title} (${pages.length})`, "");
  for (const p of [...pages].sort((a, b) => a.title.localeCompare(b.title, "ru"))) out.push(`- ${link(p)}`);
  out.push("");
};

for (const t of THEMES) {
  const all = v.pages.filter((p) => p.theme === t.name);
  if (!all.length) continue;
  const ov = all.find((p) => p.file === "_Overview" && p.segments.length === 1);
  out.push("---", "", `## ${t.name}`, "");
  if (ov) out.push(`→ ${link(ov)}`, "");
  out.push(`Страниц: **${all.length}**.`, "");

  const inProject = all.filter((p) => p.project);
  const free = all.filter((p) => !p.project && p.file !== "_Overview");
  section("Resource", free.filter((p) => p.zone === "resource"));
  section("Wiki", free.filter((p) => p.zone === "wiki"));
  section("People", free.filter((p) => p.zone === "person"));
  const rest = free.filter((p) => !["resource", "wiki", "person", "overview"].includes(p.zone));
  section("Прочее", rest);
  const subOverviews = free.filter((p) => p.zone === "overview");
  section("Обзоры папок", subOverviews);

  if (inProject.length) {
    const byProj = new Map<string, Page[]>();
    for (const p of inProject) byProj.set(p.project!, [...(byProj.get(p.project!) ?? []), p]);
    out.push(`### Проекты (${byProj.size})`, "");
    for (const [name, ps] of [...byProj.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const po = ps.find((p) => p.file === "_Overview" && p.segments.length === 3);
      out.push(`- **${name}** — ${ps.length} страниц${po ? ` · → ${link(po)}` : ""}`);
    }
    out.push("");
  }
}

const people = v.pages.filter((p) => p.zone === "person");
out.push("---", "", `## Люди (${people.length})`, "",
  `→ [[People/_Overview|People — кросс-тематический реестр]]`, "");

const text = out.join("\n");
if (WRITE) {
  writeFileSync(join(root, "wiki/index.md"), text);
  console.log(`index.md перегенерирован: ${text.split("\n").length} строк, ${v.pages.length} страниц`);
} else {
  console.log(text.slice(0, 1200));
  console.log(`\n... (пробный прогон, ${text.split("\n").length} строк — добавьте --write)`);
}

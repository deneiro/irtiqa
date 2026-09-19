/**
 * Renaming a person. A typo in a name is not a local fix: the file, the title
 * and every `[[wikilink]]` that points at it have to move together, or the
 * vault quietly fills with dead links. This plans the whole edit so the UI can
 * show what will change before anything is written.
 */
import type { Page, Vault } from "./types";
import { setFrontmatterKeys } from "./frontmatter";

export interface RenamePlan {
  from: string; // old title
  to: string; // new title
  oldRel: string;
  newRel: string;
  /** Files whose text changes, with the new content and how many links moved. */
  edits: { rel: string; content: string; links: number }[];
  /** Files that mention the old name outside a link — prose the app must not touch. */
  prose: { rel: string; hits: number }[];
  error: string | undefined;
}

const FORBIDDEN = /[\\/:*?"<>|#[\]^]/;

/** The page a wikilink target points at, by full path or by last segment. */
function matchesTarget(target: string, oldTitle: string, oldRelNoExt: string): boolean {
  const t = target.trim();
  if (t === oldTitle) return true;
  if (t === oldRelNoExt) return true;
  const last = t.slice(t.lastIndexOf("/") + 1);
  return t.includes("/") && last === oldTitle;
}

function relink(text: string, oldTitle: string, oldRelNoExt: string, newTitle: string): { text: string; links: number } {
  let links = 0;
  const out = text.replace(/\[\[([^\]]+)\]\]/g, (whole, inner: string) => {
    const [targetPart, ...aliasParts] = inner.split("|");
    const alias = aliasParts.join("|");
    const hashAt = targetPart.indexOf("#");
    const target = hashAt >= 0 ? targetPart.slice(0, hashAt) : targetPart;
    const anchor = hashAt >= 0 ? targetPart.slice(hashAt) : "";
    if (!matchesTarget(target, oldTitle, oldRelNoExt)) return whole;
    links++;
    const t = target.trim();
    const newTarget = t.includes("/") ? t.slice(0, t.lastIndexOf("/") + 1) + newTitle : newTitle;
    // An alias that repeated the old name was showing the name, not a nickname.
    const newAlias = alias && alias.trim() === oldTitle ? newTitle : alias;
    return `[[${newTarget}${anchor}${newAlias ? "|" + newAlias : ""}]]`;
  });
  return { text: out, links };
}

/** Mentions of the name that are not inside a wikilink — prose, left alone. */
function proseHits(text: string, oldTitle: string): number {
  const withoutLinks = text.replace(/\[\[[^\]]+\]\]/g, "");
  const re = new RegExp(oldTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  return (withoutLinks.match(re) ?? []).length;
}

export function planRename(vault: Vault, page: Page, newTitle: string, lifeFiles: { rel: string; content: string }[]): RenamePlan {
  const from = page.title;
  const to = newTitle.trim();
  const dir = page.rel.slice(0, page.rel.lastIndexOf("/"));
  const newRel = `${dir}/${to}.md`;
  const plan: RenamePlan = { from, to, oldRel: page.rel, newRel, edits: [], prose: [], error: undefined };

  if (!to) return { ...plan, error: "Имя не может быть пустым" };
  if (to === from) return { ...plan, error: "Имя не изменилось" };
  if (FORBIDDEN.test(to)) return { ...plan, error: 'В имени нельзя использовать \\ / : * ? " < > | # [ ] ^' };
  if (vault.pages.some((p) => p.rel !== page.rel && p.rel.toLowerCase() === newRel.toLowerCase())) {
    return { ...plan, error: `Страница «${to}» в этой папке уже есть` };
  }

  const oldRelNoExt = page.rel.replace(/\.md$/, "");
  // Every scanned file, not just the ones that became pages: wiki/index.md is
  // generated and never enters `pages`, but its links still have to move.
  const sources: { rel: string; content: string }[] = [
    ...[...vault.rawByRel.entries()].map(([rel, content]) => ({ rel, content })),
    { rel: "wiki/log.md", content: vault.logText },
    ...lifeFiles,
  ];

  for (const f of sources) {
    if (!f.content) continue;
    const isSelf = f.rel === page.rel;
    const base = isSelf ? setFrontmatterKeys(f.content, { title: to }) : f.content;
    const { text, links } = relink(base, from, oldRelNoExt, to);
    if (links > 0 || isSelf) plan.edits.push({ rel: isSelf ? page.rel : f.rel, content: text, links });
    const hits = proseHits(text, from);
    if (hits > 0) plan.prose.push({ rel: f.rel, hits });
  }
  return plan;
}

export function planSummary(plan: RenamePlan): string {
  const links = plan.edits.reduce((n, e) => n + e.links, 0);
  const files = plan.edits.filter((e) => e.links > 0).length;
  const parts = [`файл переедет в ${plan.newRel.split("/").pop()}`];
  parts.push(links ? `${links} ссылок в ${files} файлах обновятся` : "ссылок на него нет");
  if (plan.prose.length) {
    const hits = plan.prose.reduce((n, p) => n + p.hits, 0);
    parts.push(`${hits} упоминаний в тексте останутся как есть`);
  }
  return parts.join(" · ");
}

// ---------- deleting ----------

export interface DeletePlan {
  rel: string;
  /** Files rewritten: links turned into plain names, directory lines dropped. */
  edits: { rel: string; content: string; links: number; lines: number }[];
}

/** A list line in a people directory that exists only to point at this person. */
const DIRECTORY = /(^|\/)(People\/_Overview\.md|index\.md)$/;

/**
 * Removing a person the circle no longer holds. The page goes to the Trash;
 * directory lines that listed them go away; every other link becomes the plain
 * name, so no page is left pointing at nothing and no record loses its words.
 */
export function planDelete(vault: Vault, page: Page, lifeFiles: { rel: string; content: string }[]): DeletePlan {
  const title = page.title;
  const oldRelNoExt = page.rel.replace(/\.md$/, "");
  const plan: DeletePlan = { rel: page.rel, edits: [] };
  const sources: { rel: string; content: string }[] = [
    ...[...vault.rawByRel.entries()].map(([rel, content]) => ({ rel, content })),
    { rel: "wiki/log.md", content: vault.logText },
    ...lifeFiles,
  ];
  const linkRe = /\[\[([^\]]+)\]\]/g;
  const hits = (inner: string) => {
    const target = inner.split("|")[0].split("#")[0];
    return matchesTarget(target, title, oldRelNoExt);
  };
  for (const f of sources) {
    if (!f.content || f.rel === page.rel) continue;
    let lines = 0;
    let text = f.content;
    if (DIRECTORY.test(f.rel)) {
      const kept = text.split("\n").filter((l) => {
        const drop = /^\s*[-*]\s+\[\[/.test(l) && [...l.matchAll(linkRe)].some((m, i) => i === 0 && hits(m[1]));
        if (drop) lines++;
        return !drop;
      });
      text = kept.join("\n");
    }
    let links = 0;
    text = text.replace(linkRe, (whole, inner: string) => {
      if (!hits(inner)) return whole;
      links++;
      const [targetPart, ...alias] = inner.split("|");
      return alias.length ? alias.join("|") : targetPart.split("#")[0].split("/").pop()!.trim();
    });
    if (links || lines) plan.edits.push({ rel: f.rel, content: text, links, lines });
  }
  return plan;
}

export function deleteSummary(plan: DeletePlan): string {
  const lines = plan.edits.reduce((n, e) => n + e.lines, 0);
  const links = plan.edits.reduce((n, e) => n + e.links, 0);
  const parts = ["страница уйдёт в Корзину macOS, её можно вернуть оттуда"];
  if (lines) parts.push(`${lines} строк в списках людей уберутся`);
  if (links) parts.push(`${links} ссылок станут просто именем`);
  return parts.join(" · ");
}

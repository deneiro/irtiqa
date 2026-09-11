import { load as yamlLoad, JSON_SCHEMA } from "js-yaml";
import type { Page, Scan, Vault, Zone } from "./types";
import { THEME_BY_NAME } from "./themes";
import { parseLog } from "./log";

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const LINK_RE = /!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return s.length ? s : undefined;
}

export function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (s.startsWith("[") && s.endsWith("]")) {
      return s
        .slice(1, -1)
        .split(",")
        .map((x) => x.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
    return s ? [s] : [];
  }
  return [];
}

export function parseFrontmatter(content: string): { fm: Record<string, unknown>; body: string } {
  const m = content.match(FM_RE);
  if (!m) return { fm: {}, body: content };
  const body = content.slice(m[0].length);
  try {
    const parsed = yamlLoad(m[1], { schema: JSON_SCHEMA });
    if (parsed && typeof parsed === "object") return { fm: parsed as Record<string, unknown>, body };
  } catch {
    /* fall through to naive parse */
  }
  const fm: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { fm, body };
}

function zoneOf(segments: string[], file: string, type: string): Zone {
  const lower = segments.map((s) => s.toLowerCase());
  if (file === "_Overview" || file === "_MOC" || type === "overview" || type === "moc") return "overview";
  if (type === "person" || lower.includes("people")) return "person";
  if (type === "profile") return "profile";
  if (lower.includes("resource") || lower.includes("resources")) return "resource";
  if (lower.includes("wiki")) return "wiki";
  if (lower.includes("tools") || type === "tool") return "tool";
  if (lower.includes("friends") || lower.includes("family") || lower.includes("relationship")) return "personal";
  return "other";
}

function stripLinkTarget(t: string): string {
  // Obsidian escapes the alias pipe inside tables as "\|", leaving a trailing backslash on the target.
  // Normalize to NFC: macOS stores filenames decomposed (NFD) while markdown text is composed,
  // so a Cyrillic or accented filename would otherwise never match its own wikilink.
  return t.normalize("NFC").trim().replace(/\\+$/, "").trim().replace(/\.md$/i, "");
}

export function buildPage(rel: string, content: string, mtime: number): Page {
  const parts = rel.normalize("NFC").split("/");
  const file = parts[parts.length - 1].replace(/\.md$/i, "");
  const segments = parts.slice(1, -1); // drop leading "wiki" and file
  const { fm, body } = parseFrontmatter(content);

  const type = asString(fm.type) ?? "page";
  let theme = asString(fm.theme);
  if (!theme || !THEME_BY_NAME.has(theme)) {
    theme = segments[0] && THEME_BY_NAME.has(segments[0]) ? segments[0] : undefined;
  }
  let project = asString(fm.project);
  if (!project) {
    const pi = segments.indexOf("Projects");
    if (pi >= 0 && segments[pi + 1]) project = segments[pi + 1];
  }

  const links: string[] = [];
  for (const m of body.matchAll(LINK_RE)) links.push(stripLinkTarget(m[1]));

  const words = body.split(/\s+/).filter(Boolean).length;

  return {
    rel,
    segments,
    file,
    title: asString(fm.title) ?? file,
    type,
    theme,
    project,
    zone: zoneOf(segments, file, type),
    created: asString(fm.created),
    updated: asString(fm.updated),
    tags: asList(fm.tags),
    sources: asList(fm.sources),
    sourceUrl: asString(fm.source_url) ?? asString(fm.url),
    aliases: asList(fm.aliases),
    fm,
    body,
    links,
    mtime,
    words,
  };
}

/** Turn "[[X|alias]]" or plain text from a sources: list into a link target. */
export function sourceTarget(s: string): { target: string; isRaw: boolean } {
  const m = s.match(/^\[\[([^\]|#]+)/);
  if (m) return { target: stripLinkTarget(m[1]), isRaw: false };
  return { target: s, isRaw: s.startsWith("raw/") };
}

export function buildVault(scan: Scan): Vault {
  const pages = scan.pages
    .filter((f) => f.rel !== "wiki/index.md")
    .map((f) => buildPage(f.rel, f.content, f.mtime));
  const byRel = new Map(pages.map((p) => [p.rel, p]));
  const rawByRel = new Map(scan.pages.map((f) => [f.rel.normalize("NFC"), f.content]));

  // Resolution indexes.
  const byFile = new Map<string, Page[]>();
  const byTitle = new Map<string, Page[]>();
  const byAlias = new Map<string, Page[]>();
  const push = (m: Map<string, Page[]>, k: string, p: Page) => {
    const key = k.toLowerCase();
    const arr = m.get(key);
    if (arr) arr.push(p);
    else m.set(key, [p]);
  };
  for (const p of pages) {
    push(byFile, p.file, p);
    push(byTitle, p.title, p);
    for (const a of p.aliases) push(byAlias, a, p);
  }
  const relNoExt = new Map(pages.map((p) => [p.rel.replace(/\.md$/i, "").toLowerCase(), p]));

  const cache = new Map<string, Page | undefined>();
  const resolve = (raw: string): Page | undefined => {
    const target = stripLinkTarget(raw);
    if (cache.has(target)) return cache.get(target);
    let hit: Page | undefined;
    const lower = target.toLowerCase();
    if (target.includes("/")) {
      // Path-style link. Try with and without the wiki/ prefix, then suffix match.
      hit =
        relNoExt.get(lower) ??
        relNoExt.get(`wiki/${lower}`) ??
        pages.find((p) => p.rel.replace(/\.md$/i, "").toLowerCase().endsWith(`/${lower}`));
      if (!hit) {
        const last = target.split("/").pop()!;
        hit = byFile.get(last.toLowerCase())?.[0];
      }
    } else {
      hit = byFile.get(lower)?.[0] ?? byTitle.get(lower)?.[0] ?? byAlias.get(lower)?.[0];
    }
    cache.set(target, hit);
    return hit;
  };

  // Vault-level files that are valid wikilink targets but never Page objects:
  // wiki/index.md and wiki/log.md are excluded from `pages` on purpose, and
  // CLAUDE.md lives above wiki/. Links to them are correct, not broken.
  const VIRTUAL = new Set(["index", "log", "claude", "claude.md", "wiki/index", "wiki/log"]);

  const backlinks = new Map<string, Page[]>();
  const deadLinks: { from: Page; target: string }[] = [];
  for (const p of pages) {
    const seen = new Set<string>();
    for (const l of p.links) {
      const t = resolve(l);
      if (!t) {
        if (VIRTUAL.has(l.toLowerCase())) continue;
        if (!seen.has(`!${l}`)) {
          deadLinks.push({ from: p, target: l });
          seen.add(`!${l}`);
        }
        continue;
      }
      if (t.rel === p.rel || seen.has(t.rel)) continue;
      seen.add(t.rel);
      const arr = backlinks.get(t.rel);
      if (arr) arr.push(p);
      else backlinks.set(t.rel, [p]);
    }
  }

  return {
    root: scan.root,
    pages,
    byRel,
    rawByRel,
    raw: scan.raw,
    life: scan.life ?? [],
    logText: scan.log,
    log: parseLog(scan.log),
    claudeMd: scan.claude_md,
    resolve,
    backlinks,
    deadLinks,
    scannedAt: Date.now(),
  };
}

export const DAY = 86400 * 1000;

export function daysSince(date: string | undefined, now = Date.now()): number | undefined {
  if (!date) return undefined;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return undefined;
  return Math.floor((now - t) / DAY);
}

export function fmtDate(d: string | undefined): string {
  return d ?? "—";
}

export function relativeDate(d: string | undefined): string {
  const n = daysSince(d);
  if (n === undefined) return "—";
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 30) return `${n}d ago`;
  if (n < 365) return `${Math.floor(n / 30)}mo ago`;
  return `${(n / 365).toFixed(1)}y ago`;
}

export function pageUrl(p: Page): string {
  return `/page/${encodeURIComponent(p.rel)}`;
}

export function themeUrl(name: string): string {
  return `/theme/${encodeURIComponent(name)}`;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

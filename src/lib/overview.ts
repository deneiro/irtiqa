/**
 * A theme's _Overview.md is its dashboard (spec v4, 2026-11-06). The overview
 * says what the theme page shows: `## Цифры` names the numbers, `## Где был` ·
 * `## Где стою` · `## Куда иду` are three columns of phrases, `## На радаре`
 * is cards, and `sections:` names the organs and the pages behind buttons. The
 * code knows only these headings and formats, never a name from the vault.
 */
import type { Page } from "./types";
import { asList } from "./vault";

export interface OverviewSection { heading: string; md: string }

export type SectionKey =
  | "focus" | "resource" | "wiki" | "people" | "projects" | "profile" | "tools" | "template" | "summary"
  | "finance" | "events" | "skills" | "nutrition" | "quran" | "names" | "halal" | "body" | "medical"
  | "circle" | "influence" | "self" | "horizon" | "talks" | "career" | "wishes" | "library" | "sport";

export const SECTION_KEYS: readonly SectionKey[] = [
  "focus", "resource", "wiki", "people", "projects", "profile", "tools", "template", "summary",
  "finance", "events", "skills", "nutrition", "quran", "names", "halal", "body", "medical",
  "circle", "influence", "self", "horizon", "talks", "career", "wishes", "library", "sport",
];

/** Keys drawn as an organ on the theme page (spec v4 «Ключи `sections:`»); every other key is a button. */
export const ORGAN_KEYS: readonly SectionKey[] = ["focus", "skills", "medical", "sport", "nutrition", "circle", "talks", "horizon", "finance", "events", "wishes"];

/** Spec v4 retired these: the skeleton is always there (`state`), the rest left by his words. */
export const RETIRED_SECTIONS: readonly string[] = ["state", "year", "reverend", "habits"];

const DEFAULT_SECTIONS = ["resource", "wiki", "people"];

export function isSectionKey(s: string): s is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(s);
}

/**
 * The `sections:` list in its order. A key names an organ or a page; any other
 * string is the heading of one of the overview's own `##` sections.
 */
export function themeSections(overview: Page | undefined): string[] {
  const list = (overview ? asList(overview.fm.sections) : []).map((s) => s.trim()).filter(Boolean);
  if (!list.length) return DEFAULT_SECTIONS;
  return [...new Set(list.filter((s) => !RETIRED_SECTIONS.includes(s)))];
}

export function splitSections(body: string): { intro: string; sections: OverviewSection[] } {
  const clean = body.replace(/^\s*# [^\n]*\n/, "");
  const parts = clean.split(/^## (.*)$/m);
  const sections: OverviewSection[] = [];
  for (let i = 1; i < parts.length; i += 2) sections.push({ heading: parts[i].trim(), md: parts[i + 1].trim() });
  return { intro: parts[0].trim(), sections };
}

/** Suffix after " — " (Семья / Отношения), or "" for the plain heading. */
export function sectionSuffix(heading: string): string {
  const i = heading.indexOf(" — ");
  return i >= 0 ? heading.slice(i + 3) : "";
}

// ---------- the v4 skeleton ----------

/** `- Подпись — источник · цель N`: the label in his words, the source the code reads, an optional target. */
export interface NumberLine { label: string; source: string; target?: string }
/** `### Заголовок` inside `## Цифры`, the first paragraph under it (usually a quote) and its lines. */
export interface NumberGroup { title?: string; caption?: string; lines: NumberLine[] }
/** One phrase of a column; a trailing `*курсив*` is its pale note. */
export interface ColumnItem { md: string; note?: string }
/** One section of a column: `suffix` is the part after « — » in its heading (Семья, Отношения) or "". */
export interface ColumnPart { suffix: string; items: ColumnItem[]; caption?: string }
/** `- вид: **Заголовок** — строка`. */
export interface RadarCard { kind?: string; title?: string; text: string }

export interface ThemeView {
  numbers: NumberGroup[];
  past: ColumnPart[];
  stand: ColumnPart[];
  next: ColumnPart[];
  radar: RadarCard[];
  /** Every `##` section of the overview: a `sections:` string that is not a key names one of these. */
  sections: OverviewSection[];
}

const HEAD = { numbers: /^Цифры$/i, past: /^Где был$/i, stand: /^Где стою$/i, next: /^Куда иду$/i, radar: /^На радаре$/i };
const BULLET = /^(?:[-*]|\d+[.)])\s+(.*)$/;

/** The heading without its « — suffix». */
const baseHeading = (h: string) => { const i = h.indexOf(" — "); return (i >= 0 ? h.slice(0, i) : h).trim(); };

/** Top-level bullets, each with its indented continuation lines; the other text lines apart. */
function bullets(md: string): { items: string[]; rest: string[] } {
  const items: string[] = [], rest: string[] = [];
  let open = false;
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(BULLET);
    if (m) { items.push(m[1].trim()); open = true; continue; }
    if (!line.trim()) { open = false; continue; }
    if (open && /^\s+\S/.test(line)) { items[items.length - 1] += " " + line.trim(); continue; }
    open = false;
    rest.push(line.trim());
  }
  return { items, rest };
}

/** A phrase with its pale note: a trailing `*курсив*` (not `**жирный**`) becomes the note. */
export function phraseOf(text: string): ColumnItem {
  const m = text.match(/^(.*?)\s*\*([^*\n]+)\*\s*$/);
  if (!m || !m[1].trim() || m[1].endsWith("*")) return { md: text };
  return { md: m[1].trim(), note: m[2].trim() };
}

function columnPart(md: string, suffix: string): ColumnPart {
  const { items, rest } = bullets(md);
  const part: ColumnPart = { suffix, items: items.map(phraseOf) };
  if (rest.length) part.caption = rest.join(" ");
  return part;
}

/** A `[[link]]` is one unit: a « — » or « · » inside it belongs to its title. Same length, so offsets carry over. A `[` inside ends the match, so an unclosed `[[` cannot swallow a later link. */
const mask = (s: string) => s.replace(/\[\[[^\[\]]*\]\]/g, (m) => "\u0000".repeat(m.length));

export function parseNumberLine(line: string): NumberLine | undefined {
  const m = line.match(/^\s*[-*]\s+(.+?)\s*$/);
  if (!m) return undefined;
  const text = m[1];
  const at = mask(text).lastIndexOf(" — ");
  if (at < 0) return { label: text.trim(), source: "" };
  // the « · » cuts are found on the masked copy and made at the same offsets in the text (backticks dropped, as before)
  const tail = text.slice(at + 3).replace(/`/g, "");
  const hidden = mask(tail);
  const cuts: string[] = [];
  let from = 0;
  for (const sep of hidden.matchAll(/\s+·\s+/g)) {
    cuts.push(tail.slice(from, sep.index));
    from = sep.index + sep[0].length;
  }
  cuts.push(tail.slice(from));
  const [source, ...mods] = cuts.map((s) => s.trim());
  const target = mods.find((x) => /^цель\s+/i.test(x))?.replace(/^цель\s+/i, "").trim();
  const out: NumberLine = { label: text.slice(0, at).trim(), source };
  if (target) out.target = target;
  return out;
}

function numberGroups(md: string): NumberGroup[] {
  const parts = ("\n" + md).split(/\n###[ \t]+([^\n]*)/);
  const raw: { title?: string; body: string }[] = [{ body: parts[0] }];
  for (let i = 1; i < parts.length; i += 2) raw.push({ title: parts[i].trim(), body: parts[i + 1] ?? "" });
  const out: NumberGroup[] = [];
  for (const g of raw) {
    const lines: NumberLine[] = [];
    const caption: string[] = [];
    let captionDone = false;
    for (const l of g.body.split(/\r?\n/)) {
      const n = parseNumberLine(l);
      if (n) { lines.push(n); captionDone = true; continue; }
      if (!l.trim()) { if (caption.length) captionDone = true; continue; }
      if (!captionDone) caption.push(l.trim());
    }
    if (!lines.length) continue;
    const group: NumberGroup = { lines };
    if (g.title) group.title = g.title;
    if (caption.length) group.caption = caption.join(" ");
    out.push(group);
  }
  return out;
}

/** `**Заголовок** — текст`, `**Заголовок.** Текст`: the bold start and the rest. */
function boldLead(text: string): { title?: string; text: string } {
  const m = text.match(/^\*\*(.+?)\*\*[\s.:—–-]*(.*)$/);
  if (!m) return { text: text.trim() };
  return { title: m[1].trim().replace(/[.:]$/, ""), text: m[2].trim() };
}

/** A radar bullet. Without `вид:` a card of a « — Семья» section takes «семья» as its mark. */
export function radarCard(text: string, fallbackKind?: string): RadarCard {
  let rest = text.trim();
  let kind: string | undefined;
  const k = rest.match(/^([^\s:*[\]]+):\s+(.*)$/);
  if (k) { kind = k[1]; rest = k[2]; }
  const card: RadarCard = boldLead(rest);
  const mark = kind ?? fallbackKind;
  if (mark) card.kind = mark;
  return card;
}

export function themeView(overview: Page | undefined): ThemeView {
  const v: ThemeView = { numbers: [], past: [], stand: [], next: [], radar: [], sections: [] };
  if (!overview) return v;
  v.sections = splitSections(overview.body).sections;
  for (const s of v.sections) {
    const base = baseHeading(s.heading), suffix = sectionSuffix(s.heading).trim();
    if (HEAD.numbers.test(base)) v.numbers.push(...numberGroups(s.md));
    else if (HEAD.past.test(base)) v.past.push(columnPart(s.md, suffix));
    else if (HEAD.stand.test(base)) v.stand.push(columnPart(s.md, suffix));
    else if (HEAD.next.test(base)) v.next.push(columnPart(s.md, suffix));
    else if (HEAD.radar.test(base)) v.radar.push(...bullets(s.md).items.map((t) => radarCard(t, suffix ? suffix.toLowerCase() : undefined)));
  }
  return v;
}

/** The first markdown table of a section: its header and rows (`\|` inside a wikilink stays a pipe). */
export function sectionTable(md: string): { head: string[]; rows: string[][] } | undefined {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().startsWith("|"));
  if (start < 0) return undefined;
  const block: string[][] = [];
  for (const l of lines.slice(start)) {
    const t = l.trim();
    if (!t.startsWith("|")) break;
    const cells = t.replace(/\\\|/g, "\u0000").slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.replace(/\u0000/g, "|").trim());
    if (cells.every((c) => /^:?-*:?$/.test(c))) continue;
    block.push(cells);
  }
  return block.length ? { head: block[0], rows: block.slice(1) } : undefined;
}

/** The bullets of a section as cards: a bold start is the card's title. */
export function sectionCards(md: string): { title?: string; text: string }[] {
  return bullets(md).items.map((t) => boldLead(t)).map((c) => (c.title ? c : { text: c.text }));
}

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
  | "circle" | "influence" | "self" | "horizon" | "talks" | "career" | "wishes" | "library" | "sport" | "training" | "rings" | "relatives";

export const SECTION_KEYS: readonly SectionKey[] = [
  "focus", "resource", "wiki", "people", "projects", "profile", "tools", "template", "summary",
  "finance", "events", "skills", "nutrition", "quran", "names", "halal", "body", "medical",
  "circle", "influence", "self", "horizon", "talks", "career", "wishes", "library", "sport", "training", "rings", "relatives",
];

/** Keys drawn as an organ on the theme page (spec v4 «Ключи `sections:`»); every other key is a button. */
export const ORGAN_KEYS: readonly SectionKey[] = ["focus", "skills", "medical", "sport", "training", "nutrition", "circle", "talks", "horizon", "finance", "events", "wishes"];

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

/** The `##` section a `sections:` string names: the heading as written, else the same heading in any case. */
export function findSection(sections: OverviewSection[], name: string): OverviewSection | undefined {
  return sections.find((s) => s.heading === name) ?? sections.find((s) => s.heading.toLowerCase() === name.toLowerCase());
}

/** Suffix after " — " (Семья / Отношения), or "" for the plain heading. */
export function sectionSuffix(heading: string): string {
  const i = heading.indexOf(" — ");
  return i >= 0 ? heading.slice(i + 3) : "";
}

// ---------- the v4 skeleton ----------

/**
 * `- Подпись — источник · цель N`: the label in his words, the source the code reads, an optional target.
 * `parts`: a source of several habits joined by « + » (`[[A]] + [[B]]`), each part as written.
 */
export interface NumberLine { label: string; source: string; target?: string; parts?: string[] }
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

/** Top-level bullets, each with its indented continuation lines; the other text lines apart, and the same lines joined into paragraphs (a blank line or a bullet ends one). */
export function bullets(md: string): { items: string[]; rest: string[]; paras: string[] } {
  const items: string[] = [], rest: string[] = [], paras: string[] = [];
  let open = false, para = false;
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(BULLET);
    if (m) { items.push(m[1].trim()); open = true; para = false; continue; }
    if (!line.trim()) { open = false; para = false; continue; }
    if (open && /^\s+\S/.test(line)) { items[items.length - 1] += " " + line.trim(); continue; }
    open = false;
    rest.push(line.trim());
    if (para) paras[paras.length - 1] += " " + line.trim();
    else paras.push(line.trim());
    para = true;
  }
  return { items, rest, paras };
}

/** A phrase with its pale note: a trailing `*курсив*` (not `**жирный**`) becomes the note. */
export function phraseOf(text: string): ColumnItem {
  const m = text.match(/^(.*?)\s*\*([^*\n]+)\*\s*$/);
  if (!m || !m[1].trim() || m[1].endsWith("*")) return { md: text };
  return { md: m[1].trim(), note: m[2].trim() };
}

/** A column of phrases: the bullets, and the other lines as its pale caption. */
export function columnPart(md: string, suffix: string): ColumnPart {
  const { items, rest } = bullets(md);
  const part: ColumnPart = { suffix, items: items.map(phraseOf) };
  if (rest.length) part.caption = rest.join(" ");
  return part;
}

/** A `[[link]]` is one unit: a « — » or « · » inside it belongs to its title. Same length, so offsets carry over. A `[` inside ends the match, so an unclosed `[[` cannot swallow a later link. */
const mask = (s: string) => s.replace(/\[\[[^\[\]]*\]\]/g, (m) => "\u0000".repeat(m.length));

/** A `«цитата»` is one unit too: a « — », «: » or « + » inside his words does not cut. Same length, as `mask`. */
export const maskQuotes = (s: string) => mask(s).replace(/«[^«»]*»/g, (m) => "\u0000".repeat(m.length));

/** `text` cut at every match of `sep` on its masked copy: a separator inside a link (or what `hide` hides) is not one. */
function cutOutside(text: string, sep: RegExp, hide: (s: string) => string = mask): string[] {
  const cuts: string[] = [];
  let from = 0;
  for (const m of hide(text).matchAll(sep)) {
    cuts.push(text.slice(from, m.index));
    from = m.index + m[0].length;
  }
  cuts.push(text.slice(from));
  return cuts;
}

export function parseNumberLine(line: string): NumberLine | undefined {
  const m = line.match(/^\s*[-*]\s+(.+?)\s*$/);
  if (!m) return undefined;
  const text = m[1];
  const at = mask(text).lastIndexOf(" — ");
  if (at < 0) return { label: text.trim(), source: "" };
  // the « · » cuts are found on the masked copy and made at the same offsets in the text (backticks dropped, as before)
  const tail = text.slice(at + 3).replace(/`/g, "");
  const [source, ...mods] = cutOutside(tail, /\s+·\s+/g).map((s) => s.trim());
  const target = mods.find((x) => /^цель\s+/i.test(x))?.replace(/^цель\s+/i, "").trim();
  const out: NumberLine = { label: text.slice(0, at).trim(), source };
  if (target) out.target = target;
  // «Подпись — [[А]] + [[Б]]» (Eldar, 2026-11-06): several habits make one tile
  // only links join: «цель «А + Б»» stays a goal, «[[А]] + намаз» stays one (unknown) source
  const parts = cutOutside(source, /\s+\+\s+/g, maskQuotes).map((s) => s.trim());
  if (parts.length > 1 && parts.every((x) => /^\[\[[^\[\]]+\]\]$/.test(x))) out.parts = parts;
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

// ---------- an overview section as cards (Eldar, 2026-11-06: «визуально user-friendly», not a markdown file) ----------


/** One card: its title, the description, a pale note (`*курсив*` at the end), `struck` for a `~~title~~`; a table row has its cells as labelled lines. */
export interface SectionCard { title: string; text?: string; note?: string; struck?: boolean; fields?: { label: string; md: string; note?: string }[] }
/** A `###` sub-heading of the section (none for the part above the first one), its pale lines and its cards. */
export interface CardGroup { title?: string; notes: string[]; cards: SectionCard[] }

/** A bullet as a card: the bold start is the title, else the text before the first « — » outside a link or a quote; the rest is the description. */
export function cardOf(text: string): SectionCard {
  const { md, note } = phraseOf(text.trim());
  const bold = md.match(/^\*\*(.+?)\*\*[\s.:—–-]*(.*)$/);
  let title = md, rest = "";
  if (bold) { title = bold[1].trim().replace(/[.:]$/, ""); rest = bold[2].trim(); }
  else {
    const at = maskQuotes(md).indexOf(" — ");
    if (at > 0) { title = md.slice(0, at).trim(); rest = md.slice(at + 3).trim(); }
  }
  const card: SectionCard = { title };
  const struck = title.match(/^~~(.+)~~$/);
  if (struck) { card.title = struck[1].trim(); card.struck = true; }
  if (rest) card.text = rest;
  if (note) card.note = note;
  return card;
}

/** A line wholly in `*курсив*` (not bold) loses its stars: it is a pale note anyway. */
const unItalic = (s: string) => s.match(/^\*([^*].*[^*]|[^*])\*$/)?.[1].trim() ?? s;

/**
 * An overview `##` section as groups of cards: a `###` starts a group; every top-level bullet is a card (`cardOf`);
 * a table row is a card titled by its first cell, the other cells under their column names; a paragraph is a pale note.
 */
export function sectionGroups(md: string): CardGroup[] {
  const parts = ("\n" + md).split(/\n###[ \t]+([^\n]*)/);
  const raw: { title?: string; body: string }[] = [{ body: parts[0] }];
  for (let i = 1; i < parts.length; i += 2) raw.push({ title: parts[i].trim(), body: parts[i + 1] ?? "" });
  const out: CardGroup[] = [];
  for (const g of raw) {
    const table = sectionTable(g.body);
    const prose = g.body.split(/\r?\n/).filter((l) => !l.trim().startsWith("|")).join("\n");
    const { items, paras } = bullets(prose);
    const cards = items.map(cardOf);
    if (table) {
      for (const row of table.rows) {
        if (!row[0]) continue;
        const fields = table.head.slice(1).map((label, j) => ({ label, ...phraseOf(row[j + 1] ?? "") })).filter((f) => f.md.trim());
        cards.push({ ...cardOf(row[0]), fields });
      }
    }
    const notes = paras.map(unItalic);
    if (!cards.length && !notes.length && !g.title) continue;
    const group: CardGroup = { notes, cards };
    if (g.title) group.title = g.title;
    out.push(group);
  }
  return out;
}

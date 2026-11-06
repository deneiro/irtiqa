/**
 * «Влияние» across the circle (schema 4.3, `## Влияние` of a person page): what
 * people pull Eldar up to and down into, gathered from every page into one list
 * a direction, and the one edit the app makes there — a bullet under
 * «Тянет вверх» or «Тянет вниз». The old tags still count: a trigger tag is
 * «вниз», `опора` is «вверх». Pure: the page edit is string in, string out.
 */
import { TRIGGERS, countOnMeetings, eventsWith, isSupport, meetWindow, type HabitCount } from "./circle";
import { setFrontmatterKeys } from "./frontmatter";
import type { Habit, Life } from "./life";
import { phraseOf } from "./overview";
import { closenessOf } from "./people";
import { personView } from "./person";
import type { Page } from "./types";

export type Direction = "up" | "down";
export const DIRECTION_WORDS: Record<Direction, string> = { up: "Тянет вверх", down: "Тянет вниз" };

export interface InfluenceWho { page: Page; note?: string }

/** One influence of a direction and everyone whose page holds it. */
export interface InfluenceItem {
  dir: Direction;
  key: string;
  /** The influence as a bullet writes it (without the person's note): `[[Привычка|подпись]]` or a phrase. */
  md: string;
  label: string;
  /** The habit a link names, when it is one of the habits given. */
  habit?: Habit;
  people: InfluenceWho[];
}
export interface InfluenceGroups { up: InfluenceItem[]; down: InfluenceItem[] }

const LINK = /^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\\?\|([^\]]+))?\]\]$/;
/** A `[[link]]` is one unit: a « — » inside it belongs to its title. Same length, so offsets carry over. */
const mask = (s: string) => s.replace(/\[\[[^[\]]*\]\]/g, (m) => "\u0000".repeat(m.length));
const fold = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
const fileOf = (h: Habit) => h.rel.split("/").pop()!.replace(/\.md$/i, "");

function habitOf(habits: Habit[], target: string): Habit | undefined {
  const t = target.normalize("NFC").trim();
  return habits.find((h) => h.title.normalize("NFC") === t) ?? habits.find((h) => fileOf(h).normalize("NFC") === t);
}

/** A habit as a bullet links it: `[[<file>|<title>]]`, or `[[<file>]]` when they match. */
export function habitLink(h: Habit): string {
  const file = fileOf(h);
  return file === h.title ? `[[${file}]]` : `[[${file}|${h.title}]]`;
}

/** «[[X|подпись]] — заметка» → the influence and the note; a trailing `*курсив*` is a note too. */
function split(text: string): { name: string; note?: string } {
  const p = phraseOf(text.trim());
  const at = mask(p.md).indexOf(" — ");
  const name = (at < 0 ? p.md : p.md.slice(0, at)).trim();
  const note = (at < 0 ? "" : p.md.slice(at + 3).trim()) || p.note;
  return note ? { name, note } : { name };
}

/** What makes two bullets one influence: a link by its target (a habit by its file), a phrase by its words, any case. */
function keyOf(name: string, habits: Habit[]): { key: string; label: string; habit?: Habit } {
  const m = name.match(LINK);
  if (!m) return { key: `t:${fold(name)}`, label: name };
  const target = m[1].trim(), label = (m[2] ?? m[1]).trim();
  const habit = habitOf(habits, target);
  return habit ? { key: `h:${habit.rel}`, label, habit } : { key: `l:${fold(target)}`, label };
}

/**
 * Every influence of the pages, one item a direction and influence, with the people who have it: the bullets of
 * `### Тянет вверх · вниз`, then the old tags (a trigger tag of `triggers` is «вниз», `опора` is «вверх»). The most
 * shared come first; inside, the closest people.
 */
export function influenceGroups(people: Page[], habits: Habit[], triggers = TRIGGERS): InfluenceGroups {
  const maps: Record<Direction, Map<string, InfluenceItem>> = { up: new Map(), down: new Map() };
  const put = (dir: Direction, k: { key: string; label: string; habit?: Habit }, md: string, page: Page, note?: string) => {
    let it = maps[dir].get(k.key);
    if (!it) { it = { dir, key: k.key, md, label: k.label, ...(k.habit ? { habit: k.habit } : {}), people: [] }; maps[dir].set(k.key, it); }
    const had = it.people.find((p) => p.page.rel === page.rel);
    if (!had) it.people.push(note ? { page, note } : { page });
    else if (!had.note && note) had.note = note;
  };
  for (const page of people) {
    const inf = personView(page.body).influence;
    for (const dir of ["up", "down"] as const) {
      for (const pill of inf?.[dir]?.pills ?? []) {
        const { name, note } = split(pill.md);
        if (name) put(dir, keyOf(name, habits), name, page, note ?? pill.note);
      }
    }
  }
  for (const page of people) {
    for (const t of triggers.filter((x) => page.tags.some((tag) => x.tags.test(tag)))) {
      // A trigger written before its habit existed finds it by its own word.
      const h = t.habit ? habitOf(habits, t.habit) : habits.find((x) => fold(x.title) === fold(t.label));
      if (h) put("down", { key: `h:${h.rel}`, label: t.label, habit: h }, `[[${fileOf(h)}|${t.label}]]`, page);
      else put("down", { key: `t:${fold(t.label)}`, label: t.label }, t.label, page);
    }
    if (isSupport(page)) put("up", { key: "t:опора", label: "опора" }, "опора", page);
  }
  const order = (list: InfluenceItem[]) => {
    for (const it of list) it.people.sort((a, b) => (closenessOf(b.page) ?? 0) - (closenessOf(a.page) ?? 0) || a.page.title.localeCompare(b.page.title, "ru"));
    return list.sort((a, b) => b.people.length - a.people.length || a.label.localeCompare(b.label, "ru"));
  };
  return { up: order([...maps.up.values()]), down: order([...maps.down.values()]) };
}

/** A habit of an influence on the days its people were met: the count of `personInfluence`, for all of them at once. */
export function influenceItemCount(item: InfluenceItem, people: Page[], life: Life, today: string, window = 90): HabitCount | undefined {
  if (!item.habit) return undefined;
  const { from, to } = meetWindow(today, window);
  const met = new Set(item.people.flatMap((p) => eventsWith(p.page, people, life.events)).filter((e) => e.date >= from && e.date <= to).map((e) => e.date));
  return countOnMeetings(life, item.habit, met, from, to);
}

// ---------- the page edit ----------

export interface NewInfluence {
  dir: Direction;
  /** `[[Привычка|подпись]]`, `[[Привычка]]` or a phrase; one line. */
  md: string;
  note?: string;
}

const H2 = /^##\s/;
const heading = (re: RegExp) => (l: string) => re.test(l);
const BULLET = /^(?:[-*]|\d+[.)])\s+(.*)$/;

function nextH2(lines: string[], from: number): number {
  for (let i = from + 1; i < lines.length; i++) if (H2.test(lines[i])) return i;
  return lines.length;
}

/** « — » outside a link is where a bullet's note starts: inside a name it becomes « – », so the name reads back whole. */
function undash(s: string): string {
  const m = mask(s);
  let out = "", from = 0;
  for (let at = m.indexOf(" — "); at >= 0; at = m.indexOf(" — ", at + 3)) { out += s.slice(from, at) + " – "; from = at + 3; }
  return out + s.slice(from);
}

/** Back over the blank lines before `end`, never above `floor`. */
function lastFilled(lines: string[], floor: number, end: number): number {
  let at = end;
  while (at > floor && !lines[at - 1].trim()) at--;
  return at;
}

/** Put `block` at `at` with one blank line on each side where text touches it. */
function insert(lines: string[], at: number, block: string[], blankBefore: boolean) {
  const out = [...block];
  if (blankBefore && at > 0 && lines[at - 1].trim()) out.unshift("");
  if (at < lines.length && lines[at].trim()) out.push("");
  lines.splice(at, 0, ...out);
}

/**
 * One influence written into a person page from the app: a bullet `- md` (` *note*`) under `## Влияние` → the
 * `### Тянет вверх|вниз` of `dir`, after its last bullet. A missing `###` is made (вверх before вниз); a missing
 * `## Влияние` goes after `## Дальше`, else before `## Характер`, else before `## Changes`, else at the end. `updated:`
 * becomes `today` and `## Changes` gets its line. The rest of the page and the other frontmatter keys stay as they are.
 * The page comes back unchanged when that half already holds the influence.
 */
export function addInfluence(raw: string, inf: NewInfluence, today: string): string {
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const fm = raw.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] ?? "";
  const lines = raw.slice(fm.length).split(/\r?\n/);
  const name = undash(inf.md.replace(/\s+/g, " ").trim());
  if (!name) throw new Error("Нужно название влияния");
  // The note is the pale `*курсив*` of a pill (person.ts): the link stays whole, so the person page still counts the habit.
  const note = inf.note?.replace(/\*/g, "").replace(/\s+/g, " ").trim();
  const { key, label } = keyOf(name, []);
  const bullet = `- ${name}${note ? ` *${note}*` : ""}`;
  const sub = `### ${DIRECTION_WORDS[inf.dir]}`;
  const subRe = (d: Direction) => new RegExp(`^###\\s+${DIRECTION_WORDS[d]}\\s*$`, "i");

  let si = lines.findIndex(heading(/^##\s+Влияние\s*$/i));
  if (si < 0) {
    const find = (re: RegExp) => lines.findIndex(heading(re));
    const after = find(/^##\s+Дальше\s*$/i), before = [find(/^##\s+Характер\s*$/i), find(/^##\s+Changes\s*$/i)].find((i) => i >= 0);
    const end = after >= 0 ? nextH2(lines, after) : before ?? lines.length;
    const at = lastFilled(lines, 0, end);
    insert(lines, at, ["## Влияние", sub, bullet], true);
  } else {
    const end = nextH2(lines, si);
    const own = lines.slice(si + 1, end).findIndex(heading(subRe(inf.dir)));
    if (own < 0) {
      const down = inf.dir === "up" ? lines.slice(si + 1, end).findIndex(heading(subRe("down"))) : -1;
      if (down >= 0) insert(lines, si + 1 + down, [sub, bullet], true);
      else insert(lines, lastFilled(lines, si + 1, end), [sub, bullet], true);
    } else {
      const hi = si + 1 + own;
      let stop = hi + 1;
      while (stop < end && !/^#{2,3}\s/.test(lines[stop])) stop++;
      let at = hi + 1;
      for (let i = hi + 1; i < stop; i++) {
        const m = lines[i].match(BULLET);
        if (m) {
          if (keyOf(split(m[1]).name, []).key === key) return raw;
          at = i + 1;
          while (at < stop && /^\s+\S/.test(lines[at])) at++;
        }
      }
      insert(lines, at, [bullet], false);
    }
  }

  const change = `- ${today} — влияние «${label}» (${DIRECTION_WORDS[inf.dir].toLowerCase()}) добавлено в приложении`;
  const ci = lines.findIndex(heading(/^##\s+Changes\s*$/i));
  if (ci >= 0) insert(lines, lastFilled(lines, ci + 1, nextH2(lines, ci)), [change], false);
  else {
    const at = lastFilled(lines, 0, lines.length);
    lines.splice(at, lines.length - at, ...(at ? [""] : []), "## Changes", change, "");
  }
  return setFrontmatterKeys(fm + lines.join(nl), { updated: today });
}

/**
 * A person page as the dashboard of one tie (spec v5, 2026-11-06). The page in
 * the vault says what shows: `## Было` · `## Сейчас` · `## Дальше` are three
 * columns of phrases; `## Влияние`, `## Характер`, `## Плюсы и минусы` and
 * `## Круг` are the organs; `radicals:` is his own reading and a `Формула:`
 * line in a «Радикалы…» section is the questionnaire's. The code knows these
 * headings, formats and kinds of number, never a name from the vault. No data
 * is «—», never 0.
 */
import { cadenceFor, eventsWith, isMeetingRecord, personInfluence, type HabitCount } from "./circle";
import { daysBetween, fmt } from "./dashboard";
import { addDays, plural } from "./dates";
import type { LifeEvent } from "./events";
import { DEBT_THEY_OWE, debtLeft, type Habit, type Life } from "./life";
import { bullets, columnPart, phraseOf, splitSections, type ColumnItem, type ColumnPart } from "./overview";
import { closenessOf, contactsOf, daysToBirthday, debtsFor } from "./people";
import { dateWords, findHabit, lastTouch, shortDate } from "./themeNumbers";
import type { Page } from "./types";
import { asList } from "./vault";

// ---------- the page ----------

/** A pill of «Тянет вверх · вниз». One that is a whole `[[link]]` names its target: a habit, when the page links one. */
export interface Pill extends ColumnItem { label: string; target?: string }
export interface Half { pills: Pill[]; note?: string }
/** `## Влияние`: his answer as a quote, the two halves, a paragraph at the top as the card's source. */
export interface Influence { verdict?: string; note?: string; up?: Half; down?: Half }
export interface Trait { label?: string; text: string }
/** `## Характер`: his five words, the lines `- Подпись — текст`, a later paragraph as the source. */
export interface Character { five: string[]; traits: Trait[]; note?: string }
export interface ProsCons { plus: ColumnItem[]; minus: ColumnItem[]; note?: string }
/** `- Подпись — люди` of `## Круг`: the people as written, "[[Имя]]" or a plain word. */
export interface CircleLine { label: string; people: string[] }

export interface PersonView {
  past: ColumnPart;
  now: ColumnPart;
  next: ColumnPart;
  influence?: Influence;
  character?: Character;
  pros?: ProsCons;
  circle: CircleLine[];
  /** R1–R7 of a `Формула: 2, 1, 5` line in a section whose heading starts with «Радикалы». */
  formula: number[];
}

const HEAD = {
  past: /^было$/i, now: /^сейчас$/i, next: /^дальше$/i, influence: /^влияние$/i,
  character: /^характер$/i, pros: /^плюсы и минусы$/i, circle: /^круг$/i, radicals: /^радикалы/i,
};

/** A rule (`---`) is not text. */
const clean = (md: string) => md.split(/\r?\n/).filter((l) => !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(l)).join("\n");

/** A `[[link]]` is one unit: a « — » or a comma inside it belongs to its title. Same length, so offsets carry over. */
const mask = (s: string) => s.replace(/\[\[[^[\]]*\]\]/g, (m) => "\u0000".repeat(m.length));

/** A label is a word or two («Отличается», «В ссоре»); a longer start before « — » is part of the sentence. */
const LABEL_MAX = 32;

/** «Подпись — текст» cut at the first « — » outside a link. */
function labelled(text: string): { label?: string; text: string } {
  const at = mask(text).indexOf(" — ");
  const label = at < 0 ? "" : text.slice(0, at).trim();
  return !label || label.length > LABEL_MAX ? { text: text.trim() } : { label, text: text.slice(at + 3).trim() };
}

/** The items of «a, [[b]], c.» split at the commas outside links. */
function listOf(text: string): string[] {
  const hidden = mask(text);
  const out: string[] = [];
  let from = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || hidden[i] === ",") { out.push(text.slice(from, i)); from = i + 1; }
  }
  return out.map((s) => s.trim().replace(/\.$/, "").trim()).filter(Boolean);
}

/** `### Заголовок` inside a section: the text before the first one, and each with its body. */
function subSections(md: string): { intro: string; subs: { heading: string; md: string }[] } {
  const parts = ("\n" + md).split(/\n###[ \t]+([^\n]*)/);
  const subs: { heading: string; md: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) subs.push({ heading: parts[i].trim(), md: parts[i + 1] ?? "" });
  return { intro: parts[0], subs };
}

const sub = (subs: { heading: string; md: string }[], re: RegExp) => subs.find((s) => re.test(s.heading));

const LINK = /^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\\?\|([^\]]+))?\]\]$/;

function pillOf(text: string): Pill {
  const p = phraseOf(text);
  const m = p.md.match(LINK);
  return m ? { ...p, label: (m[2] ?? m[1]).trim(), target: m[1].trim() } : { ...p, label: p.md };
}

function halfOf(md: string): Half {
  const { items, rest } = bullets(clean(md));
  const half: Half = { pills: items.map(pillOf) };
  if (rest.length) half.note = rest.join(" ");
  return half;
}

function influenceOf(md: string): Influence | undefined {
  const { intro, subs } = subSections(clean(md));
  const quote: string[] = [], note: string[] = [];
  for (const line of intro.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith(">")) quote.push(line.replace(/^>\s*/, ""));
    else note.push(line);
  }
  const up = sub(subs, /^тянет вверх$/i), down = sub(subs, /^тянет вниз$/i);
  const v: Influence = {};
  if (quote.length) v.verdict = quote.join(" ");
  if (note.length) v.note = note.join(" ");
  if (up) v.up = halfOf(up.md);
  if (down) v.down = halfOf(down.md);
  const said = (h?: Half) => !!h && (h.pills.length > 0 || !!h.note);
  return v.verdict || said(v.up) || said(v.down) ? v : undefined;
}

/** «весёлый · любит признание, тревожный» → the words; a bold label in front (`**Пять слов:**`) is not one of them. */
function fiveOf(line: string): string[] {
  const text = line.replace(/^\*\*[^*]+\*\*\s*:?\s*/, "").replace(/\.$/, "");
  return text.split(/\s*[·,]\s*/).map((w) => w.trim()).filter(Boolean);
}

function characterOf(md: string): Character | undefined {
  const text = clean(md);
  const { items, rest } = bullets(text);
  const first = text.split(/\r?\n/).find((l) => l.trim());
  const opens = !!first && rest[0] === first.trim();
  const c: Character = { five: opens ? fiveOf(rest[0]) : [], traits: items.map(labelled) };
  const note = (opens ? rest.slice(1) : rest).join(" ");
  if (note) c.note = note;
  return c.five.length || c.traits.length ? c : undefined;
}

function prosOf(md: string): ProsCons | undefined {
  const { intro, subs } = subSections(clean(md));
  const list = (re: RegExp) => bullets(sub(subs, re)?.md ?? "").items.map(phraseOf);
  const p: ProsCons = { plus: list(/^плюсы$/i), minus: list(/^минусы$/i) };
  const note = bullets(intro).rest.join(" ");
  if (note) p.note = note;
  return p.plus.length || p.minus.length ? p : undefined;
}

function circleOf(md: string): CircleLine[] {
  return bullets(clean(md)).items.flatMap((t) => {
    const l = labelled(t);
    const people = l.label ? listOf(l.text) : [];
    return l.label && people.length ? [{ label: l.label, people }] : [];
  });
}

const FORMULA = /Формула:\s*(?:\*\*)?\s*([1-7](?:\s*[,→–—-]\s*[1-7])*)/i;

export function personView(body: string): PersonView {
  const sections = splitSections(body).sections;
  const of = (re: RegExp) => sections.find((s) => re.test(s.heading.trim()));
  const column = (re: RegExp) => columnPart(clean(of(re)?.md ?? ""), "");
  const v: PersonView = { past: column(HEAD.past), now: column(HEAD.now), next: column(HEAD.next), circle: [], formula: [] };
  const inf = of(HEAD.influence), ch = of(HEAD.character), pros = of(HEAD.pros), circle = of(HEAD.circle);
  const influence = inf && influenceOf(inf.md);
  if (influence) v.influence = influence;
  const character = ch && characterOf(ch.md);
  if (character) v.character = character;
  const pc = pros && prosOf(pros.md);
  if (pc) v.pros = pc;
  if (circle) v.circle = circleOf(circle.md);
  for (const s of sections) {
    const m = HEAD.radicals.test(s.heading.trim()) ? s.md.match(FORMULA) : null;
    if (m) { v.formula = [...new Set((m[1].match(/[1-7]/g) ?? []).map(Number))]; break; }
  }
  return v;
}

// ---------- radicals ----------

/** Ponomarenko's seven radicals in his order, R1–R7, and the method's word for each: it is about the radical, not the person. `of` is the name after «вместо». */
export const RADICALS: { name: string; of: string; word: string; stem: RegExp }[] = [
  { name: "паранойял", of: "паранойяла", word: "цель", stem: /^параной?я/ },
  { name: "эпилептоид", of: "эпилептоида", word: "порядок", stem: /^эпилепт/ },
  { name: "истероид", of: "истероида", word: "признание", stem: /^истер/ },
  { name: "эмотив", of: "эмотива", word: "чувства", stem: /^эмотив/ },
  { name: "шизоид", of: "шизоида", word: "свой мир", stem: /^шизо/ },
  { name: "гипертим", of: "гипертима", word: "энергия", stem: /^гипертим/ },
  { name: "тревожный", of: "тревожного", word: "безопасность", stem: /^тревож/ },
];

/** The seat (0–6) of a radical as it is written: «паранойял», «паранойяльный», «эпилептоидный»… */
export function radicalSeat(word: string): number | undefined {
  const w = word.trim().toLowerCase().replace(/ё/g, "е");
  const i = RADICALS.findIndex((r) => r.stem.test(w));
  return i >= 0 ? i : undefined;
}

export interface RadicalsView {
  /** His `radicals:`, in his order, as he wrote them. */
  his: string[];
  /** The seats his reading lights. */
  lit: number[];
  /** The seats of the questionnaire's `Формула:`, in its order. */
  reading: number[];
  /** Radicals the reading has and his does not, and his that the reading lacks — by the method's names. */
  extra: string[];
  missing: string[];
}

export function radicalsOf(page: Page, formula: number[]): RadicalsView {
  const his = asList(page.fm.radicals);
  const lit = [...new Set(his.map(radicalSeat).filter((i): i is number => i !== undefined))];
  const reading = formula.map((n) => n - 1).filter((i) => i >= 0 && i < RADICALS.length);
  const names = (seats: number[]) => seats.map((i) => RADICALS[i].name);
  return {
    his, lit, reading,
    extra: reading.length ? names(reading.filter((i) => !lit.includes(i))) : [],
    missing: reading.length ? names(lit.filter((i) => !reading.includes(i))) : [],
  };
}

/** What the questionnaire's reading says against his: «разбор на странице: шизоид вместо гипертима»; `same` when they agree. Undefined without a reading. */
export function radicalsDiff(r: RadicalsView): { text: string; same: boolean } | undefined {
  if (!r.reading.length) return undefined;
  const of = (names: string[]) => names.map((n) => RADICALS.find((x) => x.name === n)?.of ?? n).join(", ");
  if (r.extra.length && r.missing.length) return { text: `разбор на странице: ${r.extra.join(", ")} вместо ${of(r.missing)}`, same: false };
  if (r.extra.length) return { text: `разбор на странице добавляет: ${r.extra.join(", ")}`, same: false };
  if (r.missing.length) return { text: `в разборе на странице нет ${of(r.missing)}`, same: false };
  return { text: "так же в разборе на странице", same: true };
}

// ---------- the numbers ----------

export interface PersonTile {
  label: string;
  /** Pale, right of the label: «ритм — раз в 7 дней», «ты должен», «30 октября». */
  hint?: string;
  value: string;
  unit?: string;
  /** The line under the number; with `tone`, a status with its dot. */
  line?: string;
  tone?: "sage" | "honey";
  /** The pale line at the bottom. */
  note?: string;
  /** «Долг» both ways: the other remainder. */
  second?: { value: string; unit?: string; hint: string };
}

export interface PersonNumbers { contact: PersonTile; together: PersonTile; debt: PersonTile; birthday: PersonTile }

const nDays = (n: number) => plural(n, "день", "дня", "дней");
const records = (n: number) => plural(n, "запись", "записи", "записей");
const isDate = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** «5 ноя»; with the year when it is not this year's: «28 апр 2025». */
export function shortWhen(date: string, today: string): string {
  return date.slice(0, 4) === today.slice(0, 4) ? shortDate(date) : `${shortDate(date)} ${date.slice(0, 4)}`;
}

const HOW: Record<string, string> = { "контакт": "последний контакт", "разговор": "последний разговор", "встреча": "последняя встреча" };

/** «Связь»: days since the latest touch (`lastTouch`), against the rhythm his closeness sets (`cadenceFor`). */
function contactTile(page: Page, people: Page[], life: Life, today: string): PersonTile {
  const label = "Связь";
  const cadence = cadenceFor(closenessOf(page));
  const hint = cadence ? `ритм — раз в ${cadence} ${nDays(cadence)}` : "ритма нет";
  const noRhythm = "ритм считается по близости — её нет";
  const t = lastTouch(page, people, life, today);
  if (!t) return cadence ? { label, hint, value: "—", line: "не отмечена" } : { label, hint, value: "—", line: "не отмечена", note: noRhythm };
  const n = daysBetween(t.date, today);
  const value = n === 0 ? "сегодня" : String(n);
  const unit = n === 0 ? undefined : nDays(n);
  const when = `${HOW[t.how] ?? t.how} — ${shortWhen(t.date, today)}`;
  if (!cadence) return { label, hint, value, unit, line: when, note: noRhythm };
  const late = n - cadence;
  return { label, hint, value, unit, line: late > 0 ? `пора — +${late} дн` : "в ритме", tone: late > 0 ? "honey" : "sage", note: when };
}

/** The memories with a person through today, newest first: events with them, the day's «Встреча» record left out. */
export function memoriesOf(page: Page, people: Page[], events: LifeEvent[], today: string): LifeEvent[] {
  return eventsWith(page, people, events)
    .filter((e) => !isMeetingRecord(e) && isDate(e.date) && e.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function togetherTile(page: Page, people: Page[], life: Life, today: string): PersonTile {
  const label = "Вместе", hint = "воспоминаний";
  const evs = memoriesOf(page, people, life.events, today);
  if (!evs.length) return { label, hint, value: "—", line: "общих событий нет", note: "«Виделись» спросит, создать ли" };
  const last = evs[0], first = evs[evs.length - 1];
  const t: PersonTile = { label, hint, value: String(evs.length), line: `последнее — ${shortWhen(last.date, today)}, «${last.title}»` };
  if (evs.length > 1) t.note = `первое — ${shortWhen(first.date, today)}, «${first.title}»`;
  return t;
}

/** «Долг»: the open remainder by `debts.md`, both ways when money goes both ways. */
function debtTile(page: Page, life: Life, today: string): PersonTile {
  const label = "Долг";
  const all = debtsFor(page, life.debts);
  const open = all.filter((d) => !d.closed && debtLeft(d) > 0);
  if (!open.length) {
    const closed = all.filter((d) => d.closed).length;
    const t: PersonTile = { label, value: "—", line: "в долгах нет" };
    if (closed) t.note = `закрыто ${closed} ${records(closed)}`;
    return t;
  }
  const left = (they: boolean) => open.filter((d) => (d.direction === DEBT_THEY_OWE) === they).reduce((a, d) => a + debtLeft(d), 0);
  const mine = left(false), theirs = left(true);
  const since = open.map((d) => d.since).filter(isDate).sort();
  const span = !since.length ? "" : since[0] === since[since.length - 1] ? shortWhen(since[0], today) : `${shortWhen(since[0], today)} – ${shortWhen(since[since.length - 1], today)}`;
  const paid = open.reduce((a, d) => a + d.paid + (d.auto ?? 0), 0);
  const t: PersonTile = {
    label, hint: mine ? "ты должен" : "тебе должны", value: fmt(mine || theirs), unit: "₸",
    line: [`${open.length} ${records(open.length)}`, span].filter(Boolean).join(" · "), note: `выплачено ${fmt(paid)}`,
  };
  if (mine && theirs) t.second = { value: fmt(theirs), unit: "₸", hint: "тебе должны" };
  return t;
}

/** «День рождения»: days to the next one; this year's, when it has passed, with the event of that day. */
function birthdayTile(page: Page, people: Page[], life: Life, today: string): PersonTile {
  const label = "День рождения";
  const b = contactsOf(page).birthday;
  const n = daysToBirthday(b, today);
  if (n === undefined) return { label, value: "—", line: "не записан" };
  const next = addDays(today, n);
  const thisYear = `${today.slice(0, 4)}${next.slice(4)}`;
  // the day and the month, never the year: «30 октября»
  const t: PersonTile = { label, hint: dateWords(thisYear, thisYear), value: n === 0 ? "сегодня" : String(n), unit: n === 0 ? undefined : nDays(n) };
  if (thisYear > today) return t;
  const that = eventsWith(page, people, life.events).filter((e) => e.date === thisYear);
  const ev = that.find((e) => !isMeetingRecord(e));
  if (ev) return { ...t, line: `в этот раз — «${ev.title}»`, note: "общее событие в тот же день" };
  if (that.length) return { ...t, line: "в этот раз — виделись" };
  return n === 0 ? t : { ...t, line: "в этот раз — событий нет", note: dateWords(next, today) };
}

export function personNumbers(page: Page, people: Page[], life: Life, today: string): PersonNumbers {
  return {
    contact: contactTile(page, people, life, today),
    together: togetherTile(page, people, life, today),
    debt: debtTile(page, life, today),
    birthday: birthdayTile(page, people, life, today),
  };
}

// ---------- the influence count ----------

export interface InfluenceCount {
  /** The days with the person in the 90 days ending yesterday, oldest first, and those with a day file. */
  meetings: string[];
  withFile: string[];
  /** One count a habit a half links to. */
  up: HabitCount[];
  down: HabitCount[];
}

/** The habits the halves of `## Влияние` link to, counted on the days of the meetings (`personInfluence`). */
export function influenceCount(inf: Influence, page: Page, people: Page[], life: Life, today: string): InfluenceCount {
  const habits = (h?: Half) => [...new Set((h?.pills ?? []).map((p) => (p.target ? findHabit(life, p.target) : undefined)).filter((x): x is Habit => !!x))];
  const up = habits(inf.up), down = habits(inf.down);
  const all = [...new Set([...up, ...down])];
  const c = personInfluence(page, people, life, all, today);
  const row = (h: Habit) => c.rows[all.indexOf(h)];
  return { meetings: c.meetings, withFile: c.withFile, up: up.map(row), down: down.map(row) };
}

/** A habit's line under its beads: «вместе — срыв 1 из 1 · порознь — 21 из 46». */
export function countWords(c: HabitCount): { together: string; apart: string } {
  const did = c.habit.kind === "bad" ? "срыв" : "сделал";
  const together = !c.beads.length ? "вместе — встреч нет"
    : !c.counted ? "вместе — дни не записаны"
    : !c.marked ? "вместе — без отметки"
    : `вместе — ${did} ${c.hits} из ${c.counted}`;
  return { together, apart: c.apart ? `порознь — ${c.apartHits} из ${c.apart}` : "порознь — дней нет" };
}

/** The line under the counts: the meetings, the days written, «судить рано» while fewer than three are. */
export function meetingsFoot(meetings: string[], withFile: string[], today: string): string {
  if (!meetings.length) return "встреч за 90 дней нет";
  const list = (ds: string[]) => ds.map((d) => shortWhen(d, today)).join(", ");
  const met = meetings.length <= 6 ? `встреча — общее событие: ${list(meetings)}` : `встреч за 90 дней — ${meetings.length}`;
  if (!withFile.length) return `${met} · ни один из этих дней не записан — судить рано`;
  if (withFile.length >= 3) return `${met} · дни записаны у ${withFile.length} из ${meetings.length}`;
  const only = withFile.length < meetings.length ? " только" : "";
  return `${met} · ${withFile.length === 1 ? "день записан" : "дни записаны"}${only} ${list(withFile)} — судить рано`;
}

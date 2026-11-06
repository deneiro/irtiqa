/**
 * «📸 Воспоминание» in the Telegram bot: the pure half. The bot asks one
 * question at a time (what happened, with whom, a few words, photos) and saves
 * an event the way the app's own form does (`serializeEvent`), with the photos
 * beside it. Everything that can be decided without Telegram or the disk is
 * here, so it can be tested: the title and the date he typed, the people he
 * chose or named, the photo a message carries, the text of the event and of the
 * closing reply.
 */
import type { Page } from "./types";
import { byLastContactOrMeeting, type CircleItem } from "./circle";
import { IMAGE_RE, serializeEvent } from "./events";
import { addDays, toDateStr } from "./dates";
import { safeFilename } from "./life";
import { findPerson, isAuthor, nameKey } from "./people";

export const MEMORY_THEME = "Memories & Fun";

// ---------- what he types ----------

export const TITLE_MAX = 80;

/** The title of an event on one line. Not usable when no file name can be made from it or when it is too long for one. */
export function eventTitle(text: string): { ok: true; title: string } | { ok: false; why: "empty" | "long" } {
  const title = text.replace(/\s+/g, " ").trim();
  if (!safeFilename(title)) return { ok: false, why: "empty" };
  if (title.length > TITLE_MAX) return { ok: false, why: "long" };
  return { ok: true, title };
}

export type DateAnswer = { ok: true; date: string } | { ok: false; why: "format" | "future" };

const DAY_WORDS = new Map([["сегодня", 0], ["вчера", -1], ["позавчера", -2]]);

/** A real calendar day as YYYY-MM-DD, or undefined («31 февраля»). */
function calendarDay(y: number, m: number, d: number): string | undefined {
  if (y < 1900 || y > 2999) return undefined;
  const s = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return toDateStr(new Date(`${s}T12:00:00`)) === s ? s : undefined;
}

/**
 * The day of a memory: «2026-11-05», «вчера», «позавчера», «сегодня», or the
 * way it is written at home — «05.11», «5.11.2026», «05.11.26». A day and a
 * month without a year is the latest such day that is not ahead of today. A
 * memory is something that already happened, so a day after today is refused.
 */
export function parseDateInput(text: string, today: string): DateAnswer {
  const t = text.trim().toLowerCase().replace(/ё/g, "е").replace(/[.!\s]+$/, "");
  let date: string | undefined;
  const word = DAY_WORDS.get(t);
  if (word !== undefined) date = addDays(today, word);
  else {
    const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const ru = t.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{4}|\d{2}))?$/);
    if (iso) date = calendarDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    else if (ru) {
      const year = ru[3] ? (ru[3].length === 2 ? 2000 + Number(ru[3]) : Number(ru[3])) : Number(today.slice(0, 4));
      date = calendarDay(year, Number(ru[2]), Number(ru[1]));
      if (date && !ru[3] && date > today) date = calendarDay(year - 1, Number(ru[2]), Number(ru[1]));
    }
    if (!date) return { ok: false, why: "format" };
  }
  return date > today ? { ok: false, why: "future" } : { ok: true, date };
}

// ---------- with whom ----------

/**
 * One person of a memory: a page of the circle (`rel` and `file` set, `name` is
 * its title) or a name that has no page.
 */
export type Who = { name: string; rel?: undefined; file?: undefined } | { name: string; rel: string; file: string };
export type PageWho = Extract<Who, { rel: string }>;

const sameWho = (a: Who, b: Who) => (a.rel || b.rel ? a.rel === b.rel : nameKey(a.name) === nameKey(b.name));

/** «Человек А, Человек Б» → two names; separators are a comma, a semicolon and a new line; `[[…]]` around a name is dropped. */
export function splitNames(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[,;\n]+/)
    .map((s) => s.replace(/^\s*\[\[|\]\]\s*$/g, "").replace(/\s+/g, " ").trim())
    .filter((s) => {
      const k = nameKey(s);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/** A name has a letter and is short: «-», «.», «👍» are not names, and a longer line is a sentence typed at the wrong step. */
export const looksLikeName = (s: string) => /\p{L}/u.test(s) && s.length <= 40 && s.split(" ").length <= 4;

/** The buttons toggle: a chosen person is taken off, one who is not chosen is added. */
export function toggleWho(chosen: Who[], who: Who): Who[] {
  return chosen.some((p) => sameWho(p, who)) ? chosen.filter((p) => !sameWho(p, who)) : [...chosen, who];
}

/**
 * Names he typed instead of tapping: each is matched to a person page by title,
 * file name or alias, and kept as plain text when there is none (no page is
 * made here). A line that does not look like a name is rejected, not kept.
 */
export function addTyped(chosen: Who[], pages: Page[], text: string): { people: Who[]; added: Who[]; rejected: string[] } {
  const people = [...chosen];
  const added: Who[] = [];
  const rejected: string[] = [];
  for (const name of splitNames(text)) {
    const page = findPerson(pages, name);
    if (!page && !looksLikeName(name)) { rejected.push(name); continue; }
    const who: Who = page ? { name: page.title, rel: page.rel, file: page.file } : { name };
    if (people.some((p) => sameWho(p, who))) continue;
    people.push(who);
    added.push(who);
  }
  return { people, added, rejected };
}

/** «Имя, Имя (нет страницы)» — what the question shows as chosen. */
export const whoList = (people: Who[]) => people.map((w) => (w.rel ? w.name : `${w.name} (нет страницы)`)).join(", ");

export const POOL_SIZE = 14;

/** The people offered as buttons: the circle without authors and templates, the most recently touched first. */
export function memoryPool(items: CircleItem[], limit = POOL_SIZE): PageWho[] {
  return byLastContactOrMeeting(items.filter((i) => !isAuthor(i.page) && i.page.type !== "template"))
    .slice(0, limit)
    .map((i) => ({ name: i.name, rel: i.page.rel, file: i.page.file }));
}

// ---------- words typed instead of a button ----------

/** «готово» at «С кем?» and at the photos. */
export const DONE_WORDS = /^(готово|всё|все|хватит|конец)[.!]?$/i;
/** «без фото» at the photos. */
export const NO_PHOTO_WORDS = /^(без фото|нет|не надо)[.!]?$/i;
/** «ни с кем» at «С кем?»; «нет» answers that question too, it is not a person. */
export const NOBODY_WORDS = /^(ни с кем|никого|один|одна|сам|нет)[.!]?$/i;
/** «пропустить» at the description and at the free questions about a new person. */
export const SKIP_WORDS = /^(пропустить|пропуск|нет|-|—)[.!]?$/i;

// ---------- photos ----------

export interface PhotoSize { file_id: string; width: number; height: number; file_size?: number }
export interface DocumentInfo { file_id: string; file_name?: string; mime_type?: string }

/** Telegram sends every photo in several sizes; the biggest is the one worth keeping. */
export function largestPhoto(sizes: PhotoSize[]): PhotoSize | undefined {
  return [...sizes].sort((a, b) => b.width * b.height - a.width * a.height || (b.file_size ?? 0) - (a.file_size ?? 0))[0];
}

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/gif": ".gif",
  "image/webp": ".webp", "image/heic": ".heic", "image/heif": ".heic", "image/avif": ".avif",
};

/** The extension of an image the app can show: from the file name when it has one it knows, else from the mime type. */
export function imageExt(name: string | undefined, mime: string | undefined): string | undefined {
  const byName = name?.match(IMAGE_RE);
  if (byName) return byName[0].toLowerCase();
  return mime ? MIME_EXT[mime.toLowerCase()] : undefined;
}

export interface PhotoPick { fileId: string; ext: string }

/**
 * The photo in a message: the largest size of a photo, or an image sent as a
 * document (the original, not compressed). `undefined` when the message has no
 * image; «unsupported» when it is an image the app cannot show.
 */
export function photoPick(m: { photo?: PhotoSize[]; document?: DocumentInfo }): PhotoPick | "unsupported" | undefined {
  if (m.photo?.length) {
    const best = largestPhoto(m.photo);
    return best && { fileId: best.file_id, ext: ".jpg" }; // Telegram re-encodes a photo to JPEG
  }
  const doc = m.document;
  if (!doc) return undefined;
  const image = !!doc.mime_type?.toLowerCase().startsWith("image/") || (!!doc.file_name && IMAGE_RE.test(doc.file_name));
  if (!image) return undefined;
  const ext = imageExt(doc.file_name, doc.mime_type);
  return ext ? { fileId: doc.file_id, ext } : "unsupported";
}

/** `photo-1.jpg`, `photo-2.jpg`, … in the order they were sent. */
export const photoName = (n: number, ext: string) => `photo-${n}${ext}`;

// ---------- what is written and what is said ----------

/**
 * How a chosen person is linked in `people:`: by the file name, which is what
 * Obsidian resolves (and what contact.ts links by), with the title after a bar
 * when the two differ. `personName` reads the file name from both forms, so the
 * circle and the person page find the event either way. A person with no page
 * stays plain text.
 */
export function whoLink(w: Who): string {
  if (!w.rel) return w.name;
  const same = w.file.normalize("NFC") === w.name.normalize("NFC");
  return same || /[\[\]|#^]/.test(w.name) ? `[[${w.file}]]` : `[[${w.file}|${w.name}]]`;
}

/** The event file: the same text the app's own form writes, with the description as the body. */
export function memoryEventText(m: { title: string; date: string; people: Who[]; text: string }): string {
  return serializeEvent({
    title: m.title,
    date: m.date,
    theme: MEMORY_THEME,
    place: "",
    people: m.people.map(whoLink),
    tags: [],
    body: m.text,
  });
}

/** «📸 Записано: Событие Б · 2026-11-05 · с кем: Человек А · фото: 3» — the closing reply. */
export function memorySummary(m: { title: string; date: string; people: Who[]; photos: number }): string {
  return [
    `📸 Записано: ${m.title}`,
    m.date,
    m.people.length ? `с кем: ${m.people.map((w) => w.name).join(", ")}` : "",
    `фото: ${m.photos}`,
  ].filter(Boolean).join(" · ");
}

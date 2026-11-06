/**
 * Recording a contact with someone in the circle: writing to them counts as
 * contact (`last_contact` on their page), meeting them counts too and joins
 * the day's «Встреча» event. Pure: returns the files to write, so the Circle
 * screen and the Telegram bot record a contact the same way.
 */
import { setFrontmatterKeys } from "./frontmatter";
import { eventDir, personName, serializeEvent, type LifeEvent } from "./events";
import { MEETING_TITLE } from "./circle";
import { parseFrontmatter } from "./vault";
import { MEMORY_THEME, TITLE_MAX, eventTitle, whoLink, type PageWho } from "./memory";

export interface FileEdit { rel: string; content: string }
export interface PersonFile { rel: string; file: string; raw: string }

/** `stamp` is the day of the edit for `updated:`; it differs from `date` when the contact was on an earlier day. */
export function contactEdits(
  person: PersonFile,
  events: LifeEvent[],
  date: string,
  met: boolean,
  theme = "Social & friends",
  stamp = date,
): FileEdit[] {
  const edits: FileEdit[] = [{ rel: person.rel, content: setFrontmatterKeys(person.raw, { last_contact: date, updated: stamp }) }];
  if (!met) return edits;
  const link = `[[${person.file}]]`;
  const existing = events.find((e) => e.date === date && e.title === MEETING_TITLE);
  if (existing) {
    if (!existing.people.some((p) => personName(p).toLowerCase() === person.file.toLowerCase())) {
      edits.push({ rel: existing.rel, content: serializeEvent({ ...existing, people: [...existing.people, link] }) });
    }
  } else {
    edits.push({
      rel: `${eventDir(date, MEETING_TITLE)}/event.md`,
      content: serializeEvent({
        title: MEETING_TITLE, date, theme, place: "", people: [link], tags: ["встреча"],
        body: "Кого видел сегодня. Приложение дописывает сюда людей кнопкой «виделись»; текст и фото можно добавить самому.",
      }),
    });
  }
  return edits;
}

/**
 * A meeting recorded as an event (the bot's «📸 Воспоминание») is a contact:
 * `last_contact` is the day of the event on every page of the people who were
 * there, `updated` is today. The event itself is the meeting record, so no
 * «Встреча» event is added. `last_contact` never moves back to an earlier day
 * than the page already holds, and never forward past today.
 */
export function memoryContactEdits(people: PersonFile[], date: string, today: string): FileEdit[] {
  if (date > today) return [];
  const edits: FileEdit[] = [];
  for (const p of people) {
    const last = parseFrontmatter(p.raw).fm.last_contact;
    const text = last instanceof Date ? last.toISOString().slice(0, 10) : typeof last === "string" ? last.trim() : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text) && text >= date) continue; // a later contact is already on the page; anything that is not a date is replaced
    edits.push(...contactEdits(p, [], date, false, undefined, today));
  }
  return edits;
}

/** What «Создать воспоминание?» holds (spec v5). `people` are the others who were there, linked as the bot links them (`whoLink`). */
export interface MemoryForm { title: string; place: string; people: string[]; body: string; theme: string }

/**
 * «Виделись» → «Создать воспоминание?» (spec v5): the event of a memory with
 * the person, written as the event form writes one, the person always first
 * among its people; the title follows the bot's rule (`eventTitle`), the theme
 * is «Досуг» unless he picks another. The memory is the meeting, so no
 * «Встреча» is written, and `last_contact` is the button's own edit
 * (`contactEdits`). Throws when that day already has an event of that name, or
 * the name makes no folder or is too long.
 */
export function memoryEdits(person: PageWho, form: MemoryForm, date: string, events: LifeEvent[]): FileEdit {
  const t = eventTitle(form.title);
  if (!t.ok) throw new Error(t.why === "long" ? `Что было — не длиннее ${TITLE_MAX} знаков` : "Что было — нужно название");
  const title = t.title;
  const dir = eventDir(date, title);
  const key = (d: string) => d.normalize("NFC").toLowerCase();
  if (events.some((e) => key(e.dir) === key(dir))) throw new Error("Событие с таким названием в этот день уже есть");
  const people = [whoLink(person)];
  const seen = new Set([person.file.toLowerCase()]);
  for (const raw of form.people) {
    const k = personName(raw).toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    people.push(raw.trim());
  }
  const content = serializeEvent({ title, date, theme: form.theme || MEMORY_THEME, place: form.place.replace(/\s+/g, " ").trim(), people, tags: [], body: form.body });
  return { rel: `${dir}/event.md`, content };
}

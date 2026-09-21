/**
 * Recording a contact with someone in the circle: writing to them counts as
 * contact (`last_contact` on their page), meeting them counts too and joins
 * the day's «Встреча» event. Pure: returns the files to write, so the Circle
 * screen and the Telegram bot record a contact the same way.
 */
import { setFrontmatterKeys } from "./frontmatter";
import { eventDir, personName, serializeEvent, type LifeEvent } from "./events";
import { MEETING_TITLE } from "./circle";

export interface FileEdit { rel: string; content: string }

export function contactEdits(
  person: { rel: string; file: string; raw: string },
  events: LifeEvent[],
  date: string,
  met: boolean,
  theme = "Social & friends",
): FileEdit[] {
  const edits: FileEdit[] = [{ rel: person.rel, content: setFrontmatterKeys(person.raw, { last_contact: date, updated: date }) }];
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

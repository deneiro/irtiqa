/**
 * Events: what actually happened, with photos and the people who were there.
 * One folder per event under `life/events/`, holding `event.md` and the images,
 * so the memory and its pictures never drift apart.
 */
import type { MdFile } from "./types";
import { parseFrontmatter } from "./vault";
import { asList } from "./vault";
import { normalizeTime, safeFilename } from "./life";

export const EVENT_DIR = "life/events";
export const IMAGE_RE = /\.(jpe?g|png|gif|webp|heic|avif)$/i;

export interface LifeEvent {
  rel: string; // life/events/<folder>/event.md
  dir: string; // life/events/<folder>
  title: string;
  date: string;
  theme: string | undefined;
  place: string;
  /** HH:MM or "" — an event with a time is drawn on the calendar. */
  from: string;
  to: string;
  people: string[]; // raw "[[Имя]]" or plain names
  tags: string[];
  body: string;
  photos: string[]; // vault-relative paths, filled from the media list
}

const str = (v: unknown): string => {
  if (v === undefined || v === null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

export function eventDir(date: string, title: string): string {
  return `${EVENT_DIR}/${date} ${safeFilename(title)}`.replace(/\s+$/, "");
}

export function parseEvent(f: MdFile, media: string[]): LifeEvent {
  const { fm, body } = parseFrontmatter(f.content);
  const dir = f.rel.slice(0, f.rel.lastIndexOf("/"));
  const folder = dir.slice(dir.lastIndexOf("/") + 1);
  const fromFolder = folder.match(/^(\d{4}-\d{2}-\d{2})\s+(.*)$/);
  return {
    rel: f.rel,
    dir,
    title: str(fm.title) || (fromFolder ? fromFolder[2] : folder),
    date: str(fm.date) || (fromFolder ? fromFolder[1] : ""),
    theme: str(fm.theme) || undefined,
    place: str(fm.place),
    from: normalizeTime(str(fm.from)),
    to: str(fm.to) === "24:00" ? "24:00" : normalizeTime(str(fm.to)),
    people: asList(fm.people),
    tags: asList(fm.tags),
    body: body.replace(/^\s*# [^\n]*\n/, "").trim(),
    photos: media.filter((m) => m.startsWith(dir + "/") && IMAGE_RE.test(m)).sort(),
  };
}

export function serializeEvent(e: Omit<LifeEvent, "rel" | "dir" | "photos" | "from" | "to"> & { from?: string; to?: string }): string {
  const yaml = (v: string) => (/[:#"'\[\]{}]|^\s|\s$/.test(v) ? JSON.stringify(v) : v);
  const lines = [
    "---",
    `title: ${yaml(e.title)}`,
    "type: event",
    `date: ${e.date}`,
  ];
  if (e.theme) lines.push(`theme: ${e.theme}`);
  if (e.place) lines.push(`place: ${yaml(e.place)}`);
  if (e.from) lines.push(`from: "${e.from}"`);
  if (e.from && e.to) lines.push(`to: "${e.to}"`);
  lines.push(`people: [${e.people.map(yaml).join(", ")}]`);
  if (e.tags.length) lines.push(`tags: [${e.tags.map(yaml).join(", ")}]`);
  lines.push("---", "", e.body.trim(), "");
  return lines.join("\n");
}

/** The page title a "[[Link|alias]]" or plain name points at. */
export function personName(raw: string): string {
  const m = raw.match(/^\[\[([^\]|#]+)/);
  return (m ? m[1] : raw).trim();
}

export function eventsFor(names: string[], events: LifeEvent[]): LifeEvent[] {
  const set = new Set(names.map((n) => n.toLowerCase()));
  return events.filter((e) => e.people.some((p) => set.has(personName(p).toLowerCase())));
}

export function eventUrl(e: LifeEvent): string {
  return `/event/${encodeURIComponent(e.rel)}`;
}

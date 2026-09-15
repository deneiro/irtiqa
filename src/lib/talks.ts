/**
 * Разговоры. The family theme's own diagnosis is not «мало контактов» but
 * silence under one roof: с отцом нет разговора длиннее десяти минут. So the
 * thing worth recording here is a conversation and what it was about — not a
 * message sent.
 *
 * One app-owned table in `life/talks.md`, because a talk belongs to the log of
 * what happened, not to the person's page.
 */
import type { MdFile } from "./types";
import { personName } from "./events";

export { TALKS_REL } from "./life";

export interface Talk { date: string; who: string; about: string }

const HEAD = [
  "---",
  "type: ledger",
  "updated: {date}",
  "---",
  "# Разговоры",
  "",
  "Кто с кем говорил и о чём. Пишет приложение, кнопкой «поговорили» в теме",
  "«Семья и отношения». Ссылка ведёт на страницу человека.",
  "",
  "| Дата | С кем | О чём |",
  "|---|---|---|",
];

export function parseTalks(content: string): Talk[] {
  const out: Talk[] = [];
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const cells = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
    if (cells.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(cells[0])) continue;
    out.push({ date: cells[0], who: cells[1], about: cells[2] ?? "" });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function serializeTalks(talks: Talk[], today: string): string {
  const rows = [...talks]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => `| ${t.date} | ${t.who} | ${t.about} |`);
  return HEAD.map((l) => l.replace("{date}", today)).concat(rows).join("\n") + "\n";
}

/** The most recent talk with any of those names. */
export function lastTalk(talks: Talk[], names: string[]): Talk | undefined {
  const set = new Set(names.map((n) => n.toLowerCase()));
  return talks.find((t) => set.has(personName(t.who).toLowerCase()));
}

export function parseTalksFile(f: MdFile | undefined): Talk[] {
  return f ? parseTalks(f.content) : [];
}

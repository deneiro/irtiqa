/**
 * Что Эльдар посмотрел и прочитал: фильмы, сериалы, книги. One table in
 * `life/library.md` — title, kind, his 1–10 score, an optional comment. Not a
 * reading plan and not knowledge: a book's ideas live on its Resource page,
 * here only what he thought of it.
 */
export { LIBRARY_REL } from "./life";

export const LIBRARY_KINDS = [
  { key: "film", label: "фильм", plural: "фильмы" },
  { key: "series", label: "сериал", plural: "сериалы" },
  { key: "book", label: "книга", plural: "книги" },
] as const;

export type LibraryKind = (typeof LIBRARY_KINDS)[number]["key"];

export interface LibraryItem {
  title: string;
  kind: LibraryKind;
  /** 1–10, or undefined when not rated yet. */
  score: number | undefined;
  comment: string;
}

const BY_LABEL: Record<string, LibraryKind> = { фильм: "film", сериал: "series", книга: "book" };
const LABEL: Record<LibraryKind, string> = { film: "фильм", series: "сериал", book: "книга" };

/** A pipe inside a cell would break the table: keep the text, lose the pipe. */
const cell = (s: string) => s.replace(/\|/g, "/").replace(/\s+/g, " ").trim();

export function parseLibrary(content: string): LibraryItem[] {
  const out: LibraryItem[] = [];
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const c = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((x) => x.trim());
    if (c.length < 2 || c[0] === "Что" || c.every((x) => /^-*$/.test(x))) continue;
    const kind = BY_LABEL[c[1].toLowerCase()];
    if (!kind || !c[0]) continue;
    const n = Number(c[2]);
    out.push({ title: c[0], kind, score: c[2] && n >= 1 && n <= 10 ? Math.round(n) : undefined, comment: c[3] ?? "" });
  }
  return out;
}

const HEAD = [
  "---",
  "type: ledger",
  "updated: {date}",
  "---",
  "# Посмотрел и прочитал",
  "",
  "Фильмы, сериалы и книги: название, оценка Эльдара от 1 до 10, комментарий",
  "если есть. Оценка — его, никто её не угадывает. Идеи книги живут на её",
  "Resource-странице, здесь только отношение. Пишет приложение, тема",
  "«Воспоминания и досуг».",
  "",
  "| Что | Тип | Оценка | Комментарий |",
  "|---|---|---|---|",
];

export function serializeLibrary(items: LibraryItem[], today: string): string {
  const order: LibraryKind[] = ["film", "series", "book"];
  const rows = [...items]
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title, "ru"))
    .map((i) => `| ${cell(i.title)} | ${LABEL[i.kind]} | ${i.score ?? ""} | ${cell(i.comment)} |`);
  return HEAD.map((l) => l.replace("{date}", today)).concat(rows).join("\n") + "\n";
}

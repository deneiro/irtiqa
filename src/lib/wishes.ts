/**
 * Список желаний. The Memories theme's job is to hold what Eldar wants to live
 * through — хадж, мотоцикл, бой, Вьетнам — in the same three states the Quran
 * grid uses: хочу → делаю → сделал. A wish is not a quest: it has no deadline
 * and no sessions, and it can sit for years without being a failure.
 */
export { WISHES_REL } from "./life";

export const WISH_STATES = [
  { key: "want", label: "хочу", hint: "ещё не начато" },
  { key: "doing", label: "делаю", hint: "первый шаг сделан" },
  { key: "done", label: "сделал", hint: "прожито" },
] as const;

export type WishState = (typeof WISH_STATES)[number]["key"];

export interface Wish {
  title: string;
  state: WishState;
  since: string;
  note: string;
}

const BY_LABEL: Record<string, WishState> = { хочу: "want", делаю: "doing", сделал: "done" };

export function parseWishes(content: string): Wish[] {
  const out: Wish[] = [];
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const c = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((x) => x.trim());
    if (c.length < 2 || c[0] === "Что" || c.every((x) => /^-*$/.test(x))) continue;
    const state = BY_LABEL[c[1].toLowerCase()];
    if (!state) continue;
    out.push({ title: c[0], state, since: c[2] ?? "", note: c[3] ?? "" });
  }
  return out;
}

const HEAD = [
  "---",
  "type: ledger",
  "updated: {date}",
  "---",
  "# Желания",
  "",
  "Что Эльдар хочет прожить. Не квесты: у желания нет срока и нет сессий, оно",
  "может годами лежать в «хочу» и это не провал. Состояния — хочу, делаю,",
  "сделал; пишет приложение, тема «Воспоминания и досуг».",
  "",
  "| Что | Состояние | С даты | Заметка |",
  "|---|---|---|---|",
];

const LABEL: Record<WishState, string> = { want: "хочу", doing: "делаю", done: "сделал" };

export function serializeWishes(wishes: Wish[], today: string): string {
  const order: WishState[] = ["doing", "want", "done"];
  const rows = [...wishes]
    .sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state) || a.title.localeCompare(b.title, "ru"))
    .map((w) => `| ${w.title} | ${LABEL[w.state]} | ${w.since} | ${w.note} |`);
  return HEAD.map((l) => l.replace("{date}", today)).concat(rows).join("\n") + "\n";
}

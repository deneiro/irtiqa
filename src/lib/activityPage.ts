/**
 * What the activity page reads from an activity file (schema 4.0, `life/activities/`): the lines above the first
 * `##` (what it is, how to tell it goes well), `## Сейчас`, the file's own sections, and `## Журнал` in every way
 * it is written. `## Шаги` and `## Итог` are read by `questSteps` and `questOutcome` (life.ts). Pure.
 */
import { bullets, splitSections } from "./overview";

export interface ActivityParts {
  /** The paragraphs above the first `##`, each on one line. */
  intro: string[];
  /** `## Сейчас`: its bullets, then any other line. */
  now: string[];
  /** Any other section of the file («Этапы воронки», «Метрики»…), in file order, without the empty ones. */
  other: { heading: string; md: string }[];
}

const OWN = /^(сейчас|шаги|итог|журнал)$/i;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

export function activityParts(body: string): ActivityParts {
  const { intro, sections } = splitSections(body);
  const paragraphs = intro.split(/\n\s*\n/).map((p) => p.split(/\r?\n/).filter((l) => !RULE.test(l)).map((l) => l.trim()).join(" ").trim()).filter(Boolean);
  const nowMd = sections.find((s) => /^сейчас$/i.test(s.heading))?.md ?? "";
  const { items, rest } = bullets(nowMd.split(/\r?\n/).filter((l) => !RULE.test(l)).join("\n"));
  return {
    intro: paragraphs,
    now: [...items, ...rest].map((l) => l.replace(/^\[[ xX]\]\s*/, "")).filter(Boolean),
    other: sections.filter((s) => !OWN.test(s.heading) && s.md.trim()).map((s) => ({ heading: s.heading, md: s.md })),
  };
}

export interface JournalLine { date: string; minutes?: number; note: string }

const ENTRY = /^\s*[-*]\s*(\d{4}-\d{2}-\d{2})\s*(?:·\s*(\d+)\s*мин(?![а-яё])\s*)?(?:[·—–-]\s*)?(.*)$/;

/**
 * `## Журнал`, whichever way a line is written: `- дата · N мин — что` (a session of the timer), `- дата · что`
 * and `- дата — что` (Claude's lines). An indented line goes on with the line above; a line without a date is not
 * an entry. Newest first; of one day, the line written lower in the file first.
 */
export function activityJournal(body: string): JournalLine[] {
  const md = splitSections(body).sections.find((s) => /^журнал$/i.test(s.heading))?.md ?? "";
  const out: (JournalLine & { i: number })[] = [];
  let open = false;
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(ENTRY);
    if (m) {
      const e: JournalLine & { i: number } = { date: m[1], note: m[3].trim(), i: out.length };
      if (m[2]) e.minutes = Number(m[2]);
      out.push(e);
      open = true;
    } else if (open && /^\s+\S/.test(line)) out[out.length - 1].note += " " + line.trim();
    else open = false;
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.i - a.i).map(({ i: _i, ...e }) => e);
}

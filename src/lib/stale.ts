/**
 * Overviews are prose written by Claude and Eldar; quests are state kept by the
 * app. When a quest closes, the overview line that called it a «лягушка» or put
 * it «в движении» stays as it was — on 2026-09-21 four overviews still listed
 * quests closed days earlier. This finds those lines so the drift is visible
 * where the prose is read, instead of being rewritten behind anyone's back.
 */
import type { Day, Quest, QuestOutcome } from "./life";
import { questOutcome } from "./life";

export interface StaleMention {
  quest: Quest;
  /** When it closed: its «Итог» line, or the day file that recorded it. */
  closedOn: string | undefined;
  outcome: QuestOutcome | undefined;
  /** The overview line that still talks about it. */
  line: string;
}

/** Short titles («Иртика») match ordinary words; only a title this long is specific enough. */
const MIN_TITLE = 10;

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[«»"*_`[\]|]/g, "").replace(/[—–-]/g, "-").replace(/\s+/g, " ").trim();

export function staleMentions(md: string, quests: Quest[], days: Iterable<Day>): StaleMention[] {
  const closed = quests.filter((q) => (q.status === "done" || q.status === "dropped") && norm(q.title).length >= MIN_TITLE);
  if (!closed.length || !md.trim()) return [];
  const closedDay = new Map<string, string>();
  for (const d of days) for (const t of d.questsClosed) if (!closedDay.has(t) || closedDay.get(t)! < d.date) closedDay.set(t, d.date);
  const out: StaleMention[] = [];
  const seen = new Set<string>();
  for (const raw of md.split(/\r?\n/)) {
    const line = norm(raw);
    if (!line) continue;
    for (const q of closed) {
      if (seen.has(q.title) || !line.includes(norm(q.title))) continue;
      seen.add(q.title);
      const outcome = questOutcome(q.body);
      out.push({ quest: q, outcome, closedOn: outcome?.date ?? closedDay.get(q.title), line: raw.replace(/^\s*[-*]\s+/, "").replace(/\*\*|__/g, "").trim() });
    }
  }
  return out;
}

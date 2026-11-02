/**
 * Closing day files: seal each one, refresh or append its `day` line in
 * wiki/log.md, one commit for all of them. Shared by the «Утро» screen (the
 * morning «Готово» for yesterday, and the auto-close of anything older) and
 * kept identical in effect to the Day screen's own routine.
 */
import { closeDay, dayLogLine, dayRel, mergeDay, parseDay, serializeDay, type Day, type Habit } from "./life";

export interface CloseDeps {
  readFresh: (rel: string) => Promise<string | null>;
  saveText: (rel: string, content: string) => Promise<void>;
  commitVault: (message: string) => Promise<unknown>;
  habits: Habit[];
  logText: string;
}

export function withDayLine(logText: string, line: string): string {
  const head = line.split(" | ")[0];
  const lines = logText.split("\n");
  const at = lines.findIndex((l) => l.startsWith(head));
  if (at >= 0) return lines[at] === line ? logText : (lines[at] = line, lines.join("\n"));
  return logText.replace(/\s*$/, "") + "\n\n" + line + "\n";
}

/** `base` is the day as this screen last saw it on disk; `ours` carries the screen's marks. */
export async function closeDays(items: { base: Day; ours: Day }[], deps: CloseDeps): Promise<Day[]> {
  let logText = (await deps.readFresh("wiki/log.md")) ?? deps.logText;
  const closed: Day[] = [];
  for (const { base, ours } of items) {
    const onDisk = await deps.readFresh(dayRel(ours.date));
    const fresh = onDisk === null ? ours : parseDay({ rel: dayRel(ours.date), content: onDisk, mtime: 0 });
    const day = closeDay(mergeDay(base, ours, fresh), deps.habits);
    await deps.saveText(dayRel(day.date), serializeDay(day));
    const next = withDayLine(logText, dayLogLine(day, deps.habits));
    if (next !== logText) { logText = next; await deps.saveText("wiki/log.md", logText); }
    closed.push(day);
  }
  if (closed.length) await deps.commitVault(closed.length === 1 ? `day ${closed[0].date}` : `days ${closed[0].date}..${closed[closed.length - 1].date}`);
  return closed;
}

/**
 * Projects on «Сегодня» (Eldar, 2026-11-23: «пусть проекты показываются в главном экране и по нажатию я хочу попасть
 * именно в его environment в клауде и сразу начать работать»): every activity with `folder:` that is not done, and
 * a button that opens Terminal in that folder with `claude` running.
 */
import type { Life, Quest } from "./life";
import { inTauri } from "./native";
import { runCmd } from "./fs";

export function projectsOf(life: Life): Quest[] {
  const rank = (q: Quest) => (q.status === "active" ? 0 : 1);
  return life.quests.filter((q) => q.folder && q.status !== "done").sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, "ru"));
}

/** An AppleScript string literal. */
const as = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** The AppleScript that opens a Terminal window in `folder` and starts `claude` there. */
export function claudeScript(folder: string): string[] {
  return [
    "-e", `tell application "Terminal" to do script "cd " & quoted form of ${as(folder)} & " && claude"`,
    "-e", `tell application "Terminal" to activate`,
  ];
}

export async function openInClaude(root: string, folder: string): Promise<void> {
  if (!inTauri) throw new Error("Открыть Claude можно только в окне приложения");
  const r = await runCmd(root, "/usr/bin/osascript", claudeScript(folder));
  if (r.status !== 0) throw new Error(r.stderr.trim() || `osascript: код ${r.status}`);
}

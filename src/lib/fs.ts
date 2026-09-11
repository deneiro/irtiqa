/**
 * The app's only write path into the vault. Tauri does the file I/O; in plain
 * browser dev mode the Vite middleware in vite.config.ts stands in for it.
 *
 * Ownership (see the vault's CLAUDE.md, `## life/`): the app writes under
 * `life/`, appends `day` lines to `wiki/log.md`, and edits only its own
 * frontmatter keys on knowledge pages. Nothing else.
 */
import { invoke } from "@tauri-apps/api/core";
import { inTauri } from "./native";

const APP_OWNED = [/^life\//, /^wiki\/log\.md$/, /^wiki\/.+\.md$/];

export function assertWritable(rel: string): void {
  if (!APP_OWNED.some((re) => re.test(rel))) throw new Error(`Not app-owned: ${rel}`);
}

export async function writeText(root: string, rel: string, content: string): Promise<void> {
  assertWritable(rel);
  if (inTauri) {
    await invoke("write_text", { root, rel, content });
    return;
  }
  const r = await fetch("/__vault/write", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ root, rel, content }),
  });
  if (!r.ok) throw new Error(await r.text());
}

export interface CmdResult {
  status: number;
  stdout: string;
  stderr: string;
}

/** Run a program inside the vault folder (git, claude). Tauri only. */
export async function runCmd(root: string, program: string, args: string[]): Promise<CmdResult> {
  if (!inTauri) throw new Error("runCmd needs the desktop app");
  return invoke<CmdResult>("run_cmd", { root, program, args });
}

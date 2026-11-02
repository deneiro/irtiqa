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

/**
 * Set when the app changed the file tree in a way the store cannot patch in
 * memory (photo added, file moved or deleted). The next `reload()` rescans.
 */
export const treeChanged = { value: false };

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

/** Write an event photo. Base64 because the webview hands us bytes, not a path. */
export async function writeBinary(root: string, rel: string, bytes: ArrayBuffer): Promise<void> {
  if (!/^life\//.test(rel)) throw new Error(`Not app-owned: ${rel}`);
  const b = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
  const base64Data = btoa(bin);
  treeChanged.value = true;
  if (inTauri) return invoke("write_binary", { root, rel, base64Data });
  const r = await fetch("/__vault/write-binary", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ root, rel, base64: base64Data }),
  });
  if (!r.ok) throw new Error(await r.text());
}

/** Move a page, e.g. when a person is renamed. */
export async function renameFile(root: string, from: string, to: string): Promise<void> {
  assertWritable(from);
  assertWritable(to);
  treeChanged.value = true;
  if (inTauri) return invoke("rename_file", { root, from, to });
  const r = await fetch("/__vault/rename", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ root, from, to }),
  });
  if (!r.ok) throw new Error(await r.text());
}

/** Remove a file or folder the app owns (a photo, or a whole event). */
export async function deleteFile(root: string, rel: string): Promise<void> {
  if (!/^life\//.test(rel)) throw new Error(`Not app-owned: ${rel}`);
  treeChanged.value = true;
  if (inTauri) return invoke("delete_file", { root, rel });
  const r = await fetch("/__vault/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ root, rel }),
  });
  if (!r.ok) throw new Error(await r.text());
}

/** Move a person page to the macOS Trash. Only `wiki/People/<Имя>.md` (4.1; the old `wiki/<Тема>/People/` form is still accepted). */
export async function trashPerson(root: string, rel: string): Promise<void> {
  if (!/^wiki\/(?:[^/]+\/)?People\/[^_/][^/]*\.md$/.test(rel)) throw new Error(`Not a person page: ${rel}`);
  treeChanged.value = true;
  if (inTauri) return invoke("trash_person", { root, rel });
  const r = await fetch("/__vault/trash", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ root, rel }),
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

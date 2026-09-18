/**
 * Tools: pages under `Personal growth/tools/`. A page with `folder:` is
 * Eldar's own code on disk; `launch:` names a file in that folder that
 * `open` starts (a `.command`, an `.app`, an `.html`), `url:` is a web app.
 * Pages without `folder:` are guides to someone else's software.
 */
import type { Page } from "./types";
import { inTauri, openExternal } from "./native";
import { runCmd } from "./fs";

export interface Tool {
  page: Page;
  folder: string | undefined;
  launch: string | undefined; // absolute path
  url: string | undefined;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function isToolPage(p: Page): boolean {
  return p.segments[0] === "Personal growth" && p.segments[1] === "tools" && p.file !== "_Overview";
}

export function toTool(page: Page): Tool {
  const folder = str(page.fm.folder)?.replace(/\/+$/, "");
  const launchName = str(page.fm.launch);
  return {
    page,
    folder,
    launch: folder && launchName ? `${folder}/${launchName}` : undefined,
    url: str(page.fm.url),
  };
}

export function toolsOf(pages: Page[]): { own: Tool[]; guides: Tool[] } {
  const all = pages.filter(isToolPage).map(toTool).sort((a, b) => a.page.title.localeCompare(b.page.title));
  return { own: all.filter((t) => t.folder), guides: all.filter((t) => !t.folder) };
}

/** Start a tool's launch file with macOS `open`. Throws with the reason. */
export async function launchTool(root: string, tool: Tool): Promise<void> {
  if (tool.launch) {
    if (!inTauri) throw new Error("Запуск работает только в окне приложения");
    const r = await runCmd(root, "/usr/bin/open", [tool.launch]);
    if (r.status !== 0) throw new Error(r.stderr.trim() || `open: код ${r.status}`);
    return;
  }
  if (tool.url) return openExternal(tool.url);
}

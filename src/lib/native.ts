/**
 * Thin wrappers around Tauri plugins that degrade gracefully when the UI runs
 * in a plain browser (dev mode).
 */
export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function openExternal(url: string): Promise<void> {
  if (inTauri) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    return openUrl(url);
  }
  window.open(url, "_blank", "noopener");
}

export async function revealInFinder(path: string): Promise<void> {
  if (!inTauri) return;
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
  return revealItemInDir(path);
}

export async function pickFolder(defaultPath: string): Promise<string | null> {
  if (!inTauri) {
    const v = window.prompt("Vault folder path", defaultPath);
    return v && v.trim() ? v.trim() : null;
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const dir = await open({ directory: true, multiple: false, defaultPath, title: "Choose the Obsidian vault folder" });
  return typeof dir === "string" ? dir : null;
}

/** A URL the webview can render for a file inside the vault. */
export function mediaUrl(root: string, rel: string): string {
  if (inTauri) {
    // convertFileSrc is sync and tiny; importing it lazily would make callers async.
    const w = window as unknown as { __TAURI_INTERNALS__?: { convertFileSrc?: (p: string, protocol?: string) => string } };
    const conv = w.__TAURI_INTERNALS__?.convertFileSrc;
    if (conv) return conv(`${root}/${rel}`, "asset");
  }
  return `/__vault/file?root=${encodeURIComponent(root)}&rel=${encodeURIComponent(rel)}`;
}

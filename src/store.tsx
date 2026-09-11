import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import MiniSearch from "minisearch";
import type { Scan, Vault } from "./lib/types";
import { buildVault } from "./lib/vault";
import { inTauri } from "./lib/native";
import { buildIndex, type SearchDoc } from "./lib/search";
import { buildLife, type Life } from "./lib/life";
import { runCmd, writeText, type CmdResult } from "./lib/fs";

const KEY = "irtiqa.vaultRoot";
const LANG_KEY = "irtiqa.lang";
export type Lang = "en" | "ru";
export const DEFAULT_ROOT =
  "/Users/eldar/Library/Mobile Documents/com~apple~CloudDocs/Documents/personal-obsidian";

interface Store {
  root: string;
  setRoot: (r: string) => void;
  vault: Vault | null;
  index: MiniSearch<SearchDoc> | null;
  /** Parsed life/ zone, rebuilt on every scan. */
  life: Life | null;
  /** Write one file inside the vault (app-owned paths only). */
  saveText: (rel: string, content: string) => Promise<void>;
  /** `git add` the paths and commit. Returns null outside the desktop app. */
  commitVault: (paths: string[], message: string) => Promise<CmdResult | null>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [root, setRootState] = useState<string>(() => localStorage.getItem(KEY) || DEFAULT_ROOT);
  const [vault, setVault] = useState<Vault | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) === "en" ? "en" : "ru"));
  const setLang = (l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    document.documentElement.lang = l;
    setLangState(l);
  };
  const watching = useRef<string | null>(null);

  const setRoot = (r: string) => {
    localStorage.setItem(KEY, r);
    setRootState(r);
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scan = inTauri
        ? await invoke<Scan>("scan_vault", { root })
        : await fetch(`/__vault?root=${encodeURIComponent(root)}`).then(async (r) => {
            if (!r.ok) throw new Error(await r.text());
            return (await r.json()) as Scan;
          });
      setVault(buildVault(scan));
      if (inTauri && watching.current !== root) {
        await invoke("watch_vault", { root }).catch(() => undefined);
        watching.current = root;
      }
    } catch (e) {
      setVault(null);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [root]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!inTauri) return;
    const un = listen("vault-changed", () => void reload());
    return () => {
      void un.then((f) => f());
    };
  }, [reload]);

  const index = useMemo(() => (vault ? buildIndex(vault.pages) : null), [vault]);
  const life = useMemo(() => (vault ? buildLife(vault.life) : null), [vault]);

  const saveText = useCallback((rel: string, content: string) => writeText(root, rel, content), [root]);
  const commitVault = useCallback(
    async (paths: string[], message: string): Promise<CmdResult | null> => {
      if (!inTauri) return null;
      const add = await runCmd(root, "git", ["add", "--", ...paths]);
      if (add.status !== 0) return add;
      return runCmd(root, "git", ["commit", "-q", "-m", message]);
    },
    [root],
  );

  const value: Store = { root, setRoot, vault, index, life, saveText, commitVault, loading, error, reload, paletteOpen, setPaletteOpen, lang, setLang };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
}

/** Vault, guaranteed. Pages render only when the vault is loaded. */
export function useVault(): Vault {
  const { vault } = useStore();
  if (!vault) throw new Error("vault not loaded");
  return vault;
}

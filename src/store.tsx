import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import MiniSearch from "minisearch";
import type { Scan, Vault } from "./lib/types";
import { buildVault } from "./lib/vault";
import { inTauri } from "./lib/native";
import { buildIndex, type SearchDoc } from "./lib/search";
import { buildLife, dayRel, emptyDay, serializeDay, type Day, type Life } from "./lib/life";
import { todayStr } from "./lib/dates";
import { runCmd, writeText, type CmdResult } from "./lib/fs";

const KEY = "irtiqa.vaultRoot";
const LANG_KEY = "irtiqa.lang";
const TIMER_KEY = "irtiqa.timer";
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
  /** Read-modify-write today's day file from the latest scan (used by pages other than Day). */
  updateToday: (fn: (d: Day) => Day) => Promise<void>;
  /** One running quest timer, kept in localStorage so a reload does not lose it. */
  timer: { quest: string; startedAt: number } | null;
  startTimer: (quest: string) => void;
  /** Stop the timer and log the session into today's day file. Returns minutes. */
  stopTimer: () => Promise<number>;
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
  const life = useMemo(() => (vault ? buildLife(vault.life, vault.media) : null), [vault]);

  // In the desktop app the watcher rescans after every write; in browser dev
  // mode nothing watches, so rescan ourselves (debounced) to keep `life` fresh.
  const rescan = useRef<number | undefined>(undefined);
  const saveText = useCallback(
    async (rel: string, content: string) => {
      await writeText(root, rel, content);
      if (!inTauri) {
        window.clearTimeout(rescan.current);
        rescan.current = window.setTimeout(() => void reload(), 300);
      }
    },
    [root, reload],
  );

  const updateToday = useCallback(
    async (fn: (d: Day) => Day) => {
      const today = todayStr();
      const cur = vault ? buildLife(vault.life, vault.media).days.get(today) : undefined;
      const next = fn(cur ?? emptyDay(today));
      await saveText(dayRel(today), serializeDay(next));
    },
    [vault, saveText],
  );

  const [timer, setTimer] = useState<{ quest: string; startedAt: number } | null>(() => {
    try { const raw = localStorage.getItem(TIMER_KEY); return raw ? (JSON.parse(raw) as { quest: string; startedAt: number }) : null; } catch { return null; }
  });
  const startTimer = useCallback((quest: string) => {
    const t = { quest, startedAt: Date.now() };
    localStorage.setItem(TIMER_KEY, JSON.stringify(t));
    setTimer(t);
  }, []);
  const stopTimer = useCallback(async () => {
    if (!timer) return 0;
    const minutes = Math.round((Date.now() - timer.startedAt) / 60000);
    localStorage.removeItem(TIMER_KEY);
    setTimer(null);
    if (minutes > 0) await updateToday((d) => ({ ...d, sessions: [...d.sessions, { quest: timer.quest, minutes }] }));
    return minutes;
  }, [timer, updateToday]);
  const commitVault = useCallback(
    async (paths: string[], message: string): Promise<CmdResult | null> => {
      if (!inTauri) return null;
      const add = await runCmd(root, "git", ["add", "--", ...paths]);
      if (add.status !== 0) return add;
      return runCmd(root, "git", ["commit", "-q", "-m", message]);
    },
    [root],
  );

  const value: Store = { root, setRoot, vault, index, life, saveText, commitVault, updateToday, timer, startTimer, stopTimer, loading, error, reload, paletteOpen, setPaletteOpen, lang, setLang };
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
